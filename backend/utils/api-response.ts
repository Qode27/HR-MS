import { NextResponse } from "next/server";

type Meta = {
  requestId?: string;
  pagination?: { page: number; pageSize: number; total: number };
};

export function success<T>(data: T, meta?: Meta, status = 200) {
  return NextResponse.json({ success: true, data, meta }, { status });
}

export function failure(message: string, status = 400, details?: unknown, meta?: Meta) {
  return NextResponse.json({ success: false, error: { message, details }, meta }, { status });
}
