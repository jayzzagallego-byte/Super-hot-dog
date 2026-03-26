import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const ShiftContext = createContext(null);

export function ShiftProvider({ children }) {
  const [shift, setShift] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shd_shift')); } catch { return null; }
  });
  const [todayTotal, setTodayTotal] = useState(0);

  const refreshTotal = useCallback(async () => {
    try {
      const res = await api.get('/sales/stats/summary');
      setTodayTotal(res.data.today?.total || 0);
    } catch {}
  }, []);

  // Auto-close shift if it's from a previous day
  useEffect(() => {
    if (shift) {
      const shiftDay = new Date(shift.startedAt).toDateString();
      if (shiftDay !== new Date().toDateString()) {
        localStorage.removeItem('shd_shift');
        setShift(null);
        return;
      }
      refreshTotal();
    }
  }, []); // eslint-disable-line

  // Refresh total when window regains focus
  useEffect(() => {
    if (!shift) return;
    const onFocus = () => refreshTotal();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshTotal();
    });
    return () => window.removeEventListener('focus', onFocus);
  }, [shift, refreshTotal]);

  // Total sold since shift started (today's total minus snapshot at shift start)
  const shiftTotal = shift ? Math.max(0, todayTotal - shift.startingTotal) : 0;

  const startShift = async (openingCash) => {
    const res = await api.get('/sales/stats/summary');
    const startingTotal = res.data.today?.total || 0;
    const newShift = {
      startedAt: Date.now(),
      openingCash: Number(openingCash) || 0,
      startingTotal,
    };
    localStorage.setItem('shd_shift', JSON.stringify(newShift));
    setShift(newShift);
    setTodayTotal(startingTotal);
  };

  const endShift = () => {
    localStorage.removeItem('shd_shift');
    setShift(null);
    setTodayTotal(0);
  };

  const updateOpeningCash = (amount) => {
    const updated = { ...shift, openingCash: Number(amount) || 0 };
    localStorage.setItem('shd_shift', JSON.stringify(updated));
    setShift(updated);
  };

  return (
    <ShiftContext.Provider value={{
      shift,
      shiftTotal,
      todayTotal,
      refreshTotal,
      startShift,
      endShift,
      updateOpeningCash,
    }}>
      {children}
    </ShiftContext.Provider>
  );
}

export const useShift = () => useContext(ShiftContext);
