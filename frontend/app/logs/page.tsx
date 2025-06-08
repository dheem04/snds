"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/logs`)
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Notification Logs</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">To</th>
                <th className="border px-2 py-1">Channel</th>
                <th className="border px-2 py-1">Message</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Error</th>
                <th className="border px-2 py-1">Created At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="border px-2 py-1">{log.id}</td>
                  <td className="border px-2 py-1">{log.to}</td>
                  <td className="border px-2 py-1">{log.channel}</td>
                  <td className="border px-2 py-1">{log.message}</td>
                  <td className="border px-2 py-1">
                    <span
                      className={
                        log.status === "success"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="border px-2 py-1">
                    {log.error ? (
                      <span className="text-red-700">{log.error}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border px-2 py-1">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
