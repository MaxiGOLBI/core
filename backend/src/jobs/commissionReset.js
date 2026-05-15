const cron = require('node-cron');
const supabase = require('../config/supabase');

// Reset all commission balances every Sunday at midnight
function startCommissionReset() {
  cron.schedule('0 0 * * 0', async () => {
    console.log('[CRON] Resetting weekly commission balances...');

    const { error } = await supabase
      .from('users')
      .update({ commission_balance: 0 })
      .eq('role', 'vendedor');

    if (error) {
      console.error('[CRON] Commission reset failed:', error.message);
    } else {
      console.log('[CRON] Commission balances reset successfully');
    }
  });
}

module.exports = { startCommissionReset };
