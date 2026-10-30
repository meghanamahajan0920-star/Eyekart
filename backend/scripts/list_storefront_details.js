const { promiseDb } = require('../db');

async function listAll() {
  try {
    const [products] = await promiseDb.query("SELECT id, name, image, price FROM products WHERE id BETWEEN 4 AND 143 AND name NOT LIKE '%Test Frame%' ORDER BY id ASC");
    console.log('=== STOREFRONT REAL PRODUCTS & IMAGES ===');
    for (const p of products) {
      console.log(`Product #${p.id}: ${p.brand ? p.brand + ' - ' : ''}${p.name} | Base Image: ${p.image}`);
      const [vars] = await promiseDb.query("SELECT id, color_name, color_code, image FROM product_variants WHERE product_id = ?", [p.id]);
      if (vars.length > 0) {
        vars.forEach(v => console.log(`   └─ Variant #${v.id}: ${v.color_name} (${v.color_code}) -> ${v.image}`));
      } else {
        console.log(`   └─ (Single variant / no extra variants)`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

listAll();
