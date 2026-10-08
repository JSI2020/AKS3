/**
 * Smoke-test Cloud API delivery (free-form text).
 * Usage: npx tsx --env-file=.env.local scripts/whatsapp-send-test.ts [msisdn]
 */
import {
  sendWhatsappText,
  isWhatsappConfigured,
} from "../modules/messaging/providers/whatsapp";

const to = (process.argv[2] || "491629844319").replace(/\D/g, "");

async function main() {
  if (!isWhatsappConfigured()) {
    console.error("WhatsApp not configured");
    process.exit(1);
  }
  console.log("Sending test text to", to);
  try {
    const result = await sendWhatsappText({
      to,
      body: "AKS WhatsApp test: if you see this, Cloud API delivery works.",
    });
    console.log("OK", result);
  } catch (e) {
    console.error("FAIL", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
