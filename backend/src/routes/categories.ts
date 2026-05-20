import { Request, Response, Router } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";

const router = Router();

// Get all categories (public - cashiers need this)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        products: {
          where: { active: true },
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
    const { name, icon, order } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name required" });
      return;
    }

    const category = await prisma.category.create({
      data: { name, order: order || 0 },
    });

    res.status(201).json(category);
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
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete category (admin only)
router.delete("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
