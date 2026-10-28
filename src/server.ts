import { createApp } from "./app.js";
import { getDb } from "./config/database.js";
import { ENV } from "./config/env.js";

async function bootstrap() {
  try {
    // 1. Initialize SQLite Database & seed initial tables
    await getDb();

    // 2. Create Express application
    const app = createApp();

    // 3. Listen on configured port
    app.listen(ENV.PORT, "0.0.0.0", () => {
      console.log(`LOKA Server running on http://localhost:${ENV.PORT}`);
      console.log(`Health Check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`API Docs / Templates: http://localhost:${ENV.PORT}/api/templates`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

bootstrap();
