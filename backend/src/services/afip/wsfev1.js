'use strict';

// WSFEv1 - Web Service de Facturación Electrónica v1 de AFIP
// Uses the Access Ticket from WSAA to request CAE (Código de Autorización Electrónica)

const axios   = require('axios');
const xml2js  = require('xml2js');
const { getAccessTicket } = require('./wsaa');

const WSFEV1_URLS = {
  production:   'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
  homologation: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
};

const SOAP_NS = 'http://ar.gov.afip.dif.FEV1/';

// Parse XML stripping namespace prefixes for consistent access [DRY]
function parseXml(raw) {
  return xml2js.parseStringPromise(raw, {
    explicitArray: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
  });
}

// Generic WSFEv1 SOAP call [DRY, REH]
async function callWsfev1(action, bodyXml, env) {
  const afipEnv = env || process.env.AFIP_ENV || 'homologation';
  const url = WSFEV1_URLS[afipEnv] || WSFEV1_URLS.homologation;

  const soapEnvelope =
    '<?xml version="1.0" encoding="utf-8"?>' +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${SOAP_NS}">` +
    `<soap:Body>${bodyXml}</soap:Body>` +
    '</soap:Envelope>';

  const response = await axios.post(url, soapEnvelope, {
    headers: {
      'Content-Type': 'text/xml;charset=utf-8',
      SOAPAction: `${SOAP_NS}${action}`,
    },
    timeout: 30000,
  });

  return response.data;
}

// Extract errors from WSFEv1 result and throw if present [REH]
function checkErrors(result) {
  const errNode = result?.Errors?.Err;
  if (!errNode) return;
  const err = Array.isArray(errNode) ? errNode[0] : errNode;
  throw new Error(`WSFEv1 [${err.Code}]: ${err.Msg}`);
}

// Get the last authorized invoice number for a given PtoVta and CbteTipo
async function getLastInvoiceNumber(cuit, ptoVta, cbteTipo, env) {
  const { token, sign } = await getAccessTicket('wsfe', env);

  const bodyXml =
    '<ar:FECompUltimoAutorizado>' +
    `<ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>` +
    `<ar:PtoVta>${ptoVta}</ar:PtoVta>` +
    `<ar:CbteTipo>${cbteTipo}</ar:CbteTipo>` +
    '</ar:FECompUltimoAutorizado>';

  const raw    = await callWsfev1('FECompUltimoAutorizado', bodyXml, env);
  const parsed = await parseXml(raw);
  const result = parsed?.Envelope?.Body?.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;

  checkErrors(result);

  return parseInt(result?.CbteNro || '0', 10);
}

// Build the IVA block for the SOAP body (only included when impIVA > 0)
function buildIvaBlock(impNeto, impIVA) {
  if (impIVA <= 0) return '';
  return (
    '<ar:Iva>' +
    '<ar:AlicIva>' +
    '<ar:Id>5</ar:Id>' + // IVA 21%
    `<ar:BaseImp>${impNeto.toFixed(2)}</ar:BaseImp>` +
    `<ar:Importe>${impIVA.toFixed(2)}</ar:Importe>` +
    '</ar:AlicIva>' +
    '</ar:Iva>'
  );
}

/**
 * Request a CAE for a single invoice.
 * arcaConfig: { cuit, env } — from DB; falls back to process.env [DRY, CMV]
 */
async function requestCAE(invoiceData, arcaConfig = {}) {
  const cuit = arcaConfig.cuit || process.env.AFIP_CUIT;
  const env  = arcaConfig.env  || process.env.AFIP_ENV || 'homologation';
  if (!cuit) throw new Error('AFIP_CUIT no está configurado. El dueño debe configurar ARCA primero.');

  const {
    ptoVta   = 1,
    cbteTipo = 11,
    concepto = 1,
    docTipo  = 99,
    docNro   = 0,
    impNeto,
    impIVA   = 0,
    impTotal,
    cbteDate,
  } = invoiceData;

  if (impNeto === undefined || impTotal === undefined) {
    throw new Error('impNeto and impTotal are required');
  }

  const { token, sign } = await getAccessTicket('wsfe', env);
  const lastNro  = await getLastInvoiceNumber(cuit, ptoVta, cbteTipo, env);
  const cbteNro  = lastNro + 1;
  const cbteFch  = cbteDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ivaBlock = buildIvaBlock(impNeto, impIVA);

  const bodyXml =
    '<ar:FECAESolicitar>' +
    `<ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>` +
    '<ar:FeCAEReq>' +
    '<ar:FeCabReq>' +
    `<ar:CantReg>1</ar:CantReg><ar:PtoVta>${ptoVta}</ar:PtoVta><ar:CbteTipo>${cbteTipo}</ar:CbteTipo>` +
    '</ar:FeCabReq>' +
    '<ar:FeDetReq>' +
    '<ar:FECAEDetRequest>' +
    `<ar:Concepto>${concepto}</ar:Concepto>` +
    `<ar:DocTipo>${docTipo}</ar:DocTipo>` +
    `<ar:DocNro>${docNro}</ar:DocNro>` +
    `<ar:CbteDesde>${cbteNro}</ar:CbteDesde>` +
    `<ar:CbteHasta>${cbteNro}</ar:CbteHasta>` +
    `<ar:CbteFch>${cbteFch}</ar:CbteFch>` +
    `<ar:ImpTotal>${impTotal.toFixed(2)}</ar:ImpTotal>` +
    '<ar:ImpTotConc>0.00</ar:ImpTotConc>' +
    `<ar:ImpNeto>${impNeto.toFixed(2)}</ar:ImpNeto>` +
    '<ar:ImpOpEx>0.00</ar:ImpOpEx>' +
    `<ar:ImpIVA>${impIVA.toFixed(2)}</ar:ImpIVA>` +
    '<ar:ImpTrib>0.00</ar:ImpTrib>' +
    '<ar:MonId>PES</ar:MonId>' +
    '<ar:MonCotiz>1</ar:MonCotiz>' +
    ivaBlock +
    '</ar:FECAEDetRequest>' +
    '</ar:FeDetReq>' +
    '</ar:FeCAEReq>' +
    '</ar:FECAESolicitar>';

  const raw    = await callWsfev1('FECAESolicitar', bodyXml, env);
  const parsed = await parseXml(raw);
  const result = parsed?.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult;

  checkErrors(result);

  const det = result?.FeDetResp?.FECAEDetResponse;
  if (det?.Resultado !== 'A') {
    const obs    = det?.Observaciones?.Obs;
    const obsMsg = obs
      ? (Array.isArray(obs) ? obs.map((o) => o.Msg).join(', ') : obs.Msg)
      : 'Unknown error';
    throw new Error(`CAE not approved. Result: ${det?.Resultado}. Obs: ${obsMsg}`);
  }

  return {
    cae:     det.CAE,
    caeVtto: det.CAEFchVto,
    cbteNro,
    cbteFch,
    ptoVta,
    cbteTipo,
  };
}

module.exports = { requestCAE, getLastInvoiceNumber };
