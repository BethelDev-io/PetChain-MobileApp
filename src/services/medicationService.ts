import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: number; // hours between doses
  startDate: string; // ISO string
  refillDate?: string; // ISO string
  totalPills?: number;
  remainingPills?: number;
  notes?: string;
}

export interface DoseLog {
  id: string;
  medicationId: string;
  takenAt: string; // ISO string
  skipped?: boolean;
  notes?: string;
}

const MEDICATIONS_KEY = '@medications';
const DOSE_LOGS_KEY = '@dose_logs';

// ─── Storage ──────────────────────────────────────────────────────────────────

export async function getMedications(): Promise<Medication[]> {
  const raw = await AsyncStorage.getItem(MEDICATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveMedication(med: Medication): Promise<void> {
  const meds = await getMedications();
  const idx = meds.findIndex((m) => m.id === med.id);
  if (idx >= 0) meds[idx] = med;
  else meds.push(med);
  await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(meds));
}

export async function deleteMedication(id: string): Promise<void> {
  const meds = await getMedications();
  await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(meds.filter((m) => m.id !== id)));
}

export async function getDoseLogs(): Promise<DoseLog[]> {
  const raw = await AsyncStorage.getItem(DOSE_LOGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function logDose(log: DoseLog): Promise<void> {
  const logs = await getDoseLogs();
  logs.push(log);
  await AsyncStorage.setItem(DOSE_LOGS_KEY, JSON.stringify(logs));
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

/** Returns the scheduled dose times for a medication within a given day (local). */
export function getDaySchedule(med: Medication, date: Date): Date[] {
  const times: Date[] = [];
  const start = new Date(med.startDate);
  const intervalMs = med.frequency * 60 * 60 * 1000;

  // Align first dose to start of the given day or med start, whichever is later
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Find first dose on or after dayStart
  let t = new Date(start);
  if (t < dayStart) {
    const diff = dayStart.getTime() - t.getTime();
    const steps = Math.ceil(diff / intervalMs);
    t = new Date(t.getTime() + steps * intervalMs);
  }

  while (t <= dayEnd) {
    times.push(new Date(t));
    t = new Date(t.getTime() + intervalMs);
  }
  return times;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function scheduleRefillReminder(med: Medication): Promise<void> {
  if (!med.refillDate) return;
  const trigger = new Date(med.refillDate);
  trigger.setHours(9, 0, 0, 0); // 9 AM on refill day
  if (trigger <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Refill Reminder',
      body: `Time to refill ${med.name}`,
      data: { medicationId: med.id },
    },
    trigger,
  });
}
