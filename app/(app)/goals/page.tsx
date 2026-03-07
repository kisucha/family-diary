import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GoalsClient } from "./components/GoalsClient";

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <GoalsClient />;
}
