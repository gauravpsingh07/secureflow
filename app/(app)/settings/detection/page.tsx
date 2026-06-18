import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { detectors } from '@/lib/detection/registry';
import { DETECTOR_PARAMS } from '@/lib/detection/config';
import { saveDetectorSettingAction } from '@/lib/actions/detector-settings';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DetectionSettingsPage() {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const rows = await getTenantDb(actor.tenantId).detectorSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.detectorKey, r]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Detection rules</h1>
        <p className="mt-1 text-sm text-slate-500">
          Turn detectors on or off and tune their thresholds for this workspace.
        </p>
      </div>

      {detectors.map((d) => {
        const setting = byKey.get(d.key);
        const enabled = setting?.enabled ?? true;
        const cfg = (setting?.config ?? {}) as Record<string, unknown>;
        const specs = DETECTOR_PARAMS[d.key] ?? [];
        return (
          <Card key={d.key}>
            <CardHeader>
              <CardTitle>{d.label}</CardTitle>
            </CardHeader>
            <CardBody>
              <form action={saveDetectorSettingAction} className="flex flex-wrap items-end gap-4">
                <input type="hidden" name="detectorKey" value={d.key} />
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={enabled}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Enabled
                </label>
                {specs.map((spec) => {
                  const current = typeof cfg[spec.name] === 'number' ? (cfg[spec.name] as number) : spec.default;
                  return (
                    <div key={spec.name}>
                      <label className="block text-xs font-medium text-slate-600">{spec.label}</label>
                      <input
                        type="number"
                        name={`param_${spec.name}`}
                        defaultValue={current}
                        min={spec.min}
                        max={spec.max}
                        className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Save
                </button>
                <span className="text-xs text-slate-400">{d.key}</span>
              </form>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
