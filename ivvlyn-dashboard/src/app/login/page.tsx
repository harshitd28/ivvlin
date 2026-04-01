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
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-[#0A0A0A] px-6">
      <div className="w-full max-w-md site-fade-up">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-[28px] font-semibold tracking-tight">IVVLYN</div>
            <div className="text-[12px] text-[#555555] uppercase tracking-[0.2em] mt-1">
              Dashboard Access
            </div>
          </div>
        </div>
        <LoginForm redirectPath={redirectPath} />
        <div className="mt-4 text-center">
          <a
            href="http://localhost:39999/"
            className="text-[12px] text-[#555555] hover:text-[#0A0A0A] transition-colors"
          >
            ← Back to landing page
          </a>
        </div>
      </div>
    </main>
  );
}

