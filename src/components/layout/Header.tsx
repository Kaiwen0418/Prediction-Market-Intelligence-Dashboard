export function Header() {
  return (
    <header className="panel relative overflow-hidden px-8 py-8">
      <div className="absolute inset-0 bg-dashboard-grid bg-[size:26px_26px] opacity-40" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="metric-label">Prediction Market Intelligence</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink md:text-5xl">
            Frontend-only market analytics built for real-time interpretation.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            A production-style dashboard architecture combining market data ingestion, derived analytics,
            event context, and live orderbook monitoring without a custom backend.
          </p>
        </div>
        <div className="grid min-w-[250px] gap-3 text-sm text-slate-600">
          <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
            <p className="metric-label">Focus</p>
            <p className="mt-2 font-medium text-slate-900">Realtime systems, analytics, visualization</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
            <p className="metric-label">Stack</p>
            <p className="mt-2 font-medium text-slate-900">Next.js, TanStack Query, Zustand, ECharts</p>
          </div>
        </div>
      </div>
    </header>
  );
}
