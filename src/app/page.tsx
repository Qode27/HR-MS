import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }: { searchParams?: Promise<{ demo?: string }> }) {
  const params = (await searchParams) || {};
  const cookieStore = await cookies();
  const isDemo = params.demo === "true" || cookieStore.get("hrms_demo")?.value === "true";
  redirect(isDemo ? "/dashboard?demo=true" : "/dashboard");
}
