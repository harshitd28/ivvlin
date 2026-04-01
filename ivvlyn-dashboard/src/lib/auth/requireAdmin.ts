import { redirect } from "next/navigation";
import { getUserWithProfile } from "@/lib/auth/getUser";

export async function requireAdmin() {
  const user = await getUserWithProfile();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
