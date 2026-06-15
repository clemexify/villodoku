"use client";

export default function Header({ streak }: { streak: number }) {
  return (
    <header className="flex items-center justify-between bg-white px-4 py-3">
      <h1 className="font-display text-[2.15rem] font-bold tracking-tight">
        <span className="text-indigo-600">Villo</span>
        <span className="text-gray-800">doku</span>
      </h1>

      <div
        title={`Série en cours : ${streak} jour${streak > 1 ? "s" : ""}`}
        className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700"
      >
        <span aria-hidden>🔥</span>
        {streak}
      </div>
    </header>
  );
}
