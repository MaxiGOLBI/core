/**
 * ConfirmModal — reusable danger/warning confirmation dialog.
 * Replaces all window.confirm() calls in the app.
 *
 * Props:
 *   open        {boolean}  — whether the modal is visible
 *   title       {string}   — dialog headline
 *   message     {string}   — body text / question
 *   confirmLabel {string}  — label for the confirm button (default "Eliminar")
 *   cancelLabel  {string}  — label for the cancel button  (default "Cancelar")
 *   variant      {string}  — "danger" | "warning" (default "danger")
 *   onConfirm   {fn}       — called when user confirms
 *   onCancel    {fn}       — called when user cancels / closes
 */
export default function ConfirmModal({
  open,
  title = '¿Estás seguro?',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel  = 'Cancelar',
  variant      = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const isDanger = variant !== 'warning';
  const confirmCls = isDanger
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-amber-500 hover:bg-amber-600 text-white';
  const iconCls = isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconCls}`}>
              {isDanger ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              )}
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-base leading-snug">{title}</h3>
              {message && <p className="text-slate-500 text-sm mt-1 leading-relaxed">{message}</p>}
            </div>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
