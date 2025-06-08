import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSMS(to: string, message: string) {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE,
    to, // Must be a verified number in trial mode
  });
}
