// dacna/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/hooks/use-cart";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { ChatWidgetWrapper } from "@/components/chat-widget-wrapper";

export const metadata: Metadata = {
  title: "DACNA - Next.js",
  description: "A Next.js clean ecommerce app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased text-sm bg-muted-500`}
        suppressHydrationWarning
      >
        {/* (THAY ĐỔI) Bọc AuthProvider bên ngoài */}
        <AuthProvider>
          <CartProvider>
            {children}
            <ChatWidgetWrapper />
            <Toaster richColors position="top-center" />{" "}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
