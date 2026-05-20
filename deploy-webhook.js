// Simple GitHub webhook listener for auto-deploy
// Receives push events on master branch, pulls code, and rebuilds prod containers

const http = require("http");
const crypto = require("crypto");
const { execSync } = require("child_process");

const PORT = 9000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "webhook-secret-change-me";
const REPO_PATH = process.env.REPO_PATH || "/opt/bar-kasse";

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    // Verify signature
    const signature = req.headers["x-hub-signature-256"];
    if (signature) {
      const expected = "sha256=" + crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
      if (signature !== expected) {
        console.log("Invalid signature, rejecting");
        res.writeHead(403);
        res.end("Invalid signature");
        return;
      }
    }

    try {
      const payload = JSON.parse(body);
      const ref = payload.ref;
      const branch = ref?.replace("refs/heads/", "");

      console.log(`Received push to branch: ${branch}`);

      if (branch === "master") {
        console.log("Master branch push detected — deploying...");

        // Pull latest and rebuild prod
        try {
          console.log("Pulling latest code...");
          execSync(`cd ${REPO_PATH} && git pull origin master`, { stdio: "inherit" });

          console.log("Rebuilding production containers...");
          execSync(`cd ${REPO_PATH} && docker compose build backend-prod frontend-prod`, { stdio: "inherit" });

          console.log("Restarting production containers...");
          execSync(`cd ${REPO_PATH} && docker compose up -d backend-prod frontend-prod`, { stdio: "inherit" });

          console.log("✓ Deployment complete!");
        } catch (err) {
          console.error("Deployment failed:", err.message);
        }
      }

      res.writeHead(200);
      res.end("OK");
    } catch (err) {
      console.error("Error processing webhook:", err.message);
      res.writeHead(500);
      res.end("Error");
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Webhook listener running on port ${PORT}`);
});
