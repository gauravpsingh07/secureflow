// Delay (seconds) before each attempt; the array length is the max attempt count.
// Attempt 1 fires immediately; later attempts back off.
export const RETRY_SCHEDULE_SECONDS = [0, 60, 300, 900, 3600];
export const MAX_ATTEMPTS = RETRY_SCHEDULE_SECONDS.length;

export type AttemptPlan = {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  nextAttemptInSeconds: number | null; // null when terminal (success or exhausted)
};

/**
 * Given how many attempts were made before this one and whether the just-made
 * attempt succeeded, decide the delivery's next state. Pure — the delivery
 * processor applies the result to the row.
 */
export function planNextAttempt(priorAttempts: number, success: boolean): AttemptPlan {
  const attempts = priorAttempts + 1;
  if (success) return { status: 'SUCCESS', attempts, nextAttemptInSeconds: null };
  if (attempts >= MAX_ATTEMPTS) return { status: 'FAILED', attempts, nextAttemptInSeconds: null };
  return { status: 'PENDING', attempts, nextAttemptInSeconds: RETRY_SCHEDULE_SECONDS[attempts] };
}
