import { useState, useEffect } from 'react';
import api from '../api/client';

const PAYMENT_LABELS = {
  efectivo: { label: 'Efectivo', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  datafono: { label: 'Datáfono', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  transferencia: { label: 'Transferencia', color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  nequi: { label: 'Nequi', color: 'bg-pink-100 text-pink-800', dot: 'bg-pink-500' },
  daviplata: { label: 'Daviplata', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  llave: { label: 'Llave', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
};

const CHANNEL_LABELS = {
  restaurante: { label: 'Restaurante', icon: '🍽️', color: 'bg-indigo-100 text-indigo-800' },
  domicilio: { label: 'Domicilio', icon: '🛵', color: 'bg-teal-100 text-teal-800' },
  rappi: { label: 'Rappi', icon: '🟠', color: 'bg-orange-100 text-orange-800' },
};

function fmt(value) {
  return '$' + Number(value).toLocaleString('es-CO');
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

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
          {/* Visual bar */}
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
            {Object.entries(CHANNEL_LABELS).map(([key, meta]) => {
              const value = data[key] || 0;
              return (
                <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{meta.icon}</div>
                  <div className="text-xs text-gray-500 font-medium">{meta.label}</div>
                  <div className="font-bold text-gray-800 text-sm mt-0.5">{fmt(value)}</div>
                </div>
              );
            })}
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
    </div>
  );
}
