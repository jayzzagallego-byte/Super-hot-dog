import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo', icon: '💵' },
  { key: 'datafono', label: 'Datáfono', icon: '💳' },
  { key: 'transferencia', label: 'Transferencia', icon: '🏦' },
  { key: 'nequi', label: 'Nequi', icon: '📱' },
  { key: 'daviplata', label: 'Daviplata', icon: '📲' },
  { key: 'llave', label: 'Llave', icon: '🔑' },
];

const CHANNELS = [
  { key: 'restaurante', label: 'Restaurante', icon: '🍽️' },
  { key: 'domicilio', label: 'Domicilio', icon: '🛵' },
  { key: 'rappi', label: 'Rappi', icon: '🟠' },
];

const BASES = ['Pan', 'Arepa', 'Tortilla', 'Lechuga'];
const BASE_CATEGORIES = ['Hot Dogs', 'Burgers'];
const ADDITION_CATEGORY = 'Adiciones';

function fmt(v) {
  return '$' + Number(v).toLocaleString('es-CO');
}

export default function NewSale() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [channel, setChannel] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState('menu'); // menu | checkout
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Modal for item customization
  const [modal, setModal] = useState(null); // { product, isCombo, base, additions }

  const navigate = useNavigate();

  useEffect(() => {
    api.get('/products')
      .then(res => {
        setCategories(res.data);
        if (res.data.length > 0) setActiveCategory(res.data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const additionsCategory = categories.find(c => c.name === ADDITION_CATEGORY);
  const additionProducts = additionsCategory?.products || [];

  const openModal = (product, categoryName) => {
    const needsBase = BASE_CATEGORIES.includes(categoryName);
    setModal({
      product,
      categoryName,
      isCombo: false,
      base: needsBase ? 'Pan' : null,
      additions: [],
      quantity: 1,
    });
  };

  const addToCart = () => {
    if (!modal) return;
    const { product, isCombo, base, additions, quantity, categoryName } = modal;
    const unitPrice = isCombo && product.combo_price ? product.combo_price : product.price;
    const additionsTotal = additions.reduce((sum, a) => sum + a.price, 0);
    const totalPrice = (unitPrice + additionsTotal);

    setCart(prev => [...prev, {
      id: Date.now(),
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: totalPrice,
      is_combo: isCombo,
      base,
      additions: additions.map(a => a.name),
      categoryName,
    }]);
    setModal(null);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const cartTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const handleSubmit = async () => {
    if (!paymentMethod) return setError('Selecciona el método de pago.');
    if (!channel) return setError('Selecciona el canal de venta.');
    if (cart.length === 0) return setError('Agrega al menos un producto.');
    setError('');
    setSubmitting(true);
    try {
      await api.post('/sales', {
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          is_combo: item.is_combo,
          base: item.base,
          additions: item.additions,
        })),
        payment_method: paymentMethod,
        channel,
        notes,
      });
      setSuccess(true);
      setTimeout(() => {
        setCart([]);
        setPaymentMethod('');
        setChannel('');
        setNotes('');
        setStep('menu');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la venta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-brand-yellow border-t-transparent rounded-full" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-2xl font-black text-gray-800">¡Venta registrada!</h2>
        <p className="text-gray-500 mt-2">Total: {fmt(cartTotal)}</p>
      </div>
    );
  }

  const currentCategory = categories.find(c => c.id === activeCategory);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {step === 'menu' ? (
        <>
          {/* Category tabs */}
          <div className="flex overflow-x-auto gap-2 px-4 pt-4 pb-2 scrollbar-hide flex-shrink-0">
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

          {/* Products grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
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

          {/* Cart summary button */}
          {cart.length > 0 && (
            <div className="px-4 pb-4 flex-shrink-0">
              <button
                onClick={() => setStep('checkout')}
                className="btn-primary w-full flex items-center justify-between"
              >
                <span className="bg-brand-dark text-brand-yellow text-sm font-black rounded-lg px-2 py-0.5">
                  {cart.length}
                </span>
                <span>Ver pedido</span>
                <span>{fmt(cartTotal)}</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Checkout step */
        <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
          <button
            onClick={() => setStep('menu')}
            className="flex items-center gap-2 text-gray-600 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al menú
          </button>

          {/* Order items */}
          <div className="card space-y-3">
            <h3 className="font-bold text-gray-700">Pedido</h3>
            {cart.map(item => (
              <div key={item.id} className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{item.product_name}</p>
                  {item.is_combo && <p className="text-xs text-brand-red">Combo</p>}
                  {item.base && <p className="text-xs text-gray-500">Base: {item.base}</p>}
                  {item.additions?.length > 0 && (
                    <p className="text-xs text-gray-500">+ {item.additions.join(', ')}</p>
                  )}
                  <p className="text-sm font-bold text-gray-700 mt-1">{fmt(item.unit_price)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="font-bold text-gray-800">{fmt(item.unit_price * item.quantity)}</span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-400 hover:text-brand-red"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between font-black text-lg pt-1">
              <span>Total</span>
              <span className="text-brand-red">{fmt(cartTotal)}</span>
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
                    paymentMethod === pm.key
                      ? 'border-brand-yellow bg-yellow-50'
                      : 'border-gray-200 bg-white'
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
                    channel === ch.key
                      ? 'border-brand-yellow bg-yellow-50'
                      : 'border-gray-200 bg-white'
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
              placeholder="Observaciones de la venta..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting
              ? <span className="animate-spin w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full" />
              : `Registrar venta — ${fmt(cartTotal)}`}
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
          onAdd={addToCart}
        />
      )}
    </div>
  );
}

function ItemModal({ modal, setModal, additionProducts, onAdd }) {
  const { product, categoryName } = modal;
  const needsBase = BASE_CATEGORIES.includes(categoryName);
  const isNotAdicion = categoryName !== ADDITION_CATEGORY;

  const [isCombo, setIsCombo] = useState(false);
  const [base, setBase] = useState('Pan');
  const [additions, setAdditions] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const toggleAddition = (addition) => {
    setAdditions(prev =>
      prev.find(a => a.id === addition.id)
        ? prev.filter(a => a.id !== addition.id)
        : [...prev, { id: addition.id, name: addition.name, price: addition.price }]
    );
  };

  const unitPrice = isCombo && product.combo_price ? product.combo_price : product.price;
  const additionsTotal = additions.reduce((sum, a) => sum + a.price, 0);
  const lineTotal = (unitPrice + additionsTotal) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setModal(null)}>
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

        {/* Combo option */}
        {product.combo_price && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsCombo(false)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                !isCombo ? 'border-brand-yellow bg-yellow-50 text-gray-800' : 'border-gray-200 text-gray-500'
              }`}
            >
              Solo — {fmt(product.price)}
            </button>
            <button
              onClick={() => setIsCombo(true)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                isCombo ? 'border-brand-yellow bg-yellow-50 text-gray-800' : 'border-gray-200 text-gray-500'
              }`}
            >
              Combo — {fmt(product.combo_price)}
            </button>
          </div>
        )}

        {/* Base selection */}
        {needsBase && (
          <div>
            <p className="label">Base</p>
            <div className="flex gap-2 flex-wrap">
              {BASES.map(b => (
                <button
                  key={b}
                  onClick={() => setBase(b)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                    base === b ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Additions */}
        {isNotAdicion && additionProducts.length > 0 && (
          <div>
            <p className="label">Adiciones</p>
            <div className="grid grid-cols-2 gap-2">
              {additionProducts.map(addition => {
                const selected = additions.find(a => a.id === addition.id);
                return (
                  <button
                    key={addition.id}
                    onClick={() => toggleAddition(addition)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-colors ${
                      selected ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-700">{addition.name}</span>
                    <span className="text-xs font-bold text-gray-600">+{fmt(addition.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center justify-between">
          <p className="label mb-0">Cantidad</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-gray-600 active:scale-95"
            >
              −
            </button>
            <span className="text-xl font-black w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="w-9 h-9 rounded-full bg-brand-dark text-brand-yellow flex items-center justify-center font-bold active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            // pass state back
            Object.assign(modal, { isCombo, base, additions, quantity });
            onAdd();
          }}
          className="btn-primary w-full flex items-center justify-between"
        >
          <span>Agregar al pedido</span>
          <span>{fmt(lineTotal)}</span>
        </button>
      </div>
    </div>
  );
}
