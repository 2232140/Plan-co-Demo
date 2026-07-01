import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

const font = M_PLUS_Rounded_1c({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plan-co | 遊びの予定を楽しく決めよう",
  description: "友達や恋人と遊びに行く予定を、ルーレットやAIでスムーズに決めよう！",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={font.className}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
