export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function toAppError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(error.message, 500);
  return new AppError("Unexpected error", 500, error);
}
