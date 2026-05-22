export interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export class AtlasApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AtlasApiError';
  }
}

export async function atlasFetch<T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...init } = options;

  let url = `${baseUrl}${path}`;
  if (params) {
    const search = new URLSearchParams(params);
    url += `?${search.toString()}`;
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    throw new AtlasApiError(
      res.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? `HTTP ${res.status}`
    );
  }

  return res.json();
}
