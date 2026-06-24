"use client";

import { useState, useEffect, useRef } from "react";
import {
  fetchAllUsers,
  updateUser,
  deleteUser,
  createUser,
  type AdminUser,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCw,
  Trash2,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import AdminProtectedRoute from "@/components/admin-protected-route";
import { Permission } from "@/lib/permissions";

/**
 * Admin Users Management Page
 *
 * PERMISSIONS:
 * - ADMIN ONLY: This page requires VIEW_USERS permission
 * - Only admins can access this page
 * - Staff members cannot view or manage users
 *
 * FEATURES:
 * - View all users with filtering and search
 * - Create new users (admin only)
 * - Edit user roles and verification status (admin only)
 * - Delete users (admin only)
 * - Pagination support
 */
function AdminUsersPageContent() {
  const { isAdmin, user: authUser } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    roles: "customer",
    verified: true,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 20,
        sort_by: sortBy,
        sort_dir: sortDir,
      };
      if (roleFilter !== "all") params.role = roleFilter;
      if (search) params.search = search;

      const res = await fetchAllUsers(params);
      setUsers(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Load users when page or role filter changes
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, sortBy, sortDir]);

  // Debounced search auto-load
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      // Reset to first page when search changes
      setPage(1);
      loadUsers();
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearch = () => {
    // Manual trigger (Enter key or button) - immediate fetch bypassing debounce
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setPage(1);
    loadUsers();
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roles: newRole } : u))
    );
    try {
      await updateUser(userId, { roles: newRole });
      toast.success("Role updated");
      // Refresh lightly to sync pagination counts without flicker
      loadUsers();
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update user role");
      // Revert optimistic update on failure
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                roles: prev.find((p) => p.id === userId)?.roles || u.roles,
              }
            : u
        )
      );
    }
  };

  const handleToggleVerified = async (
    userId: number,
    currentVerified: boolean
  ) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, verified: !currentVerified } : u
      )
    );
    try {
      await updateUser(userId, { verified: !currentVerified });
      toast.success("Verification status updated");
      loadUsers();
    } catch (error) {
      console.error("Failed to toggle verified:", error);
      toast.error("Failed to update verification status");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, verified: currentVerified } : u
        )
      );
    }
  };

  const handleDelete = async (userId: number) => {
    if (authUser?.id === userId) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    // Optimistic removal for immediate UI feedback
    const prev = users;
    setUsers((u) => u.filter((x) => x.id !== userId));
    try {
      await deleteUser(userId);
      toast.success("User deleted");
      // Optionally reload to sync pagination
      loadUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
      setUsers(prev); // revert
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      admin: "destructive",
      staff: "default",
      customer: "secondary",
    };
    return <Badge variant={variants[role] || "secondary"}>{role}</Badge>;
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle direction if same column
      setSortDir(sortDir === "ASC" ? "DESC" : "ASC");
    } else {
      // New column, default to DESC
      setSortBy(column);
      setSortDir("DESC");
    }
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => {
    const isActive = sortBy === column;
    return (
      <TableHead>
        <button
          onClick={() => handleSort(column)}
          className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          {children}
          {isActive ? (
            sortDir === "ASC" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </button>
      </TableHead>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
        <div className="flex gap-2">
          {/* Only admins can create users */}
          {isAdmin && (
            <Button size="sm" onClick={() => setShowCreate((s) => !s)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {showCreate ? "Close" : "Add User"}
            </Button>
          )}
          <Button onClick={loadUsers} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search by username, email, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon" title="Search now">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isAdmin && showCreate && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Username</label>
              <Input
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <Select
                value={newUser.roles}
                onValueChange={(v) => setNewUser({ ...newUser, roles: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  if (
                    !newUser.username ||
                    !newUser.email ||
                    !newUser.password
                  ) {
                    alert("Please fill all required fields");
                    return;
                  }
                  await createUser(newUser as any);
                  setShowCreate(false);
                  setNewUser({
                    username: "",
                    email: "",
                    password: "",
                    roles: "customer",
                    verified: true,
                  });
                  loadUsers();
                } catch (e: any) {
                  alert(e?.message || "Failed to create user");
                }
              }}
            >
              Create User
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="id">ID</SortableHeader>
                <SortableHeader column="username">Username</SortableHeader>
                <SortableHeader column="email">Email</SortableHeader>
                <SortableHeader column="roles">Role</SortableHeader>
                <SortableHeader column="verified">Verified</SortableHeader>
                <SortableHeader column="created_at">Joined</SortableHeader>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">
                      {user.username}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {isAdmin && authUser?.id !== user.id ? (
                        <Select
                          value={user.roles}
                          onValueChange={(val) =>
                            handleUpdateRole(user.id, val)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getRoleBadge(user.roles)
                      )}
                      {authUser?.id === user.id && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (You)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin && authUser?.id !== user.id ? (
                        <Button
                          onClick={() =>
                            handleToggleVerified(user.id, user.verified)
                          }
                          variant={user.verified ? "default" : "outline"}
                          size="sm"
                        >
                          {user.verified ? "Verified" : "Unverified"}
                        </Button>
                      ) : (
                        <Badge
                          variant={user.verified ? "default" : "secondary"}
                        >
                          {user.verified ? "Yes" : "No"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <Button
                          onClick={() => handleDelete(user.id)}
                          variant="destructive"
                          size="sm"
                          disabled={authUser?.id === user.id}
                          title={
                            authUser?.id === user.id
                              ? "You cannot delete your own account"
                              : undefined
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            variant="outline"
          >
            Previous
          </Button>
          <span className="py-2 px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Exported Users Page with Admin-Only Protection
 * Wraps the content with AdminProtectedRoute requiring VIEW_USERS permission
 */
export default function AdminUsersPage() {
  return (
    <AdminProtectedRoute requiredPermission={Permission.VIEW_USERS}>
      <AdminUsersPageContent />
    </AdminProtectedRoute>
  );
}
