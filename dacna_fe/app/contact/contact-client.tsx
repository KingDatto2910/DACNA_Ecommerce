"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ContactClient() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Auto-fill name and email if user is logged in
  useEffect(() => {
    if (user && token) {
      setName(user.name || "");
      setEmail(user.email || "");
      console.log("✅ Pre-filled contact form with logged-in user:", {
        name: user.name,
        email: user.email,
      });
    }
  }, [user, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsSending(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("http://localhost:5000/api/contact/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({ name, email, message, subject: null }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Failed");
      toast.success("Thanks! We received your message.");
      setMessage("");
      console.log("📨 Contact message sent from:", email);
      // Redirect to home page after successful submission
      setTimeout(() => {
        router.push("/home");
      }, 1500);
    } catch (err) {
      console.error("Failed to send contact message:", err);
      toast.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
          <CardDescription>
            We'd love to hear from you. Send us a message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Support Email</p>
              <p className="text-sm font-medium">support@dacna.local</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hours</p>
              <p className="text-sm font-medium">Mon–Fri, 9:00–17:00</p>
            </div>
          </div>
          <Separator />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                rows={5}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSending}>
                {isSending ? "Sending…" : "Send Message"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/home">Back to Home</Link>
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          This is a demo form. Replace with your email service or API.
        </CardFooter>
      </Card>
    </div>
  );
}

