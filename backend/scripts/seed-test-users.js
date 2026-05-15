/**
 * seed-test-users.js
 * Creates one test user per role for local development.
 * Run ONCE: node scripts/seed-test-users.js
 * 
 * Users created:
 *   dueno@test.com     / Test1234!  → dueño
 *   encargado@test.com / Test1234!  → encargado
 *   cajero@test.com    / Test1234!  → cajero
 *   vendedor@test.com  / Test1234!  → vendedor
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const COMPANY_NAME = 'Empresa Test';
const BRANCH_NAME  = 'Sucursal Test';
const PASSWORD     = 'Test1234!';

const TEST_USERS = [
  { name: 'Dueño Test',     email: 'dueno@test.com',     role: 'dueno'     },
  { name: 'Encargado Test', email: 'encargado@test.com', role: 'encargado' },
  { name: 'Cajero Test',    email: 'cajero@test.com',    role: 'cajero'    },
  { name: 'Vendedor Test',  email: 'vendedor@test.com',  role: 'vendedor'  },
];

async function main() {
  console.log('🌱 Seeding test users...\n');

  // 1. Create or reuse test company
  let companyId;
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('name', COMPANY_NAME)
    .maybeSingle();

  if (existingCompany) {
    companyId = existingCompany.id;
    console.log(`✅ Company already exists: ${companyId}`);
  } else {
    const { data: company, error } = await supabase
      .from('companies')
      .insert([{ name: COMPANY_NAME }])
      .select('id')
      .single();
    if (error) { console.error('❌ Error creating company:', error.message); process.exit(1); }
    companyId = company.id;
    console.log(`✅ Company created: ${companyId}`);
  }

  // 2. Create or reuse test branch
  let branchId;
  const { data: existingBranch } = await supabase
    .from('branches')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', BRANCH_NAME)
    .maybeSingle();

  if (existingBranch) {
    branchId = existingBranch.id;
    console.log(`✅ Branch already exists: ${branchId}`);
  } else {
    const { data: branch, error } = await supabase
      .from('branches')
      .insert([{ name: BRANCH_NAME, company_id: companyId }])
      .select('id')
      .single();
    if (error) { console.error('❌ Error creating branch:', error.message); process.exit(1); }
    branchId = branch.id;
    console.log(`✅ Branch created: ${branchId}`);
  }

  console.log('');

  // 3. Create each test user
  for (const u of TEST_USERS) {
    // Create in Supabase Auth
    let authUserId;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: u.name },
    });

    if (authError) {
      // If already exists, find the user and reuse
      const alreadyExists =
        authError.message.toLowerCase().includes('already registered') ||
        authError.message.toLowerCase().includes('already been registered') ||
        authError.message.toLowerCase().includes('already exists');

      if (!alreadyExists) {
        console.error(`❌ Auth error for ${u.email}:`, authError.message);
        continue;
      }

      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = listData?.users?.find((usr) => usr.email === u.email);
      if (!existing) { console.error(`❌ Could not find existing user ${u.email}`); continue; }
      authUserId = existing.id;
      console.log(`⚠️  Auth user already exists for ${u.email}, reusing...`);
    } else {
      authUserId = authData.user.id;
    }

    // Upsert into users profile table
    const { error: profileError } = await supabase
      .from('users')
      .upsert([{
        id:                 authUserId,
        name:               u.name,
        email:              u.email,
        role:               u.role,
        commission_balance: 0,
        company_id:         companyId,
        // dueno doesn't need branch_id, others do
        branch_id:          u.role !== 'dueno' ? branchId : null,
      }], { onConflict: 'id' });

    if (profileError) {
      console.error(`❌ Profile error for ${u.email}:`, profileError.message);
    } else {
      console.log(`✅ ${u.role.padEnd(10)} → ${u.email}  (password: ${PASSWORD})`);
    }
  }

  console.log('\n📋 Summary:');
  console.log('   Company :', COMPANY_NAME);
  console.log('   Branch  :', BRANCH_NAME);
  console.log('   Password:', PASSWORD, '(all users)\n');
  console.log('Done ✓');
}

main().catch((err) => { console.error(err); process.exit(1); });
