const express = require('express');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const { from, to } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fromDate = from || defaultFrom;
  const toDate = to || today;

  // Top products by quantity and revenue
  const topProducts = db.prepare(`
    SELECT si.product_name,
           SUM(si.quantity) as total_qty,
           SUM(si.quantity * si.unit_price) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE date(s.date) BETWEEN date(?) AND date(?)
    GROUP BY si.product_name
    ORDER BY total_qty DESC
    LIMIT 15
  `).all(fromDate, toDate);

  // Sales over time (daily)
  const salesOverTime = db.prepare(`
    SELECT date(s.date) as day,
           COUNT(*) as count,
           SUM(s.total) as total
    FROM sales s
    WHERE date(s.date) BETWEEN date(?) AND date(?)
    GROUP BY date(s.date)
    ORDER BY day ASC
  `).all(fromDate, toDate);

  // Average ticket and total count
  const summary = db.prepare(`
    SELECT COALESCE(AVG(total), 0) as avg_ticket,
           COUNT(*) as count,
           COALESCE(SUM(total), 0) as total
    FROM sales
    WHERE date(date) BETWEEN date(?) AND date(?)
  `).get(fromDate, toDate);

  // Week over week trend
  const now = new Date();
  const dayOfWeek = now.getDay();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - dayOfWeek);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

  const thisWeekStr = thisWeekStart.toISOString().split('T')[0];
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
  const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

  const thisWeek = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date(date) BETWEEN date(?) AND date(?)`).get(thisWeekStr, today);
  const lastWeek = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date(date) BETWEEN date(?) AND date(?)`).get(lastWeekStartStr, lastWeekEndStr);
  const weekTrend = lastWeek.total > 0 ? ((thisWeek.total - lastWeek.total) / lastWeek.total) * 100 : null;

  // Sales by category
  const byCategory = db.prepare(`
    SELECT c.name as category,
           SUM(si.quantity) as qty,
           SUM(si.quantity * si.unit_price) as revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN sales s ON si.sale_id = s.id
    WHERE date(s.date) BETWEEN date(?) AND date(?)
    AND si.product_id IS NOT NULL
    GROUP BY c.name
    ORDER BY revenue DESC
  `).all(fromDate, toDate);

  // Products with no sales in last 30 days (exclude Adiciones)
  const noMovement = db.prepare(`
    SELECT p.name, c.name as category
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
    AND c.name != 'Adiciones'
    AND (p.id NOT IN (
      SELECT DISTINCT si.product_id
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE si.product_id IS NOT NULL
      AND date(s.date) >= date('now', '-30 days')
    ))
    ORDER BY c.name, p.name
  `).all();

  res.json({
    topProducts,
    salesOverTime,
    avgTicket: Math.round(summary.avg_ticket),
    totalCount: summary.count,
    totalRevenue: summary.total,
    weekTrend,
    thisWeekTotal: thisWeek.total,
    lastWeekTotal: lastWeek.total,
    byCategory,
    noMovement,
    period: { from: fromDate, to: toDate }
  });
});

module.exports = router;
