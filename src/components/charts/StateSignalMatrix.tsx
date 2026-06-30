"use client";

type StateSignalDatum = {
  state: string;
  leadLagDays: number;
  correlation: number;
  divergence: number;
  volatility: number;
};

type StateSignalMatrixProps = {
  data: StateSignalDatum[];
};

function normalize(value: number, min: number, max: number) {
  if (max <= min) return 0.5;
  return (value - min) / (max - min);
}

function cellStyle(value: number, min: number, max: number, hue: number) {
  const alpha = 0.18 + normalize(value, min, max) * 0.55;
  return {
    backgroundColor: `hsla(${hue}, 70%, 45%, ${alpha})`,
  };
}

export function StateSignalMatrix({ data }: StateSignalMatrixProps) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Signal matrix appears once multiple state summaries are available.
      </div>
    );
  }

  const leadLagValues = data.map((item) => Math.abs(item.leadLagDays));
  const correlationValues = data.map((item) => item.correlation);
  const divergenceValues = data.map((item) => item.divergence);
  const volatilityValues = data.map((item) => item.volatility);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
      <div className="grid grid-cols-[120px_repeat(4,minmax(0,1fr))] border-b border-slate-200 bg-white/70 text-xs uppercase tracking-[0.14em] text-slate-500">
        <div className="px-4 py-3">State</div>
        <div className="px-4 py-3">Lead/Lag</div>
        <div className="px-4 py-3">Correlation</div>
        <div className="px-4 py-3">Divergence</div>
        <div className="px-4 py-3">Volatility</div>
      </div>
      {data.map((item) => (
        <div key={item.state} className="grid grid-cols-[120px_repeat(4,minmax(0,1fr))] border-b border-slate-200 last:border-b-0">
          <div className="px-4 py-3 text-sm font-medium text-slate-900">{item.state}</div>
          <div className="px-4 py-3 text-sm text-slate-900" style={cellStyle(Math.abs(item.leadLagDays), Math.min(...leadLagValues), Math.max(...leadLagValues), 215)}>
            {item.leadLagDays === 0 ? "Sync" : `${Math.abs(item.leadLagDays)}d`}
          </div>
          <div className="px-4 py-3 text-sm text-slate-900" style={cellStyle(item.correlation, Math.min(...correlationValues), Math.max(...correlationValues), 144)}>
            {item.correlation.toFixed(2)}
          </div>
          <div className="px-4 py-3 text-sm text-slate-900" style={cellStyle(item.divergence, Math.min(...divergenceValues), Math.max(...divergenceValues), 12)}>
            {item.divergence.toFixed(2)}
          </div>
          <div className="px-4 py-3 text-sm text-slate-900" style={cellStyle(item.volatility, Math.min(...volatilityValues), Math.max(...volatilityValues), 280)}>
            {item.volatility.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}
