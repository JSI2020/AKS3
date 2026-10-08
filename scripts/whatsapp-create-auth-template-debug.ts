/** Usage: npx tsx --env-file=.env.local scripts/whatsapp-create-auth-template-debug.ts */
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
const version = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
const name = process.env.WHATSAPP_TEMPLATE_AUTH?.trim() || "aks_signin_code";
const language = process.env.WHATSAPP_TEMPLATE_AUTH_LANG?.trim() || "en_US";

async function main() {
  if (!token || !wabaId) throw new Error("missing env");

  const listRes = await fetch(
    `https://graph.facebook.com/${version}/${wabaId}/message_templates?limit=20`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  console.log("LIST", listRes.status, await listRes.text());

  const wabaRes = await fetch(
    `https://graph.facebook.com/${version}/${wabaId}?fields=id,name,currency,account_review_status,message_template_namespace`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  console.log("WABA", wabaRes.status, await wabaRes.text());

  const body = {
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
  };

  const createRes = await fetch(
    `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  console.log("CREATE", createRes.status, await createRes.text());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
