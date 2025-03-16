import { MedicalRecordModel, MedicalRecordCreateInput } from "./medical-record";

export interface VitalSignsModel {
  id: number;
  medicalRecordId: number;
  medicalRecord?: MedicalRecordModel;
  temperature: number | null;
  heartRate: number | null;
  bloodPressureSys: number | null;
  bloodPressureDia: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VitalSignsCreateInput {
  id?: number;
  temperature?: number | null;
  heartRate?: number | null;
  bloodPressureSys?: number | null;
  bloodPressureDia?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VitalSignsRelationalCreateInput extends VitalSignsCreateInput {
  medicalRecord?: MedicalRecordCreateInput;
}

export type VitalSignsUpdateInput = Partial<VitalSignsCreateInput>;

