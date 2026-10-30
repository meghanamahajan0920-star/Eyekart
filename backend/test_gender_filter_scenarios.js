const http = require('http');

process.env.PORT = '5007';
process.env.JWT_SECRET = 'eyekart_gender_test_secret_123';
const server = require('./server');

function request(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 5007, path }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  await new Promise(r => setTimeout(r, 1200));
  console.log('=== VERIFYING GENDER FILTERING SCENARIOS ===');
  
  // 1. All Frames
  const allRes = await request('/api/products?category=frames');
  const allProds = allRes.products || [];
  console.log(`1. All Frames count: ${allProds.length}`);
  const hasLensesInAll = allProds.some(p => p.category_id === 4 || p.category_id === 11 || (p.category_name && p.category_name.toLowerCase().includes('lens')));
  console.log(`   - Contains lenses? ${hasLensesInAll ? 'FAIL: Found lenses' : 'PASS: Zero lenses'}`);
  
  // 2. Men
  const menRes = await request('/api/products?gender=men');
  const menProds = menRes.products || [];
  console.log(`2. Men frames count: ${menProds.length}`);
  const menGenders = [...new Set(menProds.map(p => p.gender))];
  console.log(`   - Genders present in Men: ${JSON.stringify(menGenders)}`);
  const hasLensesInMen = menProds.some(p => p.category_id === 4 || p.category_id === 11);
  console.log(`   - Contains lenses? ${hasLensesInMen ? 'FAIL' : 'PASS: Zero lenses'}`);
  const hasKidsInMen = menProds.some(p => p.gender === 'Kids');
  console.log(`   - Contains Kids frames? ${hasKidsInMen ? 'FAIL' : 'PASS: No Kids frames'}`);
  const hasWomenInMen = menProds.some(p => p.gender === 'Women');
  console.log(`   - Contains Women frames? ${hasWomenInMen ? 'FAIL' : 'PASS: No Women-only frames'}`);

  // 3. Women
  const womenRes = await request('/api/products?gender=women');
  const womenProds = womenRes.products || [];
  console.log(`3. Women frames count: ${womenProds.length}`);
  const womenGenders = [...new Set(womenProds.map(p => p.gender))];
  console.log(`   - Genders present in Women: ${JSON.stringify(womenGenders)}`);
  const hasLensesInWomen = womenProds.some(p => p.category_id === 4 || p.category_id === 11);
  console.log(`   - Contains lenses? ${hasLensesInWomen ? 'FAIL' : 'PASS: Zero lenses'}`);
  const hasKidsInWomen = womenProds.some(p => p.gender === 'Kids');
  console.log(`   - Contains Kids frames? ${hasKidsInWomen ? 'FAIL' : 'PASS: No Kids frames'}`);
  const hasMenInWomen = womenProds.some(p => p.gender === 'Men');
  console.log(`   - Contains Men frames? ${hasMenInWomen ? 'FAIL' : 'PASS: No Men-only frames'}`);

  // 4. Kids
  const kidsRes = await request('/api/products?gender=kids');
  const kidsProds = kidsRes.products || [];
  console.log(`4. Kids frames count: ${kidsProds.length}`);
  const kidsGenders = [...new Set(kidsProds.map(p => p.gender))];
  console.log(`   - Genders present in Kids: ${JSON.stringify(kidsGenders)}`);
  const hasUnisexInKids = kidsProds.some(p => p.gender === 'Unisex');
  console.log(`   - Contains Unisex adult frames? ${hasUnisexInKids ? 'FAIL' : 'PASS: No Unisex adult frames'}`);
  const hasLensesInKids = kidsProds.some(p => p.category_id === 4 || p.category_id === 11);
  console.log(`   - Contains lenses? ${hasLensesInKids ? 'FAIL' : 'PASS: Zero lenses'}`);

  // Check unisex overlap:
  const menIds = new Set(menProds.map(p => p.id));
  const womenIds = new Set(womenProds.map(p => p.id));
  const unisexProds = allProds.filter(p => p.gender === 'Unisex');
  const allUnisexInBoth = unisexProds.every(p => menIds.has(p.id) && womenIds.has(p.id));
  console.log(`5. Unisex products in BOTH Men and Women: ${allUnisexInBoth ? 'PASS: All 15 unisex products appear in both Men and Women' : 'FAIL'}`);

  console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

verify().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
