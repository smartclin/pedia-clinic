import { PatientModel, PatientCreateInput } from "./patient";

export interface GrowthMeasurementModel {
  id: number;
  patientId: number;
  patient?: PatientModel;
  date: string;
  height: number;
  weight: number;
  headCircumference: number | null;
  bmi: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthMeasurementCreateInput {
  id?: number;
  date: string;
  height: number;
  weight: number;
  headCircumference?: number | null;
  bmi?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GrowthMeasurementRelationalCreateInput extends GrowthMeasurementCreateInput {
  patient?: PatientCreateInput;
}

export type GrowthMeasurementUpdateInput = Partial<GrowthMeasurementCreateInput>;

