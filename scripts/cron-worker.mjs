// Cron worker for CRM MVP
// Runs in a separate container, periodically calls /api/cron/run

const TARGET = process.env.CRON_TARGET_URL || 'http://app:3000/api/cron/run';
const SECRET = process.env.CRON_SECRET || 'change_me_cron_secret';
const INTERVAL = parseInt(process.env.CRON_INTERVAL_SECONDS || '300', 10) * 1000;

async function run() {
  console.log(`[cron] Starting worker, target: ${TARGET}, interval: ${INTERVAL / 1000}s`);

  // Initial delay to let app start
  await sleep(15000);

  while (true) {
    try {
      console.log(`[cron] Calling ${TARGET}...`);
      const response = await fetch(TARGET, {
        method: 'GET',
        headers: {
          'x-cron-secret': SECRET,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[cron] OK:`, JSON.stringify(data));
      } else {
        console.log(`[cron] Error: HTTP ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`[cron] Body: ${text.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`[cron] Fetch error:`, error instanceof Error ? error.message : String(error));
    }

    await sleep(INTERVAL);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run().catch(console.error);