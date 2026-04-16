import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getReportDefinition } from "@/lib/report-catalog";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { AppError } from "@backend/utils/errors";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "reports:read");

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "employee-master";
  const format = (searchParams.get("format") || "csv").toLowerCase();
  const definition = getReportDefinition(key);
  if (!definition) throw new AppError("Unknown report", 404);

  const origin = new URL(req.url).origin;
  const upstream = await fetch(`${origin}/api/reports/data?${searchParams.toString()}`, {
    headers: { cookie: req.headers.get("cookie") || "" },
    cache: "no-store"
  });
  const payload = await upstream.json();
  if (!upstream.ok || payload.success === false) throw new AppError(payload.error?.message || "Unable to export report", upstream.status);
  const rows = payload.data.rows as Record<string, unknown>[];

  if (format === "csv") {
    const header = Object.keys(rows[0] || {}).join(",");
    const body = rows.map((r) => Object.values(r).map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    return new Response(`${header}\n${body}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${definition.key}.csv"`
      }
    });
  }

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, definition.title.slice(0, 31));
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${definition.key}.xlsx"`
      }
    });
  }

  throw new AppError("Unsupported export format", 400);
});
