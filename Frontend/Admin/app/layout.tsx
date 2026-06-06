import type { Metadata } from "next";
import "./globals.css";
import { AuthProviders } from "@/components/auth/auth-providers";

export const metadata: Metadata = {
  title: "Secure Binary - Admin",
  description: "FMCG Binary MLM Admin Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProviders>{children}</AuthProviders>
      </body>
    </html>
  );
}
