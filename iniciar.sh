#!/bin/bash
# Script de inicio — Super Hot Dog

echo "🌭 Iniciando Super Hot Dog..."

# Backend
cd "$(dirname "$0")/backend"
npm start &
BACKEND_PID=$!

sleep 2

# Frontend
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ App iniciada!"
echo "   Abre en el navegador: http://localhost:3000"
echo "   Usuario: admin  |  Contraseña: superhotdog2026"
echo ""
echo "   Presiona Ctrl+C para detener"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
