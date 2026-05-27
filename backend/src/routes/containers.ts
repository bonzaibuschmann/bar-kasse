import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { broadcastConfig } from "../websocket";

const router = Router();

// GET /api/containers — public
router.get("/", async (_req: Request, res: Response) => {
  try {
    const containers: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Container" ORDER BY name`);
    res.json(containers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/containers — admin
router.post("/", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, deposit, image, inboundColor, inboundIcon, outboundColor, outboundIcon } = req.body;
    const container = await prisma.container.create({
      data: { name, deposit: deposit ?? 0, image: image || null, inboundColor: inboundColor || null, inboundIcon: inboundIcon || null, outboundColor: outboundColor || null, outboundIcon: outboundIcon || null },
    });
    broadcastConfig();
    res.json(container);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/containers/:id — admin
router.put("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, deposit, image, inboundColor, inboundIcon, outboundColor, outboundIcon } = req.body;
    const container = await prisma.container.update({
      where: { id },
      data: { name, deposit, image, inboundColor, inboundIcon, outboundColor, outboundIcon },
    });
    broadcastConfig();
    res.json(container);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/containers/:id — admin
router.delete("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { defaultContainerId: id },
        data: { defaultContainerId: null },
      });
      await tx.container.delete({ where: { id } });
    });
    broadcastConfig();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
