import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Meta WhatsApp Cloud API webhook helpers.
 * Docs: hub.mode/hub.verify_token/hub.challenge on GET;
 * X-Hub-Signature-256 on POST.
 */

export function whatsappWebhookVerifyToken(): string | null {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || null;
}

export function whatsappAppSecret(): string | null {
  return process.env.WHATSAPP_APP_SECRET?.trim() || null;
}

export function verifyWhatsappWebhookSubscription(params: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
}): { ok: true; challenge: string } | { ok: false; status: number } {
  const expected = whatsappWebhookVerifyToken();
  if (!expected) return { ok: false, status: 503 };
  if (params.mode !== "subscribe" || !params.token || !params.challenge) {
    return { ok: false, status: 400 };
  }
  if (params.token !== expected) return { ok: false, status: 403 };
  return { ok: true, challenge: params.challenge };
}

/** Validate X-Hub-Signature-256 when WHATSAPP_APP_SECRET is set. */
export function verifyWhatsappWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = whatsappAppSecret();
  if (!secret) {
    // Dev-friendly: allow unsigned when secret unset (Meta still needs HTTPS URL).
    return process.env.NODE_ENV !== "production";
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const their = signatureHeader.slice("sha256=".length);
  const ours = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(their, "hex");
    const b = Buffer.from(ours, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
