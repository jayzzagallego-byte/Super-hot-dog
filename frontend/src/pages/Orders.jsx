import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function fmt(v) { return '$' + Number(v).toLocaleString('es-CO'); }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr.replace(' ', 'T') + 'Z').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Hace ${hrs}h ${mins % 60}min`;
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const loadOrders = () => {
    api.get('/orders')
      .then(res => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const createOrder = async () => {
    if (!identifier.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/orders', { identifier });
      navigate(`/ordenes/${res.data.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-gray-800">Órdenes activas</h1>
        <button
          onClick={() => { setIdentifier(''); setShowNewModal(true); }}
          className="btn-primary text-sm px-4 py-2"
        >
          + Nueva orden
        </button>
      </div>

      {/* Quick sale link */}
      <button
        onClick={() => navigate('/nueva-venta')}
        className="w-full mb-4 flex items-center justify-between px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-brand-yellow hover:text-brand-dark transition-colors"
      >
        <span className="font-semibold text-sm">⚡ Venta rápida</span>
        <span className="text-xs">Rappi, domicilio sin espera</span>
      </button>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="font-semibold">No hay órdenes abiertas</p>
          <p className="text-sm mt-1">Crea una nueva orden para empezar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <button
              key={order.id}
              onClick={() => navigate(`/ordenes/${order.id}`)}
              className="w-full card text-left active:scale-95 transition-transform hover:border-brand-yellow hover:border-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-black text-gray-800 text-base">{order.identifier}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-brand-red text-lg">{fmt(order.total)}</p>
                  <p className="text-xs text-gray-400">{order.item_count} ítem{order.item_count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New order modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-black text-lg text-gray-800">Nueva orden</h3>
            <div>
              <label className="label">Mesa / Nombre / Descripción</label>
              <input
                className="input"
                placeholder="Ej: Mesa 3, Juan, Para llevar..."
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createOrder()}
                autoFocus
              />
            </div>
            <button
              onClick={createOrder}
              disabled={!identifier.trim() || creating}
              className="btn-primary w-full disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear orden →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
