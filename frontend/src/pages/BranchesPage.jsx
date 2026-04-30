import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function BranchesPage() {
  const navigate = useNavigate();
  const [branches, setBranches]       = useState([]);
  const [newName, setNewName]         = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [editName, setEditName]       = useState('');
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [creating, setCreating]       = useState(false);

  function showSuccess(msg) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  }

  async function fetchBranches() {
    setError('');
    try {
      const data = await api.get('/api/branches');
      setBranches(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { fetchBranches(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const created = await api.post('/api/branches', { name: newName });
      setNewName('');
      setBranches((prev) => [...prev, created]);
      showSuccess(`✓ Sucursal "${created.name}" creada correctamente.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(id) {
    setError('');
    try {
      const updated = await api.put(`/api/branches/${id}`, { name: editName });
      setEditingId(null);
      setBranches((prev) => prev.map((b) => b.id === id ? { ...b, name: updated.name } : b));
      showSuccess(`✓ Sucursal renombrada a "${updated.name}".`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta sucursal? Solo es posible si no tiene usuarios asignados.')) return;
    setError('');
    try {
      await api.delete(`/api/branches/${id}`);
      setBranches((prev) => prev.filter((b) => b.id !== id));
      showSuccess('✓ Sucursal eliminada.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sucursales</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Vista consolidada de todas las sucursales de tu empresa.
        </p>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-emerald-700 text-sm">{success}</p>
        </div>
      )}

      {/* Crear sucursal */}
      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Nueva sucursal</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder="Ej: Sucursal Centro"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {creating ? 'Creando...' : 'Crear'}
        </button>
      </form>

      {/* Lista de sucursales */}
      <div className="space-y-3">
        {branches.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">No hay sucursales registradas.</p>
        )}
        {branches.map((b) => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3">
              {editingId === b.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(b.id)}
                    className="text-emerald-600 hover:text-emerald-800 text-sm font-bold"
                  >✓</button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                  >×</button>
                </div>
              ) : (
                <button
                  onClick={() => navigate(`/branches/${b.id}`)}
                  className="font-semibold text-slate-900 text-left flex-1 hover:text-indigo-700 transition-colors"
                >
                  {b.name}
                  <span className="ml-2 text-xs text-slate-400 font-normal">
                    {new Date(b.created_at).toLocaleDateString('es-AR')}
                  </span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => { setEditingId(b.id); setEditName(b.name); }}
                  className="text-xs text-slate-400 hover:text-indigo-600 font-medium transition-colors"
                >
                  Renombrar
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-xs text-slate-400 hover:text-red-600 font-medium transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => navigate(`/branches/${b.id}`)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Ver sucursal →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
