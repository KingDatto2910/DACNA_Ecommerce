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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Loader2, Mail, Clock, CheckCircle2, Archive } from "lucide-react";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/auth-token";

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

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(
    null
  );
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [statusFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const url =
        statusFilter === "all"
          ? `${API_URL}/api/contact/admin/messages?sort_by=created_at&sort_dir=DESC`
          : `${API_URL}/api/contact/admin/messages?status=${statusFilter}&sort_by=created_at&sort_dir=DESC`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.ok) {
        setMessages(data.messages || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      setIsReplying(true);
      const token = getAuthToken();
      const res = await fetch(
        `${API_URL}/api/contact/admin/messages/${selectedMessage.id}/reply`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reply: replyText }),
        }
      );

      const data = await res.json();
      if (!data.ok) throw new Error(data.message);

      toast.success("Reply saved successfully");
      setSelectedMessage(null);
      setReplyText("");
      fetchMessages();
    } catch (error: any) {
      toast.error(error.message || "Failed to save reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_URL}/api/contact/admin/messages/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await res.json();
      if (!data.ok) throw new Error(data.message);

      toast.success("Status updated");
      fetchMessages();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Support Messages</h1>
        <p className="text-muted-foreground">
          Manage and respond to customer inquiries
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Messages</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            <p className="text-center text-muted-foreground py-8">
              No messages found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatDate(msg.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{msg.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {msg.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {msg.subject || "-"}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate" title={msg.message}>
                        {msg.message}
                      </p>
                      {msg.admin_reply && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                          <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                            Admin Reply:
                          </div>
                          <p className="text-blue-900 dark:text-blue-100">
                            {msg.admin_reply}
                          </p>
                          {msg.replied_at && (
                            <p className="text-blue-600 dark:text-blue-400 mt-1 text-[10px]">
                              Replied: {formatDate(msg.replied_at)}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(msg.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMessage(msg);
                            setReplyText(msg.admin_reply || "");
                          }}
                          title={msg.admin_reply ? "Edit reply" : "Add reply"}
                        >
                          {msg.admin_reply ? "Edit" : "Reply"}
                        </Button>
                        {msg.status === "new" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusChange(msg.id, "read")}
                          >
                            Mark Read
                          </Button>
                        )}
                        {msg.status !== "archived" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleStatusChange(msg.id, "archived")
                            }
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Message Detail & Reply Dialog */}
      <AlertDialog
        open={!!selectedMessage}
        onOpenChange={() => setSelectedMessage(null)}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Message from {selectedMessage?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMessage?.email} •{" "}
              {selectedMessage && formatDate(selectedMessage.created_at)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {selectedMessage?.subject && (
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium">{selectedMessage.subject}</p>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Message</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {selectedMessage?.message}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply">Your Reply</Label>
              <Textarea
                id="reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response here..."
                rows={6}
              />
              {selectedMessage?.replied_at && (
                <p className="text-xs text-muted-foreground">
                  Last replied: {formatDate(selectedMessage.replied_at)}
                </p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <Button onClick={handleReply} disabled={isReplying}>
              {isReplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Reply"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
