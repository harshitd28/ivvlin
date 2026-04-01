"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-lg w-full border border-[#E8E8E8] rounded-xl bg-[#FAFAF8] p-6 space-y-4">
        <div>
          <div className="text-[#0A0A0A] text-[18px] font-medium">Something went wrong</div>
          <div className="text-[#555] text-[13px] mt-2">
            Try again. If this keeps happening, report it to your admin.
          </div>
        </div>

        <button
          type="button"
          className="h-10 px-4 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] hover:bg-white text-[#0A0A0A] text-[13px] font-medium"
          onClick={() => reset()}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

