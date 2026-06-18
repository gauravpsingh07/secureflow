import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@/lib/auth/rbac';

/** Paths that don't require a session. */
function isAuthPage(pathname: string): boolean {
  return (
    pathname === '/sign-in' || pathname === '/sign-up' || pathname.startsWith('/invite/')
  );
}

function isPublic(pathname: string): boolean {
  return pathname === '/' || isAuthPage(pathname);
}

/**
 * Edge-safe Auth.js config (no DB / Node-only imports). Used by `middleware.ts`
 * to verify the JWT and gate routes. The Credentials provider — which needs the
 * database and bcrypt — is added in `auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: '/sign-in' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Signed-in users shouldn't see the auth pages.
      if (isAuthPage(pathname) && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', request.nextUrl));
      }
      if (isPublic(pathname)) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
