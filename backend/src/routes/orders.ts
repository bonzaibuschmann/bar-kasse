import { Request, Response, Router } from "express";
import { prisma } from "../index";

const router = Router();

interface CartItem {
  productId: number;
  quantity: number;
  isDeposit: boolean;
  depositFor: number | null;
}

// Create order (public - cashiers need this)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { items, cashGiven, registerId, note, customerType }: {
      items: CartItem[];
      cashGiven?: number;
      registerId?: number;
      note?: string;
      customerType?: string;
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ error: "Items required" });
      return;
    }

    // Fetch product prices for validation
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let total = 0;
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const unitPrice = product.price;
      total += unitPrice * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        isDeposit: item.isDeposit,
        depositFor: item.depositFor,
      };
    });

    total = Math.round(total * 100) / 100;

    const cash = cashGiven !== undefined ? parseFloat(String(cashGiven)) : null;
    const change = cash !== null ? Math.round((cash - total) * 100) / 100 : null;

    const order = await prisma.order.create({
      data: {
        total,
        cashGiven: cash,
        changeDue: change,
        registerId: registerId || null,
        note: note || null,
        customerType: customerType || "Guest",
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: true } },
        register: true,
      },
    });

    res.status(201).json(order);
  } catch (err: any) {
    console.error("Order error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// Get recent orders (admin only — for dashboard)
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
        register: true,
      },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get orders with cursor-based pagination (for history dialog infinite scroll)
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before ? parseInt(req.query.before as string) : undefined;

    const orders = await prisma.order.findMany({
      take: limit + 1, // fetch one extra to detect hasMore
      ...(before ? { where: { id: { lt: before } } } : {}),
      orderBy: { id: "desc" },
      include: {
        items: {
          include: { product: true },
          orderBy: { id: "asc" },
        },
        register: true,
      },
    });

    const hasMore = orders.length > limit;
    if (hasMore) orders.pop();

    res.json({ orders, hasMore });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get orders by date range (admin)
router.get("/range", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      res.status(400).json({ error: "from and to query params required (ISO date)" });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(from as string),
          lte: new Date(to as string),
        },
      },
      include: {
        items: { include: { product: true } },
        register: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
