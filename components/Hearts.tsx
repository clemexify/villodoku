import { MAX_ERRORS } from "@/lib/game-storage";

const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`h-5 w-5 ${filled ? "fill-rose-500 text-rose-500" : "fill-none text-gray-300"}`}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path d={HEART_PATH} />
    </svg>
  );
}

export default function Hearts({ errors }: { errors: number }) {
  return (
    <div className="flex gap-1.5" title={`Vies restantes : ${MAX_ERRORS - errors} / ${MAX_ERRORS}`}>
      {Array.from({ length: MAX_ERRORS }, (_, i) => (
        <Heart key={i} filled={i >= errors} />
      ))}
    </div>
  );
}
