import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppLayout } from "@/components/layout";

export const metadata: Metadata = {
  title: "Secure Binary - Network Marketing Dashboard",
  description: "Premium MLM network marketing platform with real-time earnings tracking, team management, and advanced analytics.",
  keywords: ["MLM", "network marketing", "dashboard", "earnings", "team management"],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
