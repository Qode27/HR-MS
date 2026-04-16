import { demoRequest, isDemoMode } from "@/lib/demo";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  if (isDemoMode()) {
    return demoRequest<T>(url, init);
  }

  const request = () =>
    fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      },
      cache: "no-store"
    });

  let res = await request();
  if (res.status === 401 && !url.includes("/api/auth/refresh")) {
    const refresh = await fetch("/api/auth/refresh", { method: "POST", cache: "no-store" });
    if (!refresh.ok) {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Session expired. Please login again.");
    }
    res = await request();
  }

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || json.error || "Request failed");
  }
  return (json.data ?? json) as T;
}
