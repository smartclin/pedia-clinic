import { Gender } from "./enums";
import { AppointmentModel, AppointmentCreateInput } from "./appointment";
import { MedicalRecordModel, MedicalRecordCreateInput } from "./medical-record";
import { PaymentModel, PaymentCreateInput } from "./payment";
import { GrowthMeasurementModel, GrowthMeasurementCreateInput } from "./growth-measurement";

export interface PatientModel {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email: string | null;
  address: string | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  createdAt: string;
  updatedAt: string;
  appointments?: AppointmentModel[];
  medicalRecords?: MedicalRecordModel[];
  payments?: PaymentModel[];
  growthMeasurements?: GrowthMeasurementModel[];
}

export interface PatientCreateInput {
  id?: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string | null;
  address?: string | null;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  insuranceProvider?: string | null;
  insuranceNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientRelationalCreateInput extends PatientCreateInput {
  appointments?: AppointmentCreateInput | AppointmentCreateInput[];
  medicalRecords?: MedicalRecordCreateInput | MedicalRecordCreateInput[];
  payments?: PaymentCreateInput | PaymentCreateInput[];
  growthMeasurements?: GrowthMeasurementCreateInput | GrowthMeasurementCreateInput[];
}

export type PatientUpdateInput = Partial<PatientCreateInput>;

