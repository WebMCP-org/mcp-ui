import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebMCP + Assistant UI Demo",
  description: "MCP-UI integration with assistant-ui and WebMCP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
