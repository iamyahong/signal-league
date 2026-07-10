import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";

const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
const baseUrl = domains ? `https://${domains}` : "http://localhost:26139";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Signal League — 예측력 리그 플랫폼",
  description:
    "사회·경제·국제정세·기술 이슈에 대한 당신의 판단을 점수와 랭킹으로 기록하는 구독형 예측력 플랫폼입니다.",
  keywords: ["예측", "리그", "랭킹", "경제", "사회", "국제정세"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Signal League",
    description: "세상의 흐름을 먼저 읽는 사람들의 예측 리그",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
