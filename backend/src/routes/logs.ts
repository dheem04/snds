import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // Show last 100 logs
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;
