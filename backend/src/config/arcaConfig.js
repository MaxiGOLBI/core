'use strict';

// Centralized ARCA config reader with 60s in-memory cache [PA, DRY]
const supabase = require('./supabase');

let _cache     = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

async function getArcaConfig() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) return _cache;
  const { data } = await supabase.from('arca_config').select('*').eq('id', 1).single();
  _cache     = data ?? null;
  _cacheTime = Date.now();
  return _cache;
}

function invalidateArcaCache() {
  _cache     = null;
  _cacheTime = 0;
}

module.exports = { getArcaConfig, invalidateArcaCache };
