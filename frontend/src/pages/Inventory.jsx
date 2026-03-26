import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Inventory() {
  const [tab, setTab] = useState('ingredientes');
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  // Modals
  const [movementModal, setMovementModal] = useState(null); // { ingredient, type: 'entrada'|'salida' }
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/inventory'), api.get('/inventory/alerts')])
      .then(([ingRes, alertRes]) => {
        setIngredients(ingRes.data);
        setAlerts(alertRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const refreshIngredients = async () => {
    const [ingRes, alertRes] = await Promise.all([
      api.get('/inventory'),
      api.get('/inventory/alerts'),
    ]);
    setIngredients(ingRes.data);
    setAlerts(alertRes.data);
  };

  const handleMovement = async (ingredient, type, quantity, notes) => {
    await api.post(`/inventory/${ingredient.id}/${type}`, { quantity: parseFloat(quantity), notes });
    await refreshIngredients();
    setMovementModal(null);
  };

  const handleAdd = async (data) => {
    await api.post('/inventory', data);
    await refreshIngredients();
    setAddModal(false);
  };

  const handleEdit = async (id, data) => {
    await api.put(`/inventory/${id}`, data);
    await refreshIngredients();
    setEditModal(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este ingrediente?')) return;
    await api.delete(`/inventory/${id}`);
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      {/* Low stock alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <h3 className="font-bold text-red-700">Stock bajo ({alerts.length})</h3>
          </div>
          <div className="space-y-1">
            {alerts.map(a => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-red-700">{a.name}</span>
                <span className="text-red-600 font-semibold">{a.stock} {a.unit} (mín. {a.min_stock})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('ingredientes')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'ingredientes' ? 'bg-brand-dark text-brand-yellow' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Ingredientes
        </button>
        <button
          onClick={() => setTab('movimientos')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'movimientos' ? 'bg-brand-dark text-brand-yellow' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Movimientos
        </button>
      </div>

      {tab === 'ingredientes' && (
        <>
          <button
            onClick={() => setAddModal(true)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <span>+ Agregar ingrediente</span>
          </button>

          <div className="space-y-2">
            {ingredients.map(ing => {
              const isLow = ing.stock <= ing.min_stock;
              return (
                <div key={ing.id} className={`card ${isLow ? 'border-red-200 bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{ing.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-lg font-black ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
                          {ing.stock}
                        </span>
                        <span className="text-sm text-gray-500">{ing.unit}</span>
                        {isLow && <span className="badge bg-red-100 text-red-700">Stock bajo</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Mínimo: {ing.min_stock} {ing.unit}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 ml-3">
                      <button
                        onClick={() => setMovementModal({ ingredient: ing, type: 'entrada' })}
                        className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-bold"
                      >
                        + Entrada
                      </button>
                      <button
                        onClick={() => setMovementModal({ ingredient: ing, type: 'salida' })}
                        className="px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg text-xs font-bold"
                      >
                        − Salida
                      </button>
                      <button
                        onClick={() => setEditModal(ing)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'movimientos' && (
        <MovementsTab />
      )}

      {/* Movement modal */}
      {movementModal && (
        <MovementModal
          ingredient={movementModal.ingredient}
          type={movementModal.type}
          onConfirm={handleMovement}
          onClose={() => setMovementModal(null)}
        />
      )}

      {/* Add ingredient modal */}
      {addModal && (
        <AddIngredientModal
          onConfirm={handleAdd}
          onClose={() => setAddModal(false)}
        />
      )}

      {/* Edit ingredient modal */}
      {editModal && (
        <EditIngredientModal
          ingredient={editModal}
          onConfirm={handleEdit}
          onDelete={handleDelete}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}

function MovementsTab() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/inventory/movements', { params: { limit: 100 } })
      .then(res => setMovements(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const typeStyles = {
    entrada: 'bg-green-100 text-green-800',
    salida: 'bg-orange-100 text-orange-800',
    venta: 'bg-blue-100 text-blue-800',
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-brand-yellow border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-2">
      {movements.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          <p>Sin movimientos registrados</p>
        </div>
      ) : movements.map(m => {
        const date = new Date(m.date);
        const str = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) +
          ' ' + date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        return (
          <div key={m.id} className="card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`badge ${typeStyles[m.type] || 'bg-gray-100 text-gray-700'}`}>
                  {m.type === 'entrada' ? '↑ Entrada' : m.type === 'salida' ? '↓ Salida' : '🛒 Venta'}
                </span>
                <span className="font-semibold text-sm text-gray-800">{m.ingredient_name}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{str} · {m.notes}</p>
            </div>
            <span className={`font-black text-sm ml-2 ${m.type === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
              {m.type === 'entrada' ? '+' : '-'}{m.quantity}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MovementModal({ ingredient, type, onConfirm, onClose }) {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    setLoading(true);
    try {
      await onConfirm(ingredient, type, quantity, notes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4">
        <h3 className="font-black text-lg">
          {type === 'entrada' ? '↑ Entrada' : '↓ Salida'} — {ingredient.name}
        </h3>
        <p className="text-sm text-gray-500">Stock actual: {ingredient.stock} {ingredient.unit}</p>
        <div>
          <label className="label">Cantidad ({ingredient.unit})</label>
          <input
            type="number"
            className="input"
            placeholder="0"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Notas (opcional)</label>
          <input
            type="text"
            className="input"
            placeholder="Ej: Compra mercado"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !quantity}
            className={`flex-1 font-bold py-3 px-6 rounded-xl transition-colors ${
              type === 'entrada'
                ? 'bg-green-500 text-white active:scale-95'
                : 'bg-orange-500 text-white active:scale-95'
            } disabled:opacity-50`}
          >
            {loading ? '...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddIngredientModal({ onConfirm, onClose }) {
  const [form, setForm] = useState({ name: '', unit: 'unidades', stock: '0', min_stock: '5' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.unit) return;
    setLoading(true);
    try {
      await onConfirm({
        name: form.name,
        unit: form.unit,
        stock: parseFloat(form.stock) || 0,
        min_stock: parseFloat(form.min_stock) || 5,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4">
        <h3 className="font-black text-lg">Nuevo ingrediente</h3>
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Pan Brioche" autoFocus />
        </div>
        <div>
          <label className="label">Unidad de medida</label>
          <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
            <option>unidades</option>
            <option>gramos</option>
            <option>kilogramos</option>
            <option>litros</option>
            <option>mililitros</option>
            <option>porciones</option>
            <option>hojas</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Stock inicial</label>
            <input type="number" className="input" value={form.stock} min="0" onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
          </div>
          <div>
            <label className="label">Stock mínimo</label>
            <input type="number" className="input" value={form.min_stock} min="0" onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || !form.name} className="btn-primary flex-1">
            {loading ? '...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditIngredientModal({ ingredient, onConfirm, onDelete, onClose }) {
  const [form, setForm] = useState({
    name: ingredient.name,
    unit: ingredient.unit,
    min_stock: String(ingredient.min_stock),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm(ingredient.id, {
        name: form.name,
        unit: form.unit,
        min_stock: parseFloat(form.min_stock) || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4">
        <h3 className="font-black text-lg">Editar ingrediente</h3>
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Unidad de medida</label>
          <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
            <option>unidades</option>
            <option>gramos</option>
            <option>kilogramos</option>
            <option>litros</option>
            <option>mililitros</option>
            <option>porciones</option>
            <option>hojas</option>
          </select>
        </div>
        <div>
          <label className="label">Stock mínimo</label>
          <input type="number" className="input" value={form.min_stock} min="0" onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => onDelete(ingredient.id)} className="btn-danger px-4 py-3 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? '...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
