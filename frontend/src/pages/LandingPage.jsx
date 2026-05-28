import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CoreLogo from '../components/CoreLogo';

// ── Legal content ─────────────────────────────────────────────────────────

const PRIVACY_POLICY = [
  { title: '1. Información que recopilamos', body: 'Recopilamos información que usted nos proporciona al registrarse (nombre, correo electrónico, datos de la empresa) y datos de uso del sistema (transacciones, operaciones realizadas) con el fin de mejorar continuamente la experiencia.' },
  { title: '2. Uso de la información', body: 'Utilizamos sus datos exclusivamente para: proveer y mejorar el servicio, enviar comunicaciones relacionadas con la cuenta, brindar soporte técnico y cumplir con obligaciones legales vigentes en la República Argentina.' },
  { title: '3. Almacenamiento y seguridad', body: 'Los datos se almacenan en servidores con cifrado en tránsito y en reposo. Implementamos medidas técnicas y organizativas para proteger su información contra acceso no autorizado, alteración o destrucción.' },
  { title: '4. Compartición de datos', body: 'No vendemos ni compartimos sus datos personales con terceros, salvo cuando sea estrictamente necesario para proveer el servicio (ej. procesamiento fiscal con AFIP/ARCA) o cuando lo exija la legislación vigente.' },
  { title: '5. Sus derechos (Ley 25.326)', body: 'Conforme a la Ley de Protección de Datos Personales N° 25.326, usted tiene derecho a acceder, rectificar, actualizar y suprimir sus datos. Para ejercer estos derechos, comuníquese a soporte@bnbsoftware.com.ar.' },
  { title: '6. Cookies', body: 'Utilizamos únicamente cookies esenciales para el funcionamiento del sistema (sesión de usuario). No utilizamos cookies de seguimiento ni publicidad de terceros.' },
  { title: '7. Modificaciones', body: 'Nos reservamos el derecho de actualizar esta política. Notificaremos cambios significativos con al menos 30 días de anticipación mediante el sistema o por correo electrónico.' },
  { title: '8. Contacto', body: 'Para consultas sobre privacidad: soporte@bnbsoftware.com.ar — B&B Software, Ciudad Autónoma de Buenos Aires, Argentina.' },
];

const TERMS_AND_CONDITIONS = [
  { title: '1. Aceptación', body: 'Al acceder o utilizar Core, usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguno de sus términos, deberá abstenerse de usar el servicio.' },
  { title: '2. Descripción del servicio', body: 'Core es una plataforma de gestión empresarial (SaaS) que comprende módulos de punto de venta, inventario, caja, empleados, comisiones, facturación AFIP/ARCA, reportes y más.' },
  { title: '3. Registro y seguridad de cuenta', body: 'Usted es responsable de mantener la confidencialidad de sus credenciales. Debe notificarnos de inmediato ante cualquier uso no autorizado de su cuenta en soporte@bnbsoftware.com.ar.' },
  { title: '4. Uso permitido', body: 'Core puede utilizarse únicamente para actividades comerciales legítimas. Queda expresamente prohibido intentar vulnerar la seguridad del sistema, utilizarlo para actividades ilegales o revender el acceso sin autorización escrita.' },
  { title: '5. Propiedad intelectual', body: 'El software, diseño, marca y contenido de Core son propiedad exclusiva de B&B Software. No se otorga ninguna licencia para copiar, modificar o distribuir el código fuente.' },
  { title: '6. Disponibilidad del servicio', body: 'Si bien nos comprometemos a mantener alta disponibilidad (objetivo 99.9% uptime), no garantizamos que el servicio sea ininterrumpido. Realizamos mantenimientos programados con previo aviso.' },
  { title: '7. Limitación de responsabilidad', body: 'B&B Software no se responsabiliza por pérdidas indirectas, lucro cesante ni daños consecuentes derivados del uso del sistema. La responsabilidad máxima queda limitada al monto abonado en los últimos 3 meses de servicio.' },
  { title: '8. Ley aplicable y jurisdicción', body: 'Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa se someterá a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires.' },
  { title: '9. Contacto', body: 'Consultas sobre estos términos: soporte@bnbsoftware.com.ar — B&B Software, Ciudad Autónoma de Buenos Aires, Argentina.' },
];

