import { NextResponse } from "next/server";

type Meta = {
  requestId?: string;
  pagination?: { page: number; pageSize: number; total: number };
};

export function success<T>(data: T, meta?: Meta, status = 200, message = "OK") {
  return NextResponse.json({ success: true, data, message, meta }, { status });
}

export function failure(message: string, status = 400, details?: unknown, meta?: Meta) {
  return NextResponse.json({ success: false, data: null, message, errors: details, error: { message, details }, meta }, { status });
}
