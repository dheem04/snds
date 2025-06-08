import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

// Minimal OpenAPI spec for your notification API
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Dheenotifications API",
    version: "1.0.0",
    description: "API for sending notifications via Email, SMS, and In-App channels."
  },
  paths: {
    "/api/notify": {
      post: {
        summary: "Send or schedule a notification",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  to: { type: "string" },
                  channel: { type: "string", enum: ["email", "sms", "in-app"] },
                  message: { type: "string" },
                  sendAt: {
                    type: "string",
                    format: "date-time",
                    description: "Optional. ISO8601 string to schedule the message.",
                  },
                },
                required: ["to", "channel", "message"]
              }
            }
          }
        },
        responses: {
          202: { description: "Notification successfully queued or scheduled" },
          400: { description: "Validation error" }
        }
      }
    },
    "/api/logs": {
      get: {
        summary: "Get notification logs",
        responses: {
          200: {
            description: "List of recent notification logs",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      to: { type: "string" },
                      channel: { type: "string" },
                      message: { type: "string" },
                      status: { type: "string" },
                      error: { type: "string", nullable: true },
                      createdAt: { type: "string", format: "date-time" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export default Router().use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