const COOKIES_POLICY = [
  { title: '¿Qué son las cookies?', body: 'Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita o utiliza una aplicación web.' },
  { title: 'Cookies que utilizamos', body: 'Core utiliza únicamente cookies de sesión esenciales para mantener su inicio de sesión activo y garantizar el correcto funcionamiento del sistema. Estas cookies se eliminan al cerrar la sesión.' },
  { title: 'No utilizamos', body: 'No utilizamos cookies de análisis, publicidad, seguimiento de comportamiento ni compartimos datos con redes publicitarias de terceros.' },
  { title: 'Control de cookies', body: 'Puede configurar su navegador para rechazar todas las cookies, pero esto podría impedir el correcto funcionamiento del sistema (en particular, el mantenimiento de la sesión de usuario).' },
  { title: 'Contacto', body: 'Para consultas: soporte@bnbsoftware.com.ar' },
];

// ── Fade-up animation on scroll ───────────────────────────────────────────

function FadeUp({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(36px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// CoreLogo is imported from ../components/CoreLogo

// ── Legal Modal ────────────────────────────────────────────────────────────

function LegalModal({ title, sections, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-700 to-cyan-500 rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-white text-lg">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-5">
          <p className="text-xs text-slate-400">Última actualización: Mayo 2026</p>
          {sections.map((s, i) => (
            <div key={i}>
              <h3 className="font-semibold text-slate-800 text-sm mb-1">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AppMockup SVG ──────────────────────────────────────────────────────────

function AppMockup() {
  return (
    <svg viewBox="0 0 520 320" className="w-full rounded-xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="am-nav" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="am-detail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="am-chip" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      {/* Window chrome */}
      <rect width="520" height="320" rx="12" fill="#0f172a" />
      <rect y="20" width="520" height="12" fill="#0f172a" />
      <circle cx="16" cy="16" r="5" fill="#ef4444" />
      <circle cx="32" cy="16" r="5" fill="#f59e0b" />
      <circle cx="48" cy="16" r="5" fill="#22c55e" />
      <rect x="80" y="6" width="280" height="20" rx="10" fill="#1e293b" />
      <text x="220" y="20" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">core.app/mis-ventas</text>
      {/* Navbar */}
      <rect y="32" width="520" height="30" fill="url(#am-nav)" />
      {/* Mini chip logo */}
      <rect x="10" y="38" width="18" height="18" rx="4" fill="url(#am-chip)" />
      <rect x="13" y="41" width="12" height="12" rx="2" fill="white" fillOpacity="0.15" />
      <text x="19" y="47" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="9" fontWeight="900" fontFamily="sans-serif">C</text>
      <line x1="16" y1="38" x2="16" y2="34" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="22" y1="38" x2="22" y2="34" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16" y1="56" x2="16" y2="60" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="22" y1="56" x2="22" y2="60" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="44" x2="6" y2="44" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="28" y1="50" x2="32" y2="50" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      <text x="34" y="51" fill="white" fontSize="9" fontWeight="700" fontFamily="sans-serif">core</text>
      <rect x="68" y="38" width="42" height="16" rx="5" fill="#2563eb" />
      <text x="89" y="50" textAnchor="middle" fill="white" fontSize="7.5" fontFamily="sans-serif">Ventas</text>
      <text x="123" y="50" fill="#93c5fd" fontSize="7.5" fontFamily="sans-serif">Caja</text>
      <text x="148" y="50" fill="#93c5fd" fontSize="7.5" fontFamily="sans-serif">Stock</text>
      {/* Left panel */}
      <rect x="0" y="62" width="152" height="258" fill="white" />
      <rect x="0" y="62" width="152" height="28" fill="#1e3a8a" />
      <text x="10" y="80" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Mis ventas</text>
      {[
        { y: 94, client: 'María García', amount: '$15.000', color: '#dcfce7', textColor: '#15803d', date: '26-may · 10:22' },
        { y: 148, client: 'Sin cliente', amount: '$30.000', color: '#dcfce7', textColor: '#15803d', date: '18-may · 10:44' },
        { y: 202, client: 'Carlos López', amount: '$60.000', color: '#fee2e2', textColor: '#dc2626', date: '18-may · 08:50' },
        { y: 256, client: 'Sin cliente', amount: '$22.500', color: '#dcfce7', textColor: '#15803d', date: '11-may · 12:48' },
      ].map((s, i) => (
        <g key={i}>
          <rect x="6" y={s.y} width="140" height="44" rx="6" fill={i === 0 ? '#eff6ff' : '#f8fafc'} />
          {i === 0 && <rect x="6" y={s.y} width="3" height="44" rx="1.5" fill="#2563eb" />}
          <text x={i === 0 ? 16 : 12} y={s.y + 15} fill="#1e293b" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">{s.client}</text>
          <text x={i === 0 ? 16 : 12} y={s.y + 28} fill="#94a3b8" fontSize="6.5" fontFamily="sans-serif">{s.date}</text>
          <rect x="88" y={s.y + 5} width="50" height="13" rx="5" fill={s.color} />
          <text x="113" y={s.y + 15} textAnchor="middle" fill={s.textColor} fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">{s.amount}</text>
        </g>
      ))}
      {/* Right panel */}
      <rect x="152" y="62" width="368" height="258" fill="#f8fafc" />
      <rect x="162" y="72" width="348" height="238" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      {/* Detail header */}
      <rect x="162" y="72" width="348" height="52" rx="12" fill="url(#am-detail)" />
      <rect x="162" y="96" width="348" height="28" fill="url(#am-detail)" />
      <text x="182" y="92" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">Venta</text>
      <rect x="214" y="80" width="58" height="13" rx="6" fill="#22c55e" />
      <text x="243" y="90" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Completada</text>
      <text x="182" y="112" fill="#bfdbfe" fontSize="7.5" fontFamily="sans-serif">lunes, 26 de mayo de 2026 · 10:22 hs</text>
      {/* Info cards */}
      <rect x="174" y="134" width="155" height="34" rx="8" fill="#f8fafc" />
      <text x="184" y="147" fill="#94a3b8" fontSize="7" fontFamily="sans-serif">Cliente</text>
      <text x="184" y="160" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">María García</text>
      <rect x="339" y="134" width="159" height="34" rx="8" fill="#ecfdf5" />
      <text x="349" y="147" fill="#059669" fontSize="7" fontFamily="sans-serif">Total</text>
      <text x="349" y="161" fill="#059669" fontSize="11" fontWeight="bold" fontFamily="sans-serif">$15.000,00</text>
      <rect x="174" y="176" width="324" height="34" rx="8" fill="#f8fafc" />
      <text x="184" y="189" fill="#94a3b8" fontSize="7" fontFamily="sans-serif">Método de pago</text>
      <text x="184" y="202" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">Efectivo</text>
      {/* Products table — fixed column alignment */}
      <rect x="174" y="218" width="324" height="80" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <text x="184" y="232" fill="#94a3b8" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" letterSpacing="0.5">PRODUCTOS</text>
      <line x1="174" y1="236" x2="498" y2="236" stroke="#f1f5f9" strokeWidth="1" />
      <text x="184" y="248" fill="#94a3b8" fontSize="6" fontFamily="sans-serif">Producto</text>
      <text x="362" y="248" textAnchor="middle" fill="#94a3b8" fontSize="6" fontFamily="sans-serif">Cant.</text>
      <text x="418" y="248" textAnchor="middle" fill="#94a3b8" fontSize="6" fontFamily="sans-serif">P.Unit.</text>
      <text x="490" y="248" textAnchor="end" fill="#94a3b8" fontSize="6" fontFamily="sans-serif">Total</text>
      <line x1="174" y1="251" x2="498" y2="251" stroke="#f1f5f9" strokeWidth="1" />
      <text x="184" y="264" fill="#334155" fontSize="7.5" fontFamily="sans-serif">Producto Premium A</text>
      <text x="362" y="264" textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">x2</text>
      <text x="418" y="264" textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">$3.500</text>
      <text x="490" y="264" textAnchor="end" fill="#1e293b" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">$7.000</text>
      <text x="184" y="279" fill="#334155" fontSize="7.5" fontFamily="sans-serif">Producto Premium B</text>
      <text x="362" y="279" textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">x1</text>
      <text x="418" y="279" textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">$8.000</text>
      <text x="490" y="279" textAnchor="end" fill="#1e293b" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">$8.000</text>
      <line x1="420" y1="284" x2="496" y2="284" stroke="#e2e8f0" strokeWidth="1" />
      <text x="432" y="294" fill="#94a3b8" fontSize="7" fontFamily="sans-serif">Total:</text>
      <text x="490" y="294" textAnchor="end" fill="#059669" fontSize="8" fontWeight="bold" fontFamily="sans-serif">$15.000</text>
    </svg>
  );
}

// ── InvoiceMockup SVG — fixed column overlap ───────────────────────────────

function InvoiceMockup() {
  return (
    <svg viewBox="0 0 320 405" className="w-full max-w-xs mx-auto drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="inv-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect x="12" y="12" width="296" height="389" rx="10" fill="#cbd5e1" />
      <rect x="4" y="4" width="296" height="389" rx="10" fill="white" />
      <rect x="4" y="4" width="296" height="68" rx="10" fill="url(#inv-grad)" />
      <rect x="4" y="40" width="296" height="32" fill="url(#inv-grad)" />
      <text x="152" y="30" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold" fontFamily="sans-serif">Mi Empresa S.A.</text>
      <text x="152" y="46" textAnchor="middle" fill="#bfdbfe" fontSize="8" fontFamily="sans-serif">CUIT: 30-12345678-9  |  Av. Corrientes 1234, CABA</text>
      <rect x="110" y="54" width="80" height="14" rx="4" fill="rgba(255,255,255,0.2)" />
      <text x="150" y="65" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">FACTURA  B</text>
      <text x="20" y="94" fill="#64748b" fontSize="8" fontFamily="sans-serif">Comprobante N°:</text>
      <text x="120" y="94" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">0001-00002847</text>
      <text x="210" y="94" fill="#64748b" fontSize="8" fontFamily="sans-serif">Fecha:</text>
      <text x="246" y="94" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">26/05/2026</text>
      <line x1="20" y1="102" x2="292" y2="102" stroke="#f1f5f9" strokeWidth="1" />
      <text x="20" y="118" fill="#64748b" fontSize="8" fontFamily="sans-serif">Razón Social:</text>
      <text x="98" y="118" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">Consumidor Final</text>
      <text x="20" y="132" fill="#64748b" fontSize="8" fontFamily="sans-serif">CUIT/DNI:</text>
      <text x="98" y="132" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">—</text>
      <line x1="20" y1="140" x2="292" y2="140" stroke="#f1f5f9" strokeWidth="1" />
      {/* Table header — columns spaced to avoid overlap */}
      <rect x="20" y="148" width="272" height="18" rx="4" fill="#f1f5f9" />
      <text x="28" y="161" fill="#64748b" fontSize="7" fontWeight="bold" fontFamily="sans-serif">DESCRIPCIÓN</text>
      <text x="188" y="161" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="bold" fontFamily="sans-serif">CANT.</text>
      <text x="234" y="161" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="bold" fontFamily="sans-serif">P.UNIT.</text>
      <text x="284" y="161" textAnchor="end" fill="#64748b" fontSize="7" fontWeight="bold" fontFamily="sans-serif">TOTAL</text>
      {[
        { name: 'Producto A', qty: '2', unit: '$5.000', total: '$10.000' },
        { name: 'Producto B', qty: '1', unit: '$5.000', total: '$5.000' },
      ].map((item, i) => (
        <g key={i}>
          <text x="28" y={183 + i * 18} fill="#334155" fontSize="8" fontFamily="sans-serif">{item.name}</text>
          <text x="188" y={183 + i * 18} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="sans-serif">{item.qty}</text>
          <text x="234" y={183 + i * 18} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="sans-serif">{item.unit}</text>
          <text x="284" y={183 + i * 18} textAnchor="end" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">{item.total}</text>
          <line x1="20" y1={186 + i * 18} x2="292" y2={186 + i * 18} stroke="#f8fafc" strokeWidth="1" />
        </g>
      ))}
      <line x1="170" y1="228" x2="292" y2="228" stroke="#e2e8f0" strokeWidth="1" />
      <text x="178" y="243" fill="#64748b" fontSize="8" fontFamily="sans-serif">Subtotal s/IVA</text>
      <text x="284" y="243" textAnchor="end" fill="#334155" fontSize="8" fontFamily="sans-serif">$12.397</text>
      <text x="178" y="258" fill="#64748b" fontSize="8" fontFamily="sans-serif">IVA 21%</text>
      <text x="284" y="258" textAnchor="end" fill="#334155" fontSize="8" fontFamily="sans-serif">$2.603</text>
      <line x1="170" y1="266" x2="292" y2="266" stroke="#1d4ed8" strokeWidth="1.5" />
      <text x="178" y="280" fill="#1d4ed8" fontSize="9" fontWeight="bold" fontFamily="sans-serif">TOTAL</text>
      <text x="284" y="280" textAnchor="end" fill="#1d4ed8" fontSize="10" fontWeight="bold" fontFamily="sans-serif">$15.000</text>
      <rect x="20" y="296" width="272" height="66" rx="8" fill="#eff6ff" />
      <rect x="24" y="300" width="3" height="58" rx="1.5" fill="#1d4ed8" />
      <text x="36" y="314" fill="#1d4ed8" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">COMPROBANTE AUTORIZADO AFIP / ARCA</text>
      <text x="36" y="328" fill="#475569" fontSize="7" fontFamily="sans-serif">CAE: 74012345678901</text>
      <text x="36" y="341" fill="#475569" fontSize="7" fontFamily="sans-serif">Vencimiento CAE: 05/06/2026</text>
      <text x="36" y="354" fill="#22c55e" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Autorizado electronicamente</text>
      <text x="152" y="382" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="sans-serif">Core · B&amp;B Software  —  soporte@bnbsoftware.com.ar</text>
    </svg>
  );
}

// ── ReportsMockup SVG ──────────────────────────────────────────────────────

function ReportsMockup() {
  const bars = [
    { label: 'Ene', h: 60, highlight: false },
    { label: 'Feb', h: 78, highlight: false },
    { label: 'Mar', h: 70, highlight: false },
    { label: 'Abr', h: 88, highlight: false },
    { label: 'May', h: 110, highlight: true },
  ];
  return (
    <svg viewBox="0 0 360 230" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rm-bar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="360" height="230" rx="16" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <text x="18" y="28" fill="#0f172a" fontSize="12" fontWeight="bold" fontFamily="sans-serif">Ventas del mes</text>
      <rect x="250" y="10" width="92" height="26" rx="8" fill="#eff6ff" />
      <text x="296" y="27" textAnchor="middle" fill="#1d4ed8" fontSize="10" fontWeight="bold" fontFamily="sans-serif">$420.000</text>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1="44" y1={44 + i * 30} x2="340" y2={44 + i * 30} stroke="#f1f5f9" strokeWidth="1" />
      ))}
      {bars.map((b, i) => {
        const x = 56 + i * 58;
        const y = 154 - b.h;
        return (
          <g key={i}>
            <rect x={x} y={y} width="38" height={b.h} rx="6" fill={b.highlight ? 'url(#rm-bar)' : '#bfdbfe'} />
            <text x={x + 19} y="174" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="sans-serif">{b.label}</text>
            {b.highlight && (
              <text x={x + 19} y={y - 6} textAnchor="middle" fill="#1d4ed8" fontSize="9" fontWeight="bold" fontFamily="sans-serif">+19%</text>
            )}
          </g>
        );
      })}
      {[
        { label: 'Ventas', value: '247', bg: '#f8fafc', color: '#1e293b' },
        { label: 'Ticket prom.', value: '$1.700', bg: '#f8fafc', color: '#1e293b' },
        { label: 'Ganancia neta', value: '$168.000', bg: '#ecfdf5', color: '#059669' },
      ].map((s, i) => (
        <g key={i}>
          <rect x={16 + i * 114} y="186" width="104" height="34" rx="8" fill={s.bg} />
          <text x={68 + i * 114} y="200" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="sans-serif">{s.label}</text>
          <text x={68 + i * 114} y="213" textAnchor="middle" fill={s.color} fontSize="9.5" fontWeight="bold" fontFamily="sans-serif">{s.value}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Module icons (uniform cyan-300 color) ─────────────────────────────────

const ic = (d) => (
  <svg className="w-4 h-4 text-cyan-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const MODULES = [
  { label: 'Historial de Ventas', icon: ic('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2') },
  { label: 'Gestión de Mesas', icon: ic('M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z') },
  { label: 'Lista de Precios', icon: ic('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z') },
  { label: 'Gastos e Ingresos', icon: ic('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z') },
  { label: 'Notas de Crédito', icon: ic('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z') },
  { label: 'Pedidos de Compra', icon: ic('M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z') },
  { label: 'Gestión de Proveedores', icon: ic('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z') },
  { label: 'Ret. y Percepciones', icon: ic('M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z') },
  { label: 'Multi-sucursal', icon: ic('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4') },
  { label: 'Órdenes de Servicio', icon: ic('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z') },
  { label: 'Cola de Atención', icon: ic('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z') },
  { label: 'Saldo de Clientes', icon: ic('M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3') },
  { label: 'Métodos de Pago', icon: ic('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z') },
  { label: 'Estado de Resultados', icon: ic('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z') },
  { label: 'Exportación de Datos', icon: ic('M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10') },
  { label: 'Roles y Permisos', icon: ic('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z') },
];

// ── Trust bar items ────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: ic('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'), text: 'Integración oficial AFIP/ARCA' },
  { icon: ic('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'), text: 'Soporte multi-sucursal' },
  { icon: ic('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'), text: 'Datos cifrados y seguros' },
  { icon: ic('M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'), text: 'Funciona en cualquier dispositivo' },
];

// ── Feature cards ──────────────────────────────────────────────────────────

const FEATURES = [
  { icon: ic('M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'), title: 'Punto de Venta', desc: 'Creá ventas en segundos, asigná clientes, aplicá descuentos y cobrá con cualquier medio de pago — desde cualquier dispositivo.' },
  { icon: ic('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'), title: 'Stock en Tiempo Real', desc: 'Inventario actualizado automáticamente con cada venta. Alertas de stock bajo para que nunca te quedes sin mercadería.' },
  { icon: ic('M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'), title: 'Caja y Turnos', desc: 'Apertura y cierre de caja con desglose de efectivo, tarjetas y transferencias. Control total del flujo de dinero.' },
  { icon: ic('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'), title: 'Facturación AFIP/ARCA', desc: 'Emisión de Facturas A y B con obtención de CAE automático. Cumplí con la normativa vigente sin complicaciones.' },
  { icon: ic('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'), title: 'Equipo y Comisiones', desc: 'Gestioná vendedores, cajeros y encargados. Cálculo automático de comisiones por período con historial detallado.' },
  { icon: ic('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'), title: 'Reportes e Informes', desc: 'Dashboards con ventas, gastos, rentabilidad y métricas clave. Exportá en CSV o PDF con un clic.' },
];

// ── Smooth scroll helper ───────────────────────────────────────────────────

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Scroll-snap between sections ──────────────────────────────────────────

const SECTION_IDS = ['hero', 'trust', 'funcionalidades', 'pos-deep', 'fiscal-deep', 'reportes-deep', 'modulos', 'multi-branch', 'soporte', 'cta'];

function useScrollSnap() {
  useEffect(() => {
    let snapTimeout = null;
    let lastDelta = 0;

    function onWheel(e) {
      clearTimeout(snapTimeout);
      lastDelta = e.deltaY;
      snapTimeout = setTimeout(() => {
        const sections = SECTION_IDS.map(id => document.getElementById(id)).filter(Boolean);
        let current = 0;
        for (let i = 0; i < sections.length; i++) {
          const top = sections[i].getBoundingClientRect().top;
          if (top <= window.innerHeight * 0.45) current = i;
        }
        const next = lastDelta > 0
          ? Math.min(current + 1, sections.length - 1)
          : Math.max(current - 1, 0);
        sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => { window.removeEventListener('wheel', onWheel); clearTimeout(snapTimeout); };
  }, []);
}

// ── Main component ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useScrollSnap();

  return (
    <div className="min-h-screen bg-slate-900 overflow-x-hidden text-white">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CoreLogo size={34} />
            <span className="font-black text-xl text-white tracking-tight">core</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('funcionalidades')} className="text-sm font-medium text-slate-400 hover:text-cyan-300 transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo('modulos')} className="text-sm font-medium text-slate-400 hover:text-cyan-300 transition-colors">Módulos</button>
            <button onClick={() => scrollTo('soporte')} className="text-sm font-medium text-slate-400 hover:text-cyan-300 transition-colors">Soporte</button>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-blue-900/40">
              Iniciar sesión
            </Link>
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-slate-900 px-4 py-3 space-y-1">
            <button onClick={() => { scrollTo('funcionalidades'); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10">Funcionalidades</button>
            <button onClick={() => { scrollTo('modulos'); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10">Módulos</button>
            <button onClick={() => { scrollTo('soporte'); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10">Soporte</button>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm text-white/80 font-medium">Diseñado para negocios argentinos</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6">
                Todo lo que tu{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">negocio necesita</span>
                {' '}en un solo lugar
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-lg">
                Ventas, stock, caja, empleados y facturación AFIP/ARCA — todo integrado y accesible desde cualquier dispositivo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/30 text-base">
                  Comenzar ahora
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
                <button onClick={() => scrollTo('funcionalidades')} className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base">
                  Ver funcionalidades
                </button>
              </div>
              <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/10">
                {[{ value: '16+', label: 'módulos integrados' }, { value: '99.9%', label: 'uptime garantizado' }, { value: '24/7', label: 'soporte disponible' }].map((s, i) => (
                  <div key={i}>
                    <p className="text-3xl font-black text-white">{s.value}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </FadeUp>
            <FadeUp delay={150} className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-3xl" />
                <div className="relative bg-white/5 border border-white/10 rounded-2xl p-2 shadow-2xl">
                  <AppMockup />
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
        <button onClick={() => scrollTo('trust')} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors">
          <span className="text-xs font-medium tracking-widest uppercase">Descubrí más</span>
          <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </section>

      {/* ── Trust bar ── */}
      <section id="trust" className="bg-slate-800/60 border-y border-white/10 py-5">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
          {TRUST_ITEMS.map((item, i) => (
            <FadeUp key={i} delay={i * 80} className="flex items-center gap-2.5">
              {item.icon}
              <span className="text-sm font-medium text-slate-300">{item.text}</span>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Feature Grid ── */}
      <section id="funcionalidades" className="py-20 sm:py-28 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeUp className="text-center mb-16">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-3 py-1.5 rounded-full">Funcionalidades</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-4">Una plataforma. Todo tu negocio.</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">Dejá de usar múltiples herramientas y hojas de cálculo. Core centraliza toda la operación en un solo lugar.</p>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeUp key={i} delay={i * 70}>
                <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-slate-700/60 border border-white/10">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deep dive: POS ── */}
      <section id="pos-deep" className="py-20 bg-slate-800/40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeUp>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-3 py-1.5 rounded-full">Punto de Venta</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-4 leading-tight">Vendé más rápido,<br />con menos errores</h2>
              <p className="text-slate-400 leading-relaxed mb-8">Nuestro POS está diseñado para velocidad. Buscá productos, aplicá descuentos y procesá el cobro en segundos desde cualquier dispositivo.</p>
              <ul className="space-y-3">
                {['Búsqueda instantánea de productos por nombre o código', 'Múltiples métodos de pago simultáneos', 'Descuentos por producto o sobre el total de la venta', 'Asignación de vendedor y cliente con balance', 'Historial completo con filtros avanzados', 'Emisión de remitos y comprobantes desde la venta'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </FadeUp>
            <FadeUp delay={150} className="lg:pl-8">
              <div className="bg-slate-900/80 rounded-2xl border border-white/10 p-3 sm:p-4 shadow-2xl">
                <AppMockup />
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Deep dive: Fiscal ── */}
      <section id="fiscal-deep" className="py-20 bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeUp className="order-2 lg:order-1 lg:pr-8">
              <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-6 sm:p-8">
                <InvoiceMockup />
              </div>
            </FadeUp>
            <FadeUp delay={150} className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1.5 mb-4">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">Facturación AFIP / ARCA</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">Compliance fiscal<br />sin complicaciones</h2>
              <p className="text-slate-400 leading-relaxed mb-8">Emitís Facturas A y B directamente desde el sistema con obtención automática del CAE. Sin intermediarios, sin demoras.</p>
              <ul className="space-y-3">
                {['Factura electrónica A y B', 'Obtención de CAE en tiempo real vía WebService', 'Notas de crédito y débito fiscales', 'Retenciones y percepciones impositivas', 'Archivo digital de todos los comprobantes', 'Configuración WSAA / WSFE integrada'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Deep dive: Reports ── */}
      <section id="reportes-deep" className="py-20 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeUp>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-3 py-1.5 rounded-full">Reportes e Informes</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-4 leading-tight">Conocé tu negocio<br />en profundidad</h2>
              <p className="text-slate-300 leading-relaxed mb-8">Accedé a reportes detallados de ventas, gastos, rentabilidad y comisiones. Tomá decisiones estratégicas basadas en datos reales.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Estado de resultados', icon: ic('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z') },
                  { label: 'Ventas por categoría', icon: ic('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z') },
                  { label: 'Rentabilidad producto', icon: ic('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z') },
                  { label: 'Flujo de caja', icon: ic('M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z') },
                  { label: 'Comisiones por período', icon: ic('M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z') },
                  { label: 'Exportación CSV / PDF', icon: ic('M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10') },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    {item.icon}
                    <span className="text-sm text-white/80">{item.label}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
            <FadeUp delay={150} className="lg:pl-8">
              <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 shadow-2xl">
                <ReportsMockup />
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── All Modules ── */}
      <section id="modulos" className="py-20 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeUp className="text-center mb-12">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-3 py-1.5 rounded-full">Módulos incluidos</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-4">Todo lo que venías pidiendo</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Cada módulo trabaja en conjunto con el resto. Sin extras ni sorpresas — todo incluido.</p>
          </FadeUp>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MODULES.map((m, i) => (
              <FadeUp key={i} delay={(i % 8) * 50}>
                <div className="flex items-center gap-3 bg-slate-800/60 hover:bg-slate-700/60 border border-white/10 hover:border-cyan-500/40 rounded-xl px-4 py-3 transition-colors">
                  {m.icon}
                  <span className="text-sm font-medium text-slate-300">{m.label}</span>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Multi-branch ── */}
      <section id="multi-branch" className="py-20 bg-slate-800/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <FadeUp>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-full px-4 py-1.5 mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span className="font-bold text-sm">Multi-sucursal</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">¿Tenés más de un local?<br />Te tenemos cubierto</h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-12">Gestioná múltiples sucursales desde una sola cuenta. Cada sucursal tiene su propia caja, inventario y equipo.</p>
          </FadeUp>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              { n: '01', title: 'Inventario por sucursal', desc: 'Cada local tiene su propio stock con transferencias entre sucursales en tiempo real.' },
              { n: '02', title: 'Reportes consolidados', desc: 'Visualizá las métricas de todas las sucursales juntas o individualmente con un solo clic.' },
              { n: '03', title: 'Gestión de equipos', desc: 'Cada empleado está asignado a su sucursal con roles y permisos configurables.' },
            ].map((item, i) => (
              <FadeUp key={i} delay={i * 100}>
                <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-6 hover:border-blue-400/30 transition-colors">
                  <span className="text-4xl font-black text-blue-800/60 block mb-3">{item.n}</span>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Support ── */}
      <section id="soporte" className="py-20 bg-gradient-to-br from-blue-950 to-slate-900 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-64 h-64 rounded-full bg-cyan-300/5 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <FadeUp>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-white font-semibold text-sm">Equipo disponible ahora mismo</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Estamos con vos, siempre</h2>
            <p className="text-blue-200 text-lg max-w-xl mx-auto mb-12">Sabemos que tu negocio no para. Por eso nuestro equipo está disponible en cualquier momento.</p>
          </FadeUp>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: ic('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'), title: 'Disponibilidad 24/7', desc: 'Soporte disponible las 24 horas, los 7 días de la semana, incluso feriados.' },
              { icon: ic('M13 10V3L4 14h7v7l9-11h-7z'), title: 'Respuesta garantizada', desc: 'Nos comprometemos a responder consultas críticas en menos de 60 minutos.' },
              { icon: ic('M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'), title: 'Actualizaciones incluidas', desc: 'Mejoras y nuevas funcionalidades incluidas sin costo adicional. Siempre en la última versión.' },
            ].map((item, i) => (
              <FadeUp key={i} delay={i * 100}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 transition-colors">
                  <div className="mb-4">{item.icon}</div>
                  <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                  <p className="text-blue-200 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section id="cta" className="py-24 bg-slate-900">
        <FadeUp className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center mb-6">
            <CoreLogo size={64} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">¿Listo para llevar tu negocio al siguiente nivel?</h2>
          <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">Ingresá al sistema y empezá a gestionar todo desde un solo lugar.</p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold px-10 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-xl shadow-blue-900/50 text-base">
            Iniciar sesión
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </FadeUp>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400 pt-14 pb-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 gap-10 pb-10 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <CoreLogo size={32} />
                <span className="font-black text-white text-xl tracking-tight">core</span>
              </div>
              <p className="text-sm leading-relaxed mb-5">Sistema de gestión integral para negocios argentinos. Ventas, stock, caja, empleados y facturación en un solo lugar.</p>
              <p className="text-xs text-slate-500">Desarrollado con cuidado por <span className="font-semibold text-slate-300">B&amp;B Software</span></p>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-5 uppercase tracking-widest">Plataforma</h4>
              <ul className="space-y-3">
                <li><button onClick={() => scrollTo('funcionalidades')} className="text-sm hover:text-white transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => scrollTo('modulos')} className="text-sm hover:text-white transition-colors">Módulos incluidos</button></li>
                <li><button onClick={() => scrollTo('soporte')} className="text-sm hover:text-white transition-colors">Soporte 24/7</button></li>
                <li><Link to="/login" className="text-sm hover:text-white transition-colors">Iniciar sesión</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-5 uppercase tracking-widest">Legal</h4>
              <ul className="space-y-3">
                <li><button onClick={() => setModal('privacy')} className="text-sm hover:text-white transition-colors text-left">Política de Privacidad</button></li>
                <li><button onClick={() => setModal('terms')} className="text-sm hover:text-white transition-colors text-left">Términos y Condiciones</button></li>
                <li><button onClick={() => setModal('cookies')} className="text-sm hover:text-white transition-colors text-left">Política de Cookies</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <p>© 2026 Core · B&amp;B Software. Todos los derechos reservados.</p>
            <p>Ciudad Autónoma de Buenos Aires, Argentina</p>
          </div>
        </div>
      </footer>

      {modal === 'privacy' && <LegalModal title="Política de Privacidad" sections={PRIVACY_POLICY} onClose={() => setModal(null)} />}
      {modal === 'terms' && <LegalModal title="Términos y Condiciones" sections={TERMS_AND_CONDITIONS} onClose={() => setModal(null)} />}
      {modal === 'cookies' && <LegalModal title="Política de Cookies" sections={COOKIES_POLICY} onClose={() => setModal(null)} />}
    </div>
  );
}
