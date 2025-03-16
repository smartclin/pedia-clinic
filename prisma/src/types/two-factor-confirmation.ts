import { UserModel, UserCreateInput } from "./user";

export interface TwoFactorConfirmationModel {
  id: string;
  userId: string;
  user?: UserModel;
}

export interface TwoFactorConfirmationCreateInput {
  id?: string;
  userId?: string;
}

export interface TwoFactorConfirmationRelationalCreateInput extends TwoFactorConfirmationCreateInput {
  user?: UserCreateInput;
}

export type TwoFactorConfirmationUpdateInput = Partial<TwoFactorConfirmationCreateInput>;

