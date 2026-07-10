import { sendEmail, EmailType } from "@/lib/email";
import prisma from "@/lib/prisma";

export interface EmailNotificationOptions {
  userId: string;
  type: EmailType;
  subject: string;
  html: string;
  text: string;
  forceEmailRegardlessOfPreference?: boolean;
  preferenceKey?: string;
}

export async function sendEmailNotification(opts: EmailNotificationOptions): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: {
        email: true,
        profile: {
          select: { notificationPreferences: true },
        },
      },
    });

    if (!user?.email) return;

    if (!opts.forceEmailRegardlessOfPreference && opts.preferenceKey) {
      const prefs = user.profile?.notificationPreferences as Record<string, { email?: boolean }> | null;
      const emailEnabled = prefs?.[opts.preferenceKey]?.email ?? true;
      if (!emailEnabled) return;
    }

    await sendEmail({
      to: user.email,
      type: opts.type,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      userId: opts.userId,
    });
  } catch (err) {
    console.error("[sendEmailNotification] failed:", err);
  }
}
