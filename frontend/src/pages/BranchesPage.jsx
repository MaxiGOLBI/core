import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';

export default function BranchesPage() {
  const navigate = useNavigate();
  const [branches, setBranches]       = useState([]);
  const [newName, setNewName]         = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [editName, setEditName]       = useState('');
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [creating, setCreating]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // branch id

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
    setDeleteConfirm(null);
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">Sucursales</h1>
          <p className="text-blue-100 text-sm mt-1">Vista consolidada de todas las sucursales de tu empresa.</p>
        </div>
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
      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Nueva sucursal</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder="Ej: Sucursal Centro"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
        className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm disabled:opacity-50"
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
          <div key={b.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Branch avatar */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm select-none">
                {b.name.charAt(0).toUpperCase()}
              </div>
              {/* Name + info */}
              <div className="flex-1 min-w-0">
                {editingId === b.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(b.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-bold"
                    >✓</button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                    >×</button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(`/branches/${b.id}`)}
                      className="font-semibold text-slate-900 hover:text-blue-700 text-left w-full truncate block transition-colors text-sm"
                    >
                      {b.name}
                    </button>
                    <p className="text-xs text-slate-400 mt-0.5">Creada el {new Date(b.created_at).toLocaleDateString('es-AR')}</p>
                  </>
                )}
              </div>
              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 ml-2 shrink-0">
                <button
                  onClick={() => { setEditingId(b.id); setEditName(b.name); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  Renombrar
                </button>
                <button
                  onClick={() => setDeleteConfirm(b.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => navigate(`/branches/${b.id}`)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 transition-all shadow-sm"
                >
                  Ver →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!deleteConfirm}
        title="Eliminar sucursal"
        message="Solo es posible si no tiene usuarios asignados. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
