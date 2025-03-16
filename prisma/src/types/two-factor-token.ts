export interface TwoFactorTokenModel {
  id: string;
  email: string;
  token: string;
  expires: string;
}

export interface TwoFactorTokenCreateInput {
  id?: string;
  email: string;
  token: string;
  expires: string;
}

export interface TwoFactorTokenRelationalCreateInput extends TwoFactorTokenCreateInput {
  
}

export type TwoFactorTokenUpdateInput = Partial<TwoFactorTokenCreateInput>;

