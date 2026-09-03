import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "業務管理",
  description: "個人用 SFA / CRM / 案件・タスク管理",
  applicationName: "業務管理"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
