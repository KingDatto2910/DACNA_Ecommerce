"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/breadcrumbs";
import {
  Loader2,
  Mail,
  Clock,
  CheckCircle2,
  Archive,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5000";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: "new" | "read" | "archived";
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
}

export default function UserSupportPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        toast.error("Please login to view your messages");
        router.push("/login");
        return;
      }

      console.log("🔄 Fetching messages...");
      const res = await fetch(`${API_URL}/api/contact/my-messages`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📊 Response status:", res.status);
      const data = (await res.json()) as {
        ok?: boolean;
        messages?: ContactMessage[];
        message?: string;
      };
      console.log("📨 API Response:", data);

      if (!res.ok) {
        console.error("❌ API Error:", data);
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      if (data.ok) {
        const messagesList = data.messages || [];
        console.log("✅ Messages loaded:", messagesList.length, "messages");
        setMessages(messagesList);

        if (messagesList.length === 0) {
          toast.info("No messages found. Send your first message!");
        }
      } else {
        throw new Error(data.message || "Failed to fetch messages");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load messages";
      console.error("❌ Fetch error:", error);
      toast.error(errorMessage);
      setMessages([]); // Clear messages on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Mail className="h-3 w-3 mr-1" />
            New
          </Badge>
        );
      case "read":
        return (
          <Badge variant="secondary">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Read
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline">
            <Archive className="h-3 w-3 mr-1" />
            Archived
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Messages</h1>
          <p className="text-muted-foreground">
            View your contact history and replies
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/home")} variant="outline">
            Back to Home
          </Button>
          <Button onClick={() => router.push("/contact")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
          <CardDescription>
            Total: {messages.length} message{messages.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No messages found</p>
              <Button onClick={() => router.push("/contact")} variant="outline">
                Send your first message
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <Card key={msg.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {msg.subject && (
                            <h3 className="font-semibold text-lg">
                              {msg.subject}
                            </h3>
                          )}
                          {getStatusBadge(msg.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Sent: {formatDate(msg.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Your Message:
                        </p>
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded">
                          {msg.message}
                        </p>
                      </div>

                      {msg.admin_reply && (
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              Admin Reply:
                            </p>
                          </div>
                          <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                            {msg.admin_reply}
                          </p>
                          {msg.replied_at && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              Replied: {formatDate(msg.replied_at)}
                            </p>
                          )}
                        </div>
                      )}

                      {!msg.admin_reply && msg.status === "new" && (
                        <p className="text-xs text-muted-foreground italic">
                          Waiting for admin response...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
