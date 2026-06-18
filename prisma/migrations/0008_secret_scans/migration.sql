-- CreateTable
CREATE TABLE "SecretScan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "bytesScanned" INTEGER NOT NULL,
    "findingCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretFinding" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "line" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "maskedValue" TEXT NOT NULL,
    "remediation" TEXT NOT NULL,

    CONSTRAINT "SecretFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecretScan_tenantId_createdAt_idx" ON "SecretScan"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SecretFinding_scanId_idx" ON "SecretFinding"("scanId");

-- AddForeignKey
ALTER TABLE "SecretScan" ADD CONSTRAINT "SecretScan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretFinding" ADD CONSTRAINT "SecretFinding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "SecretScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row-Level Security for SecretScan (see 0002_rls). SecretFinding has no
-- tenantId; it is accessed only via its parent SecretScan.
ALTER TABLE "SecretScan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecretScan" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_secret_scan ON "SecretScan"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "tenantId" = current_setting('app.current_tenant', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant', true) IS NULL
    OR "tenantId" = current_setting('app.current_tenant', true)
  );
