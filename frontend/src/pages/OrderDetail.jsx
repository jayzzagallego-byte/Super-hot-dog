import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useShift } from '../context/ShiftContext';

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo', icon: '💵' },
  { key: 'datafono', label: 'Datáfono', icon: '💳' },
  { key: 'transferencia', label: 'Transferencia', icon: '🏦' },
  { key: 'nequi', label: 'Nequi', icon: '📱' },
  { key: 'daviplata', label: 'Daviplata', icon: '📲' },
];
const CHANNELS = [
  { key: 'restaurante', label: 'Restaurante', icon: '🍽️' },
  { key: 'domicilio', label: 'Domicilio', icon: '🛵' },
  { key: 'rappi', label: 'Rappi', icon: '🟠' },
];
const BASES = ['Pan', 'Arepa', 'Tortilla', 'Lechuga'];
const BASE_CATEGORIES = ['Hot Dogs', 'Burgers', 'Hamburguesas'];
const NO_ADDITIONS_CATEGORIES = ['Adiciones', 'Bebidas'];
const SALSAS = ['Salsa de ajo', 'Tomate', 'Mostaza', 'Piña', 'Rosada', 'BBQ'];
const SALSAS_CATEGORIES = ['Hot Dogs', 'Hamburguesas', 'Mazorcadas'];

