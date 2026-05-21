export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiMeta {
  request_id: string;
  attribution: string;
  cache_hit: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: ApiMeta & {
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}
