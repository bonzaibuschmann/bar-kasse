import { Request, Response, Router } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";

const router = Router();

// Get all products (public - cashiers need this)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true,
        deposit: true,
        depositFor: { where: { active: true } },
      },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get all products including inactive (admin only)
router.get("/all", authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        deposit: true,
        depositFor: { where: { active: true } },
      },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create product (admin only)
router.post("/", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, price, categoryId, isDeposit, active, order, depositId, volume } = req.body;
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
        order: order || 0,
        depositId: depositId ? parseInt(depositId) : null,
      },
      include: { category: true, deposit: true },
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update product (admin only)
router.put("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, categoryId, isDeposit, active, order, depositId, volume } = req.body;

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(volume !== undefined && { volume: volume !== null && volume !== "" ? parseFloat(volume) : null }),
        ...(categoryId !== undefined && { categoryId: parseInt(categoryId) }),
        ...(isDeposit !== undefined && { isDeposit }),
        ...(active !== undefined && { active }),
        ...(order !== undefined && { order }),
        ...(depositId !== undefined && { depositId: depositId ? parseInt(depositId) : null }),
      },
      include: { category: true, deposit: true },
    });

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete product (admin only)
router.delete("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
