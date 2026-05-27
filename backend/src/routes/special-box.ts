import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { broadcastConfig } from "../websocket";

const router = Router();

// GET /api/special-box — public
router.get("/", async (_req: Request, res: Response) => {
  try {
    const box = await prisma.specialBox.findFirst();
    if (!box) {
      // Auto-create if missing
      const created = await prisma.specialBox.create({
        data: { name: "Special", price: 5, color: "#b45309" },
      });
      return res.json(created);
    }
    res.json(box);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/special-box — admin
router.put("/", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    let box = await prisma.specialBox.findFirst();
    const { name, price, color, icon, image } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = price;
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon;
    if (image !== undefined) data.image = image;

    if (box) {
      box = await prisma.specialBox.update({ where: { id: box.id }, data });
    } else {
      box = await prisma.specialBox.create({ data: { name: name ?? "Special", price: price ?? 5, color: color ?? "#b45309", ...data } });
    }
    broadcastConfig();
    res.json(box);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
