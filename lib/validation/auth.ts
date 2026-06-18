import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  organizationName: z.string().min(2, 'Workspace name is too short').max(80),
  name: z.string().min(1, 'Name is required').max(80),
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
