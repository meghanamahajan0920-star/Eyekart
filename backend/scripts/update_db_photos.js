const { promiseDb } = require('../db');

async function main() {
  console.log('--- Updating Database with Genuine Photo Paths ---');

  // Update products table
  const prodUpdates = [
    { id: 1, image: '/images/products/prod-1-classic-black-frame.jpg' },
    { id: 2, image: '/images/products/prod-2-fastrack-aviator-black.jpg' },
    { id: 3, image: '/images/products/prod-3-titan-blue-light.jpg' },
    { id: 144, image: '/images/products/prod-144-vincent-chase-wayfarer-black.jpg' },
    { id: 145, image: '/images/products/prod-145-john-jacobs-clubmaster-tortoise.jpg' },
    { id: 146, image: '/images/products/prod-146-rayban-round-gunmetal.png' },
    { id: 147, image: '/images/products/prod-147-titan-rimless-silver.jpg' },
    { id: 148, image: '/images/products/prod-148-rayban-wayfarer-black.jpg' },
    { id: 149, image: '/images/products/prod-149-fastrack-hexagonal-goldgreen.jpg' },
    { id: 150, image: '/images/products/prod-150-vincent-chase-clubmaster-tortoise.jpg' },
    { id: 151, image: '/images/products/prod-151-john-jacobs-cateye-burgundy.jpg' },
    { id: 152, image: '/images/products/prod-152-vc-screen-crystal.jpg' },
    { id: 153, image: '/images/products/prod-153-jj-bluecut-navy.jpg' },
    { id: 154, image: '/images/products/prod-154-fastrack-shield-grey.jpg' },
    { id: 155, image: '/images/products/prod-155-titan-workpro-black.jpg' },
    { id: 156, image: '/images/products/prod-156-vc-digital-blue.jpg' },
    { id: 157, image: '/images/products/prod-157-rayban-shield-silver.jpg' },
    { id: 158, image: '/images/products/prod-158-titan-junior-sky-blue.jpg' },
    { id: 159, image: '/images/products/prod-159-vincent-chase-kids-pink.jpg' },
    { id: 160, image: '/images/products/prod-160-fastrack-kids-red.jpg' },
    { id: 161, image: '/images/products/prod-161-jj-junior-teal.jpg' },
    { id: 162, image: '/images/products/prod-162-bausch-lomb-soflens-59.jpg' },
    { id: 163, image: '/images/products/prod-163-acuvue-oasys.jpg' },
    { id: 164, image: '/images/products/prod-164-alcon-dailies-total1.jpg' },
    { id: 167, image: '/images/products/prod-167-essilor-crizal-easy-pro.jpg' },
    { id: 170, image: '/images/products/prod-170-crizal-prevencia.jpg' }
  ];

  for (const p of prodUpdates) {
    await promiseDb.query('UPDATE products SET image = ? WHERE id = ?', [p.image, p.id]);
  }
  console.log(`✓ Updated ${prodUpdates.length} products with genuine image paths.`);

  // Update variants table
  const varUpdates = [
    // 151
    { pid: 151, color: 'Onyx Black', img: '/images/products/prod-151-john-jacobs-cateye-black.jpg' },
    { pid: 151, color: 'Champagne Tortoise', img: '/images/products/prod-151-john-jacobs-cateye-champagne.jpg' },
    // 152
    { pid: 152, color: 'Transparent Crystal', img: '/images/products/prod-152-vc-screen-crystal.jpg' },
    { pid: 152, color: 'Smoky Grey', img: '/images/products/prod-152-vc-screen-grey.jpg' },
    // 153
    { pid: 153, color: 'Midnight Blue', img: '/images/products/prod-153-jj-bluecut-navy.jpg' },
    { pid: 153, color: 'Matte Black', img: '/images/products/prod-153-jj-bluecut-black.jpg' },
    // 154
    { pid: 154, color: 'Matte Grey', img: '/images/products/prod-154-fastrack-shield-grey.jpg' },
    { pid: 154, color: 'Crystal Brown', img: '/images/products/prod-154-fastrack-shield-brown.jpg' },
    // 155
    { pid: 155, color: 'Matte Black', img: '/images/products/prod-155-titan-workpro-black.jpg' },
    { pid: 155, color: 'Brushed Gunmetal', img: '/images/products/prod-155-titan-workpro-gunmetal.jpg' },
    // 156
    { pid: 156, color: 'Gunmetal Blue', img: '/images/products/prod-156-vc-digital-blue.jpg' },
    { pid: 156, color: 'Amber Tortoise', img: '/images/products/prod-156-vc-digital-amber.jpg' },
    // 157
    { pid: 157, color: 'Brushed Silver', img: '/images/products/prod-157-rayban-shield-silver.jpg' },
    { pid: 157, color: 'Satin Black', img: '/images/products/prod-157-rayban-shield-black.jpg' },
    // 158
    { pid: 158, color: 'Sky Blue & Lime', img: '/images/products/prod-158-titan-junior-sky-blue.jpg' },
    { pid: 158, color: 'Royal Blue', img: '/images/products/prod-158-titan-junior-royal-blue.jpg' },
    { pid: 158, color: 'Cherry Red', img: '/images/products/prod-158-titan-junior-cherry-red.jpg' },
    // 159
    { pid: 159, color: 'Bubblegum Pink', img: '/images/products/prod-159-vincent-chase-kids-pink.jpg' },
    { pid: 159, color: 'Pastel Teal', img: '/images/products/prod-159-vincent-chase-kids-teal.jpg' },
    { pid: 159, color: 'Purple Violet', img: '/images/products/prod-159-vincent-chase-kids-purple.jpg' },
    // 160
    { pid: 160, color: 'Electric Red', img: '/images/products/prod-160-fastrack-kids-red.jpg' },
    { pid: 160, color: 'Neon Blue', img: '/images/products/prod-160-fastrack-kids-blue.jpg' },
    { pid: 160, color: 'Solar Yellow', img: '/images/products/prod-160-fastrack-kids-yellow.jpg' },
    // 161
    { pid: 161, color: 'Navy Teal', img: '/images/products/prod-161-jj-junior-teal.jpg' },
    { pid: 161, color: 'Coral Pink', img: '/images/products/prod-161-jj-junior-coral.jpg' }
  ];

  for (const v of varUpdates) {
    await promiseDb.query(
      'UPDATE product_variants SET image = ? WHERE product_id = ? AND color_name = ?',
      [v.img, v.pid, v.color]
    );
  }
  console.log(`✓ Updated ${varUpdates.length} variants with genuine image paths.`);

  // Verify baseline products 1, 2, 3 have variants
  const baselineVariants = [
    { product_id: 1, color_name: 'Matte Black', color_code: '#18181b', image: '/images/products/prod-1-classic-black-frame.jpg', stock: 48, is_default: 1 },
    { product_id: 2, color_name: 'Glossy Black', color_code: '#000000', image: '/images/products/prod-2-fastrack-aviator-black.jpg', stock: 15, is_default: 1 },
    { product_id: 2, color_name: 'Aviator Gold', color_code: '#d4af37', image: '/images/products/prod-2-fastrack-aviator-gold.jpg', stock: 10, is_default: 0 },
    { product_id: 2, color_name: 'Metallic Silver', color_code: '#c0c0c0', image: '/images/products/prod-2-fastrack-aviator-silver.jpg', stock: 10, is_default: 0 },
    { product_id: 3, color_name: 'Deep Blue', color_code: '#1e3a8a', image: '/images/products/prod-3-titan-blue-light.jpg', stock: 40, is_default: 1 }
  ];

  for (const bv of baselineVariants) {
    const [existing] = await promiseDb.query(
      'SELECT id FROM product_variants WHERE product_id = ? AND color_name = ?',
      [bv.product_id, bv.color_name]
    );
    if (existing.length === 0) {
      await promiseDb.query(
        'INSERT INTO product_variants (product_id, color_name, color_code, image, stock, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [bv.product_id, bv.color_name, bv.color_code, bv.image, bv.stock, bv.is_default]
      );
      console.log(`✓ Inserted variant for Prod ${bv.product_id}: ${bv.color_name}`);
    } else {
      await promiseDb.query(
        'UPDATE product_variants SET image = ?, color_code = ? WHERE id = ?',
        [bv.image, bv.color_code, existing[0].id]
      );
      console.log(`✓ Updated variant for Prod ${bv.product_id}: ${bv.color_name}`);
    }
  }

  // Verification queries
  const [svgProducts] = await promiseDb.query("SELECT id, name, image FROM products WHERE image LIKE '%.svg'");
  const [svgVariants] = await promiseDb.query("SELECT id, product_id, color_name, image FROM product_variants WHERE image LIKE '%.svg'");
  const [nullFrameProducts] = await promiseDb.query("SELECT id, name, image FROM products WHERE image IS NULL AND category_id IN (1, 2, 3)");

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log('Remaining SVG Products:', svgProducts.length);
  console.log('Remaining SVG Variants:', svgVariants.length);
  console.log('Remaining Null Frame Products:', nullFrameProducts.length);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
