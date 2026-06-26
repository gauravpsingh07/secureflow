import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { verifyTotp } from '@/lib/auth/totp';
import { authConfig } from './auth.config';

const credentialsSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  token: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password, token } = parsed.data;
        // Login happens before we know the tenant, so use the unscoped client.
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Second factor: if MFA is enabled, a valid TOTP code is required.
        if (user.mfaEnabled) {
          if (!user.mfaSecret || !token || !verifyTotp(user.mfaSecret, token)) return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
        };
      },
    }),
  ],
});
