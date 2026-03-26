import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api/client';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const PERIODS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '1 año', days: 365 },
];

const COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgoStr(n) { return new Date(Date.now() - n * 864e5).toISOString().split('T')[0]; }

export default function Analytics() {
  // Period / date range
  const [activePeriod, setActivePeriod] = useState(30);
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [queryFrom, setQueryFrom] = useState(() => daysAgoStr(30));
  const [queryTo, setQueryTo] = useState(() => todayStr());

  // Data & loading
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chart state
  const [activeChart, setActiveChart] = useState('productos'); // productos | tiempo | categorias
  const [chartType, setChartType] = useState('Barras');

  // Category filters per tab
  const [topCat, setTopCat] = useState(null);   // null = all
  const [timeCat, setTimeCat] = useState(null);
  const [compareCats, setCompareCats] = useState(null); // null = all (multi)

  // No-movement section
  const [noMovOpen, setNoMovOpen] = useState(false);
  const [noMovCat, setNoMovCat] = useState(null);

  // ── helpers ──────────────────────────────────────────────────
  const selectPeriod = (days) => {
    setActivePeriod(days);
    setCustomMode(false);
    setQueryFrom(daysAgoStr(days));
    setQueryTo(todayStr());
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    setActivePeriod(null);
    setQueryFrom(customFrom);
    setQueryTo(customTo);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics', { params: { from: queryFrom, to: queryTo } });
      setData(res.data);
      // reset filters when data changes
      setTopCat(null); setTimeCat(null); setCompareCats(null); setNoMovCat(null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [queryFrom, queryTo]);

  useEffect(() => { load(); }, [load]);

  // ── derived data ─────────────────────────────────────────────
  // All categories that appear in the current period's sales
  const allCats = [...new Set([
    ...(data?.topProducts ?? []).map(p => p.category),
    ...(data?.salesOverTimeByCategory ?? []).map(d => d.category),
  ].filter(Boolean))].sort();

  // Top products filtered
  const filteredTop = topCat
    ? (data?.topProducts ?? []).filter(p => p.category === topCat)
    : (data?.topProducts ?? []);

  // Time data: total or per-category
  const filteredTime = timeCat
    ? (data?.salesOverTimeByCategory ?? []).filter(d => d.category === timeCat)
    : (data?.salesOverTime ?? []);

  // Compare categories (multi-select filter)
  const filteredCompare = compareCats
    ? (data?.byCategory ?? []).filter(c => compareCats.includes(c.category))
    : (data?.byCategory ?? []);

  // No-movement filter
  const noMovCats = [...new Set((data?.noMovement ?? []).map(p => p.category).filter(Boolean))].sort();
  const filteredNoMov = noMovCat
    ? (data?.noMovement ?? []).filter(p => p.category === noMovCat)
    : (data?.noMovement ?? []);

  // ── CSV export ────────────────────────────────────────────────
  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Producto', 'Categoría', 'Unidades vendidas', 'Ingresos'],
      ...(data.topProducts ?? []).map(p => [p.product_name, p.category, p.total_qty, p.total_revenue]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `superhotdog_${queryFrom}_${queryTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── category filter pill component ───────────────────────────
  const CatPills = ({ value, onChange }) => (
    <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
          value === null ? 'border-brand-dark bg-brand-dark text-brand-yellow' : 'border-gray-200 text-gray-500'
        }`}
      >
        Todos
      </button>
      {allCats.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat === value ? null : cat)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
            value === cat ? 'border-brand-dark bg-brand-dark text-brand-yellow' : 'border-gray-200 text-gray-500'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );

  // ── compare category multi-select ────────────────────────────
  const toggleCompareCat = (cat) => {
    if (!compareCats) {
      setCompareCats((data?.byCategory ?? []).map(c => c.category).filter(c => c !== cat));
    } else if (compareCats.includes(cat)) {
      const next = compareCats.filter(c => c !== cat);
      setCompareCats(next.length === 0 ? null : next.length === (data?.byCategory ?? []).length ? null : next);
    } else {
      const next = [...compareCats, cat];
      setCompareCats(next.length === (data?.byCategory ?? []).length ? null : next);
    }
  };

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-black text-xl text-brand-dark">Analíticas</h1>
        <button onClick={exportCSV} className="flex items-center gap-1.5 text-sm font-semibold text-brand-dark bg-brand-yellow px-3 py-1.5 rounded-xl">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Period buttons */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map(p => (
          <button key={p.days} onClick={() => selectPeriod(p.days)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activePeriod === p.days && !customMode ? 'bg-brand-dark text-brand-yellow' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
            {p.label}
          </button>
        ))}
        <button onClick={() => setCustomMode(m => !m)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            customMode ? 'bg-brand-dark text-brand-yellow' : 'bg-white text-gray-600 border border-gray-200'
          }`}>
          Personalizado
        </button>
      </div>

      {/* Custom date inputs */}
      {customMode && (
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Desde</label>
              <input type="date" className="input text-sm" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" className="input text-sm" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          </div>
          <button onClick={applyCustom} disabled={!customFrom || !customTo} className="btn-primary w-full disabled:opacity-50">
            Aplicar
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card text-center p-3">
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="font-black text-brand-dark text-sm leading-tight">{COP(data.totalRevenue)}</p>
              <p className="text-xs text-gray-400">{data.totalCount} ventas</p>
            </div>
            <div className="card text-center p-3">
              <p className="text-xs text-gray-500 mb-1">Ticket prom.</p>
              <p className="font-black text-brand-dark text-sm leading-tight">{COP(data.avgTicket)}</p>
            </div>
            <div className="card text-center p-3">
              <p className="text-xs text-gray-500 mb-1">vs sem. ant.</p>
              {data.weekTrend !== null ? (
                <p className={`font-black text-sm ${data.weekTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {data.weekTrend >= 0 ? '↑' : '↓'} {Math.abs(data.weekTrend).toFixed(1)}%
                </p>
              ) : (
                <p className="text-xs text-gray-400">Sin datos</p>
              )}
            </div>
          </div>

          {/* Chart tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              ['productos', 'Top productos'],
              ['tiempo', 'En el tiempo'],
              ['categorias', 'Comparar categorías'],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setActiveChart(key)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  activeChart === key ? 'bg-brand-red text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Category filter — Top productos & En el tiempo */}
          {(activeChart === 'productos' || activeChart === 'tiempo') && allCats.length > 0 && (
            <CatPills
              value={activeChart === 'productos' ? topCat : timeCat}
              onChange={activeChart === 'productos' ? setTopCat : setTimeCat}
            />
          )}

          {/* Category multi-filter — Comparar categorías */}
          {activeChart === 'categorias' && (data?.byCategory ?? []).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {(data.byCategory).map(c => {
                const active = !compareCats || compareCats.includes(c.category);
                return (
                  <button key={c.category} onClick={() => toggleCompareCat(c.category)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                      active ? 'border-brand-dark bg-brand-dark text-brand-yellow' : 'border-gray-200 text-gray-400'
                    }`}>
                    {c.category}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chart type selector */}
          <div className="flex gap-2">
            {['Líneas', 'Barras', 'Torta'].map(t => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chartType === t ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="card p-4">
            {activeChart === 'productos' && (
              <ProductChart
                data={filteredTop}
                chartType={chartType}
                title={topCat ? `Top — ${topCat}` : 'Top productos'}
              />
            )}
            {activeChart === 'tiempo' && (
              <TimeChart
                data={filteredTime}
                chartType={chartType}
                title={timeCat ? `${timeCat} en el tiempo` : 'Ventas diarias (total)'}
              />
            )}
            {activeChart === 'categorias' && (
              <CategoryChart
                data={filteredCompare}
                chartType={chartType}
              />
            )}
          </div>

          {/* No-movement section — collapsible */}
          {data.noMovement.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              {/* Header / toggle */}
              <button
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setNoMovOpen(o => !o)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">😴</span>
                  <span className="font-bold text-amber-800 text-sm">
                    Sin ventas en 30 días ({filteredNoMov.length}{noMovCat ? ` en ${noMovCat}` : ''} / {data.noMovement.length} total)
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-amber-600 flex-shrink-0 transition-transform ${noMovOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {noMovOpen && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Category filter */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setNoMovCat(null)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                        noMovCat === null ? 'border-amber-600 bg-amber-600 text-white' : 'border-amber-300 text-amber-700'
                      }`}
                    >
                      Todas
                    </button>
                    {noMovCats.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setNoMovCat(c => c === cat ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                          noMovCat === cat ? 'border-amber-600 bg-amber-600 text-white' : 'border-amber-300 text-amber-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Product list */}
                  <div className="space-y-1">
                    {filteredNoMov.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-amber-800">{p.name}</span>
                        <span className="text-amber-600 text-xs">{p.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ── Chart components ─────────────────────────────────────────────

function TimeChart({ data, chartType, title }) {
  if (!data || data.length === 0) return <EmptyChart />;
  const fmt = data.map(d => ({ ...d, day: d.day.slice(5) }));

  if (chartType === 'Torta') {
    // Aggregate totals per day label for pie
    return (
      <div>
        <p className="font-bold text-sm mb-3 text-gray-700">{title}</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={fmt} dataKey="total" nameKey="day" cx="50%" cy="50%" outerRadius={90}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {fmt.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => [COP(v), 'Total']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'Barras') {
    return (
      <div>
        <p className="font-bold text-sm mb-3 text-gray-700">{title}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={fmt} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [COP(v), 'Total']} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {fmt.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Líneas (default)
  return (
    <div>
      <p className="font-bold text-sm mb-3 text-gray-700">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={fmt} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="day" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={v => [COP(v), 'Total']} labelFormatter={l => `Día: ${l}`} />
          <Line type="monotone" dataKey="total" stroke="#F59E0B" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProductChart({ data, chartType, title }) {
  if (!data || data.length === 0) return <EmptyChart />;
  const top = data.slice(0, 10);

  if (chartType === 'Torta') {
    return (
      <div>
        <p className="font-bold text-sm mb-3 text-gray-700">{title}</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={top} dataKey="total_qty" nameKey="product_name" cx="50%" cy="50%" outerRadius={90}
              label={({ name, percent }) => `${name?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v + ' uds', n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div>
      <p className="font-bold text-sm mb-3 text-gray-700">{title}</p>
      <ResponsiveContainer width="100%" height={Math.max(200, top.length * 32)}>
        <BarChart data={top} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="product_name" tick={{ fontSize: 9 }} width={110} />
          <Tooltip formatter={v => [v + ' uds', 'Vendidos']} />
          <Bar dataKey="total_qty" radius={[0, 4, 4, 0]}>
            {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryChart({ data, chartType }) {
  if (!data || data.length === 0) return <EmptyChart />;

  if (chartType === 'Torta') {
    return (
      <div>
        <p className="font-bold text-sm mb-3 text-gray-700">Ingresos por categoría</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={90}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => [COP(v), 'Ingresos']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div>
      <p className="font-bold text-sm mb-3 text-gray-700">Ingresos por categoría</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
          <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={v => [COP(v), 'Ingresos']} />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">Sin datos en este período</p>
    </div>
  );
}
