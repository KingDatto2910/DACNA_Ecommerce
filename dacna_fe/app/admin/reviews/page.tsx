"use client";

import { useState, useEffect, Fragment } from "react";
import {
  fetchAllReviews,
  deleteReview,
  updateReviewReply,
  type AdminReview,
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
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  X,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

/**
 * Admin Reviews Management Page
 *
 * PERMISSIONS:
 * - ADMIN: Full access (view reviews, delete reviews, manage all reviews)
 * - STAFF: Full access (view reviews, delete reviews, manage all reviews)
 * - Customer: Cannot access (protected by layout)
 *
 * FEATURES:
 * - View all product reviews with user information
 * - Filter reviews by rating (1-5 stars)
 * - Search reviews by product name or user
 * - Delete inappropriate or spam reviews
 * - View verified purchase status
 * - Pagination support
 * - Both admin and staff have full access to this page
 */

export default function AdminReviewsPage() {
  const { isAdmin } = useAdminAuth();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 20,
        sort_by: sortBy,
        sort_dir: sortDir,
      };
      if (ratingFilter !== "all") params.rating = parseInt(ratingFilter);
      if (search) params.search = search;

      const res = await fetchAllReviews(params);
      setReviews(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ratingFilter, sortBy, sortDir]);

  const handleSearch = () => {
    setPage(1);
    loadReviews();
  };

  const handleDelete = async (reviewId: number) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      await deleteReview(reviewId);
      loadReviews();
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert("Failed to delete review");
    }
  };

  const openReply = (review: AdminReview) => {
    setReplyingId(review.id);
    setReplyText(review.admin_reply || "");
  };

  const saveReply = async () => {
    if (!replyingId || !replyText.trim()) return;

    try {
      await updateReviewReply(replyingId, replyText.trim());
      setReplyingId(null);
      setReplyText("");
      loadReviews();
    } catch (error) {
      console.error("Failed to save reply:", error);
      alert("Failed to save reply");
    }
  };

  const cancelReply = () => {
    setReplyingId(null);
    setReplyText("");
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "ASC" ? "DESC" : "ASC");
    } else {
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
  }) => (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => handleSort(column)}
        className="h-8 px-2"
      >
        {children}
        {sortBy === column ? (
          sortDir === "ASC" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowDown className="ml-2 h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Reviews Management
        </h1>
        <Button onClick={loadReviews} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search by product, username, comment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="text-center py-8">Loading reviews...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="product_id">Product</SortableHeader>
                <TableHead>User</TableHead>
                <SortableHeader column="rating">Rating</SortableHeader>
                <TableHead>Comment</TableHead>
                <TableHead>Verified</TableHead>
                <SortableHeader column="created_at">Date</SortableHeader>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No reviews found
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <Fragment key={review.id}>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {review.product_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {review.product_sku}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{review.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {review.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{renderStars(review.rating)}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate" title={review.comment}>
                          {review.comment}
                        </p>
                        {review.admin_reply && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                            <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                              Admin Reply:
                            </div>
                            <p className="text-blue-900 dark:text-blue-100">
                              {review.admin_reply}
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            review.is_verified_purchase
                              ? "default"
                              : "secondary"
                          }
                        >
                          {review.is_verified_purchase
                            ? "Verified"
                            : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(review.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openReply(review)}
                            variant="outline"
                            size="sm"
                            title={
                              review.admin_reply ? "Edit reply" : "Add reply"
                            }
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              onClick={() => handleDelete(review.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {replyingId === review.id && (
                      <TableRow className="bg-muted/40">
                        <TableCell colSpan={7}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">
                                {review.admin_reply
                                  ? "Edit Reply"
                                  : "Add Reply"}
                              </div>
                              <Button
                                onClick={cancelReply}
                                variant="ghost"
                                size="sm"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <textarea
                              className="w-full border rounded-md p-2 bg-background min-h-[100px]"
                              placeholder="Type your reply to this review..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={saveReply}
                                disabled={!replyText.trim()}
                              >
                                Save Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelReply}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
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
