-- Defense-in-depth tenant isolation via Postgres Row-Level Security.
--
-- Primary isolation is the application query-scoping layer (lib/db/tenant.ts).
-- These policies are the second layer: they enforce isolation whenever a request
-- sets the `app.current_tenant` session variable (see lib/db/rls.ts).
--
-- The policies are intentionally permissive when the GUC is unset so the owner
-- connection the app normally uses keeps working. Set the GUC (as the app does
-- inside withTenantRls) — or connect as a non-owner role — to enforce isolation
-- at the database. FORCE makes even the table owner subject to the policy when
-- the GUC is present.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_user ON "User"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "tenantId" = current_setting('app.current_tenant', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant', true) IS NULL
    OR "tenantId" = current_setting('app.current_tenant', true)
  );

CREATE POLICY tenant_isolation_invite ON "Invite"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "tenantId" = current_setting('app.current_tenant', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant', true) IS NULL
    OR "tenantId" = current_setting('app.current_tenant', true)
  );
