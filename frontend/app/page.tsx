"use client";
import { useState } from "react";
import axios from "axios";

const CHANNELS = ["email", "sms", "in-app"];

export default function Home() {
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState("email");
  const [message, setMessage] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const payload: any = { to, channel, message };
      if (sendAt) payload.sendAt = sendAt;
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/notify`,
        payload
      );
      setResult(JSON.stringify(res.data));
    } catch (err: any) {
      setResult(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Send Notification</h1>
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block font-semibold">To</label>
          <input
            className="border px-2 py-1 rounded w-full"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            placeholder="Email, phone, or user ID"
          />
        </div>
        <div>
          <label className="block font-semibold">Channel</label>
          <select
            className="border px-2 py-1 rounded w-full"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold">Message</label>
          <textarea
            className="border px-2 py-1 rounded w-full"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={3}
          />
        </div>
        <div>
          <label className="block font-semibold">
            Schedule (optional, ISO8601)
          </label>
          <input
            className="border px-2 py-1 rounded w-full"
            type="datetime-local"
            value={sendAt}
            onChange={(e) => setSendAt(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Notification"}
        </button>
      </form>
      {result && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-sm">
          <strong>Result:</strong> {result}
        </div>
      )}
    </div>
  );
}
