'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { requireRole } from '@/lib/auth/session';
import { signIn } from '@/auth';
import { generateInviteToken } from '@/lib/tenant/invite';
import { audit } from '@/lib/audit';

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']),
});

export type TeamActionState = { error?: string; ok?: string };

/** Invite a new member to the current tenant (owners/admins only). */
export async function inviteMemberAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid invite.' };
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { error: 'That email already has an account.' };

  try {
    await getTenantDb(actor.tenantId).invite.create({
      data: {
        tenantId: actor.tenantId,
        email,
        role: parsed.data.role,
        token: generateInviteToken(),
        invitedBy: actor.userId,
      },
    });
  } catch {
    return { error: 'That email is already invited.' };
  }
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'member.invite',
    target: email,
    metadata: { role: parsed.data.role },
  });

  revalidatePath('/settings/team');
  return { ok: `Invitation created for ${email}.` };
}

/** Revoke a pending invitation (owners/admins only). */
export async function revokeInviteAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const id = String(formData.get('inviteId') ?? '');
  if (!id) return;
  await getTenantDb(actor.tenantId).invite.deleteMany({ where: { id } });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'invite.revoke',
    target: id,
  });
  revalidatePath('/settings/team');
}

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(80),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export type AcceptState = { error?: string };

/** Redeem an invitation: create the account in the invite's tenant + role. */
export async function acceptInviteAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const parsed = acceptSchema.safeParse({
    token: formData.get('token'),
    name: formData.get('name'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }

  const invite = await prisma.invite.findUnique({ where: { token: parsed.data.token } });
  if (!invite || invite.acceptedAt) {
    return { error: 'This invitation is invalid or has already been used.' };
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) return { error: 'An account with that email already exists.' };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [newUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invite.email,
        name: parsed.data.name,
        passwordHash,
        tenantId: invite.tenantId,
        role: invite.role,
      },
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  await audit({
    tenantId: invite.tenantId,
    actorId: newUser.id,
    actorName: parsed.data.name,
    action: 'member.join',
    target: invite.email,
    metadata: { role: invite.role },
  });

  try {
    await signIn('credentials', {
      email: invite.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Account created — please sign in.' };
    throw error;
  }
  return {};
}
