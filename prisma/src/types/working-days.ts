import { DoctorModel, DoctorCreateInput } from "./doctor";

export interface WorkingDaysModel {
  id: number;
  doctorId: number;
  day: string;
  start_time: string;
  close_time: string;
  doctor?: DoctorModel;
  created_at: string;
  updated_at: string;
}

export interface WorkingDaysCreateInput {
  id?: number;
  day: string;
  start_time: string;
  close_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkingDaysRelationalCreateInput extends WorkingDaysCreateInput {
  doctor?: DoctorCreateInput;
}

export type WorkingDaysUpdateInput = Partial<WorkingDaysCreateInput>;

