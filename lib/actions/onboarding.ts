'use server';

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/db/client';
import { signIn } from '@/auth';
import { signUpSchema } from '@/lib/validation/auth';
import { slugify } from '@/lib/tenant/slug';
import { isDemoMode, DEMO_MESSAGE } from '@/lib/demo';

export type SignUpState = { error?: string };

/**
 * Creates a brand-new workspace: a Tenant plus its first user as OWNER, then
 * signs them in. This is the only place a tenant is created.
 */
export async function signUpAction(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  if (isDemoMode()) return { error: DEMO_MESSAGE };
  const parsed = signUpSchema.safeParse({
    organizationName: formData.get('organizationName'),
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }

  const { organizationName, name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: 'An account with that email already exists.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await uniqueSlug(organizationName);

  await prisma.tenant.create({
    data: {
      name: organizationName,
      slug,
      users: {
        create: { name, email: normalizedEmail, passwordHash, role: 'OWNER' },
      },
    },
  });

  try {
    await signIn('credentials', { email: normalizedEmail, password, redirectTo: '/dashboard' });
  } catch (error) {
    // signIn throws a redirect on success; surface only real auth failures.
    if (error instanceof AuthError) {
      return { error: 'Workspace created — please sign in.' };
    }
    throw error;
  }
  return {};
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.tenant.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
    candidate = `${base}-${randomBytes(2).toString('hex')}`;
  }
  return `${base}-${randomBytes(4).toString('hex')}`;
}
