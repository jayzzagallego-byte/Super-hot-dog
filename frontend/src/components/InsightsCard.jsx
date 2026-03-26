import { useState, useEffect } from 'react';
import api from '../api/client';
import { todayColombia, daysAgoColombia, TZ } from '../utils/dates';

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function InsightsCard() {
  const [insights, setInsights] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = todayColombia();
        const lastWeekSameDay = daysAgoColombia(7);

        const [todayRes, lwRes] = await Promise.all([
          api.get('/analytics', { params: { from: today, to: today } }),
          api.get('/analytics', { params: { from: lastWeekSameDay, to: lastWeekSameDay } }),
        ]);

        const t = todayRes.data;
        const lw = lwRes.data;
        const list = [];

        // ── 1. 🥤 Bebidas bajas (prioridad 1 — accionable ahora) ──────────
        if (t.totalRevenue > 0) {
          const bev = t.byCategory?.find(c => c.category === 'Bebidas');
          const bevPct = bev ? Math.round((bev.revenue / t.totalRevenue) * 100) : 0;
          if (bevPct < 20) {
            list.push({
              emoji: '🥤',
              text: `Las bebidas solo representan el ${bevPct}% de los ingresos de hoy. ¡No olvides ofrecerlas!`,
              priority: 1,
            });
          }
        }

        // ── 2. 📈 Crecimiento vs mismo día semana pasada (prioridad 2) ─────
        if (t.totalRevenue > 0 && lw.totalRevenue > 0) {
          const growth = Math.round(((t.totalRevenue - lw.totalRevenue) / lw.totalRevenue) * 100);
          const dayName = DAYS_ES[new Date().getDay()];
          if (growth > 0) {
            list.push({
              emoji: '📈',
              text: `¡Vas volando! Hoy llevas un ${growth}% más que el ${dayName} pasado.`,
              priority: 2,
            });
          }
        }

        // ── 3. 💸 Quincena mañana (prioridad 2 — planificación) ───────────
        const tomorrowStr = new Date(Date.now() + 864e5)
          .toLocaleDateString('en-CA', { timeZone: TZ });
        const tomorrowDay = parseInt(tomorrowStr.split('-')[2], 10);
        const [ty, tm] = tomorrowStr.split('-').map(Number);
        const daysInMonth = new Date(ty, tm, 0).getDate();
        if (tomorrowDay === 15 || tomorrowDay === 30 || tomorrowDay === daysInMonth) {
          list.push({
            emoji: '💸',
            text: `¡Mañana es quincena! Buen momento para preparar producción extra.`,
            priority: 2,
          });
        }

        // ── 4. ⭐ Producto estrella del día (prioridad 3 — contexto) ───────
        if (t.topProducts?.length > 0) {
          const star = t.topProducts[0];
          if (star.total_qty >= 2) {
            list.push({
              emoji: '⭐',
              text: `${star.product_name} es lo más pedido hoy — ¡ya van ${star.total_qty} unidades!`,
              priority: 3,
            });
          }
        }

        // ── 5. 📉 Producto olvidado (prioridad 4 — contexto) ──────────────
        const forgotten = (t.noMovement ?? []).filter(p => p.category !== 'Adiciones');
        if (forgotten.length > 0) {
          // Varía según el día del año para no mostrar siempre el mismo
          const dayOfYear = Math.floor(Date.now() / 864e5);
          const pick = forgotten[dayOfYear % forgotten.length];
          list.push({
            emoji: '📉',
            text: `Hace días que nadie pide ${pick.name}. ¿Y si lo destacamos hoy en el tablero?`,
            priority: 4,
          });
        }

        list.sort((a, b) => a.priority - b.priority);
        setInsights(list);
        setIdx(0);
      } catch (e) {
        console.error('InsightsCard error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || insights.length === 0) return null;

  const current = insights[idx];

  return (
    <div className="bg-brand-dark rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <span className="text-2xl flex-shrink-0">{current.emoji}</span>
      <p className="text-white text-sm font-medium flex-1 leading-snug">{current.text}</p>
      {insights.length > 1 && (
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          <button
            onClick={() => setIdx(i => (i - 1 + insights.length) % insights.length)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-brand-yellow transition-colors text-xl leading-none"
          >‹</button>
          <span className="text-xs text-gray-500 w-7 text-center tabular-nums">
            {idx + 1}/{insights.length}
          </span>
          <button
            onClick={() => setIdx(i => (i + 1) % insights.length)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-brand-yellow transition-colors text-xl leading-none"
          >›</button>
        </div>
      )}
    </div>
  );
}
