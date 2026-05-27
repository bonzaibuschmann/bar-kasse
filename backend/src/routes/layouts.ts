import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { broadcastConfig } from "../websocket";

const router = Router();

type LayoutItem = {
  itemType: string;
  productId?: number | null;
  inboundContainerId?: number | null;
  outboundContainerId?: number | null;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
};

// GET /api/layouts — public, returns all grid layouts
router.get("/", async (_req: Request, res: Response) => {
  try {
    const layouts = await prisma.gridLayout.findMany({
      orderBy: { id: "asc" },
    });
    res.json(layouts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/layouts — admin, bulk replace all layouts
router.put("/", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const items: LayoutItem[] = req.body;

    if (!Array.isArray(items)) {
      res.status(400).json({ error: "Expected array of layout items" });
      return;
    }

    // Validate item types
    const validTypes = ["Product", "Special"];
    for (const item of items) {
      if (!validTypes.includes(item.itemType)) {
        res.status(400).json({ error: `Invalid itemType: ${item.itemType}` });
        return;
      }
    }

    // Delete existing and recreate
    await prisma.$transaction(async (tx) => {
      await tx.gridLayout.deleteMany();
      if (items.length > 0) {
        await tx.gridLayout.createMany({
          data: items.map((item) => ({
            itemType: item.itemType,
            productId: item.itemType === "Product" ? item.productId : null,
            inboundContainerId: item.inboundContainerId ?? null,
            outboundContainerId: item.outboundContainerId ?? null,
            xPosition: item.xPosition ?? 0,
            yPosition: item.yPosition ?? 0,
            width: item.width ?? 1,
            height: item.height ?? 1,
          })),
        });
      }
    });

    broadcastConfig();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
