import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartOne | CRM & ERP",
  description: "پلتفرم یکپارچه و قابل سفارشی‌سازی CRM و ERP اسمارت‌سینک",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
