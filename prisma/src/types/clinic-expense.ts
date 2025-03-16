import { ExpenseCategory } from "./enums";


export interface ClinicExpenseModel {
  id: number;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicExpenseCreateInput {
  id?: number;
  category: ExpenseCategory;
  amount: number;
  description?: string | null;
  expenseDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicExpenseRelationalCreateInput extends ClinicExpenseCreateInput {
  
}

export type ClinicExpenseUpdateInput = Partial<ClinicExpenseCreateInput>;

