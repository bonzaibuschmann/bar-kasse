import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { prisma } from "./index";

const clients = new Set<WebSocket>();
let wss: WebSocketServer | null = null;

export function initWebSocket(server: import("http").Server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: import("stream").Duplex, head: Buffer) => {
    if (req.url === "/ws/config") {
      wss!.handleUpgrade(req, socket, head, (ws) => {
        wss!.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));

    // Send current config immediately on connect
    sendConfigTo(ws);
  });

  // Heartbeat every 5 seconds — keeps clients aware of connection health
  const heartbeat = setInterval(() => {
    const ping = JSON.stringify({ type: "heartbeat" });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(ping);
      }
    }
  }, 5000);

  // Clean up heartbeat on server close
  wss.on("close", () => clearInterval(heartbeat));
}

async function sendConfigTo(ws: WebSocket) {
  try {
    const payload = await buildConfigPayload();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch {
    // ignore — client will get data on next broadcast
  }
}

async function buildConfigPayload() {
  const [categories, productsRaw, registers, staffGroups, layoutsRaw, containers] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        products: {
          orderBy: { order: "asc" },
          include: { deposit: true, defaultContainer: true },
        },
      },
    }),
    // Use raw SQL for products to bypass stale Prisma client
    prisma.$queryRawUnsafe(`
      SELECT p.*, c.name as "categoryName", c.order as "categoryOrder",
             d.id as "depositId2", d.name as "depositName", d.price as "depositPrice",
             dc.id as "dcId", dc.name as "dcName", dc.deposit as "dcDeposit"
      FROM "Product" p
      JOIN "Category" c ON p."categoryId" = c.id
      LEFT JOIN "Product" d ON p."depositId" = d.id
      LEFT JOIN "Container" dc ON p."defaultContainerId" = dc.id
      ORDER BY c."order", p."order"
    `) as Promise<any[]>,
    prisma.register.findMany({ orderBy: { id: "asc" } }),
    prisma.staffGroup.findMany({
      orderBy: { order: "asc" },
      include: { members: { orderBy: { order: "asc" } } },
    }),
    prisma.$queryRawUnsafe(`SELECT * FROM "GridLayout"`) as Promise<any[]>,
    prisma.$queryRawUnsafe(`SELECT * FROM "Container" ORDER BY name`) as Promise<any[]>,
  ]);

  const products = (productsRaw as any[]).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    volume: p.volume,
    categoryId: p.categoryId,
    isDeposit: p.isDeposit,
    active: p.active,
    display: p.display,
    order: p.order,
    color: p.color,
    image: p.image,
    depositId: p.depositId,
    defaultContainerId: p.defaultContainerId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    category: { id: p.categoryId, name: p.categoryName, order: p.categoryOrder },
    deposit: p.depositId ? { id: p.depositId, name: p.depositName, price: p.depositPrice } : null,
    defaultContainer: p.defaultContainerId ? { id: p.dcId, name: p.dcName, deposit: p.dcDeposit } : null,
    depositFor: [],
  }));

  return {
    type: "config-update",
    categories,
    products,
    registers,
    staffGroups,
    layouts: layoutsRaw,
    containers,
  };
}

/** Call this after any config mutation (product/category/register CRUD) */
export async function broadcastConfig() {
  if (clients.size === 0) return;
  try {
    const payload = await buildConfigPayload();
    const data = JSON.stringify(payload);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  } catch (err) {
    console.error("WebSocket broadcast error:", err);
  }
}
