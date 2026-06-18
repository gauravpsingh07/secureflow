-- CreateTable
CREATE TABLE "DetectorSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "detectorKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetectorSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetectorSetting_tenantId_idx" ON "DetectorSetting"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DetectorSetting_tenantId_detectorKey_key" ON "DetectorSetting"("tenantId", "detectorKey");

-- AddForeignKey
ALTER TABLE "DetectorSetting" ADD CONSTRAINT "DetectorSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row-Level Security for DetectorSetting (see 0002_rls for rationale).
ALTER TABLE "DetectorSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DetectorSetting" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_detector_setting ON "DetectorSetting"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "tenantId" = current_setting('app.current_tenant', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant', true) IS NULL
    OR "tenantId" = current_setting('app.current_tenant', true)
  );
