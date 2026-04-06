export function SummaryCard({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className={`p-4 rounded-2xl ${color} flex flex-col gap-1`}>
      <span className="text-xs font-bold opacity-70">{label}</span>
      <span className="text-2xl font-black">{count}</span>
    </div>
  );
}
