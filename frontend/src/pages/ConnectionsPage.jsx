import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ENV_LABELS = {
  homologation: 'Homologación (pruebas)',
  production:   'Producción',
};

export default function ConnectionsPage() {
  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [warning, setWarning]   = useState('');

  const [form, setForm] = useState({ cuit: '', env: 'homologation' });

  async function fetchStatus() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/arca/status');
      setStatus(data);
      if (data.configured) {
        setForm({ cuit: data.cuit, env: data.env });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStatus(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setWarning('');
    try {
      const res = await api.post('/api/arca/configure', form);
      if (res.warning) {
        setWarning(res.warning);
      } else {
        setSuccess('Conexión configurada y verificada correctamente.');
      }
      await fetchStatus();
    } catch (err) {
      setError(err.message ?? err.warning ?? 'Error al configurar');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError('');
    setSuccess('');
    setWarning('');
    try {
      await api.post('/api/arca/test', {});
      setSuccess('Conexión probada exitosamente. Token y firma obtenidos.');
      await fetchStatus();
    } catch (err) {
      setError(err.message ?? 'Error al probar la conexión');
      await fetchStatus();
    } finally {
      setTesting(false);
    }
  }

  const isActive = status?.active === true;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Conexiones</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Configuración de la conexión central ARCA / AFIP de la empresa.
          Solo el dueño puede modificar esta sección.
        </p>
      </div>

      {/* Estado actual */}
      <div className={`rounded-xl border px-5 py-4 mb-6 flex items-center gap-4 ${
        isActive
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
        <div className="flex-1">
          {loading ? (
            <p className="text-slate-500 text-sm">Verificando estado...</p>
          ) : isActive ? (
            <>
              <p className="font-semibold text-emerald-800">ARCA conectado</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                CUIT: {status.cuit} · {ENV_LABELS[status.env] ?? status.env}
                {status.last_tested_at && ` · Última prueba: ${new Date(status.last_tested_at).toLocaleString('es-AR')}`}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-red-700">ARCA no configurado</p>
              <p className="text-xs text-red-500 mt-0.5">
                {status?.configured
                  ? 'La conexión fue guardada pero no está activa. Probá la conexión.'
                  : 'Completá el formulario para conectar la cuenta AFIP de la empresa.'}
              </p>
            </>
          )}
        </div>
        {status?.configured && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="text-sm border border-slate-300 bg-white text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-medium transition-colors"
          >
            {testing ? 'Probando...' : 'Probar conexión'}
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-yellow-800 text-sm">{warning}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-emerald-700 text-sm">{success}</p>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Configurar conexión ARCA</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              CUIT de la empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.cuit}
              onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value.replace(/\D/g, '') }))}
              placeholder="20123456789"
              maxLength={11}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">11 dígitos, sin guiones ni espacios.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Entorno <span className="text-red-500">*</span>
            </label>
            <select
              value={form.env}
              onChange={(e) => setForm((f) => ({ ...f, env: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="homologation">Homologación (pruebas)</option>
              <option value="production">Producción</option>
            </select>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 mb-1">Archivos de certificado requeridos:</p>
            <p>📄 <code>backend/certificados/claveprivada.key</code></p>
            <p>📄 <code>backend/certificados/wsarca_1abf30440b47f40c.crt</code></p>
            <p className="mt-1">Estos archivos deben estar presentes en el servidor y sus rutas configuradas en el archivo <code>.env</code>.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando y verificando...' : 'Guardar y conectar'}
          </button>
        </form>
      </div>

      {/* Nota informativa */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Conexión centralizada:</span> una vez configurada, todos los usuarios
          de la empresa podrán emitir facturas electrónicas usando esta cuenta, sin necesidad de
          conocer las credenciales AFIP.
        </p>
      </div>
    </div>
  );
}
