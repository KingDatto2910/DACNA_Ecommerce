"use client";

import { useState, useEffect } from "react";
import {
  fetchCancelRequests,
  approveCancelRequest,
  rejectCancelRequest,
  type CancelRequest,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { toast } from "sonner";

/**
 * Admin Cancellation Requests Page
 *
 * PERMISSIONS:
 * - ADMIN: Full access (approve/reject requests)
 * - STAFF: Full access (approve/reject requests)
 * - Customer: Cannot access (protected by layout)
 *
 * FEATURES:
 * - View all cancellation requests
 * - Filter by status (pending, approved, rejected)
 * - Approve requests with optional note
 * - Reject requests with optional note
 */

export default function AdminCancelRequestsPage() {
  const { isAdmin, isStaff } = useAdminAuth();
  const [requests, setRequests] = useState<CancelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<CancelRequest | null>(
    null
  );
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [adminNote, setAdminNote] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 20,
      };
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await fetchCancelRequests(params);
      setRequests(res.data);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (error: any) {
      console.error("Failed to load cancel requests:", error);
      toast.error(error.message || "Failed to load cancel requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await approveCancelRequest(
        selectedRequest.id,
        adminNote || undefined,
        selectedRequest.order_id
      );
      toast.success("Cancel request approved");
      setSelectedRequest(null);
      setActionType(null);
      setAdminNote("");
      loadRequests();
    } catch (error: any) {
      console.error("Failed to approve:", error);
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await rejectCancelRequest(selectedRequest.id, adminNote || undefined);
      toast.success("Cancel request rejected");
      setSelectedRequest(null);
      setActionType(null);
      setAdminNote("");
      loadRequests();
    } catch (error: any) {
      console.error("Failed to reject:", error);
      toast.error(error.message || "Failed to reject request");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Cancellation Requests
        </h1>
        <Button onClick={loadRequests} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="text-center py-8">Loading requests...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Code</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No cancellation requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.order_code || `#${request.order_id}`}
                    </TableCell>
                    <TableCell>
                      {request.username || request.email || "Unknown"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.reason || "No reason provided"}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (isAdmin || isStaff) && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType("approve");
                            }}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType("reject");
                            }}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {request.status !== "pending" && (
                        <span className="text-sm text-muted-foreground">
                          {request.admin_note || "No admin note"}
                        </span>
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

      {/* Action Dialog */}
      <AlertDialog
        open={!!selectedRequest && !!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setActionType(null);
            setAdminNote("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Cancellation
              Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Order:{" "}
              {selectedRequest?.order_code || `#${selectedRequest?.order_id}`}
              <br />
              Customer reason: {selectedRequest?.reason || "No reason provided"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add an optional note for the customer..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setAdminNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={actionType === "approve" ? handleApprove : handleReject}
            >
              Confirm {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
