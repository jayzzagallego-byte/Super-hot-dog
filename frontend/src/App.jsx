import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewSale from './pages/NewSale';
import SalesHistory from './pages/SalesHistory';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import MenuManagement from './pages/MenuManagement';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="nueva-venta" element={<NewSale />} />
            <Route path="historial" element={<SalesHistory />} />
            <Route path="inventario" element={<Inventory />} />
            <Route path="configuracion" element={<Settings />} />
            <Route path="configuracion/menu" element={<MenuManagement />} />
            <Route path="analiticas" element={<Analytics />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
