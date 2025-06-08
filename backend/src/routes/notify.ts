import express from "express";
import { body, validationResult } from "express-validator";
import { notificationQueue } from "../queue/notificationQueue";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.post(
  "/",
  [
    body("to").isString().notEmpty(),
    body("channel").isIn(["email", "sms", "in-app"]),
    body("message").isString().notEmpty(),
    body("sendAt").optional().isISO8601(),
  ],
  async (req: express.Request, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { to, channel, message, sendAt } = req.body;

    if (sendAt) {
      await prisma.scheduledNotification.create({
        data: {
          to,
          channel,
          message,
          sendAt: new Date(sendAt),
        },
      });
      res.status(202).json({ status: "scheduled", sendAt });
    } else {
      await notificationQueue.add(
        "send",
        { to, channel, message },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 10000,
          },
        }
      );
      res.status(202).json({ status: "queued" });
    }
  }
);


export default router;
