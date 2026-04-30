import { useState } from 'react';

/**
 * Input numérico que muestra el valor formateado con separadores de miles (es-AR)
 * mientras no está enfocado. Compatible con onChange={(e) => setState(e.target.value).
 */
export function NumericInput({ value, onChange, className, min, step, type, ...props }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  function format(v) {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    if (isNaN(n)) return '';
    return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }

  function handleFocus() {
    setFocused(true);
    setDraft(value == null || value === '' ? '' : String(value));
  }

  function handleBlur() {
    setFocused(false);
    // Normalizar: quitar puntos de miles, reemplazar coma decimal por punto
    const raw = draft.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    const normalized = isNaN(n) ? '0' : String(n);
    onChange({ target: { value: normalized } });
  }

  function handleChange(e) {
    setDraft(e.target.value);
    onChange({ target: { value: e.target.value } });
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : format(value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}
