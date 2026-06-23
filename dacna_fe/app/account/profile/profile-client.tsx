// dacna/app/account/profile/profile-client.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Breadcrumbs from "@/components/breadcrumbs";
import {
  getUserProfile,
  updateUserProfile,
  UserProfile,
  deleteOwnAccount,
} from "@/lib/user-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfileClient() {
  const { isAuthenticated, isLoading: authLoading, token, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    full_name: "",
    address_street: "",
    address_district: "",
    address_ward: "",
    // ...existing code...

    address_city: "",
    avatar_url: "",
  });

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please log in to view your profile.");
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load user data
  useEffect(() => {
    if (isAuthenticated && token) {
      loadUserData();
    }
  }, [isAuthenticated, token]);

  const loadUserData = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const userData = await getUserProfile(token);
      setUser(userData);
      setFormData({
        username: userData.username || "",
        phone: userData.phone || "",
        full_name: userData.full_name || "",
        address_street: userData.address_street || "",
        address_district: userData.address_district || "",
        address_ward: userData.address_ward || "",
        address_city: userData.address_city || "",
        avatar_url: userData.avatar_url || "",
      });

      // Update localStorage with new user data (for navbar and other components)
      const authUserData = {
        id: userData.id,
        email: userData.email,
        name: userData.username,
        role: userData.roles,
        avatar_url: userData.avatar_url, // Include avatar in auth context
      };
      localStorage.setItem("auth_user", JSON.stringify(authUserData));
      console.log("💾 Updated auth_user in localStorage with avatar:", userData.avatar_url);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load profile";
      console.error("Failed to load user data:", error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    // Validate avatar URL length
    if (formData.avatar_url && formData.avatar_url.length > 500) {
      toast.error(
        "Avatar URL is too long (max 500 characters). Please use a shorter URL."
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(token, formData);
      toast.success("Profile updated successfully!");
      await loadUserData();

      // Dispatch custom event to update auth context in navbar and other components
      window.dispatchEvent(new Event("auth:update"));
      console.log("📢 Dispatched auth:update event for avatar refresh");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      console.error("Failed to update profile:", error);
      // Check if error is due to avatar URL being too long
      if (errorMessage.includes("Data too long")) {
        toast.error(
          "Avatar URL is too long. Please use a shorter URL (max 500 characters)."
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;

    setIsDeleting(true);
    try {
      await deleteOwnAccount(token);
      toast.success("Account deleted successfully");
      // Logout and redirect to homepage
      logout();
      router.push("/?deleted=true");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete account";
      console.error("Failed to delete account:", error);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Breadcrumbs />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">My Profile</CardTitle>
          <CardDescription>
            View and edit your account information
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Basic Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Your username"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Your full name"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Your phone number"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Address Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="address_city">City/Province</Label>
                <Input
                  id="address_city"
                  value={formData.address_city}
                  onChange={(e) =>
                    setFormData({ ...formData, address_city: e.target.value })
                  }
                  placeholder="e.g., Ho Chi Minh City"
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_district">District</Label>
                  <Input
                    id="address_district"
                    value={formData.address_district}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address_district: e.target.value,
                      })
                    }
                    placeholder="e.g., District 1"
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_ward">Ward</Label>
                  <Input
                    id="address_ward"
                    value={formData.address_ward}
                    onChange={(e) =>
                      setFormData({ ...formData, address_ward: e.target.value })
                    }
                    placeholder="e.g., Ward 1"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_street">Street Address</Label>
                <Input
                  id="address_street"
                  value={formData.address_street}
                  onChange={(e) =>
                    setFormData({ ...formData, address_street: e.target.value })
                  }
                  placeholder="e.g., 123 Main Street"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Avatar Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Profile Picture
              </h3>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) =>
                    setFormData({ ...formData, avatar_url: e.target.value })
                  }
                  placeholder="https://example.com/avatar.jpg"
                  disabled={isSaving}
                  className={formData.avatar_url && formData.avatar_url.length > 500 ? "border-red-500" : ""}
                />
                <div className="flex justify-between items-start">
                  <p className="text-xs text-muted-foreground">
                    {formData.avatar_url.length} / 500 characters
                  </p>
                  {formData.avatar_url && formData.avatar_url.length > 500 && (
                    <p className="text-xs text-red-500 font-medium">
                      URL too long! Max 500 characters allowed.
                    </p>
                  )}
                </div>
                {formData.avatar_url && formData.avatar_url.length <= 500 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">Avatar preview:</p>
                    <img
                      src={formData.avatar_url}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                      onError={(e) => {
                        e.currentTarget.src =
                          "http://localhost:5000/placeholder/user.svg";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Account Info (Read-only) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Account Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={user?.roles || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Status</Label>
                  <Input
                    value={user?.verified ? "Verified" : "Not Verified"}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <Input
                    value={
                      user ? new Date(user.created_at).toLocaleDateString() : ""
                    }
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <Input
                    value={
                      user ? new Date(user.updated_at).toLocaleDateString() : ""
                    }
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/account")}
              >
                Back to Account
              </Button>
            </div>

            {/* Delete Account Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all your data from our servers,
                    including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Your profile information</li>
                      <li>Order history</li>
                      <li>Favorite products</li>
                      <li>Reviews and comments</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
