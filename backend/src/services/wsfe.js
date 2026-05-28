'use strict';

// WSFE v1 — Web Service de Facturación Electrónica (AFIP)
// Handles FECAESolicitar (request CAE) and FECompUltimoAutorizado (last authorized number).

const axios  = require('axios');
const xml2js = require('xml2js');

const WSFE_URLS = {
  homologacion: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  produccion:   'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

// Our receipt_type codes → AFIP CbteTipo numbers
const CBTE_TIPO = {
  FA: 1,  FB: 6,  FC: 11,
  NCA: 2, NCB: 7, NCC: 12,
  NDA: 3, NDB: 8, NDC: 13,
};

// IVA alicuota IDs used in Iva section (21% = Id 5, most common for tech products)
const IVA_ID_21 = 5;

// ── Internal SOAP helper ──────────────────────────────────────
async function soapCall(environment, action, bodyXml) {
  const url = WSFE_URLS[environment] ?? WSFE_URLS.homologacion;

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    ${bodyXml}
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await axios.post(url, envelope, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction':   `http://ar.gov.afip.dif.FEV1/${action}`,
    },
    timeout: 30_000,
  });

  return xml2js.parseStringPromise(res.data, { explicitArray: false });
}

function authBlock(cuit, token, sign) {
  return `<ar:Auth>
      <ar:Token>${token}</ar:Token>
      <ar:Sign>${sign}</ar:Sign>
      <ar:Cuit>${cuit}</ar:Cuit>
    </ar:Auth>`;
}

function checkErrors(result, responseName) {
  const body = result['soapenv:Envelope']['soapenv:Body'];
  const resp = body[`${responseName}Response`]?.[`${responseName}Result`];
  if (!resp) throw new Error(`Respuesta AFIP inesperada para ${responseName}`);
  if (resp.Errors) {
    const err = Array.isArray(resp.Errors.Err) ? resp.Errors.Err[0] : resp.Errors.Err;
    throw new Error(`AFIP [${err.Code}]: ${err.Msg}`);
  }
  return resp;
}

// ── GET last authorized voucher number ───────────────────────
async function getLastVoucher({ cuit, environment }, token, sign, ptoVta, cbteTipo) {
  const body = `<ar:FECompUltimoAutorizado>
    ${authBlock(cuit, token, sign)}
    <ar:PtoVta>${ptoVta}</ar:PtoVta>
    <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
  </ar:FECompUltimoAutorizado>`;

  const result = await soapCall(environment, 'FECompUltimoAutorizado', body);
  const resp   = checkErrors(result, 'FECompUltimoAutorizado');
  return parseInt(resp.CbteNro ?? 0);
}

// ── Request CAE for a single invoice ─────────────────────────
async function requestCae({ cuit, environment }, token, sign, invoice) {
  const today   = new Date();
  const cbteFch = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const ivaXml = invoice.iva_amount > 0
    ? `<ar:Iva>
        <ar:AlicIva>
          <ar:Id>${IVA_ID_21}</ar:Id>
          <ar:BaseImp>${invoice.net_amount.toFixed(2)}</ar:BaseImp>
          <ar:Importe>${invoice.iva_amount.toFixed(2)}</ar:Importe>
        </ar:AlicIva>
      </ar:Iva>`
    : '';

  const body = `<ar:FECAESolicitar>
    ${authBlock(cuit, token, sign)}
    <ar:FeCAEReq>
      <ar:FeCabReq>
        <ar:CantReg>1</ar:CantReg>
        <ar:PtoVta>${invoice.point_of_sale}</ar:PtoVta>
        <ar:CbteTipo>${invoice.cbte_tipo}</ar:CbteTipo>
      </ar:FeCabReq>
      <ar:FeDetReq>
        <ar:FECAEDetRequest>
          <ar:Concepto>1</ar:Concepto>
          <ar:DocTipo>${invoice.doc_tipo}</ar:DocTipo>
          <ar:DocNro>${invoice.doc_nro}</ar:DocNro>
          <ar:CbteDesde>${invoice.number}</ar:CbteDesde>
          <ar:CbteHasta>${invoice.number}</ar:CbteHasta>
          <ar:CbteFch>${cbteFch}</ar:CbteFch>
          <ar:ImpTotal>${invoice.total_amount.toFixed(2)}</ar:ImpTotal>
          <ar:ImpTotConc>0.00</ar:ImpTotConc>
          <ar:ImpNeto>${invoice.net_amount.toFixed(2)}</ar:ImpNeto>
          <ar:ImpOpEx>0.00</ar:ImpOpEx>
          <ar:ImpTrib>0.00</ar:ImpTrib>
          <ar:ImpIVA>${invoice.iva_amount.toFixed(2)}</ar:ImpIVA>
          <ar:MonId>PES</ar:MonId>
          <ar:MonCotiz>1</ar:MonCotiz>
          ${ivaXml}
        </ar:FECAEDetRequest>
      </ar:FeDetReq>
    </ar:FeCAEReq>
  </ar:FECAESolicitar>`;

  const result = await soapCall(environment, 'FECAESolicitar', body);
  const resp   = checkErrors(result, 'FECAESolicitar');
  const det    = resp.FeDetResp.FECAEDetResponse;

  if (det.Resultado !== 'A') {
    const obs = det.Observaciones?.Obs;
    const msg = obs
      ? (Array.isArray(obs) ? obs.map((o) => `${o.Code}: ${o.Msg}`).join('; ') : `${obs.Code}: ${obs.Msg}`)
      : 'Comprobante rechazado por AFIP';
    throw new Error(`AFIP rechazó el comprobante: ${msg}`);
  }

  const expiry = String(det.CAEFchVto);
  return {
    cae:        det.CAE,
    cae_expiry: `${expiry.slice(0, 4)}-${expiry.slice(4, 6)}-${expiry.slice(6, 8)}`,
    number:     parseInt(det.CbteDesde),
  };
}

module.exports = { CBTE_TIPO, getLastVoucher, requestCae };
