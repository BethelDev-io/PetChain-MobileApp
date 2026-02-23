/**
 * Pet data model interfaces and types
 */

/**
 * Medical history record for a pet
 */
export interface MedicalHistoryRecord {
  id: string;
  date: string;
  condition: string;
  treatment: string;
  veterinarian?: string;
  notes?: string;
}

/**
 * Vaccination record for a pet
 */
export interface VaccinationRecord {
  id: string;
  name: string;
  date: string;
  nextDueDate?: string;
  veterinarian?: string;
  batchNumber?: string;
}

/**
 * Medication record for a pet
 */
export interface MedicationRecord {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  notes?: string;
}

/**
 * Pet species type
 */
export type Species = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';

/**
 * Main Pet interface
 */
export interface Pet {
  id: string;
  name: string;
  breed: string;
  species: Species;
  age: number;
  weight: number;
  owner: string;
  medicalHistory: MedicalHistoryRecord[];
  vaccinations: VaccinationRecord[];
  medications: MedicationRecord[];
  qrCode: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  color?: string;
  microchipId?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
