import Link from "next/link";

type Section = {
  title: string;
  body: string[];
};

type Props = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: Section[];
};

export default function LegalPageTemplate({ title, updatedAt, intro, sections }: Props) {
  return (
    <main className="min-h-screen bg-[#fafaf8] text-[#0a0a0a]">
      <header className="border-b border-[#e8e8e8]">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-3">
          <Link href="/" className="inline-flex items-center gap-3 text-[#0a0a0a] no-underline">
            <img
              src="/assets/ivvlyn-logo.png"
              alt="Ivvlin"
              className="h-[clamp(62px,11.5vw,88px)] max-h-[88px] w-auto object-contain"
            />
          </Link>
          <nav className="flex items-center gap-6 text-[15px] text-[#555555]">
            <Link href="/privacy-policy" className="hover:text-[#0a0a0a]">
              Privacy
            </Link>
            <Link href="/terms-of-service" className="hover:text-[#0a0a0a]">
              Terms
            </Link>
            <Link href="/user-data-deletion" className="hover:text-[#0a0a0a]">
              Data Deletion
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[#666666]">Last updated: {updatedAt}</p>
        <p className="mt-6 text-[15px] leading-7 text-[#222222]">{intro}</p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <article key={section.title} className="space-y-3">
              <h2 className="text-lg font-medium">{section.title}</h2>
              {section.body.map((line) => (
                <p key={line} className="text-[15px] leading-7 text-[#222222]">
                  {line}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#e8e8e8]">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-3 px-6 py-8 text-xs text-[#777777]">
          <span>© {new Date().getFullYear()} Ivvlin. All rights reserved.</span>
          <span>•</span>
          <Link href="/privacy-policy" className="hover:text-[#0a0a0a]">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms-of-service" className="hover:text-[#0a0a0a]">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/user-data-deletion" className="hover:text-[#0a0a0a]">
            User Data Deletion
          </Link>
        </div>
      </footer>
    </main>
  );
}
