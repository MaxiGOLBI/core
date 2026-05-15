'use strict';

// WSAA — Web Service de Autenticación y Autorización (AFIP)
// Generates a Ticket de Acceso (TA) signed with the company's certificate.
// The TA contains Token + Sign, valid for 12 hours, cached in memory.

const forge  = require('node-forge');
const axios  = require('axios');
const xml2js = require('xml2js');

const WSAA_URLS = {
  homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  produccion:   'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};

// In-memory ticket cache — key: `${cuit}_${service}_${env}`
const _cache = {};

// ── Build the LoginTicketRequest XML ─────────────────────────
function buildLtrXml(service) {
  const now  = new Date();
  const from = new Date(now.getTime() - 60_000);           // 1 min ago (clock skew)
  const to   = new Date(now.getTime() + 12 * 3_600_000);  // 12 h ahead

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketRequest version="1.0">',
    '  <header>',
    `    <uniqueId>${Date.now()}</uniqueId>`,
    `    <generationTime>${from.toISOString()}</generationTime>`,
    `    <expirationTime>${to.toISOString()}</expirationTime>`,
    '  </header>',
    `  <service>${service}</service>`,
    '</loginTicketRequest>',
  ].join('\n');
}

// ── Sign the XML with PKCS#7 / CMS using node-forge ──────────
function signCms(xml, certPem, keyPem) {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(xml, 'utf8');
  p7.addCertificate(certPem);

  const cert = forge.pki.certificateFromPem(certPem);
  const key  = forge.pki.privateKeyFromPem(keyPem);

  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType,   value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest, value: '' },
      { type: forge.pki.oids.signingTime,   value: new Date() },
    ],
  });

  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

// ── Call WSAA SOAP endpoint ───────────────────────────────────
async function callWsaa(cms, environment) {
  const url  = WSAA_URLS[environment] ?? WSAA_URLS.homologacion;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
    timeout: 30_000,
  });

  const parsed = await xml2js.parseStringPromise(res.data, { explicitArray: false });
  const taXml  = parsed['soapenv:Envelope']['soapenv:Body']['loginCmsResponse']['loginCmsReturn'];
  const ta     = await xml2js.parseStringPromise(taXml, { explicitArray: false });

  const creds  = ta.loginTicketResponse.credentials;
  const expiry = ta.loginTicketResponse.header.expirationTime;

  return {
    token:     creds.token,
    sign:      creds.sign,
    expiresAt: new Date(expiry),
  };
}

// ── Public: get a valid ticket (from cache or fresh) ─────────
async function getTicket({ cuit, certPem, keyPem, service = 'wsfe', environment = 'homologacion' }) {
  const key    = `${cuit}_${service}_${environment}`;
  const cached = _cache[key];

  // Reuse cached ticket if it expires more than 5 minutes from now
  if (cached && cached.expiresAt.getTime() - Date.now() > 5 * 60_000) {
    return { token: cached.token, sign: cached.sign };
  }

  const xml    = buildLtrXml(service);
  const cms    = signCms(xml, certPem, keyPem);
  const ticket = await callWsaa(cms, environment);

  _cache[key] = ticket;
  console.log(`[WSAA] New ticket for ${cuit} / ${service} (${environment}), expires ${ticket.expiresAt.toISOString()}`);

  return { token: ticket.token, sign: ticket.sign };
}

module.exports = { getTicket };
