const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://api.localhost';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? '';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const search = new URLSearchParams(params);
    url += `?${search.toString()}`;
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      ...init.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: { message: res.statusText } }))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
