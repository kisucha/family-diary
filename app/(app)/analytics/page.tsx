import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TimeAnalyticsClient } from "./components/TimeAnalyticsClient";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <TimeAnalyticsClient />;
}
