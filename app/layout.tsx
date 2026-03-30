import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/organisms/Providers";

export const metadata: Metadata = {
  title: "Work Leave Tracker",
  description: "Track your holiday and leave allowances",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
