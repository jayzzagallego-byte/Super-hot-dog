import { useState, useEffect } from 'react';
import api from '../api/client';
import { useShift } from '../context/ShiftContext';

const PAYMENT_LABELS = {
  efectivo:      { label: 'Efectivo',      color: 'bg-green-100 text-green-800',   dot: 'bg-green-500' },
  datafono:      { label: 'Datáfono',      color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500' },
  transferencia: { label: 'Transferencia', color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  nequi:         { label: 'Nequi',         color: 'bg-pink-100 text-pink-800',     dot: 'bg-pink-500' },
  daviplata:     { label: 'Daviplata',     color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
};

const CHANNEL_LABELS = {
  restaurante: { label: 'Restaurante', icon: '🍽️', color: 'bg-indigo-100 text-indigo-800' },
  domicilio:   { label: 'Domicilio',   icon: '🛵', color: 'bg-teal-100 text-teal-800' },
  rappi:       { label: 'Rappi',       icon: '🟠', color: 'bg-orange-100 text-orange-800' },
};

function fmt(value) {
  return '$' + Number(value).toLocaleString('es-CO');
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [shiftOpen, setShiftOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const { shift, shiftTotal, startShift, endShift, updateOpeningCash } = useShift();

  useEffect(() => {
    api.get('/sales/stats/summary')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full" />
      </div>
    );
  }

  const data = stats?.[period] || {};
  const periodLabels = { today: 'Hoy', week: 'Esta semana', month: 'Este mes' };

  const payments = Object.entries(PAYMENT_LABELS)
    .map(([key, meta]) => ({ key, ...meta, value: data[key] || 0 }))
    .filter(p => p.value > 0);

  const channels = Object.entries(CHANNEL_LABELS)
    .map(([key, meta]) => ({ key, ...meta, value: data[key] || 0 }))
    .filter(c => c.value > 0);

  return (
    <div className="px-4 pt-5 pb-4 space-y-5">
      {/* Period selector */}
      <div className="flex gap-2">
        {Object.entries(periodLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              period === key
                ? 'bg-brand-dark text-brand-yellow shadow'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main stat */}
      <div className="card bg-brand-dark text-white">
        <p className="text-gray-400 text-sm font-medium">Total vendido — {periodLabels[period]}</p>
        <p className="text-4xl font-black text-brand-yellow mt-1">{fmt(data.total || 0)}</p>
        <p className="text-gray-400 text-sm mt-1">{data.count || 0} ventas registradas</p>
      </div>

      {/* Payment breakdown */}
      {payments.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-3">Por método de pago</h3>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                  <span className="text-sm text-gray-700">{p.label}</span>
                </div>
                <span className="font-semibold text-gray-900">{fmt(p.value)}</span>
              </div>
            ))}
          </div>
          {data.total > 0 && (
            <div className="flex rounded-full overflow-hidden h-2 mt-3">
              {payments.map(p => (
                <div
                  key={p.key}
                  className={p.dot}
                  style={{ width: `${(p.value / data.total) * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channel breakdown */}
      {channels.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-3">Por canal de venta</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(CHANNEL_LABELS).map(([key, meta]) => (
              <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{meta.icon}</div>
                <div className="text-xs text-gray-500 font-medium">{meta.label}</div>
                <div className="font-bold text-gray-800 text-sm mt-0.5">{fmt(data[key] || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {payments.length === 0 && channels.length === 0 && (
        <div className="card text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          <p className="font-medium">Sin ventas en este período</p>
          <p className="text-sm mt-1">Las estadísticas aparecerán aquí</p>
        </div>
      )}

      {/* Recent sales */}
      {stats?.recent?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-3">Ventas recientes</h3>
          <div className="space-y-2">
            {stats.recent.map(sale => {
              const pm = PAYMENT_LABELS[sale.payment_method];
              const ch = CHANNEL_LABELS[sale.channel];
              const date = new Date(sale.date);
              const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
              return (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ch?.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`badge ${pm?.color}`}>{pm?.label}</span>
                        <span className={`badge ${ch?.color}`}>{ch?.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{dateStr} · {timeStr}</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-800">{fmt(sale.total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shift buttons */}
      {shift ? (
        <button
          onClick={() => setShiftOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold text-sm hover:border-brand-dark hover:text-brand-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Resumen del turno
        </button>
      ) : (
        <button
          onClick={() => setStartOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors shadow"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Empezar turno
        </button>
      )}

      {/* Start shift modal */}
      {startOpen && (
        <StartShiftModal
          onStart={async (cash) => { await startShift(cash); setStartOpen(false); }}
          onClose={() => setStartOpen(false)}
        />
      )}

      {/* Shift summary modal */}
      {shiftOpen && (
        <ShiftSummaryModal
          today={stats?.today || {}}
          shift={shift}
          shiftTotal={shiftTotal}
          updateOpeningCash={updateOpeningCash}
          onEnd={() => { endShift(); setShiftOpen(false); }}
          onClose={() => setShiftOpen(false)}
        />
      )}
    </div>
  );
}

function StartShiftModal({ onStart, onClose }) {
  const [cash, setCash] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try { await onStart(cash); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="bg-green-500 text-white px-6 pt-6 pb-5 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-100 text-xs uppercase tracking-wide font-semibold">Nuevo turno</p>
              <p className="text-white font-bold text-lg mt-0.5">Empezar turno</p>
            </div>
            <button onClick={onClose} className="text-green-200 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Base de efectivo en caja</label>
            <p className="text-xs text-gray-400 mb-2">Monto con el que abre el restaurante</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
              <input
                type="number"
                value={cash}
                onChange={e => setCash(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-4 py-3 border border-gray-300 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-400"
                autoFocus
              />
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={loading}
            className="btn-primary w-full bg-green-500 hover:bg-green-600"
          >
            {loading ? 'Iniciando...' : 'Iniciar turno'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShiftSummaryModal({ today, shift, shiftTotal, updateOpeningCash, onEnd, onClose }) {
  const [editingCash, setEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState(shift?.openingCash ?? 0);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const payments = Object.entries(PAYMENT_LABELS)
    .map(([key, meta]) => ({ ...meta, value: today[key] || 0 }))
    .filter(p => p.value > 0);

  const channels = Object.entries(CHANNEL_LABELS)
    .map(([key, meta]) => ({ ...meta, value: today[key] || 0 }))
    .filter(c => c.value > 0);

  const cashCollected = today.efectivo || 0;
  const digitalTotal = (today.datafono || 0) + (today.transferencia || 0) + (today.nequi || 0) + (today.daviplata || 0);
  const openingCash = shift?.openingCash || 0;
  const expectedInRegister = openingCash + cashCollected;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-brand-dark text-white px-6 pt-6 pb-5 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Resumen del turno</p>
              <p className="text-brand-yellow font-bold text-sm mt-0.5 capitalize">{dateStr}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-sm">Vendido en este turno</p>
            <p className="text-4xl font-black text-brand-yellow mt-0.5">{fmt(shiftTotal)}</p>
            <p className="text-gray-400 text-sm mt-1">{today.count || 0} ventas hoy · ticket promedio {fmt(today.count > 0 ? Math.round(today.total / today.count) : 0)}</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Opening cash */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600">Base de efectivo</p>
              <button
                onClick={() => { setEditingCash(!editingCash); setCashInput(openingCash); }}
                className="text-xs text-blue-500 font-semibold"
              >
                {editingCash ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            {editingCash ? (
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                  <input
                    type="number"
                    value={cashInput}
                    onChange={e => setCashInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => { updateOpeningCash(cashInput); setEditingCash(false); }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold text-sm"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <p className="text-2xl font-black text-gray-800 mt-1">{fmt(openingCash)}</p>
            )}
          </div>

          {/* Cash vs Digital summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-2xl p-4 text-center">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Efectivo cobrado</p>
              <p className="text-2xl font-black text-green-800 mt-1">{fmt(cashCollected)}</p>
              <p className="text-xs text-green-600 mt-1 font-medium">En caja: {fmt(expectedInRegister)}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 text-center">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Digital</p>
              <p className="text-2xl font-black text-blue-800 mt-1">{fmt(digitalTotal)}</p>
              <p className="text-xs text-blue-600 mt-0.5">Transferencias / tarjeta</p>
            </div>
          </div>

          {/* Payment breakdown */}
          {payments.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-700 text-sm mb-2">Detalle por pago</h4>
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                      <span className="text-sm text-gray-600">{p.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{fmt(p.value)}</span>
                      {today.total > 0 && (
                        <span className="text-xs text-gray-400 w-10 text-right">
                          {Math.round((p.value / today.total) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {today.total > 0 && (
                <div className="flex rounded-full overflow-hidden h-2 mt-3 gap-0.5">
                  {payments.map((p, i) => (
                    <div key={i} className={`${p.dot} rounded-full`} style={{ width: `${(p.value / today.total) * 100}%` }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Channel breakdown */}
          {channels.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-700 text-sm mb-2">Por canal</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CHANNEL_LABELS).map(([key, meta]) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-xl">{meta.icon}</div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">{meta.label}</div>
                    <div className="font-bold text-gray-800 text-sm">{fmt(today[key] || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {today.count === 0 && (
            <div className="text-center py-6 text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="font-medium">Sin ventas registradas hoy</p>
            </div>
          )}

          {confirmEnd ? (
            <div className="bg-red-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-red-700 text-center">¿Cerrar el turno?</p>
              <p className="text-xs text-red-500 text-center">El contador del turno se reiniciará</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmEnd(false)} className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm">
                  Cancelar
                </button>
                <button onClick={onEnd} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm">
                  Sí, cerrar turno
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 btn-primary">
                Cerrar resumen
              </button>
              <button
                onClick={() => setConfirmEnd(true)}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
              >
                Cerrar turno
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
