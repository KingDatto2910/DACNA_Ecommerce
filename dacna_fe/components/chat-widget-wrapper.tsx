"use client";
import { usePathname } from "next/navigation";
import { ChatWidget } from "@/components/chat-widget";

export function ChatWidgetWrapper() {
  const pathname = usePathname();
  // Hide chat widget on admin routes
  if (pathname?.startsWith("/admin")) return null;
  return <ChatWidget />;
}
