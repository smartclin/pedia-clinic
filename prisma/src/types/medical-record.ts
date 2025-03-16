import { AppointmentModel, AppointmentCreateInput } from "./appointment";
import { PatientModel, PatientCreateInput } from "./patient";
import { DoctorModel, DoctorCreateInput } from "./doctor";
import { VitalSignsModel, VitalSignsCreateInput } from "./vital-signs";
import { DiagnosisModel, DiagnosisCreateInput } from "./diagnosis";

export interface MedicalRecordModel {
  id: number;
  appointmentId: number;
  appointment?: AppointmentModel;
  patientId: number;
  patient?: PatientModel;
  doctorId: number;
  doctor?: DoctorModel;
  diagnosis: string | null;
  treatment: string | null;
  prescription: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vitalSigns?: VitalSignsModel;
  Diagnosis?: DiagnosisModel[];
}

export interface MedicalRecordCreateInput {
  id?: number;
  diagnosis?: string | null;
  treatment?: string | null;
  prescription?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalRecordRelationalCreateInput extends MedicalRecordCreateInput {
  appointment?: AppointmentCreateInput;
  patient?: PatientCreateInput;
  doctor?: DoctorCreateInput;
  vitalSigns?: VitalSignsCreateInput;
  Diagnosis?: DiagnosisCreateInput | DiagnosisCreateInput[];
}

export type MedicalRecordUpdateInput = Partial<MedicalRecordCreateInput>;

