import { redirect } from "next/navigation";

// Root page: detect browser locale and redirect to /en or /zh
export default async function RootPage() {
  redirect("/en");
}
