import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WeeklyReviewClient } from "./components/WeeklyReviewClient";

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <WeeklyReviewClient />;
}
