import { DoctorModel, DoctorCreateInput } from "./doctor";
import { MedicalRecordModel, MedicalRecordCreateInput } from "./medical-record";

export interface DiagnosisModel {
  id: number;
  patientId: number;
  medicalId: number;
  doctorId: number;
  doctor?: DoctorModel;
  symptoms: string;
  diagnosis: string;
  notes: string | null;
  prescribed_medications: string | null;
  follow_up_plan: string | null;
  medical?: MedicalRecordModel;
  created_at: string;
  updated_at: string;
}

export interface DiagnosisCreateInput {
  id?: number;
  symptoms: string;
  diagnosis: string;
  notes?: string | null;
  prescribed_medications?: string | null;
  follow_up_plan?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DiagnosisRelationalCreateInput extends DiagnosisCreateInput {
  doctor?: DoctorCreateInput;
  medical?: MedicalRecordCreateInput;
}

export type DiagnosisUpdateInput = Partial<DiagnosisCreateInput>;

