export interface Channel {
  inApp: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  questionApproved: Channel;
  questionRejected:  Channel;
  resultConfirmed:   Channel;
  betaApproved:      Channel;
  questionVoided:    Channel;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  questionApproved: { inApp: true, email: true },
  questionRejected: { inApp: true, email: true },
  resultConfirmed:  { inApp: true, email: true },
  betaApproved:     { inApp: true, email: true },
  questionVoided:   { inApp: true, email: true },
};

export function isNewStructure(prefs: unknown): prefs is NotificationPreferences {
  if (prefs == null || typeof prefs !== "object") return false;
  const p = prefs as Record<string, unknown>;
  return typeof p["questionApproved"] === "object" && p["questionApproved"] !== null;
}

export function toJsonValue(
  prefs: NotificationPreferences
): Record<string, { inApp: boolean; email: boolean }> {
  return prefs as unknown as Record<string, { inApp: boolean; email: boolean }>;
}
