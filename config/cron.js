const cron = require("node-cron");
const { cleanupExpiredDocs } = require("../components/cleanupExpireDocs");

async function processFileDeletions() {
  await cleanupExpiredDocs();
}

// Run cron job every 1 minute
cron.schedule("* * * * *", () => {
  processFileDeletions();
});

