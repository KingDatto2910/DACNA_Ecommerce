"use client";

import { Product, Review } from "@/lib/types";
import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { createReview, updateReview } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface ProductReviewsProps {
  product: Product;
}

export default function ProductReviews({ product }: ProductReviewsProps) {
  const { isAuthenticated, token } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !token) {
      toast.error("You must be logged in to write a review");
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write your review");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingReviewId) {
        await updateReview(product.id, editingReviewId, token, {
          rating,
          comment: comment.trim(),
        });
        toast.success("Review updated successfully!");
      } else {
        await createReview(product.id, token, {
          rating,
          comment: comment.trim(),
        });
        toast.success("Review submitted successfully!");
      }

      setRating(5);
      setComment("");
      setShowReviewForm(false);
      setEditingReviewId(null);
      window.location.reload();
    } catch (error) {
      toast.error(
        editingReviewId
          ? "Failed to update review. Please try again."
          : "Failed to submit review. Please try again."
      );
      console.error("Review submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-5 w-5 transition-colors",
              interactive && "cursor-pointer hover:scale-110",
              i < (interactive ? hoveredRating || rating : rating)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/50"
            )}
            onClick={interactive ? () => setRating(i + 1) : undefined}
            onMouseEnter={interactive ? () => setHoveredRating(i + 1) : undefined}
            onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
          />
        ))}
      </div>
    );
  };

  const totalReviews = product.reviewCount || 0;
  const avgRating = product.rating ? product.rating.toFixed(1) : "0.0";

  const ratingCounts = [0, 0, 0, 0, 0];
  const reviews = product.reviews || [];
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating - 1]++;
    }
  });
  ratingCounts.reverse();

  return (
    <div className="py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold mb-2">Reviews</h3>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold">{avgRating}</span>
            {renderStars(Math.round(Number(avgRating)))}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
          </p>

          {totalReviews > 0 && (
            <div className="mt-6 space-y-3">
              {ratingCounts.map((count, index) => {
                const starLevel = 5 - index;
                const percentage = (count / totalReviews) * 100;
                return (
                  <div key={starLevel} className="flex items-center gap-2">
                    <span className="text-sm font-medium">{starLevel}</span>
                    <Star className="h-4 w-4 fill-muted text-muted-foreground/50" />
                    <Progress value={percentage} className="w-full h-2" />
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            onClick={() => {
              if (!isAuthenticated) {
                toast.error("You must be logged in to write a review");
                return;
              }
              setShowReviewForm(!showReviewForm);
            }}
            className="w-full mt-6"
            variant={showReviewForm ? "outline" : "default"}
          >
            {showReviewForm ? "Cancel" : "Write a Review"}
          </Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          {showReviewForm && (
            <form
              onSubmit={handleSubmitReview}
              className="border p-6 rounded-lg bg-muted/50 space-y-4"
            >
              <h3 className="text-xl font-semibold">Write Your Review</h3>

              <div>
                <Label>Your Rating *</Label>
                <div className="mt-2">{renderStars(rating, true)}</div>
              </div>

              <div>
                <Label htmlFor="comment">Your Review *</Label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about this product"
                  className="w-full min-h-[120px] px-3 py-2 border rounded-md resize-y"
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          )}

          {reviews.length === 0 && !showReviewForm && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No reviews for this product yet. Be the first to write one!
              </p>
            </div>
          )}

          <div className="space-y-6">
            {product.reviews?.map((rev) => (
              <div key={rev.id} className="border rounded-md p-4">
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < rev.rating
                          ? "fill-yellow-500 text-yellow-500"
                          : "fill-gray-200 text-gray-200"
                      )}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground">
                    {new Date(rev.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-medium">{rev.author}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rev.comment}
                  </p>
                </div>
                {rev.admin_reply && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Admin Reply
                    </div>
                    <p className="text-sm text-blue-900 dark:text-blue-100 mt-1">
                      {rev.admin_reply}
                    </p>
                    {rev.admin_reply_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(rev.admin_reply_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
