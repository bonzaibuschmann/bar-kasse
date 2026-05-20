import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, requireAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// List all registers (public)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const registers = await prisma.register.findMany({ orderBy: { id: "asc" } });
    res.json(registers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create register (admin)
router.post("/", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, location } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const register = await prisma.register.create({
      data: { name, active: true },
    });
    res.status(201).json(register);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update register (admin)
router.put("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;
    const register = await prisma.register.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(register);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete register (admin)
router.delete("/:id", authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.register.delete({ where: { id: parseInt(id) } });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
