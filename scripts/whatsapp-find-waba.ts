/** Usage: npx tsx --env-file=.env.local scripts/whatsapp-find-waba.ts */
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const version = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
const businessId = process.argv[2] || "927553550213861";

if (!token) {
  console.error("WHATSAPP_ACCESS_TOKEN required");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

async function get(path: string) {
  const r = await fetch(`https://graph.facebook.com/${version}${path}`, {
    headers,
  });
  const t = await r.text();
  console.log(`\nGET ${path} → ${r.status}`);
  console.log(t.slice(0, 4000));
  return { status: r.status, body: t };
}

async function main() {
  await get(
    `/${businessId}?fields=id,name,owned_whatsapp_business_accounts{id,name,currency,timezone_id}`,
  );
  await get(
    `/${businessId}/owned_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name}`,
  );
  await get(
    `/${businessId}/client_whatsapp_business_accounts?fields=id,name`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
