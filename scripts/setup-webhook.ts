const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

async function setup() {
  if (!TOKEN || !WEBHOOK_URL) {
    console.error("❌ Need TELEGRAM_BOT_TOKEN and WEBHOOK_URL env vars");
    process.exit(1);
  }

  const fullUrl = `${WEBHOOK_URL}/api/telegram/webhook`;
  const res = await fetch(
    `https://api.telegram.org/bot${TOKEN}/setWebhook?url=${fullUrl}`,
    { method: "POST" }
  );

  const data = await res.json();
  console.log("Webhook setup:", JSON.stringify(data, null, 2));

  const info = await fetch(
    `https://api.telegram.org/bot${TOKEN}/getWebhookInfo`
  );
  const infoData = await info.json();
  console.log("Webhook info:", JSON.stringify(infoData, null, 2));
}

setup().catch(console.error);
