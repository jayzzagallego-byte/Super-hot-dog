import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const PAYMENT_LABELS = {
  efectivo: { label: 'Efectivo', color: 'bg-green-100 text-green-800' },
  datafono: { label: 'Datáfono', color: 'bg-blue-100 text-blue-800' },
  transferencia: { label: 'Transferencia', color: 'bg-purple-100 text-purple-800' },
  nequi: { label: 'Nequi', color: 'bg-pink-100 text-pink-800' },
  daviplata: { label: 'Daviplata', color: 'bg-orange-100 text-orange-800' },
};

const CHANNEL_LABELS = {
  restaurante: { label: 'Restaurante', icon: '🍽️' },
  domicilio: { label: 'Domicilio', icon: '🛵' },
  rappi: { label: 'Rappi', icon: '🟠' },
};

function fmt(v) { return '$' + Number(v).toLocaleString('es-CO'); }

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({ from: today, to: today, payment_method: '', channel: '' });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.payment_method) params.payment_method = filters.payment_method;
      if (filters.channel) params.channel = filters.channel;
      const res = await api.get('/sales', { params });
      setSales(res.data.sales);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/sales/${id}`);
      setSales(prev => prev.filter(s => s.id !== id));
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const dailyTotal = sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      {/* Filters */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-700">Filtros</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              className="input text-sm"
              value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              className="input text-sm"
              value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Pago</label>
            <select
              className="input text-sm"
              value={filters.payment_method}
              onChange={e => setFilters(f => ({ ...f, payment_method: e.target.value }))}
            >
              <option value="">Todos</option>
              {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Canal</label>
            <select
              className="input text-sm"
              value={filters.channel}
              onChange={e => setFilters(f => ({ ...f, channel: e.target.value }))}
            >
              <option value="">Todos</option>
              {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between bg-brand-dark text-white rounded-2xl px-4 py-3">
        <span className="text-gray-400 text-sm">{total} ventas encontradas</span>
        <span className="font-black text-brand-yellow text-lg">{fmt(dailyTotal)}</span>
      </div>

      {/* Sales list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full" />
        </div>
      ) : sales.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">🔍</div>
          <p className="font-medium">Sin ventas en este período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => {
            const pm = PAYMENT_LABELS[sale.payment_method];
            const ch = CHANNEL_LABELS[sale.channel];
            const date = new Date(sale.date);
            const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const isExpanded = expandedId === sale.id;

            return (
              <div key={sale.id} className="card">
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ch?.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`badge ${pm?.color}`}>{pm?.label}</span>
                        <span className="text-xs text-gray-400">{ch?.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{dateStr} · {timeStr}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-800">{fmt(sale.total)}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {sale.items?.map(item => (
                      <div key={item.id} className="flex items-start justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-700">{item.quantity}× {item.product_name}</span>
                          {item.is_combo ? <span className="text-xs text-brand-red ml-1">Combo</span> : null}
                          {item.base && <span className="text-xs text-gray-500 ml-1">({item.base})</span>}
                          {item.additions?.length > 0 && (
                            <p className="text-xs text-gray-400">+ {item.additions.join(', ')}</p>
                          )}
                          {item.removals?.length > 0 && (
                            <p className="text-xs text-red-400">Sin: {item.removals.join(', ')}</p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-700 ml-2">{fmt(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                    {sale.notes && (
                      <p className="text-xs text-gray-500 italic">Nota: {sale.notes}</p>
                    )}
                    <button
                      onClick={() => setDeleteId(sale.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 mt-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar venta
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-black text-lg text-gray-800">¿Eliminar venta?</h3>
            <p className="text-gray-500 text-sm">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
