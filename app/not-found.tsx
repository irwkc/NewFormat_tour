export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-white">
      <div className="flex items-center gap-4 text-sm sm:text-base">
        <span className="text-base sm:text-lg font-semibold tracking-[0.25em]">
          404
        </span>
        <span className="h-5 sm:h-6 w-px bg-white/30" />
        <span className="text-white/70 text-sm sm:text-base">
          This page could not be found.
        </span>
      </div>
    </div>
  )
}

