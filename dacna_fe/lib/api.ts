// API client for backend communication
import { Product, Category } from "./types";

const API_URL = "http://localhost:5000";
export const IMAGE_BASE_URL = API_URL; // Images served from server

/** Standard API response wrapper */
interface ApiResponse<T> {
  ok: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

/**
 * Base fetch wrapper with error handling
 * @param path API endpoint path
 * @param options Fetch options
 */
async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "API request failed");
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.ok) {
      throw new Error(data.message || data.error || "API returned an error");
    }

    return data.data;
  } catch (err) {
    console.error(`Fetch API error at ${path}:`, err);
    // @ts-ignore
    throw new Error(`API Error: ${err.message}`);
  }
}

// ========== Products API ==========

export async function getProducts(query: {
  categorySlug?: string;
  subCategorySlug?: string;
  trending?: boolean;
  bestseller?: boolean;
  toprated?: boolean;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string; // price-asc, price-desc, rating, newest
}): Promise<Product[]> {
  const params = new URLSearchParams();

  if (query.categorySlug) params.set("category_slug", query.categorySlug);
  if (query.subCategorySlug)
    params.set("sub_category_slug", query.subCategorySlug);
  if (query.trending) params.set("trending", "true");
  if (query.bestseller) params.set("bestseller", "true");
  if (query.toprated) params.set("toprated", "true");
  if (query.q) params.set("q", query.q);
  if (query.minPrice !== undefined)
    params.set("min_price", query.minPrice.toString());
  if (query.maxPrice !== undefined)
    params.set("max_price", query.maxPrice.toString());
  if (query.sort) params.set("sort", query.sort);

  const queryString = params.toString();
  return fetchApi<Product[]>(
    `/api/products${queryString ? `?${queryString}` : ""}`
  );
}

export async function getProductById(id: string): Promise<Product> {
  const product = await fetchApi<Product>(`/api/products/${id}`);
  console.log("📦 Product API Response:", product);
  console.log("🎁 Applicable Promotions:", product.applicablePromotions);
  return product;
}

// ========== Categories API ==========

export async function getCategories(): Promise<Category[]> {
  return fetchApi<Category[]>(`/api/categories`);
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  return fetchApi<Category>(`/api/categories/${slug}`);
}

// ========== Reviews API ==========

export async function createReview(
  productId: string,
  token: string,
  reviewData: { rating: number; comment: string }
): Promise<{ reviewId: number }> {
  return fetchApi<{ reviewId: number }>(`/api/products/${productId}/reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(reviewData),
  });
}

export async function updateReview(
  productId: string,
  reviewId: number,
  token: string,
  reviewData: { rating: number; comment: string }
): Promise<void> {
  return fetchApi<void>(`/api/products/${productId}/reviews/${reviewId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(reviewData),
  });
}

export async function deleteReview(
  productId: string,
  reviewId: number,
  token: string
): Promise<void> {
  return fetchApi<void>(`/api/products/${productId}/reviews/${reviewId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
