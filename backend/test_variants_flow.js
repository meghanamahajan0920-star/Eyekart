const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: defaultHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- Starting Frame Variants & Color Selection Verification ---');

  // 1. Check GET /api/products returns variants
  console.log('1. Testing GET /api/products...');
  const prodsRes = await request('GET', '/api/products');
  if (prodsRes.status !== 200 || !prodsRes.body.products) {
    throw new Error(`Failed to fetch products: status ${prodsRes.status}`);
  }
  const products = prodsRes.body.products;
  console.log(`✓ Fetched ${products.length} products.`);

  const withVariants = products.filter(p => Array.isArray(p.variants) && p.variants.length >= 2);
  console.log(`✓ Products with multiple variants: ${withVariants.length} / ${products.length}`);
  if (withVariants.length === 0) {
    throw new Error('No products have multiple variants attached!');
  }

  // 2. Check a specific frame (Vincent Chase Wayfarer or first with variants)
  const sampleFrame = withVariants[0];
  console.log(`\n2. Inspecting variants for frame: "${sampleFrame.name}" (ID: ${sampleFrame.id})...`);
  const frameRes = await request('GET', `/api/products/${sampleFrame.id}`);
  const frameData = frameRes.body.product;
  console.log(`✓ Frame details retrieved with ${frameData.variants.length} color variants:`);
  frameData.variants.forEach((v, idx) => {
    console.log(`   [${idx + 1}] Color: ${v.color_name} (${v.color_code}) | Image: ${v.image} | Stock: ${v.stock} | Default: ${v.is_default}`);
  });

  if (frameData.variants.length < 2) {
    throw new Error('Sample frame does not have multiple variants!');
  }

  // 3. User Registration & Login
  console.log('\n3. Creating and authenticating test customer...');
  const testEmail = `variant_tester_${Date.now()}@eyekart.com`;
  const testMobile = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const registerRes = await request('POST', '/api/auth/register', {
    name: 'Variant Tester',
    email: testEmail,
    password: 'Password@123',
    mobile: testMobile
  });
  if (registerRes.status !== 201 && registerRes.status !== 200) {
    throw new Error(`User registration failed: ${JSON.stringify(registerRes.body)}`);
  }
  const userToken = registerRes.body.token;
  console.log('✓ Test customer created and logged in successfully.');

  // 4. Place an order with 2 different color variants of the same frame
  const variant1 = frameData.variants[0];
  const variant2 = frameData.variants[1];
  console.log(`\n4. Placing order with 2 color variants of frame ${sampleFrame.id}:`);
  console.log(`   - Variant 1: ${variant1.color_name} (ID: ${variant1.id})`);
  console.log(`   - Variant 2: ${variant2.color_name} (ID: ${variant2.id})`);

  const orderPayload = {
    customer_name: 'Variant Tester',
    mobile: testMobile,
    address: '123 Optical Lane, Bangalore, KA',
    payment_method: 'Cash on Delivery',
    items: [
      {
        product_id: sampleFrame.id,
        quantity: 1,
        selected_color: variant1.color_name,
        selected_image: variant1.image,
        variant_id: variant1.id
      },
      {
        product_id: sampleFrame.id,
        quantity: 2,
        selected_color: variant2.color_name,
        selected_image: variant2.image,
        variant_id: variant2.id
      }
    ]
  };

  const createOrderRes = await request('POST', '/api/orders', orderPayload, {
    Authorization: `Bearer ${userToken}`
  });
  if (createOrderRes.status !== 201 || !createOrderRes.body.order_id) {
    throw new Error(`Order creation failed: ${JSON.stringify(createOrderRes.body)}`);
  }
  const orderId = createOrderRes.body.order_id;
  console.log(`✓ Order #${orderId} created successfully.`);

  // 5. Verify order items contain selected_color and variant_id
  console.log(`\n5. Verifying order items for Order #${orderId}...`);
  const getOrderRes = await request('GET', `/api/orders/${orderId}`, null, {
    Authorization: `Bearer ${userToken}`
  });
  if (getOrderRes.status !== 200 || !getOrderRes.body.items) {
    throw new Error(`Failed to fetch order #${orderId}`);
  }
  const orderItems = getOrderRes.body.items;
  console.log(`✓ Order items retrieved (${orderItems.length} items):`);
  orderItems.forEach((item, idx) => {
    console.log(`   [${idx + 1}] Product: ${item.product_name || item.name} | Color: ${item.selected_color} | VariantID: ${item.variant_id} | Image: ${item.selected_image || item.image}`);
  });

  if (orderItems.length !== 2) {
    throw new Error(`Expected 2 distinct order items for different color variants, found ${orderItems.length}`);
  }
  if (orderItems[0].selected_color !== variant1.color_name || orderItems[1].selected_color !== variant2.color_name) {
    throw new Error('Order items color mismatch!');
  }
  console.log('✓ Order items correctly preserved both selectable colors and images!');

  // 6. Admin Authentication & Variant Management Endpoints
  console.log('\n6. Authenticating admin user...');
  const adminLoginRes = await request('POST', '/api/auth/login', {
    email: 'admin@eyekart.com',
    password: 'EyeKart@2026'
  });
  if (adminLoginRes.status !== 200 || !adminLoginRes.body.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.body)}`);
  }
  const adminToken = adminLoginRes.body.token;
  console.log('✓ Admin logged in successfully.');

  // 7. Admin GET variants
  console.log(`\n7. Testing Admin GET /api/admin/products/${sampleFrame.id}/variants...`);
  const adminVariantsRes = await request('GET', `/api/admin/products/${sampleFrame.id}/variants`, null, {
    Authorization: `Bearer ${adminToken}`
  });
  if (adminVariantsRes.status !== 200 || !Array.isArray(adminVariantsRes.body.variants)) {
    throw new Error('Admin get variants failed');
  }
  console.log(`✓ Admin fetched ${adminVariantsRes.body.variants.length} variants.`);

  // 8. Admin POST variant (Add temporary variant)
  console.log('\n8. Testing Admin POST /api/admin/products/:id/variants (Create variant)...');
  const addVarRes = await request('POST', `/api/admin/products/${sampleFrame.id}/variants`, {
    color_name: 'Test Crystal Amber',
    color_code: '#d97706',
    image: '/images/products/test_amber.jpg',
    stock: 15,
    is_default: false
  }, {
    Authorization: `Bearer ${adminToken}`
  });
  if (addVarRes.status !== 201 || !addVarRes.body.success) {
    throw new Error(`Admin create variant failed: ${JSON.stringify(addVarRes.body)}`);
  }
  const newVarId = addVarRes.body.variant_id || (addVarRes.body.variant && addVarRes.body.variant.id);
  console.log(`✓ Added test variant ID: ${newVarId} ("Test Crystal Amber").`);

  // 9. Admin PUT variant (Update temporary variant)
  console.log('\n9. Testing Admin PUT /api/admin/variants/:variantId (Update variant)...');
  const updateVarRes = await request('PUT', `/api/admin/variants/${newVarId}`, {
    color_name: 'Test Crystal Amber Updated',
    stock: 25
  }, {
    Authorization: `Bearer ${adminToken}`
  });
  if (updateVarRes.status !== 200) {
    throw new Error(`Admin update variant failed: ${JSON.stringify(updateVarRes.body)}`);
  }
  console.log('✓ Updated test variant.');

  // 10. Admin DELETE variant
  console.log('\n10. Testing Admin DELETE /api/admin/variants/:variantId (Delete variant)...');
  const deleteVarRes = await request('DELETE', `/api/admin/variants/${newVarId}`, null, {
    Authorization: `Bearer ${adminToken}`
  });
  if (deleteVarRes.status !== 200) {
    throw new Error(`Admin delete variant failed: ${JSON.stringify(deleteVarRes.body)}`);
  }
  console.log('✓ Deleted test variant cleanly.');

  // 11. Admin view order
  console.log(`\n11. Testing Admin GET /api/admin/orders/${orderId}...`);
  const adminOrderRes = await request('GET', `/api/admin/orders/${orderId}`, null, {
    Authorization: `Bearer ${adminToken}`
  });
  if (adminOrderRes.status !== 200 || !adminOrderRes.body.items) {
    throw new Error(`Admin fetch order failed: ${JSON.stringify(adminOrderRes.body)}`);
  }
  const adminOrderItems = adminOrderRes.body.items;
  console.log(`✓ Admin order view verified: ${adminOrderItems.length} items with color variants:`);
  adminOrderItems.forEach(i => console.log(`   - ${i.product_name || i.name} [Color: ${i.selected_color}]`));

  console.log('\n======================================================');
  console.log('🎉 ALL VARIANT & COLOR SELECTION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
