import { Request, Response, Router } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { broadcastConfig } from "../websocket";

const router = Router();

// Get all products (public - cashiers need this)
router.get("/", async (_req: Request, res: Response) => {
  try {
    // Use raw SQL to bypass stale Prisma client
    const products: any[] = await prisma.$queryRawUnsafe(`
      SELECT p.*, c.name as "categoryName", c.order as "categoryOrder",
             d.id as "depositId2", d.name as "depositName", d.price as "depositPrice",
             dc.id as "dcId", dc.name as "dcName", dc.deposit as "dcDeposit"
      FROM "Product" p
      JOIN "Category" c ON p."categoryId" = c.id
      LEFT JOIN "Product" d ON p."depositId" = d.id
      LEFT JOIN "Container" dc ON p."defaultContainerId" = dc.id
      WHERE p."active" = true
      ORDER BY c."order", p."order"
    `);

    const result = products.map((p: any) => ({
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

    res.json(result);
  } catch (err: any) {
    console.error("Products query error:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// Get all products including inactive (admin only)
router.get("/all", authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const products: any[] = await prisma.$queryRawUnsafe(`
      SELECT p.*, c.name as "categoryName", c.order as "categoryOrder",
             d.id as "depositId2", d.name as "depositName", d.price as "depositPrice",
             dc.id as "dcId", dc.name as "dcName", dc.deposit as "dcDeposit"
      FROM "Product" p
      JOIN "Category" c ON p."categoryId" = c.id
      LEFT JOIN "Product" d ON p."depositId" = d.id
      LEFT JOIN "Container" dc ON p."defaultContainerId" = dc.id
      ORDER BY c."order", p."order"
    `);

    const result = products.map((p: any) => ({
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

    res.json(result);
  } catch (err: any) {
    console.error("Products all query error:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// Create product (admin only)
router.post("/", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, price, categoryId, isDeposit, active, display, order, depositId, volume, color, image, defaultContainerId } = req.body;
    if (!name || price === undefined || !categoryId) {
      res.status(400).json({ error: "Name, price, and categoryId required" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        volume: volume !== undefined && volume !== null && volume !== "" ? parseFloat(volume) : null,
        categoryId: parseInt(categoryId),
        isDeposit: isDeposit || false,
        active: active !== false,
        display: display !== false,
        order: order || 0,
        depositId: depositId ? parseInt(depositId) : null,
        color: color || null,
        image: image || null,
        defaultContainerId: defaultContainerId ? parseInt(defaultContainerId) : null,
      },
    });

    res.status(201).json(product);
    broadcastConfig();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update product (admin only)
router.put("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, categoryId, isDeposit, active, display, order, depositId, volume, color, image, defaultContainerId } = req.body;

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(volume !== undefined && { volume: volume !== null && volume !== "" ? parseFloat(volume) : null }),
        ...(categoryId !== undefined && { categoryId: parseInt(categoryId) }),
        ...(isDeposit !== undefined && { isDeposit }),
        ...(active !== undefined && { active }),
        ...(display !== undefined && { display }),
        ...(order !== undefined && { order }),
        ...(depositId !== undefined && { depositId: depositId ? parseInt(depositId) : null }),
        ...(color !== undefined && { color }),
        ...(image !== undefined && { image }),
        ...(defaultContainerId !== undefined && { defaultContainerId: defaultContainerId ? parseInt(defaultContainerId) : null }),
      },
    });

    res.json(product);
    broadcastConfig();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete product (admin only)
router.delete("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);

    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { productId } }),
      prisma.gridLayout.deleteMany({ where: { productId } }),
      prisma.product.updateMany({ where: { depositId: productId }, data: { depositId: null } }),
      prisma.product.delete({ where: { id: productId } }),
    ]);

    res.json({ message: "Product deleted" });
    broadcastConfig();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
