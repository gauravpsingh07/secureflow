import { detectors } from '@/lib/detection/registry';
import { evalScenarios } from '@/lib/detection/eval-data';

/**
 * Detector evaluation: run every detector over the labeled scenarios and report
 * precision/recall. Pure and deterministic — no DB. Exits non-zero if any
 * scenario has a false positive or false negative, so it can gate CI.
 */
function main(): void {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  const lines: string[] = [];

  for (const sc of evalScenarios) {
    const fired = new Set<string>();
    for (const d of detectors) {
      if (d.run(sc.context).length > 0) fired.add(d.key);
    }
    const expected = new Set(sc.expected);
    const scTp = [...fired].filter((k) => expected.has(k)).length;
    const scFp = [...fired].filter((k) => !expected.has(k)).length;
    const scFn = [...expected].filter((k) => !fired.has(k)).length;
    tp += scTp;
    fp += scFp;
    fn += scFn;

    const ok = scFp === 0 && scFn === 0;
    lines.push(
      `${ok ? 'PASS' : 'FAIL'}  ${sc.name.padEnd(34)} expected=[${
        [...expected].join(', ') || 'none'
      }] fired=[${[...fired].join(', ') || 'none'}]`,
    );
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;

  console.log('Detector evaluation\n===================');
  console.log(lines.join('\n'));
  console.log(`\nTP=${tp}  FP=${fp}  FN=${fn}`);
  console.log(`Precision = ${(precision * 100).toFixed(1)}%`);
  console.log(`Recall    = ${(recall * 100).toFixed(1)}%`);

  if (fp > 0 || fn > 0) {
    console.error('\nEval gate failed: at least one false positive or false negative.');
    process.exitCode = 1;
  }
}

main();
