const { promiseDb } = require('../db');
const pool = promiseDb;

async function verify() {
  try {
    const [rows] = await pool.query("SELECT id, name, category_id, image FROM products WHERE name NOT LIKE '%Test Frame%' ORDER BY id ASC");
    console.log(`Public storefront products count: ${rows.length}`);
    const svgs = rows.filter(r => r.image && r.image.toLowerCase().endsWith('.svg'));
    console.log(`SVG count in public products: ${svgs.length}`);

    const [vars] = await pool.query("SELECT v.id, v.product_id, v.color_name, v.image FROM product_variants v JOIN products p ON v.product_id = p.id WHERE p.name NOT LIKE '%Test Frame%'");
    const varSvgs = vars.filter(v => v.image && v.image.toLowerCase().endsWith('.svg'));
    console.log(`Total public variants: ${vars.length} | SVG count in public variants: ${varSvgs.length}`);

    const [testRows] = await pool.query("SELECT id, name FROM products WHERE name LIKE '%Test Frame%'");
    console.log(`Test fixtures preserved in database: ${testRows.length} (${testRows.map(t => t.name).join(', ')})`);

    const nonExistent = [];
    const fs = require('fs');
    const path = require('path');
    const pubDir = path.join(__dirname, '../../frontend/public');

    for (const r of rows) {
      if (r.image && r.image.startsWith('/images/')) {
        const full = path.join(pubDir, r.image);
        if (!fs.existsSync(full)) nonExistent.push({ id: r.id, name: r.name, path: r.image });
      }
    }
    for (const v of vars) {
      if (v.image && v.image.startsWith('/images/')) {
        const full = path.join(pubDir, v.image);
        if (!fs.existsSync(full)) nonExistent.push({ variantId: v.id, color: v.color_name, path: v.image });
      }
    }

    console.log(`Missing local image files on disk: ${nonExistent.length}`);
    if (nonExistent.length > 0) {
      console.log('Missing files:', nonExistent);
    }
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    process.exit(0);
  }
}

verify();
