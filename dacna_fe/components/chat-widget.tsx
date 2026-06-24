"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { io, Socket } from "socket.io-client";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChatSession {
  id: number;
  status: "pending" | "active" | "ended" | "rejected";
  admin_name?: string;
  created_at: string;
  expires_at?: string;
  end_reason?: string;
}

interface ChatMessage {
  id: number;
  sender_type: "user" | "admin" | "system";
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export function ChatWidget() {
  const [mounted, setMounted] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showStart, setShowStart] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mount guard to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const el = document.createElement("div");
    el.id = "chat-widget-root";
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      el.remove();
    };
  }, []);

  // Check for active session and poll messages
  useEffect(() => {
    checkSession();
    const interval = setInterval(() => {
      checkSession();
      if (session?.id) {
        fetchMessages();
      }
    }, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [session?.id]);

  // Initialize socket
  useEffect(() => {
    const s = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnection: true,
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  // Join session room & handle incoming events
  useEffect(() => {
    if (socket && session?.id) {
      socket.emit("join_session", session.id);
    }
  }, [socket, session?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.sender_type === "admin") {
        setUnreadCount((c) => c + 1);
      }
    };
    const onSessionUpdate = (payload: any) => {
      if (payload?.session && payload.session.id === session?.id) {
        setSession(payload.session);
      }
    };
    socket.on("message", onMessage);
    socket.on("session_update", onSessionUpdate);
    return () => {
      socket.off("message", onMessage);
      socket.off("session_update", onSessionUpdate);
    };
  }, [socket, session?.id, session]);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      if (!token) return;

      const res = await fetch("http://localhost:5000/api/chat/my-session", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const sessionObj = data.session
          ? data.session
          : data.ok && data.session === undefined
          ? null
          : data;
        if (sessionObj && (sessionObj.status || sessionObj.id)) {
          setSession(sessionObj);
        } else {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  };

  const fetchMessages = async () => {
    if (!session?.id) return;

    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(
        `http://localhost:5000/api/chat/${session.id}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const msgs = Array.isArray(data)
          ? data
          : Array.isArray(data.messages)
          ? data.messages
          : [];
        setMessages(msgs);
        const unread = msgs.filter(
          (m: ChatMessage) => !m.is_read && m.sender_type === "admin"
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const requestChat = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        alert("Please log in to start a chat.");
        setLoading(false);
        return;
      }
      const res = await fetch("http://localhost:5000/api/chat/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setShowStart(false);
      } else {
        alert(data.message || "Failed to request chat");
      }
    } catch (e) {
      console.error("Chat request error", e);
      alert("Error requesting chat");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !session?.id) return;

    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(
        `http://localhost:5000/api/chat/${session.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: newMessage }),
        }
      );

      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!session) setShowStart(true);
    setUnreadCount(0);
  };

  if (!mounted || !portalEl) return null; // Avoid SSR/client mismatch
  return createPortal(
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 rounded-full">
              {unreadCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-h-[600px] bg-white border rounded-lg shadow-xl flex flex-col z-50">
          {/* Header */}
          <div className="bg-primary text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Customer Support</h3>
              {session?.status === "active" && session.admin_name && (
                <p className="text-xs opacity-90">with {session.admin_name}</p>
              )}
              {session?.status === "pending" && (
                <p className="text-xs opacity-90">Waiting for agent...</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Request Form */}
          {showStart && !session && (
            <div className="flex-1 p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Start a chat with our support team
              </p>
              <Button
                onClick={requestChat}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Starting...
                  </>
                ) : (
                  "Start Chat"
                )}
              </Button>
            </div>
          )}

          {/* Messages */}
          {session && (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender_type === "user"
                            ? "bg-primary text-white"
                            : msg.sender_type === "system"
                            ? "bg-muted text-muted-foreground text-sm italic"
                            : "bg-gray-100"
                        }`}
                      >
                        {msg.sender_type !== "user" && (
                          <p className="text-xs font-semibold mb-1">
                            {msg.sender_name}
                          </p>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              {session.status === "active" && (
                <div className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <Button onClick={sendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {session.status === "ended" && (
                <div className="p-4 border-t bg-muted text-center">
                  <p className="text-sm text-muted-foreground">
                    Chat has ended
                  </p>
                </div>
              )}

              {session.status === "rejected" && (
                <div className="p-4 border-t bg-muted text-center">
                  <p className="text-sm text-muted-foreground">
                    Chat request was declined
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>,
    portalEl
  );
}
