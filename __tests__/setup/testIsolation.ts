/**
 * Test data isolation helpers for parallel Jest suites.
 *
 * Shared database and storage fixtures can make tests pass or fail depending
 * on execution order. These helpers give each suite an isolated namespace and
 * reset it deterministically, so suites pass in random order and in-band mode
 * without weakening production behavior.
 */

import { randomUUID } from 'crypto';

/**
 * A deterministic, per-suite namespace used to prefix database keys and
 * storage paths so fixtures never collide across suites or account ids.
 */
export type TestNamespace = {
  /** Unique namespace id for the current suite. */
  id: string;
  /** Prefix applied to every database key owned by this suite. */
  dbPrefix: string;
  /** Prefix applied to every storage path owned by this suite. */
  storagePrefix: string;
  /** Namespace a database key so it cannot leak across suites. */
  dbKey: (key: string) => string;
  /** Namespace a storage path so it cannot leak across suites. */
  storagePath: (path: string) => string;
};

/**
 * Create an isolated namespace for a suite. The id is derived from the suite
 * name plus a random suffix so parallel workers never share a namespace, while
 * still being readable in failure output.
 */
export function createTestNamespace(suiteName: string): TestNamespace {
  const slug = suiteName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'suite';
  const id = `${slug}-${randomUUID()}`;
  const dbPrefix = `test:${id}:`;
  const storagePrefix = `test/${id}/`;

  return {
    id,
    dbPrefix,
    storagePrefix,
    dbKey: (key: string) => `${dbPrefix}${key}`,
    storagePath: (path: string) => `${storagePrefix}${path.replace(/^\/+/, '')}`,
  };
}

/**
 * Minimal shape of the shared database fixture used by the suites. Only the
 * operations needed for isolation are required, so this stays compatible with
 * the existing in-memory and remote test doubles.
 */
export type IsolatableDatabase = {
  set: (key: string, value: unknown) => void | Promise<void>;
  get: (key: string) => unknown | Promise<unknown>;
  remove: (key: string) => void | Promise<void>;
  keys?: () => string[] | Promise<string[]>;
};

/**
 * Minimal shape of the shared storage fixture used by the suites.
 */
export type IsolatableStorage = {
  write: (path: string, value: unknown) => void | Promise<void>;
  read: (path: string) => unknown | Promise<unknown>;
  remove: (path: string) => void | Promise<void>;
  list?: () => string[] | Promise<string[]>;
};

/**
 * Track every key/path written through an isolated fixture so cleanup can
 * remove exactly what the suite created, even when a test fails mid-way.
 */
export type IsolationTracker = {
  namespace: TestNamespace;
  /** Record a database key written by the suite. */
  trackDbKey: (key: string) => void;
  /** Record a storage path written by the suite. */
  trackStoragePath: (path: string) => void;
  /** Remove all tracked fixtures. Safe to call multiple times. */
  cleanup: () => Promise<void>;
};

/**
 * Create a tracker bound to a namespace and the shared fixtures. Cleanup is
 * idempotent and swallows individual removal errors so a single failure cannot
 * prevent the rest of the teardown from running.
 */
export function createIsolationTracker(
  namespace: TestNamespace,
  db: IsolatableDatabase,
  storage: IsolatableStorage,
): IsolationTracker {
  const dbKeys = new Set<string>();
  const storagePaths = new Set<string>();

  return {
    namespace,
    trackDbKey: (key: string) => {
      dbKeys.add(key);
    },
    trackStoragePath: (path: string) => {
      storagePaths.add(path);
    },
    cleanup: async () => {
      const removals: Array<Promise<void>> = [];

      for (const key of dbKeys) {
        removals.push(Promise.resolve(db.remove(key)).then(() => undefined, () => undefined));
      }
      for (const path of storagePaths) {
        removals.push(Promise.resolve(storage.remove(path)).then(() => undefined, () => undefined));
      }

      await Promise.all(removals);
      dbKeys.clear();
      storagePaths.clear();
    },
  };
}

/**
 * Assert that no fixture data leaked across account ids. Any key or path that
 * belongs to another namespace is a leak and fails the suite.
 */
export async function assertNoFixtureLeak(
  namespace: TestNamespace,
  db: IsolatableDatabase,
  storage: IsolatableStorage,
): Promise<void> {
  if (typeof db.keys === 'function') {
    const keys = await db.keys();
    const leaked = keys.filter((key) => key.startsWith('test:') && !key.startsWith(namespace.dbPrefix));
    if (leaked.length > 0) {
      throw new Error(
        `Fixture leak detected in database for namespace ${namespace.id}: ${leaked.join(', ')}`,
      );
    }
  }

  if (typeof storage.list === 'function') {
    const paths = await storage.list();
    const leaked = paths.filter(
      (path) => path.startsWith('test/') && !path.startsWith(namespace.storagePrefix),
    );
    if (leaked.length > 0) {
      throw new Error(
        `Fixture leak detected in storage for namespace ${namespace.id}: ${leaked.join(', ')}`,
      );
    }
  }
}

/**
 * Wire up deterministic per-suite isolation. Returns the namespace and tracker
 * so suites can register cleanup in afterEach/afterAll, guaranteeing teardown
 * runs even when a test fails.
 */
export function setupTestIsolation(
  suiteName: string,
  db: IsolatableDatabase,
  storage: IsolatableStorage,
): { namespace: TestNamespace; tracker: IsolationTracker } {
  const namespace = createTestNamespace(suiteName);
  const tracker = createIsolationTracker(namespace, db, storage);
  return { namespace, tracker };
}
