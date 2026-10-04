import type { Store, Product } from './types';
export const backendOrigin = 'https://folio-netlify-backend.caprocktechnology.chatgpt.site';
export function backendHeaders() {
  const token = process.env.FOLIO_BACKEND_TOKEN;
  if (!token) throw new Error('Pilot storage connection is not configured.');
  return {'OAI-Sites-Authorization': 'Bearer ' + token};
}
async function publicData<T>(path: string): Promise<T | null> {
  const response = await fetch(backendOrigin + '/api/' + path, { cache: 'no-store', headers: backendHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Store data is temporarily unavailable.');
  return response.json() as Promise<T>;
}
export function getPublicStore(handle: string) {
  return publicData<{store: Store; products: Product[]}>('stores/' + encodeURIComponent(handle));
}
export function getPublicProduct(id: string) {
  return publicData<{store: Store; product: Product}>('products/' + encodeURIComponent(id));
}
