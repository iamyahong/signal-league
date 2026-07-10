import { Webhook } from "svix";

export interface ResendWebhookPayload {
  type:
    | "email.delivered"
    | "email.bounced"
    | "email.complained"
    | "email.opened"
    | "email.clicked";
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    created_at?: string;
    subject?: string;
    bounce?: {
      message?: string;
      type?: "hard" | "soft";
    };
  };
}

export function verifyResendWebhook(
  rawBody: string,
  headers: {
    "svix-id": string | null;
    "svix-timestamp": string | null;
    "svix-signature": string | null;
  }
): ResendWebhookPayload {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET이 설정되지 않았습니다.");

  const wh = new Webhook(secret);
  return wh.verify(rawBody, {
    "svix-id": headers["svix-id"] ?? "",
    "svix-timestamp": headers["svix-timestamp"] ?? "",
    "svix-signature": headers["svix-signature"] ?? "",
  }) as ResendWebhookPayload;
}
