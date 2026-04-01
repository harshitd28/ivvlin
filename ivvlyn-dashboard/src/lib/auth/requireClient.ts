import { redirect } from "next/navigation";
import { getUserWithProfile } from "@/lib/auth/getUser";

export async function requireClient() {
  const user = await getUserWithProfile();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/admin");
  return user;
}
