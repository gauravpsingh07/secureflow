export type EmailMessage = { to: string; subject: string; body: string };

/**
 * Email stub. In production this would call a transactional email provider; here
 * it logs so the demo runs with no external dependency or API key.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  console.log(`[email] → ${message.to}: ${message.subject}`);
  return Promise.resolve();
}
