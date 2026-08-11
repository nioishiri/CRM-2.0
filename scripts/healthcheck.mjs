// Healthcheck script for Docker
const url = 'http://localhost:3000/api/health';

fetch(url)
  .then((res) => {
    if (res.ok) {
      process.exit(0);
    } else {
      console.error(`Healthcheck failed: HTTP ${res.status}`);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error(`Healthcheck error: ${err.message}`);
    process.exit(1);
  });