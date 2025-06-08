import Link from "next/link";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-gray-800 text-white px-6 py-3 flex space-x-4">
          <Link href="/" className="hover:underline">
            Send Notification
          </Link>
          <Link href="/logs" className="hover:underline">
            View Logs
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
