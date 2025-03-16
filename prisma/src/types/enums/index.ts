export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER'
} as const;
export type UserRole = keyof typeof UserRole;

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  INSURANCE: 'INSURANCE'
} as const;
export type PaymentMethod = keyof typeof PaymentMethod;

export const PaymentStatus = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL'
} as const;
export type PaymentStatus = keyof typeof PaymentStatus;

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER'
} as const;
export type Gender = keyof typeof Gender;

export const AppointmentStatus = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
} as const;
export type AppointmentStatus = keyof typeof AppointmentStatus;

export const Status = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DORMANT: 'DORMANT'
} as const;
export type Status = keyof typeof Status;

export const JOBTYPE = {
  FULL: 'FULL',
  PART: 'PART'
} as const;
export type JOBTYPE = keyof typeof JOBTYPE;

export const ExpenseCategory = {
  SALARY: 'SALARY',
  RENT: 'RENT',
  EQUIPMENT: 'EQUIPMENT',
  SUPPLIES: 'SUPPLIES',
  UTILITIES: 'UTILITIES',
  OTHER: 'OTHER'
} as const;
export type ExpenseCategory = keyof typeof ExpenseCategory;

