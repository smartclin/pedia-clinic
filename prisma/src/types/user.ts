import { UserRole } from "./enums";
import { AccountModel, AccountCreateInput } from "./account";
import { TwoFactorConfirmationModel, TwoFactorConfirmationCreateInput } from "./two-factor-confirmation";
import { DoctorModel, DoctorCreateInput } from "./doctor";

export interface UserModel {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  password: string | null;
  role: UserRole;
  accounts?: AccountModel[];
  isTwoFactorEnabled: boolean;
  twoFactorConfirmation?: TwoFactorConfirmationModel;
  doctors?: DoctorModel[];
}

export interface UserCreateInput {
  id?: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: string | null;
  image?: string | null;
  password?: string | null;
  role?: UserRole;
  isTwoFactorEnabled?: boolean;
}

export interface UserRelationalCreateInput extends UserCreateInput {
  accounts?: AccountCreateInput | AccountCreateInput[];
  twoFactorConfirmation?: TwoFactorConfirmationCreateInput;
  doctors?: DoctorCreateInput | DoctorCreateInput[];
}

export type UserUpdateInput = Partial<UserCreateInput>;

