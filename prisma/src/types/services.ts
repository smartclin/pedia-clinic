export interface ServicesModel {
  id: number;
  service_name: string;
  description: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface ServicesCreateInput {
  id?: number;
  service_name: string;
  description: string;
  price: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServicesRelationalCreateInput extends ServicesCreateInput {
  
}

export type ServicesUpdateInput = Partial<ServicesCreateInput>;

