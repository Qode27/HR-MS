import { success } from "@backend/utils/api-response";
import { COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/constants";

export async function POST() {
  const res = success({ loggedOut: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  res.cookies.set(REFRESH_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
