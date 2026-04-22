'use strict';

// WSAA - Web Service de Autenticación y Autorización de AFIP
// Generates and signs the LoginTicketRequest, obtains the Access Ticket (TA)
// and caches it to ta.xml to avoid redundant requests [RM, PA]

const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const axios = require('axios');
const xml2js = require('xml2js');

const TA_DIR = path.join(__dirname, '../../../');

// Returns the TA cache path scoped to the given env [CMV]
function taCachePath(env) {
  return path.join(TA_DIR, `ta-${env}.xml`);
}

const WSAA_URLS = {
  production:   'https://wsaa.afip.gov.ar/ws/services/LoginCms',
  homologation: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
};

// Build the LoginTicketRequest XML [CMV]
function buildLoginTicketRequest(service) {
  const now = new Date();
  const pad = (d) => d.toISOString().replace('Z', '-03:00');
  const genTime = pad(new Date(now.getTime() - 10 * 60 * 1000));
  const expTime = pad(new Date(now.getTime() + 10 * 60 * 1000));
  const uniqueId = Math.floor(now.getTime() / 1000);

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<loginTicketRequest version="1.0">\n' +
    '  <header>\n' +
    `    <uniqueId>${uniqueId}</uniqueId>\n` +
    `    <generationTime>${genTime}</generationTime>\n` +
    `    <expirationTime>${expTime}</expirationTime>\n` +
    '  </header>\n' +
    `  <service>${service}</service>\n` +
    '</loginTicketRequest>'
  );
}

// Sign the XML using PKCS7 CMS with the provided cert + private key [SFT]
function signCMS(xmlContent) {
  const certPem = fs.readFileSync(path.resolve(process.env.CERT_CRT_PATH), 'utf8');
  const keyPem  = fs.readFileSync(path.resolve(process.env.CERT_KEY_PATH), 'utf8');

  const cert = forge.pki.certificateFromPem(certPem);
  const key  = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(xmlContent, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, 'binary').toString('base64');
}

// Return cached ticket if still valid (with 5 min buffer) [PA]
async function loadCachedTicket(env) {
  const TA_PATH = taCachePath(env);
  if (!fs.existsSync(TA_PATH)) return null;
  try {
    const taXml = fs.readFileSync(TA_PATH, 'utf8');
    const parsed = await xml2js.parseStringPromise(taXml, {
      explicitArray: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });
    const expTime = parsed.loginTicketResponse.header.expirationTime;
    const buffer = 5 * 60 * 1000; // 5 minutes buffer
    if (new Date(expTime) > new Date(Date.now() + buffer)) {
      const { token, sign } = parsed.loginTicketResponse.credentials;
      return { token, sign };
    }
  } catch {
    // Cache invalid or corrupt — will request a new ticket
  }
  return null;
}

// Obtain an Access Ticket from WSAA [REH]
// env: 'homologation' | 'production' — overrides AFIP_ENV env var
async function getAccessTicket(service = 'wsfe', env) {
  const afipEnv = env || process.env.AFIP_ENV || 'homologation';
  const cached  = await loadCachedTicket(afipEnv);
  if (cached) return cached;

  const wsaaUrl = WSAA_URLS[afipEnv] || WSAA_URLS.homologation;

  const ltrXml = buildLoginTicketRequest(service);
  const cms    = signCMS(ltrXml);

  const soapEnvelope =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soapenv:Envelope' +
    '  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"' +
    '  xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
    `<wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms>` +
    '</soapenv:Body>' +
    '</soapenv:Envelope>';

  const response = await axios.post(wsaaUrl, soapEnvelope, {
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      SOAPAction: '',
    },
    timeout: 30000,
  });

  // Strip namespace prefixes for consistent navigation [DRY]
  const envelope = await xml2js.parseStringPromise(response.data, {
    explicitArray: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
  });

  const taXml =
    envelope?.Envelope?.Body?.loginCmsResponse?.return ||
    envelope?.Envelope?.Body?.loginCmsResponse?.['ns2:return'];

  if (!taXml) {
    throw new Error('WSAA: could not extract TA from SOAP response');
  }

  // Persist the TA for caching [RM]
  const TA_PATH = taCachePath(afipEnv);
  fs.writeFileSync(TA_PATH, taXml, 'utf8');

  const taParsed = await xml2js.parseStringPromise(taXml, {
    explicitArray: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
  });
  const { token, sign } = taParsed.loginTicketResponse.credentials;
  return { token, sign };
}

module.exports = { getAccessTicket };
