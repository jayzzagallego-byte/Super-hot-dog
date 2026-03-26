# 🌭 Super Hot Dog — Instrucciones de instalación

## 1. Instalar Node.js

1. Ve a: **https://nodejs.org**
2. Descarga la versión **LTS** (la recomendada, actualmente v24.x.x)
3. Abre el instalador `.pkg` y sigue los pasos
4. Cuando termine, abre la **Terminal** y escribe:
   ```
   node --version
   ```
   Debe mostrar algo como `v24.x.x` ✅

---

## 2. Preparar la aplicación

Abre la **Terminal**, copia y pega estos comandos uno por uno:

```bash
# Ir a la carpeta del proyecto
cd ~/Desktop/PROGRAMAR/CLAUDE/super-hot-dog

# Instalar dependencias del backend
cd backend
npm install

# Cargar los datos iniciales del menú
npm run seed

# Instalar dependencias del frontend
cd ../frontend
npm install

cd ..
```

---

## 3. Iniciar la aplicación

Necesitas abrir **dos ventanas de Terminal**:

**Terminal 1 — Backend:**
```bash
cd ~/Desktop/PROGRAMAR/CLAUDE/super-hot-dog/backend
npm start
```

**Terminal 2 — Frontend:**
```bash
cd ~/Desktop/PROGRAMAR/CLAUDE/super-hot-dog/frontend
npm run dev
```

Luego abre el navegador en: **http://localhost:3000**

---

## 4. Credenciales iniciales

| Campo | Valor |
|-------|-------|
| **Usuario** | `admin` |
| **Contraseña** | `superhotdog2026` |

> ⚠️ Cambia la contraseña desde Configuración después de entrar.

---

## 5. Publicar en internet (para usar desde el celular)

Para que tu mamá pueda acceder desde su celular sin importar dónde esté:

1. Ve a **https://railway.app** y crea una cuenta gratuita
2. Escríbeme y te explico cómo subir la app paso a paso

> 💡 Mientras tanto, si tienes WiFi en casa, puedes acceder desde el celular usando la IP local de tu computador.

---

## ¿Qué hace la app?

| Sección | Función |
|---------|---------|
| **Inicio** | Resumen de ventas del día, semana y mes |
| **Vender** | Registrar una venta eligiendo productos, método de pago y canal |
| **Historial** | Ver y filtrar todas las ventas anteriores |
| **Inventario** | Controlar el stock de ingredientes con entradas y salidas |
| **Configuración** | Cambiar la contraseña |
