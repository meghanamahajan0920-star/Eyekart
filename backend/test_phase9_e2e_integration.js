const http = require("http");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

async function runPhase9E2ETests() {
  console.log("====================================================================");
  console.log("       STARTING EYE-KART PHASE 9 COMPREHENSIVE E2E TEST SUITE        ");
  console.log("====================================================================");

  // Setup test environment
  process.env.PORT = "5005";
  process.env.JWT_SECRET = "eyekart_phase9_e2e_jwt_secret_key_prod_test_999";
  process.env.RAZORPAY_KEY_ID = "rzp_test_eyekart_mock_phase9";
  process.env.RAZORPAY_KEY_SECRET = "eyekart_mock_secret_phase9_test";

  const { promiseDb } = require("./db");

  // Clean up any previous Phase 9 test data
  console.log("Cleaning up prior Phase 9 test fixtures...");
  await promiseDb.query("DELETE FROM reviews WHERE review LIKE '%Phase 9%'");
  await promiseDb.query("DELETE FROM order_prescriptions WHERE prescription_file_url LIKE '%phase9%' OR notes LIKE '%Phase 9%'");
  await promiseDb.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE 'Phase9%')");
  await promiseDb.query("DELETE FROM orders WHERE customer_name LIKE 'Phase9%'");
  await promiseDb.query("DELETE FROM wishlist WHERE user_id IN (SELECT id FROM users WHERE email IN ('phase9_alice@test.com', 'phase9_bob@test.com'))");
  await promiseDb.query("DELETE FROM products WHERE name LIKE 'Phase9 E2E%'");
  await promiseDb.query("DELETE FROM users WHERE email IN ('phase9_alice@test.com', 'phase9_bob@test.com')");

  // Insert test product with known stock for order lifecycle testing
  const [prodRes] = await promiseDb.query(
    `INSERT INTO products 
      (name, description, price, stock, gender, frame_type, frame_material, lens_type, color, image) 
     VALUES 
      ('Phase9 E2E Titanium Aviator', 'Ultra lightweight aerospace-grade frame', 2499.00, 25, 'Unisex', 'Full Rim', 'Titanium', 'Clear', 'Midnight Black', '🕶️')`
  );
  const testProductId = prodRes.insertId;

  // Launch test server
  const server = require("./server");
  await new Promise((r) => setTimeout(r, 1200));

  function request(method, reqPath, body = null, token = null) {
    return new Promise((resolve) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = { "Content-Type": "application/json" };
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: "localhost",
          port: 5005,
          path: encodeURI(reqPath),
          method,
          headers
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
            } catch (e) {
              resolve({ status: res.statusCode, data, headers: res.headers });
            }
          });
        }
      );
      req.on("error", (err) => resolve({ status: 500, data: { error: err.message } }));
      if (payload) req.write(payload);
      req.end();
    });
  }

  let passed = 0;
  let total = 0;
  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ [E2E STEP ${total}] PASSED: ${message}`);
      passed++;
    } else {
      console.error(`✗ [E2E STEP ${total}] FAILED: ${message}`);
      process.exit(1);
    }
  }

  // ====================================================================
  // PART 1: AUTHENTICATION & ACCESS CONTROL
  // ====================================================================
  console.log("\n--- PART 1: User Registration, Login & Session Verification ---");

  // Step 1: Registration input validation (short password rejected)
  const regShortPass = await request("POST", "/api/auth/register", {
    name: "Phase9 Alice",
    email: "phase9_alice@test.com",
    mobile: "9871110001",
    password: "short"
  });
  assert(regShortPass.status === 400, "Registration rejects password shorter than 8 characters");

  // Step 2: Valid customer registration (Alice)
  const regAlice = await request("POST", "/api/auth/register", {
    name: "Phase9 Alice",
    email: "phase9_alice@test.com",
    mobile: "9871110001",
    password: "Password@123"
  });
  assert(regAlice.status === 201 && regAlice.data.user && regAlice.data.token, "Customer Alice registers successfully with JWT token");
  const aliceId = regAlice.data.user.id;
  const tokenAlice = regAlice.data.token;

  // Step 3: Registration of second customer (Bob for cross-user tests)
  const regBob = await request("POST", "/api/auth/register", {
    name: "Phase9 Bob",
    email: "phase9_bob@test.com",
    mobile: "9871110002",
    password: "Password@123"
  });
  assert(regBob.status === 201 && regBob.data.user && regBob.data.token, "Customer Bob registers successfully");
  const bobId = regBob.data.user.id;
  const tokenBob = regBob.data.token;

  // Step 4: Login with incorrect credentials rejected
  const badLogin = await request("POST", "/api/auth/login", {
    email: "phase9_alice@test.com",
    password: "WrongPassword999"
  });
  assert(badLogin.status === 401, "Login with invalid password rejected with 401");

  // Step 5: Successful login with valid credentials
  const loginAlice = await request("POST", "/api/auth/login", {
    email: "phase9_alice@test.com",
    password: "Password@123"
  });
  assert(loginAlice.status === 200 && loginAlice.data.token, "Customer Alice logs in successfully");

  // Step 6: Verify /api/auth/me returns current authenticated user profile
  const meAlice = await request("GET", "/api/auth/me", null, tokenAlice);
  assert(meAlice.status === 200 && meAlice.data.user.email === "phase9_alice@test.com", "GET /api/auth/me returns authenticated customer profile");

  // Step 7: Admin login
  const loginAdmin = await request("POST", "/api/auth/login", {
    email: "admin@eyekart.com",
    password: "EyeKart@2026"
  });
  assert(loginAdmin.status === 200 && loginAdmin.data.user.role === "admin", "Admin logs in with role='admin'");
  const tokenAdmin = loginAdmin.data.token;

  // ====================================================================
  // PART 2: CATALOG BROWSING, SEARCH, FILTERS & DETAILS
  // ====================================================================
  console.log("\n--- PART 2: Product Catalog Browsing, Search & Filtering ---");

  // Step 8: Public product catalog retrieval
  const prodList = await request("GET", "/api/products");
  assert(prodList.status === 200 && Array.isArray(prodList.data.products) && prodList.data.products.length > 0, "Public catalog returns available eyewear products");

  // Step 9: Search query filtering
  const searchRes = await request("GET", "/api/products?search=Titanium");
  assert(searchRes.status === 200 && searchRes.data.products.some(p => p.id === testProductId), "Search query parameter filters frames matching search term");

  // Step 10: Gender and price range filtering
  const filterRes = await request("GET", "/api/products?gender=Unisex&min_price=2000&max_price=3000");
  assert(filterRes.status === 200 && filterRes.data.products.some(p => p.id === testProductId), "Multi-criteria filter (gender + price range) correctly matches test frame");

  // Step 11: Single product optical details
  const singleProd = await request("GET", `/api/products/${testProductId}`);
  assert(singleProd.status === 200 && singleProd.data.product.name === "Phase9 E2E Titanium Aviator", "GET /api/products/:id returns detailed optical specifications");

  // ====================================================================
  // PART 3: WISHLIST LIFECYCLE & USER ISOLATION
  // ====================================================================
  console.log("\n--- PART 3: Wishlist Management & User Isolation ---");

  // Step 12: Add frame to Alice's wishlist
  const addWish = await request("POST", `/api/wishlist/${testProductId}`, {}, tokenAlice);
  assert(addWish.status === 200 && addWish.data.inWishlist === true, "Customer can add eyewear frame to personal wishlist");

  // Step 13: Check wishlist status for Alice
  const checkWishAlice = await request("GET", `/api/wishlist/check/${testProductId}`, null, tokenAlice);
  assert(checkWishAlice.status === 200 && checkWishAlice.data.inWishlist === true, "Wishlist check endpoint confirms item is saved");

  // Step 14: Bob's wishlist remains isolated (does not contain Alice's saved product)
  const checkWishBob = await request("GET", `/api/wishlist/check/${testProductId}`, null, tokenBob);
  assert(checkWishBob.status === 200 && checkWishBob.data.inWishlist === false, "Cross-user wishlist isolation: Bob does not see Alice's wishlisted product");

  // Step 15: Retrieve Alice's full wishlist
  const getWishAlice = await request("GET", "/api/wishlist", null, tokenAlice);
  assert(getWishAlice.status === 200 && getWishAlice.data.wishlist.some(p => p.id === testProductId), "GET /api/wishlist returns customer's saved frames");

  // ====================================================================
  // PART 4: PRESCRIPTION UPLOAD & OPTICAL DATA PROCESSING
  // ====================================================================
  console.log("\n--- PART 4: Prescription Optical Support & Document Upload ---");

  // Step 16: Safe rejection of malicious file upload
  const badUpload = await request("POST", "/api/prescriptions/upload", {
    file_data: "data:application/x-sh;base64,IyEvYmluL3NoCmVjaG8gImhhY2tlZCI=",
    file_name: "exploit.sh"
  }, tokenAlice);
  assert(badUpload.status === 400, "Prescription upload rejects executable/shell scripts with 400");

  // Step 17: Valid prescription document upload (base64 image)
  const sampleRxPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const goodUpload = await request("POST", "/api/prescriptions/upload", {
    file_data: sampleRxPng,
    file_name: "phase9_eye_prescription.png"
  }, tokenAlice);
  assert(goodUpload.status === 201 && goodUpload.data.filePath, "Prescription upload accepts valid image document and generates secure file URL");
  const uploadedRxUrl = goodUpload.data.filePath;
  const uploadedFilename = path.basename(uploadedRxUrl);

  // Step 18: Alice can access and download her own uploaded prescription file
  const aliceRxDownload = await request("GET", `/api/prescriptions/file/${uploadedFilename}`, null, tokenAlice);
  assert(aliceRxDownload.status === 200, "Alice can securely download her own prescription file");

  // Step 19: Bob CANNOT access Alice's prescription document (403 Forbidden)
  const bobRxUnauthorized = await request("GET", `/api/prescriptions/file/${uploadedFilename}`, null, tokenBob);
  assert(bobRxUnauthorized.status === 403, "Bob is blocked with 403 Forbidden when trying to access Alice's prescription file");

  // Step 20: Admin CAN access customer's prescription document for order fulfillment
  const adminRxDownload = await request("GET", `/api/prescriptions/file/${uploadedFilename}`, null, tokenAdmin);
  assert(adminRxDownload.status === 200, "Admin can access customer's prescription document for verification");

  // ====================================================================
  // PART 5: CHECKOUT, ORDER CREATION & INVENTORY ATOMICITY
  // ====================================================================
  console.log("\n--- PART 5: Checkout, Order Placement & Inventory Restocking ---");

  // Step 21: Checkout with Cash on Delivery + Optical Prescription data
  const orderPayload = {
    customer_name: "Phase9 Alice Customer",
    mobile: "9871110001",
    address: "Flat 402, Titanium Heights, Vision Avenue, Mumbai 400001",
    payment_method: "Cash on Delivery",
    items: [
      { product_id: testProductId, quantity: 2, price: 2499.00 }
    ],
    prescription: {
      has_prescription: true,
      left_sph: "-1.50",
      right_sph: "-1.75",
      left_cyl: "-0.50",
      right_cyl: "-0.25",
      left_axis: "90",
      right_axis: "85",
      pupillary_distance: "63",
      prescription_file_url: uploadedRxUrl,
      notes: "Phase 9 E2E Test Optical Prescription with Anti-Reflective Coating"
    }
  };

  const createOrderRes = await request("POST", "/api/orders", orderPayload, tokenAlice);
  assert(createOrderRes.status === 201 && createOrderRes.data.order_id, "Alice places order successfully with attached optical prescription");
  const orderId = createOrderRes.data.order_id;

  // Step 22: Verify stock was atomically decremented by ordered quantity (25 - 2 = 23)
  const [stockCheck1] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
  assert(stockCheck1[0].stock === 23, `Inventory decremented atomically from 25 to 23 (Current: ${stockCheck1[0].stock})`);

  // Step 23: Alice can view her order details, including prescription specs
  const getAliceOrder = await request("GET", `/api/orders/${orderId}`, null, tokenAlice);
  assert(
    getAliceOrder.status === 200 &&
    getAliceOrder.data.order.id === orderId &&
    getAliceOrder.data.prescription &&
    getAliceOrder.data.prescription.pupillary_distance === "63",
    "Customer retrieves order details containing attached optical powers & prescription details"
  );

  // Step 24: Alice order list shows order #orderId
  const getAliceOrdersList = await request("GET", "/api/orders", null, tokenAlice);
  assert(getAliceOrdersList.status === 200 && getAliceOrdersList.data.orders.some(o => o.id === orderId), "GET /api/orders lists customer order history");

  // Step 25: Bob CANNOT view Alice's order (403 Forbidden)
  const bobViewAliceOrder = await request("GET", `/api/orders/${orderId}`, null, tokenBob);
  assert(bobViewAliceOrder.status === 403, "Bob cannot view Alice's order (rejected with 403 Forbidden)");

  // Step 26: Bob CANNOT cancel Alice's order (403 Forbidden)
  const bobCancelAliceOrder = await request("PATCH", `/api/orders/${orderId}/cancel`, null, tokenBob);
  assert(bobCancelAliceOrder.status === 403, "Bob cannot cancel Alice's order (rejected with 403 Forbidden)");

  // ====================================================================
  // PART 6: VERIFIED CUSTOMER REVIEWS
  // ====================================================================
  console.log("\n--- PART 6: Verified Buyer Reviews & Rating Moderation ---");

  // Step 27: Alice (who ordered the product) is verified as eligible to review
  const aliceEligibility = await request("GET", `/api/products/${testProductId}/review-eligibility`, null, tokenAlice);
  assert(aliceEligibility.status === 200 && aliceEligibility.data.canReview === true, "Verified buyer status confirmed: Alice is eligible to review purchased product");

  // Step 28: Bob (who has NOT purchased the product) is NOT eligible to review
  const bobEligibility = await request("GET", `/api/products/${testProductId}/review-eligibility`, null, tokenBob);
  assert(bobEligibility.status === 200 && bobEligibility.data.canReview === false, "Bob (non-buyer) is flagged as ineligible to post a review");

  // Step 29: Alice posts a 5-star review
  const postReview = await request("POST", `/api/products/${testProductId}/reviews`, {
    rating: 5,
    review: "Phase 9 E2E Test: Exceptional frame lightness and crystal clear lenses!"
  }, tokenAlice);
  assert(postReview.status === 201 && postReview.data.review_id, "Eligible customer successfully submits 5-star product review");
  const reviewId = postReview.data.review_id;

  // Step 30: Public reviews endpoint includes Alice's review and updated average rating
  const prodReviews = await request("GET", `/api/products/${testProductId}/reviews`);
  assert(
    prodReviews.status === 200 &&
    prodReviews.data.reviews.some(r => r.id === reviewId) &&
    prodReviews.data.stats.totalReviews >= 1,
    "GET /api/products/:id/reviews includes verified review and calculated aggregate stats"
  );

  // Step 31: Alice updates her review to 4 stars
  const updateReview = await request("PUT", `/api/reviews/${reviewId}`, {
    rating: 4,
    review: "Phase 9 E2E Test: Updated feedback - Still great, slight frame flex."
  }, tokenAlice);
  assert(updateReview.status === 200, "Review author can update their review rating and feedback");

  // Step 32: Bob cannot modify Alice's review (403 Forbidden)
  const bobTamperReview = await request("PUT", `/api/reviews/${reviewId}`, {
    rating: 1,
    review: "Phase 9 Malicious review overwrite"
  }, tokenBob);
  assert(bobTamperReview.status === 403, "Other customers cannot edit reviews they do not own (403 Forbidden)");

  // ====================================================================
  // PART 7: ADMIN DASHBOARD, FULFILLMENT & INVENTORY RESTORATION
  // ====================================================================
  console.log("\n--- PART 7: Admin Dashboard, Catalog Management & Order Fulfillment ---");

  // Step 33: Non-admin accessing admin stats rejected with 403 Forbidden
  const userAccessStats = await request("GET", "/api/admin/stats", null, tokenAlice);
  assert(userAccessStats.status === 403, "Non-admin accessing /api/admin/stats is blocked with 403 Forbidden");

  // Step 34: Admin retrieves dashboard operational metrics
  const adminStats = await request("GET", "/api/admin/stats", null, tokenAdmin);
  assert(
    adminStats.status === 200 &&
    typeof adminStats.data.stats.totalOrders === "number" &&
    typeof adminStats.data.stats.totalProducts === "number",
    "Admin successfully retrieves live dashboard metrics"
  );

  // Step 35: Admin creates a new optical frame in catalog
  const createAdminProd = await request("POST", "/api/admin/products", {
    name: "Phase9 Admin Managed Polarized Classic",
    description: "Premium polarized acetate frames with UV400",
    price: 3499.00,
    stock: 15,
    gender: "Men",
    frame_type: "Full Rim",
    frame_material: "Acetate",
    lens_type: "Polarized",
    color: "Tortoise",
    image: "👓"
  }, tokenAdmin);
  assert(createAdminProd.status === 201 && createAdminProd.data.product_id, "Admin creates new product in catalog");
  const adminNewProdId = createAdminProd.data.product_id;

  // Step 36: Admin updates stock for the newly created product
  const updateStock = await request("PATCH", `/api/admin/products/${adminNewProdId}/stock`, {
    stock: 22
  }, tokenAdmin);
  assert(updateStock.status === 200 && updateStock.data.stock === 22, "Admin performs real-time stock adjustment on frame");

  // Step 37: Admin retrieves orders list
  const adminOrders = await request("GET", "/api/admin/orders", null, tokenAdmin);
  assert(adminOrders.status === 200 && adminOrders.data.orders.some(o => o.id === orderId), "Admin retrieves all customer orders for fulfillment");

  // Step 38: Admin inspects order details including prescription
  const adminOrderDetail = await request("GET", `/api/admin/orders/${orderId}`, null, tokenAdmin);
  assert(
    adminOrderDetail.status === 200 &&
    adminOrderDetail.data.prescription &&
    adminOrderDetail.data.prescription.notes.includes("Anti-Reflective"),
    "Admin inspects attached optical prescription values for manufacturing"
  );

  // Step 39: Admin transitions order status: Pending -> Confirmed -> Processing -> Shipped
  const advanceStatus1 = await request("PATCH", `/api/admin/orders/${orderId}/status`, { status: "Confirmed" }, tokenAdmin);
  const advanceStatus2 = await request("PATCH", `/api/admin/orders/${orderId}/status`, { status: "Processing" }, tokenAdmin);
  const advanceStatus3 = await request("PATCH", `/api/admin/orders/${orderId}/status`, { status: "Shipped" }, tokenAdmin);
  assert(
    advanceStatus1.status === 200 &&
    advanceStatus2.status === 200 &&
    advanceStatus3.status === 200,
    "Admin fulfills order status pipeline through Confirmed -> Processing -> Shipped"
  );

  // Step 40: Customer cannot self-cancel order once Shipped
  const cancelShipped = await request("PATCH", `/api/orders/${orderId}/cancel`, null, tokenAlice);
  assert(cancelShipped.status === 400, "Customer cannot self-cancel an order that is already Shipped");

  // Step 41: Admin transitions to Delivered
  const advanceStatusDelivered = await request("PATCH", `/api/admin/orders/${orderId}/status`, { status: "Delivered" }, tokenAdmin);
  assert(advanceStatusDelivered.status === 200, "Admin marks order as Delivered");

  // Step 42: Admin cleans up test product
  const deleteAdminProd = await request("DELETE", `/api/admin/products/${adminNewProdId}`, null, tokenAdmin);
  assert(deleteAdminProd.status === 200, "Admin deletes product from catalog");

  // Step 43: Alice deletes her review
  const deleteReview = await request("DELETE", `/api/reviews/${reviewId}`, null, tokenAlice);
  assert(deleteReview.status === 200, "Customer can delete their own review");

  // Step 44: Clean up Alice's wishlist item
  const removeWish = await request("DELETE", `/api/wishlist/${testProductId}`, null, tokenAlice);
  assert(removeWish.status === 200, "Customer can remove item from wishlist");

  // Step 45: Create another test order and verify self-service cancellation inventory restock
  const cancelTestOrder = await request("POST", "/api/orders", {
    customer_name: "Phase9 Alice Cancel Test",
    mobile: "9871110001",
    address: "Flat 402, Titanium Heights, Vision Avenue, Mumbai 400001",
    payment_method: "Cash on Delivery",
    items: [{ product_id: testProductId, quantity: 3, price: 2499.00 }]
  }, tokenAlice);
  const cancelOrderId = cancelTestOrder.data.order_id;

  // Stock decreased by 3 (from 23 to 20)
  const [stockBeforeCancel] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
  assert(stockBeforeCancel[0].stock === 20, `Stock reduced by 3 before cancellation (Current: ${stockBeforeCancel[0].stock})`);

  // Alice cancels her pending order
  const cancelSuccess = await request("PATCH", `/api/orders/${cancelOrderId}/cancel`, null, tokenAlice);
  assert(cancelSuccess.status === 200, "Customer self-cancels pending order");

  // Stock restored back to 23
  const [stockAfterCancel] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
  assert(stockAfterCancel[0].stock === 23, `Inventory restocked back to 23 upon order cancellation (Current: ${stockAfterCancel[0].stock})`);

  // ====================================================================
  // SUMMARY
  // ====================================================================
  console.log("\n====================================================================");
  console.log(`ALL ${total} PHASE 9 END-TO-END INTEGRATION TESTS PASSED: ${passed}/${total}`);
  console.log("====================================================================");

  // Clean up Phase 9 test fixtures
  await promiseDb.query("DELETE FROM order_prescriptions WHERE prescription_file_url LIKE '%phase9%' OR notes LIKE '%Phase 9%'");
  await promiseDb.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE 'Phase9%')");
  await promiseDb.query("DELETE FROM orders WHERE customer_name LIKE 'Phase9%'");
  await promiseDb.query("DELETE FROM products WHERE id = ?", [testProductId]);
  await promiseDb.query("DELETE FROM users WHERE email IN ('phase9_alice@test.com', 'phase9_bob@test.com')");

  process.exit(0);
}

runPhase9E2ETests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
