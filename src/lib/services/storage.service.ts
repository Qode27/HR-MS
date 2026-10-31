import { AppError } from "@backend/utils/errors";

const DEFAULT_MAX_MB = 5;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

type StoredFile = {
  storageKey: string;
  fileUrl: string;
  bucket: string;
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_DOCUMENT_BUCKET || "hrms-documents";

  if (!url || !serviceKey) {
    throw new AppError("Document storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.", 500);
  }

  return { url: url.replace(/\/$/, ""), serviceKey, bucket };
}

export function documentMaxBytes() {
  const configured = Number(process.env.DOCUMENT_MAX_FILE_MB || DEFAULT_MAX_MB);
  const maxMb = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_MB;
  return maxMb * 1024 * 1024;
}

export function validateDocumentFile(input: { buffer: Buffer; fileName: string; mimeType: string; size: number }) {
  if (!ALLOWED_TYPES.has(input.mimeType)) throw new AppError("Only PDF, JPG, and PNG files are allowed", 422);
  if (input.size > documentMaxBytes()) throw new AppError(`File exceeds ${documentMaxBytes() / 1024 / 1024}MB limit`, 422);

  const { buffer, mimeType } = input;
  const isPdf = buffer.subarray(0, 4).toString("ascii") === "%PDF";
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  if (mimeType === "application/pdf" && !isPdf) throw new AppError("Invalid PDF file signature", 422);
  if (mimeType === "image/png" && !isPng) throw new AppError("Invalid PNG file signature", 422);
  if (mimeType === "image/jpeg" && !isJpeg) throw new AppError("Invalid JPG file signature", 422);
}

export function sanitizeFileName(fileName: string) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "document";
}

export async function saveFileToObjectStorage(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  tenantId?: string | null;
  documentId?: string;
  version?: number;
}): Promise<StoredFile> {
  validateDocumentFile({ buffer: input.buffer, fileName: input.fileName, mimeType: input.mimeType, size: input.buffer.length });

  const { url, serviceKey, bucket } = supabaseConfig();
  const tenantSegment = input.tenantId || "platform";
  const docSegment = input.documentId || crypto.randomUUID();
  const versionSegment = `v${input.version || 1}`;
  const storageKey = `${tenantSegment}/documents/${docSegment}/${versionSegment}-${Date.now()}-${sanitizeFileName(input.fileName)}`;

  const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURIComponent(storageKey).replaceAll("%2F", "/")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": input.mimeType,
      "Cache-Control": "private, max-age=31536000",
      "x-upsert": "false"
    },
    body: new Blob([new Uint8Array(input.buffer)], { type: input.mimeType })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AppError("Unable to store document in Supabase Storage", 502, detail);
  }

  return {
    storageKey,
    fileUrl: `${url}/storage/v1/object/${bucket}/${storageKey}`,
    bucket
  };
}

export async function readFileFromObjectStorage(storageKey: string) {
  const { url, serviceKey, bucket } = supabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURIComponent(storageKey).replaceAll("%2F", "/")}`, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey
    },
    cache: "no-store"
  });

  if (!response.ok) throw new AppError("Document file not found in storage", response.status);
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteFileFromObjectStorage(storageKey: string) {
  const { url, serviceKey, bucket } = supabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURIComponent(storageKey).replaceAll("%2F", "/")}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey
    }
  });

  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "");
    throw new AppError("Unable to delete document from storage", 502, detail);
  }
}
