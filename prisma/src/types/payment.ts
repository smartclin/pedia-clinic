import { PaymentMethod, PaymentStatus } from "./enums";
import { AppointmentModel, AppointmentCreateInput } from "./appointment";
import { PatientModel, PatientCreateInput } from "./patient";

export interface PaymentModel {
  id: number;
  appointmentId: number;
  appointment?: AppointmentModel;
  patientId: number;
  patient?: PatientModel;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCreateInput {
  id?: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentRelationalCreateInput extends PaymentCreateInput {
  appointment?: AppointmentCreateInput;
  patient?: PatientCreateInput;
}

export type PaymentUpdateInput = Partial<PaymentCreateInput>;

