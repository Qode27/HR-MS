export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: { message: string; details?: unknown };
  meta?: { requestId?: string; pagination?: { page: number; pageSize: number; total: number } };
};
