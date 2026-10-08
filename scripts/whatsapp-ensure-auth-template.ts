/**
 * Create (or confirm) the WhatsApp authentication template used for shop OTP.
 *
 * Requires in .env.local:
 *   WHATSAPP_ACCESS_TOKEN
 *   WHATSAPP_BUSINESS_ACCOUNT_ID  (API Setup → WhatsApp Business Account ID)
 *
 * Optional:
 *   WHATSAPP_TEMPLATE_AUTH       (default aks_signin_code)
 *   WHATSAPP_TEMPLATE_AUTH_LANG  (default en_US)
 *
 * Usage: npx tsx --env-file=.env.local scripts/whatsapp-ensure-auth-template.ts
 */
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
const version = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
const name = process.env.WHATSAPP_TEMPLATE_AUTH?.trim() || "aks_signin_code";
const language = process.env.WHATSAPP_TEMPLATE_AUTH_LANG?.trim() || "en_US";

if (!token || !wabaId) {
  console.error(
    "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in .env.local",
  );
  process.exit(1);
}

async function main() {
  const listUrl = `https://graph.facebook.com/${version}/${wabaId}/message_templates?name=${encodeURIComponent(name)}&limit=5`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = (await listRes.json()) as {
    data?: Array<{ name: string; status: string; language: string }>;
    error?: { message?: string };
  };

  if (!listRes.ok) {
    console.error("List templates failed:", listJson.error?.message ?? listJson);
    process.exit(1);
  }

  const existing = (listJson.data ?? []).find(
    (t) => t.name === name && t.language === language,
  );
  if (existing) {
    console.log(`Template "${name}" (${language}) status: ${existing.status}`);
    console.log(
      `Set in .env.local:\n  WHATSAPP_TEMPLATE_AUTH=${name}\n  WHATSAPP_TEMPLATE_AUTH_LANG=${language}\n  AKS_ALLOW_DEV_OTP=0`,
    );
    return;
  }

  const createRes = await fetch(
    `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        language,
        category: "AUTHENTICATION",
        message_send_ttl_seconds: 600,
        components: [
          { type: "BODY", add_security_recommendation: true },
          { type: "FOOTER", code_expiration_minutes: 10 },
          {
            type: "BUTTONS",
            buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy code" }],
          },
        ],
      }),
    },
  );

  const createJson = (await createRes.json()) as {
    id?: string;
    status?: string;
    error?: { message?: string };
  };

  if (!createRes.ok) {
    console.error(
      "Create template failed:",
      createJson.error?.message ?? createJson,
    );
    process.exit(1);
  }

  console.log(
    `Created template "${name}" id=${createJson.id} status=${createJson.status}`,
  );
  console.log(
    `Set in .env.local:\n  WHATSAPP_TEMPLATE_AUTH=${name}\n  WHATSAPP_TEMPLATE_AUTH_LANG=${language}\n  AKS_ALLOW_DEV_OTP=0`,
  );
  console.log(
    "If status is PENDING, wait for Meta approval (often minutes for AUTHENTICATION), then retry sign-in.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
