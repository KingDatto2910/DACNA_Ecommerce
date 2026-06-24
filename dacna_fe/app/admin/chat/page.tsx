"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Check, X, Send, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthToken } from "@/lib/auth-token";

interface ChatSession {
  id: number;
  user_id?: number;
  admin_id?: number;
  admin_name?: string;
  status: "pending" | "active" | "ended" | "rejected" | "closed";
  created_at: string;
  accepted_at?: string;
  ended_at?: string;
  expires_at?: string;
  end_reason?: string;
  unread_count?: number;
  guest_name?: string;
  guest_email?: string;
}

interface ChatMessage {
  id: number;
  sender_type: "user" | "admin" | "system";
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function AdminChatPage() {
  const [pendingRequests, setPendingRequests] = useState<ChatSession[]>([]);
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
    fetchActiveChats();

    const interval = setInterval(() => {
      fetchPendingRequests();
      fetchActiveChats();
      if (selectedSession) {
        fetchMessages(selectedSession.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedSession?.id]);

  const fetchPendingRequests = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch("http://localhost:5000/api/chat/admin/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPendingRequests(Array.isArray(data.requests) ? data.requests : []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const fetchActiveChats = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch("http://localhost:5000/api/chat/admin/active", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setActiveChats(Array.isArray(data.sessions) ? data.sessions : []);
      }
    } catch (error) {
      console.error("Error fetching active chats:", error);
    }
  };

  const fetchMessages = async (sessionId: number) => {
    try {
      const token = getAuthToken();
      const res = await fetch(
        `http://localhost:5000/api/chat/${sessionId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const acceptRequest = async (sessionId: number) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `http://localhost:5000/api/chat/admin/${sessionId}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchPendingRequests();
        fetchActiveChats();
        const acceptedSession = pendingRequests.find((s) => s.id === sessionId);
        if (acceptedSession) {
          setSelectedSession({ ...acceptedSession, status: "active" });
        }
      }
    } catch (error) {
      console.error("Error accepting request:", error);
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (sessionId: number) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `http://localhost:5000/api/chat/admin/${sessionId}/reject`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchPendingRequests();
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setLoading(false);
    }
  };

  const endChat = async (sessionId: number) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `http://localhost:5000/api/chat/admin/${sessionId}/end`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchActiveChats();
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error("Error ending chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession?.id) return;

    try {
      const token = getAuthToken();
      const res = await fetch(
        `http://localhost:5000/api/chat/${selectedSession.id}/messages`,
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
        fetchMessages(selectedSession.id);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const selectSession = (session: ChatSession) => {
    setSelectedSession(session);
    fetchMessages(session.id);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Customer Support Chat</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="col-span-1">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pending
                {pendingRequests.length > 0 && (
                  <Badge className="ml-2" variant="destructive">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active">
                Active
                {activeChats.length > 0 && (
                  <Badge className="ml-2">{activeChats.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {pendingRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No pending requests
                    </p>
                  ) : (
                    pendingRequests.map((session) => (
                      <Card
                        key={session.id}
                        className="p-4 cursor-pointer hover:bg-muted"
                        onClick={() => selectSession(session)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5" />
                            <div>
                              <p className="font-semibold">
                                User #{session.user_id}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Session #{session.id}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {new Date(session.created_at).toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptRequest(session.id);
                            }}
                            disabled={loading}
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectRequest(session.id);
                            }}
                            disabled={loading}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="active">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {activeChats.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active chats
                    </p>
                  ) : (
                    activeChats.map((session) => (
                      <Card
                        key={session.id}
                        className="p-4 cursor-pointer hover:bg-muted"
                        onClick={() => selectSession(session)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <UserCircle className="h-5 w-5" />
                          <div className="flex-1">
                            <p className="font-semibold">
                              User #{session.user_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Session #{session.id}
                            </p>
                          </div>
                          {session.unread_count! > 0 && (
                            <Badge variant="destructive">
                              {session.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Started:{" "}
                          {new Date(session.created_at).toLocaleTimeString()}
                        </p>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Chat Panel */}
        <div className="col-span-2">
          {!selectedSession ? (
            <Card className="h-[660px] flex items-center justify-center">
              <p className="text-muted-foreground">
                Select a chat to start messaging
              </p>
            </Card>
          ) : (
            <Card className="h-[660px] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-semibold">
                    {selectedSession.guest_name ||
                      `User #${selectedSession.user_id}`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.guest_email || ""}
                  </p>
                </div>
                {selectedSession.status === "active" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => endChat(selectedSession.id)}
                    disabled={loading}
                  >
                    End Chat
                  </Button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "admin"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender_type === "admin"
                            ? "bg-primary text-white"
                            : msg.sender_type === "system"
                            ? "bg-muted text-muted-foreground text-sm italic"
                            : "bg-gray-100"
                        }`}
                      >
                        {msg.sender_type !== "admin" && (
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
                </div>
              </div>

              {/* Input */}
              {selectedSession.status === "active" && (
                <div className="p-4 border-t flex gap-2 shrink-0">
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

              {selectedSession.status === "pending" && (
                <div className="p-4 border-t bg-muted text-center shrink-0">
                  <p className="text-sm text-muted-foreground">
                    Waiting for acceptance...
                  </p>
                </div>
              )}

              {['ended','closed'].includes(selectedSession.status) && (
                <div className="p-4 border-t bg-muted text-center shrink-0">
                  <p className="text-sm text-muted-foreground">Chat has ended</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
