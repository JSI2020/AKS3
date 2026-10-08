/** Usage: npx tsx --env-file=.env.local scripts/whatsapp-probe-graph.ts */
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
const version = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";

if (!token || !phoneNumberId) {
  console.error("missing token or phone number id");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

async function get(path: string) {
  const r = await fetch(`https://graph.facebook.com/${version}${path}`, {
    headers,
  });
  const t = await r.text();
  console.log(`\nGET ${path} → ${r.status}`);
  console.log(t.slice(0, 3000));
}

async function main() {
  await get("/me?fields=id,name");
  await get(
    `/${phoneNumberId}?fields=id,display_phone_number,verified_name,account_mode,name_status,code_verification_status,platform_type,throughput`,
  );
  await get(`/${phoneNumberId}/whatsapp_business_profile`);
  await get(
    "/me/owned_whatsapp_business_accounts?fields=id,name,currency,timezone_id",
  );
  await get("/me/whatsapp_business_accounts?fields=id,name");

  const debug = await fetch(
    `https://graph.facebook.com/${version}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
  );
  const dj = (await debug.json()) as {
    data?: {
      app_id?: string;
      type?: string;
      is_valid?: boolean;
      scopes?: string[];
      granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
    };
  };
  console.log("\ndebug_token:", JSON.stringify(dj, null, 2));

  const appId = dj.data?.app_id;
  if (appId) {
    await get(`/${appId}?fields=id,name`);
  }

  // Parent WABA sometimes exposed via this edge on newer Graph versions
  await get(`/${phoneNumberId}?fields=whatsapp_business_account`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
