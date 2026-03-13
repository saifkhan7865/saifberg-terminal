import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saifberg Terminal",
  description: "Bloomberg-style financial terminal — live quotes, AI analysis, earnings calendar, options flow, and more.",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
