import { MAX_SCORE, getScoreRank } from "@/lib/rarity";

// Repères visuels à 25 / 50 / 75 % de la barre
const CAPS = [25, 50, 75];

export default function ScoreGauge({ score }: { score: number }) {
  const percent = Math.min(100, (score / MAX_SCORE) * 100);

  return (
    <div className="flex w-full max-w-xl flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm font-medium text-gray-600">
        <span>
          Score : <span className="font-semibold text-violet-700">{score}</span> / {MAX_SCORE}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-violet-500">{getScoreRank(score)}</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
        {CAPS.map((cap) => (
          <div key={cap} className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: `${cap}%` }} />
        ))}
      </div>
      <p className="text-center text-[11px] text-gray-400">
        Moins la ville trouvée est <span className="font-semibold text-violet-500">peuplée</span> parmi les réponses valides, plus tu marques de points.
      </p>
    </div>
  );
}
