import { redirect } from "next/navigation";

export default function MyTimesheetsAliasPage() {
  redirect("/timesheets?mine=1");
}
