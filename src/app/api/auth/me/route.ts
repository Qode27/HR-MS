import { getSession } from "@/lib/auth";
import { success, failure } from "@backend/utils/api-response";

export async function GET() {
  const session = await getSession();
  if (!session) return failure("Unauthorized", 401);
  return success(session);
}
