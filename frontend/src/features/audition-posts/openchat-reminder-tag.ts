export const OPENCHAT_SOURCE = "kakao_openchat";
export const REMINDER_CAMPAIGN_PARAM = "utm_campaign";
export type ReminderTiming = "d0" | "d1";
export type ReminderCampaign = `deadline_reminder_${string}_${ReminderTiming}`;

export function readOpenChatReminder(src: unknown, campaign: unknown): ReminderCampaign | undefined {
  if (src === OPENCHAT_SOURCE && isReminderCampaign(campaign)) return campaign;
}

export function isReminderCampaign(value: unknown): value is ReminderCampaign {
  if (typeof value !== "string") return false;
  const match = /^deadline_reminder_(\d{4})(\d{2})(\d{2})_d[01]$/.exec(value);
  if (!match || match[0] !== value) return false;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
