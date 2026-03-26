import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function fmt(v) { return '$' + Number(v).toLocaleString('es-CO'); }

export default function MenuManagement() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);  // [{ id, name, products: [] }]
  const [catList, setCatList] = useState([]);         // [{ id, name }] for dropdowns
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});       // { categoryId: bool }

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);   // product object
  const [deleteModal, setDeleteModal] = useState(null); // product object

  const load = async () => {
    try {
      const [allRes, catRes] = await Promise.all([
        api.get('/products/all'),
        api.get('/products/categories'),
      ]);
      setCategories(allRes.data);
      setCatList(catRes.data);
      // Expand all by default
      const exp = {};
      allRes.data.forEach(c => { exp[c.id] = true; });
      setExpanded(exp);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleToggleActive = async (product) => {
    await api.put(`/products/${product.id}`, { active: !product.active });
    await load();
  };

  const handleEdit = async (id, data) => {
    await api.put(`/products/${id}`, data);
    setEditModal(null);
    await load();
  };

  const handleAdd = async (data) => {
    await api.post('/products', data);
    setAddModal(false);
    await load();
  };

  const handleDelete = async (id) => {
    await api.delete(`/products/${id}`);
    setDeleteModal(null);
    await load();
  };

  const totalProducts = categories.reduce((n, c) => n + c.products.length, 0);
  const activeProducts = categories.reduce((n, c) => n + c.products.filter(p => p.active).length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/configuracion')} className="text-gray-500 hover:text-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-black text-xl text-brand-dark">Gestión de Menú</h1>
            <p className="text-xs text-gray-400">{activeProducts} activos · {totalProducts} total</p>
          </div>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-1.5 bg-brand-dark text-brand-yellow text-sm font-bold px-3 py-2 rounded-xl"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar
        </button>
      </div>

      {/* Category sections */}
      {categories.map(cat => (
        <div key={cat.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Category header */}
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50"
            onClick={() => toggleExpand(cat.id)}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700">{cat.name}</span>
              <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                {cat.products.filter(p => p.active).length}/{cat.products.length}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded[cat.id] ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Products list */}
          {expanded[cat.id] && (
            <div className="divide-y divide-gray-100">
              {cat.products.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 italic">Sin productos en esta categoría</p>
              ) : cat.products.map(product => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between px-4 py-3 transition-colors ${
                    !product.active ? 'bg-gray-50 opacity-60' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm text-gray-800 ${!product.active ? 'line-through text-gray-400' : ''}`}>
                        {product.name}
                      </p>
                      {!product.active && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Inactivo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-brand-red">{fmt(product.price)}</span>
                      {product.combo_price && (
                        <span className="text-xs text-gray-400">Combo: {fmt(product.combo_price)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2">
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleActive(product)}
                      title={product.active ? 'Desactivar' : 'Activar'}
                      className={`p-2 rounded-lg transition-colors ${
                        product.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {product.active ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditModal(product)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteModal(product)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add product modal */}
      {addModal && (
        <ProductFormModal
          title="Nuevo producto"
          categories={catList}
          onConfirm={handleAdd}
          onClose={() => setAddModal(false)}
        />
      )}

      {/* Edit product modal */}
      {editModal && (
        <ProductFormModal
          title="Editar producto"
          initial={editModal}
          categories={catList}
          onConfirm={(data) => handleEdit(editModal.id, data)}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-black text-lg text-gray-800">¿Eliminar producto?</h3>
            <p className="text-gray-500 text-sm">
              <span className="font-semibold text-gray-700">"{deleteModal.name}"</span> se eliminará del menú.
              Las ventas pasadas no se verán afectadas.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDelete(deleteModal.id)} className="btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductFormModal({ title, initial, categories, onConfirm, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    category_id: initial?.category_id ?? (categories[0]?.id ?? ''),
    price: initial?.price ?? '',
    combo_price: initial?.combo_price ?? '',
    description: initial?.description ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If editing, we don't change category_id (product stays in its category)
  const isEditing = !!initial;

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('El nombre es requerido.');
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) return setError('Ingresa un precio válido.');
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        combo_price: form.combo_price !== '' ? Number(form.combo_price) : null,
        description: form.description.trim() || null,
      };
      if (!isEditing) payload.category_id = Number(form.category_id);
      await onConfirm(payload);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <label className="label">Nombre del producto</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Super Dog" autoFocus />
        </div>

        {!isEditing && (
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Precio</label>
            <input
              type="number" className="input" placeholder="20000" min="0"
              value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Precio combo <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="number" className="input" placeholder="28000" min="0"
              value={form.combo_price} onChange={e => setForm(f => ({ ...f, combo_price: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="label">Descripción <span className="text-gray-400 font-normal">(ingredientes, opcional)</span></label>
          <textarea
            className="input resize-none" rows={3}
            placeholder="Ej: Pan brioche, salchicha, cebolla, queso..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">Separa los ingredientes con comas para que aparezcan como opciones de "Quitar ingredientes" en la venta.</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? '...' : isEditing ? 'Guardar cambios' : 'Agregar producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
