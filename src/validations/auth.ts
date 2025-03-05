import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email().min(1, { message: 'Email is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
})

export const signupSchema = z
  .object({
    confirmPassword: z
      .string()
      .min(1, { message: 'Confirm Password is required' }),
    email: z.string().email().min(1, { message: 'Email is required' }),
    name: z.string().min(1, { message: 'Name is required' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
