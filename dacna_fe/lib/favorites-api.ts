const API_URL = "http://localhost:5000";

async function safeJson(res: Response) { try { return await res.json(); } catch { return null; } }

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export interface FavoriteProduct {
  id: number;
  name: string;
  sku?: string;
  model?: string;
  price: number;
  sale_price?: number;
  average_rating?: number;
  review_count?: number;
  category_slug?: string;
  sub_category_slug?: string;
  thumbnail_url?: string;
}

export async function apiGetFavorites(token: string): Promise<FavoriteProduct[]> {
  const res = await fetch(`${API_URL}/api/favorites`, { headers: authHeaders(token) });
  const data = await safeJson(res);
  if (!res.ok || !data?.ok) throw new Error(data?.error || data?.message || 'Failed to load favorites');
  return data.data as FavoriteProduct[];
}

export async function apiAddFavorite(token: string, productId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/favorites`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ product_id: productId })
  });
  const data = await safeJson(res);
  if (!res.ok || !data?.ok) throw new Error(data?.error || data?.message || 'Failed to add favorite');
}

export async function apiRemoveFavorite(token: string, productId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/favorites/${productId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const data = await safeJson(res);
  if (!res.ok || !data?.ok) throw new Error(data?.error || data?.message || 'Failed to remove favorite');
}