function fmt(v) { return '$' + Number(v).toLocaleString('es-CO'); }

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshTotal } = useShift();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('detail'); // 'detail' | 'addItems' | 'checkout'

  // Product picker
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [modal, setModal] = useState(null);

  // Checkout
  const [paymentMethod, setPaymentMethod] = useState('');
  const [channel, setChannel] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paidTotal, setPaidTotal] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
    } catch {
      navigate('/ordenes');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadOrder();
    api.get('/products').then(res => {
      setCategories(res.data);
      if (res.data.length > 0) setActiveCategory(res.data[0].id);
    });
  }, [loadOrder]);

  const additionProducts = categories.find(c => c.name === 'Adiciones')?.products || [];
  const allBebidas = categories.find(c => c.name === 'Bebidas')?.products || [];
  const comboDrinks = allBebidas.filter(p => p.name.includes('400')).length > 0
    ? allBebidas.filter(p => p.name.includes('400'))
    : allBebidas;

  const openModal = (product, categoryName) => {
    setModal({
      product,
      categoryName,
      isCombo: false,
      base: BASE_CATEGORIES.includes(categoryName) ? 'Pan' : null,
      additions: [],
      quantity: 1,
    });
  };

  const addItemToOrder = async () => {
    if (!modal) return;
    const { product, isCombo, base, combo_drink, additions, removals, salsas, quantity } = modal;
    const unitPrice = isCombo && product.combo_price ? product.combo_price : product.price;
    const additionsTotal = (additions || []).reduce((sum, a) => sum + a.price, 0);
    try {
      await api.post(`/orders/${id}/items`, {
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: unitPrice + additionsTotal,
        is_combo: isCombo,
        base,
        combo_drink: combo_drink || null,
        additions: (additions || []).map(a => a.name),
        removals: removals || [],
        salsas: salsas || [],
      });
      setModal(null);
      await loadOrder();
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/orders/${id}/items/${itemId}`);
      await loadOrder();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckout = async () => {
    if (!paymentMethod) return setError('Selecciona el método de pago.');
    if (!channel) return setError('Selecciona el canal de venta.');
    setError('');
    setSubmitting(true);
    try {
      setPaidTotal(orderTotal);
      await api.post(`/orders/${id}/checkout`, { payment_method: paymentMethod, channel, notes });
      await refreshTotal();
      setSuccess(true);
      setTimeout(() => navigate('/ordenes'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el pago.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async () => {
    try {
      await api.delete(`/orders/${id}`);
      navigate('/ordenes');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full" />
    </div>
  );

  if (success) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="text-7xl mb-4">✅</div>
      <h2 className="text-2xl font-black text-gray-800">¡Pago registrado!</h2>
      <p className="text-gray-500 mt-2">{order?.identifier} · {fmt(paidTotal)}</p>
    </div>
  );

  const orderTotal = order?.items?.reduce((s, i) => s + i.unit_price * i.quantity, 0) || 0;
  const currentCategory = categories.find(c => c.id === activeCategory);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0 border-b border-gray-100">
        <button
          onClick={() => view === 'detail' ? navigate('/ordenes') : setView('detail')}
          className="text-gray-500"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-gray-800 text-lg leading-tight truncate">{order?.identifier}</h1>
          <p className="text-xs text-gray-400">
            {view === 'detail' ? 'Orden abierta' : view === 'addItems' ? 'Agregar productos' : 'Cobrar'}
          </p>
        </div>
        {view === 'detail' && orderTotal > 0 && (
          <span className="font-black text-brand-red">{fmt(orderTotal)}</span>
        )}
      </div>

      {/* ── DETAIL VIEW ── */}
      {view === 'detail' && (
        <>
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-3">
            {order?.items?.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">🛒</p>
                <p className="font-semibold">Sin productos aún</p>
                <p className="text-sm">Toca "Agregar productos" para empezar</p>
              </div>
            ) : (
              <div className="card space-y-3">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{item.product_name}</p>
                      {item.is_combo === 1 && <p className="text-xs text-brand-red">Combo</p>}
                      {item.base && <p className="text-xs text-gray-500">Base: {item.base}</p>}
                      {item.combo_drink && <p className="text-xs text-blue-500">🥤 {item.combo_drink}</p>}
                      {item.salsas?.length > 0 && <p className="text-xs text-green-600">Salsas: {item.salsas.join(', ')}</p>}
                      {item.removals?.length > 0 && <p className="text-xs text-red-500">Sin: {item.removals.join(', ')}</p>}
                      {item.additions?.length > 0 && <p className="text-xs text-gray-500">+ {item.additions.join(', ')}</p>}
                      <p className="text-sm font-bold text-gray-700 mt-1">{fmt(item.unit_price)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="font-bold text-gray-800 text-sm">{fmt(item.unit_price * item.quantity)}</span>
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-brand-red">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-black text-lg pt-1">
                  <span>Total</span>
                  <span className="text-brand-red">{fmt(orderTotal)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 pb-4 flex-shrink-0 space-y-2 pt-2">
            <button
              onClick={() => setView('addItems')}
              className="w-full py-3 rounded-xl border-2 border-brand-dark text-brand-dark font-bold"
            >
              + Agregar productos
            </button>
            {order?.items?.length > 0 && (
              <button
                onClick={() => setView('checkout')}
                className="btn-primary w-full flex items-center justify-between"
              >
                <span>Cobrar</span>
                <span>{fmt(orderTotal)}</span>
              </button>
            )}
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full py-2 text-red-400 text-sm font-semibold"
            >
              Cancelar orden
            </button>
          </div>
        </>
      )}

      {/* ── ADD ITEMS VIEW ── */}
      {view === 'addItems' && (
        <>
          <div className="flex overflow-x-auto gap-2 px-4 py-2 scrollbar-hide flex-shrink-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors flex-shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-brand-dark text-brand-yellow'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 py-2">
              {currentCategory?.products.map(product => (
                <button
                  key={product.id}
                  onClick={() => openModal(product, currentCategory.name)}
                  className="card text-left active:scale-95 transition-transform hover:border-brand-yellow hover:border-2"
                >
                  <p className="font-semibold text-sm text-gray-800 leading-tight">{product.name}</p>
                  <p className="text-brand-red font-bold mt-2">{fmt(product.price)}</p>
                  {product.combo_price && (
                    <p className="text-xs text-gray-500 mt-0.5">Combo: {fmt(product.combo_price)}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── CHECKOUT VIEW ── */}
      {view === 'checkout' && (
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
          {/* Order summary */}
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-2">Resumen</h3>
            {order?.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">{item.quantity}× {item.product_name}</span>
                <span className="font-semibold">{fmt(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between font-black text-lg pt-2">
              <span>Total</span>
              <span className="text-brand-red">{fmt(orderTotal)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-3">Método de pago</h3>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.key}
                  onClick={() => setPaymentMethod(pm.key)}
                  className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-colors ${
                    paymentMethod === pm.key ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{pm.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 mt-1 text-center leading-tight">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Channel */}
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-3">Canal de venta</h3>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch.key}
                  onClick={() => setChannel(ch.key)}
                  className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-colors ${
                    channel === ch.key ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{ch.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 mt-1 text-center">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <label className="label">Notas (opcional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <button
            onClick={handleCheckout}
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting
              ? <span className="animate-spin w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full" />
              : `Registrar pago — ${fmt(orderTotal)}`}
          </button>
          <div className="h-4" />
        </div>
      )}

      {/* Item customization modal */}
      {modal && (
        <ItemModal
          modal={modal}
          setModal={setModal}
          additionProducts={additionProducts}
          comboDrinks={comboDrinks}
          onAdd={addItemToOrder}
        />
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-black text-gray-800 text-lg">¿Cancelar orden?</h3>
            <p className="text-gray-500 text-sm">Se eliminará <strong>"{order?.identifier}"</strong> y todos sus productos.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-semibold text-gray-600"
              >
                No, mantener
              </button>
              <button
                onClick={cancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemModal({ modal, setModal, additionProducts, comboDrinks, onAdd }) {
  const { product, categoryName } = modal;
  const needsBase = BASE_CATEGORIES.includes(categoryName);
  const showAdditions = !NO_ADDITIONS_CATEGORIES.includes(categoryName);
  const showSalsas = SALSAS_CATEGORIES.includes(categoryName);

  const [isCombo, setIsCombo] = useState(false);
  const [base, setBase] = useState('Pan');
  const [combo_drink, setComboDrink] = useState('');
  const [salsas, setSalsas] = useState([]);
  const [additions, setAdditions] = useState([]);
  const [removals, setRemovals] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const ingredientList = product.description
    ? product.description.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const toggleSalsa = (s) => setSalsas(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleAddition = (a) => setAdditions(prev =>
    prev.find(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, { id: a.id, name: a.name, price: a.price }]
  );
  const toggleRemoval = (ing) => setRemovals(prev =>
    prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
  );

  const unitPrice = isCombo && product.combo_price ? product.combo_price : product.price;
  const additionsTotal = additions.reduce((sum, a) => sum + a.price, 0);
  const lineTotal = (unitPrice + additionsTotal) * quantity;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setModal(null)}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-black text-lg text-gray-800">{product.name}</h3>
            {product.description && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{product.description}</p>
            )}
          </div>
          <button onClick={() => setModal(null)} className="text-gray-400 ml-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Solo / Combo */}
        {product.combo_price && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsCombo(false)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${!isCombo ? 'border-brand-yellow bg-yellow-50 text-gray-800' : 'border-gray-200 text-gray-500'}`}
            >
              Solo — {fmt(product.price)}
            </button>
            <button
              onClick={() => setIsCombo(true)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${isCombo ? 'border-brand-yellow bg-yellow-50 text-gray-800' : 'border-gray-200 text-gray-500'}`}
            >
              Combo — {fmt(product.combo_price)}
            </button>
          </div>
        )}

        {/* 1. Base */}
        {needsBase && (
          <div>
            <p className="label">Base</p>
            <div className="flex gap-2 flex-wrap">
              {BASES.map(b => (
                <button
                  key={b}
                  onClick={() => setBase(b)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${base === b ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200'}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Combo drink */}
        {isCombo && product.combo_price && comboDrinks.length > 0 && (
          <div>
            <p className="label">🥤 Bebida del combo</p>
            <div className="grid grid-cols-2 gap-2">
              {comboDrinks.map(drink => (
                <button
                  key={drink.id}
                  onClick={() => setComboDrink(d => d === drink.name ? '' : drink.name)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${combo_drink === drink.name ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
                >
                  <span className="text-lg">🥤</span>
                  <span className="text-sm font-medium text-gray-700 leading-tight">{drink.name}</span>
                </button>
              ))}
            </div>
            {!combo_drink && <p className="text-xs text-amber-600 mt-1">Selecciona la bebida del combo</p>}
          </div>
        )}

        {/* 2. Salsas */}
        {showSalsas && (
          <div>
            <p className="label">Salsas</p>
            <div className="flex flex-wrap gap-2">
              {SALSAS.map(salsa => (
                <button
                  key={salsa}
                  onClick={() => toggleSalsa(salsa)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${salsas.includes(salsa) ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}
                >
                  {salsa}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Quitar ingredientes */}
        {ingredientList.length > 0 && (
          <div>
            <p className="label">Quitar ingredientes</p>
            <div className="flex flex-wrap gap-2">
              {ingredientList.map(ing => {
                const removed = removals.includes(ing);
                return (
                  <button
                    key={ing}
                    onClick={() => toggleRemoval(ing)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${removed ? 'border-red-400 bg-red-50 text-red-700 line-through' : 'border-gray-200 text-gray-600'}`}
                  >
                    {removed ? '✕ ' : ''}{ing}
                  </button>
                );
              })}
            </div>
            {removals.length > 0 && <p className="text-xs text-red-500 mt-1.5">Sin: {removals.join(', ')}</p>}
          </div>
        )}

        {/* 4. Adiciones */}
        {showAdditions && additionProducts.length > 0 && (
          <div>
            <p className="label">Adiciones</p>
            <div className="grid grid-cols-2 gap-2">
              {additionProducts.map(addition => {
                const selected = additions.find(a => a.id === addition.id);
                return (
                  <button
                    key={addition.id}
                    onClick={() => toggleAddition(addition)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-colors ${selected ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200'}`}
                  >
                    <span className="text-sm font-medium text-gray-700">{addition.name}</span>
                    <span className="text-xs font-bold text-gray-600">+{fmt(addition.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Cantidad */}
        <div className="flex items-center justify-between">
          <p className="label mb-0">Cantidad</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-gray-600 active:scale-95"
            >−</button>
            <span className="text-xl font-black w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="w-9 h-9 rounded-full bg-brand-dark text-brand-yellow flex items-center justify-center font-bold active:scale-95"
            >+</button>
          </div>
        </div>

        <button
          onClick={() => {
            Object.assign(modal, { isCombo, base, combo_drink, salsas, additions, removals, quantity });
            onAdd();
          }}
          className="btn-primary w-full flex items-center justify-between"
        >
          <span>Agregar a la orden</span>
          <span>{fmt(lineTotal)}</span>
        </button>
      </div>
    </div>
  );
}
