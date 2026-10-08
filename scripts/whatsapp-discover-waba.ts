/**
 * Resolve WhatsApp Business Account ID from the configured phone number id.
 * Usage: npx tsx --env-file=.env.local scripts/whatsapp-discover-waba.ts
 */
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
const version = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";

if (!token || !phoneNumberId) {
  console.error("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID required");
  process.exit(1);
}

async function main() {
  // Try phone node fields that may include the parent WABA.
  const fields = [
    "id",
    "display_phone_number",
    "verified_name",
    "quality_rating",
    "is_official_business_account",
  ].join(",");

  const phoneRes = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}?fields=${fields}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const phoneJson = await phoneRes.json();
  console.log("Phone number:", JSON.stringify(phoneJson, null, 2));

  // Debug token → granular scopes / app; then list businesses.
  const debugRes = await fetch(
    `https://graph.facebook.com/${version}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
  );
  const debugJson = (await debugRes.json()) as {
    data?: { app_id?: string; granular_scopes?: Array<{ scope: string; target_ids?: string[] }> };
    error?: { message?: string };
  };

  if (debugJson.error) {
    console.log("debug_token:", debugJson.error.message);
  } else {
    const targets =
      debugJson.data?.granular_scopes?.flatMap((s) => s.target_ids ?? []) ?? [];
    const unique = [...new Set(targets)];
    console.log("Token target ids (often include WABA):", unique);
    if (unique[0]) {
      console.log(`\nTry adding to .env.local:\nWHATSAPP_BUSINESS_ACCOUNT_ID=${unique[0]}`);
    }
  }

  // Shared WABAs for this app/user
  const sharedRes = await fetch(
    `https://graph.facebook.com/${version}/me/accounts?fields=id,name`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  console.log("me/accounts:", await sharedRes.text());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
