export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-lg text-center space-y-3">
        <div className="text-[#0A0A0A] text-[18px] font-medium">Page not found</div>
        <div className="text-[#555] text-[13px]">
          The link you opened may be broken or the page no longer exists.
        </div>
      </div>
    </div>
  );
}

