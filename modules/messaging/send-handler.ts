import { eq } from "drizzle-orm";

import { db, messageLog } from "@aks/db";

import type { OutboxHandler } from "@/modules/platform/outbox";
import {
  isResendConfigured,
  resolveFromEmail,
  sendResendEmail,
} from "@/modules/messaging/providers/resend";

import { orderNotificationEmail } from "./email-templates";
import {
  appendCustomerRemark,
  loadMessageTemplate,
  renderTemplate,
} from "./templates";

export type MessageSendPayload = {
  messageLogId: string;
  recipient: string;
  templateKey: string;
  locale: string;
  vars: Record<string, string>;
  customerRemark?: string | null;
};

function isMessageSendPayload(
  payload: Record<string, unknown>,
): payload is MessageSendPayload {
  return (
    typeof payload.messageLogId === "string" &&
    typeof payload.recipient === "string" &&
    typeof payload.templateKey === "string" &&
    typeof payload.locale === "string" &&
    typeof payload.vars === "object" &&
    payload.vars !== null
  );
}

/**
 * Outbox handler for `message.send` — renders a template and delivers via Resend.
 */
export const handleMessageSend: OutboxHandler = async (payload) => {
  if (!isMessageSendPayload(payload)) {
    throw new Error("Invalid message.send payload");
  }

  try {
    const template = await loadMessageTemplate({
      key: payload.templateKey,
      locale: payload.locale,
    });

    if (!template) {
      throw new Error(`No template found for ${payload.templateKey}`);
    }

    const subject = renderTemplate(template.subject, payload.vars);
    let body = renderTemplate(template.body, payload.vars);
    body = appendCustomerRemark(body, payload.customerRemark ?? null);

    if (!isResendConfigured()) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("RESEND_API_KEY unset in production — cannot mark SENT");
      }
      console.log(
        `[message.send] RESEND_API_KEY unset — logging only\n  to: ${payload.recipient}\n  subject: ${subject}\n  text: ${body}`,
      );
      await db
        .update(messageLog)
        .set({
          status: "SENT",
          sentAt: new Date(),
          providerRef: "dev-log-only",
          error: null,
        })
        .where(eq(messageLog.id, payload.messageLogId));
      return;
    }

    const html = orderNotificationEmail({
      templateKey: payload.templateKey,
      subject,
      bodyText: body,
      vars: payload.vars,
    });

    const result = await sendResendEmail({
      from: resolveFromEmail(),
      to: payload.recipient,
      subject,
      html,
      text: body,
    });

    await db
      .update(messageLog)
      .set({
        status: "SENT",
        sentAt: new Date(),
        providerRef: result.id,
        error: null,
      })
      .where(eq(messageLog.id, payload.messageLogId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    await db
      .update(messageLog)
      .set({
        status: "FAILED",
        error: message,
      })
      .where(eq(messageLog.id, payload.messageLogId));
    throw error;
  }
};
