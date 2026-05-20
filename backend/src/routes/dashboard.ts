import { Request, Response, Router } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";

const router = Router();

// All dashboard routes require admin auth
router.use(authMiddleware, requireAdmin);

// Summary stats
router.get("/summary", async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      avgOrderValue,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: today } },
      }),
      prisma.order.aggregate({ _avg: { total: true } }),
    ]);

    // Revenue by register
    const registers = await prisma.order.groupBy({
      by: ["register"],
      _sum: { total: true },
      _count: true,
    });

    // Top products
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      _count: true,
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const topProductIds = topProducts.map((tp) => tp.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
    });
    const productMap = new Map(topProductDetails.map((p) => [p.id, p]));

    const topProductsWithName = topProducts.map((tp) => ({
      product: productMap.get(tp.productId),
      totalQuantity: tp._sum.quantity,
      orderCount: tp._count,
    }));

    // Hourly breakdown today
    const todayOrdersList = await prisma.order.findMany({
      where: { createdAt: { gte: today } },
      select: { createdAt: true, total: true, register: true },
    });

    const hourlyData: Record<number, { count: number; revenue: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourlyData[h] = { count: 0, revenue: 0 };
    }
    todayOrdersList.forEach((o) => {
      const hour = o.createdAt.getHours();
      hourlyData[hour].count++;
      hourlyData[hour].revenue += o.total;
    });

    res.json({
      totalOrders,
      todayOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      todayRevenue: todayRevenue._sum.total || 0,
      avgOrderValue: avgOrderValue._avg.total || 0,
      registers: registers.map((r) => ({
        register: r.register,
        revenue: r._sum.total || 0,
        orderCount: r._count,
      })),
      topProducts: topProductsWithName,
      hourlyData,
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Revenue over time (last N days)
router.get("/revenue-timeline", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, total: true },
    });

    const dailyData: Record<string, { revenue: number; count: number }> = {};
    orders.forEach((o) => {
      const day = o.createdAt.toISOString().split("T")[0];
      if (!dailyData[day]) dailyData[day] = { revenue: 0, count: 0 };
      dailyData[day].revenue += o.total;
      dailyData[day].count++;
    });

    res.json(dailyData);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
