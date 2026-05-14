import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EliteDrive – Payment",
  description: "Auto Dealer Fleet Management – eSewa Payment",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
