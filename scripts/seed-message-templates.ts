import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { seedMessageTemplatesIntoDb } = await import(
    "../modules/messaging/seed-templates"
  );
  await seedMessageTemplatesIntoDb();
  console.log("Message templates seeded (AWB dispatch copy included).");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
