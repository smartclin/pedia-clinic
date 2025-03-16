export interface PasswordResetTokenModel {
  id: string;
  email: string;
  token: string;
  expires: string;
}

export interface PasswordResetTokenCreateInput {
  id?: string;
  email: string;
  token: string;
  expires: string;
}

export interface PasswordResetTokenRelationalCreateInput extends PasswordResetTokenCreateInput {
  
}

export type PasswordResetTokenUpdateInput = Partial<PasswordResetTokenCreateInput>;

