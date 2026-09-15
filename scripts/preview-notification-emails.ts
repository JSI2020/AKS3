import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** Renders every notification email into one scrollable preview page. */
async function main() {
  const { orderNotificationEmail, verificationCodeEmail } = await import(
    "@/modules/messaging/email-templates"
  );
  const { MESSAGE_TEMPLATE_SEEDS, renderTemplate } = await import(
    "@/modules/messaging/templates"
  );

  const vars: Record<string, string> = {
    orderNumber: "AKS-10482",
    customerName: "Ayesha",
    trackUrl: "https://aks-atelier.com/track/AKS-10482",
    courierName: "TCS",
    trackingNumber: "TCS-77401939",
    code: "482913",
  };

  const cards: string[] = [];

  // Verification (already branded) first, for comparison.
  const v = verificationCodeEmail("482913");
  cards.push(card(`verification · ${v.subject}`, v.html));

  for (const seed of MESSAGE_TEMPLATE_SEEDS) {
    const subject = renderTemplate(seed.subject, vars);
    const body = renderTemplate(seed.body, vars);
    const html = orderNotificationEmail({
      templateKey: seed.key,
      subject,
      bodyText: body,
      vars,
    });
    cards.push(card(`${seed.key} · ${subject}`, html));
  }

  const page = `<!doctype html><html><head><meta charset="utf-8">
<title>AKS notification emails</title>
<style>
  body{margin:0;background:#2b2926;font-family:system-ui,sans-serif;padding:24px;}
  h2{color:#bfaa88;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;margin:28px 8px 10px;}
  .grid{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;}
  .frame{width:560px;max-width:100%;background:#f1ece1;border-radius:6px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.35);}
  iframe{width:100%;height:640px;border:0;display:block;background:#f1ece1;}
</style></head><body>
<div class="grid">
${cards.join("\n")}
</div></body></html>`;

  const out = join(process.cwd(), "scripts", "notification-emails-preview.html");
  writeFileSync(out, page, "utf-8");
  console.log(`Wrote ${out} (${MESSAGE_TEMPLATE_SEEDS.length + 1} emails)`);
  process.exit(0);
}

function card(title: string, html: string): string {
  const srcdoc = html.replace(/"/g, "&quot;");
  return `<div><h2>${title}</h2><div class="frame"><iframe srcdoc="${srcdoc}"></iframe></div></div>`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
