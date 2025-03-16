export interface ClinicIncomeModel {
  id: number;
  source: string;
  amount: number;
  description: string | null;
  incomeDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicIncomeCreateInput {
  id?: number;
  source: string;
  amount: number;
  description?: string | null;
  incomeDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicIncomeRelationalCreateInput extends ClinicIncomeCreateInput {
  
}

export type ClinicIncomeUpdateInput = Partial<ClinicIncomeCreateInput>;

