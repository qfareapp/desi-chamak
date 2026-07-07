const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const connectToDatabase = require("./config/db");

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend");
  console.error(error);
  process.exit(1);
});
