import Link from "next/link";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const redirect = resolved?.redirect;
  const redirectPath = typeof redirect === "string" ? redirect : undefined;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#030712] text-[#f9fafb] px-6">
      <div className="w-full max-w-md site-fade-up">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-[28px] font-semibold tracking-tight">IVVLYN</div>
            <div className="text-[26px] mt-4 font-medium tracking-tight">Welcome back</div>
          </div>
        </div>
        <LoginForm redirectPath={redirectPath} />
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-[12px] text-[#9ca3af] hover:text-white transition-colors"
          >
            ← Back to landing page
          </Link>
        </div>
      </div>
    </main>
  );
}

