import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "다음 휘슬까지 | 월드컵 감독 시뮬레이션";
const description =
  "화면상 180초, 실제 최대 60초 안에 가장 중요한 전술부터 전달하는 월드컵 감독 시뮬레이션.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      images: [{ url: imageUrl, width: 1731, height: 909, alt: "다음 휘슬까지" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
