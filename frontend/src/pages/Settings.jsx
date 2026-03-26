import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Settings() {
  const { username, logout } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      return setError('Las contraseñas nuevas no coinciden.');
    }
    if (form.newPassword.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }

    setLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Contraseña actualizada correctamente.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-5 pb-4 space-y-5 max-w-lg mx-auto">
      {/* User info */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-dark flex items-center justify-center text-brand-yellow font-black text-2xl">
          {username?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-800 text-lg">{username}</p>
          <p className="text-sm text-gray-400">Administrador</p>
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-4">Cambiar contraseña</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label">Contraseña actual</label>
            <input
              type="password"
              className="input"
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              className="input"
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input
              type="password"
              className="input"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{success}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      {/* App info */}
      <div className="card text-center text-gray-400 text-sm">
        <p className="text-2xl mb-2">🌭</p>
        <p className="font-semibold text-gray-500">Super Hot Dog</p>
        <p>Sistema de gestión v1.0</p>
      </div>
    </div>
  );
}
