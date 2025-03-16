import { AppointmentStatus } from "./enums";
import { PatientModel, PatientCreateInput } from "./patient";
import { DoctorModel, DoctorCreateInput } from "./doctor";
import { MedicalRecordModel, MedicalRecordCreateInput } from "./medical-record";
import { PaymentModel, PaymentCreateInput } from "./payment";

export interface AppointmentModel {
  id: number;
  patientId: number;
  patient?: PatientModel;
  doctorId: number;
  doctor?: DoctorModel;
  date: string;
  status: AppointmentStatus;
  type: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  medicalRecord?: MedicalRecordModel;
  payment?: PaymentModel;
}

export interface AppointmentCreateInput {
  id?: number;
  date: string;
  status: AppointmentStatus;
  type: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentRelationalCreateInput extends AppointmentCreateInput {
  patient?: PatientCreateInput;
  doctor?: DoctorCreateInput;
  medicalRecord?: MedicalRecordCreateInput;
  payment?: PaymentCreateInput;
}

export type AppointmentUpdateInput = Partial<AppointmentCreateInput>;

