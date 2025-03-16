export interface VerificationTokenModel {
  id: string;
  email: string;
  token: string;
  expires: string;
}

export interface VerificationTokenCreateInput {
  id?: string;
  email: string;
  token: string;
  expires: string;
}

export interface VerificationTokenRelationalCreateInput extends VerificationTokenCreateInput {
  
}

export type VerificationTokenUpdateInput = Partial<VerificationTokenCreateInput>;

