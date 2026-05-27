import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { broadcastConfig } from "../websocket";

const router = Router();

// Get all staff groups with members
router.get("/", async (_req: Request, res: Response) => {
  try {
    const groups = await prisma.staffGroup.findMany({
      orderBy: { order: "asc" },
      include: { members: { orderBy: { order: "asc" } } },
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create staff group
router.post("/groups", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, order } = req.body;
    if (!name) { res.status(400).json({ error: "Name required" }); return; }
    const group = await prisma.staffGroup.create({ data: { name, order: order || 0 } });
    res.status(201).json(group);
    broadcastConfig();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// Update staff group
router.put("/groups/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, order } = req.body;
    const group = await prisma.staffGroup.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(name && { name }), ...(order !== undefined && { order }) },
    });
    res.json(group);
    broadcastConfig();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// Delete staff group (cascades members)
router.delete("/groups/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.staffGroup.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
    broadcastConfig();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// Create staff member
router.post("/members", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, order, groupId } = req.body;
    if (!name || !groupId) { res.status(400).json({ error: "Name and groupId required" }); return; }
    const member = await prisma.staffMember.create({ data: { name, order: order || 0, groupId } });
    res.status(201).json(member);
    broadcastConfig();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// Update staff member
router.put("/members/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, order, groupId } = req.body;
    const member = await prisma.staffMember.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(name && { name }), ...(order !== undefined && { order }), ...(groupId && { groupId }) },
    });
    res.json(member);
    broadcastConfig();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// Delete staff member
router.delete("/members/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.staffMember.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
    broadcastConfig();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

export default router;
