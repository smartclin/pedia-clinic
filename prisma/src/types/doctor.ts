import { JOBTYPE } from "./enums";
import { UserModel, UserCreateInput } from "./user";
import { WorkingDaysModel, WorkingDaysCreateInput } from "./working-days";
import { AppointmentModel, AppointmentCreateInput } from "./appointment";
import { DiagnosisModel, DiagnosisCreateInput } from "./diagnosis";
import { MedicalRecordModel, MedicalRecordCreateInput } from "./medical-record";

export interface DoctorModel {
  id: number;
  email: string;
  name: string;
  specialization: string | null;
  license_number: string | null;
  phone: string | null;
  address: string | null;
  department: string | null;
  img: string | null;
  colorCode: string | null;
  availability_status: string | null;
  userId: string | null;
  user?: UserModel;
  type: JOBTYPE;
  working_days?: WorkingDaysModel[];
  appointments?: AppointmentModel[];
  diagnosis?: DiagnosisModel[];
  created_at: string;
  updated_at: string;
  MedicalRecord?: MedicalRecordModel[];
}

export interface DoctorCreateInput {
  id?: number;
  email: string;
  name: string;
  specialization?: string | null;
  license_number?: string | null;
  phone?: string | null;
  address?: string | null;
  department?: string | null;
  img?: string | null;
  colorCode?: string | null;
  availability_status?: string | null;
  type?: JOBTYPE;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorRelationalCreateInput extends DoctorCreateInput {
  user?: UserCreateInput;
  working_days?: WorkingDaysCreateInput | WorkingDaysCreateInput[];
  appointments?: AppointmentCreateInput | AppointmentCreateInput[];
  diagnosis?: DiagnosisCreateInput | DiagnosisCreateInput[];
  MedicalRecord?: MedicalRecordCreateInput | MedicalRecordCreateInput[];
}

export type DoctorUpdateInput = Partial<DoctorCreateInput>;

