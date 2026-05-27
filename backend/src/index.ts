import express from "express";
import cors from "cors";
import http from "http";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import orderRoutes from "./routes/orders";
import dashboardRoutes from "./routes/dashboard";
import registerRoutes from "./routes/registers";
import staffRoutes from "./routes/staff";
import layoutRoutes from "./routes/layouts";
import containerRoutes from "./routes/containers";
import { initWebSocket } from "./websocket";

export const prisma = new PrismaClient();

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/registers", registerRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/layouts", layoutRoutes);
app.use("/api/containers", containerRoutes);

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
