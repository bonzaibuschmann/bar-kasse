import { Request, Response, Router } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { broadcastConfig } from "../websocket";

const router = Router();

// Get all categories (public - cashiers need this)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        products: {
          orderBy: { order: "asc" },
          include: { deposit: true },
        },
      },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create category (admin only)
router.post("/", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, order } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name required" });
      return;
    }

    const category = await prisma.category.create({
      data: { name, order: order || 0 },
    });

    res.status(201).json(category);
    broadcastConfig();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update category (admin only)
router.put("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, order } = req.body;

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(order !== undefined && { order }),
      },
    });

    res.json(category);
    broadcastConfig();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete category (admin only)
router.delete("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    // Get all product IDs in this category
    const products = await prisma.product.findMany({
      where: { categoryId },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    // Clean up all related records, then delete the category
    await prisma.$transaction(async (tx) => {
      if (productIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { productId: { in: productIds } } });
        await tx.gridLayout.deleteMany({ where: { productId: { in: productIds } } });
        await tx.product.updateMany({ where: { depositId: { in: productIds } }, data: { depositId: null } });
        await tx.product.deleteMany({ where: { categoryId } });
      }
      await tx.category.delete({ where: { id: categoryId } });
    });

    res.json({ message: "Category deleted" });
    broadcastConfig();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
