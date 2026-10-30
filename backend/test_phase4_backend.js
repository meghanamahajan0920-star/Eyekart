const http = require("http");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

async function runPhase4Tests() {
  console.log("==================================================");
  console.log("    STARTING EYE-KART PHASE 4 BACKEND TEST SUITE    ");
  console.log("==================================================");

  // Setup test environment
  process.env.PORT = "5002";
  process.env.JWT_SECRET = "eyekart_phase4_test_jwt_secret_xyz123";
  process.env.RAZORPAY_KEY_ID = "rzp_test_eyekart_mock_id";
  process.env.RAZORPAY_KEY_SECRET = "eyekart_mock_secret_key_99887766";

  const { promiseDb } = require("./db");

  // Cleanup past test data
  console.log("Cleaning up prior test data...");
  await promiseDb.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE 'Test Phase4%')");
  await promiseDb.query("DELETE FROM orders WHERE customer_name LIKE 'Test Phase4%'");
  await promiseDb.query("DELETE FROM products WHERE name LIKE 'Phase4 Test Frame%'");
  await promiseDb.query("DELETE FROM users WHERE email IN ('phase4_userA@test.com', 'phase4_userB@test.com', 'phase4_admin@test.com', 'phase4_reg@test.com')");

  // Insert standard User A, User B, and Admin
  const hashedPass = await bcrypt.hash("Password@123", 10);
  const [userARes] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES ('Test Phase4 UserA', 'phase4_userA@test.com', '9870000001', ?, 'user')",
    [hashedPass]
  );
  const userAId = userARes.insertId;

  const [userBRes] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES ('Test Phase4 UserB', 'phase4_userB@test.com', '9870000002', ?, 'user')",
    [hashedPass]
  );
  const userBId = userBRes.insertId;

  const [adminRes] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES ('Test Phase4 Admin', 'phase4_admin@test.com', '9870000003', ?, 'admin')",
    [hashedPass]
  );
  const adminId = adminRes.insertId;

  // Insert a test product with known stock
  const [prodRes] = await promiseDb.query(
    "INSERT INTO products (name, description, price, stock, gender, frame_type, frame_material, lens_type, color, image) VALUES ('Phase4 Test Frame A', 'Testing Frame', 1299.00, 20, 'Unisex', 'Full Rim', 'Titanium', 'Clear', 'Blue', '👓')"
  );
  const testProductId = prodRes.insertId;

  // Launch test server
  const server = require("./server");
  await new Promise((r) => setTimeout(r, 1500));

  function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = { "Content-Type": "application/json" };
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: "localhost",
          port: 5002,
          path,
          method,
          headers
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, data });
            }
          });
        }
      );
      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  let userAToken = "";
  let userBToken = "";
  let adminToken = "";
  let createdAdminProductId = null;
  let testOrderId = null;

  let passedCount = 0;
  function assert(testNum, desc, condition, extraInfo = "") {
    if (condition) {
      console.log(`✓ [TEST ${testNum}] PASSED: ${desc} ${extraInfo}`);
      passedCount++;
    } else {
      console.error(`✗ [TEST ${testNum}] FAILED: ${desc} ${extraInfo}`);
      throw new Error(`Assertion failed for Test ${testNum}: ${desc}`);
    }
  }

  try {
    // 1. Health endpoint
    const r1 = await request("GET", "/api/health");
    assert(1, "GET /api/health returns 200 and success: true", r1.status === 200 && r1.data.success);

    // 2. Register
    const r2 = await request("POST", "/api/auth/register", {
      name: "Phase4 Reg User",
      email: "phase4_reg@test.com",
      mobile: "9870000004",
      password: "Password@123"
    });
    assert(2, "POST /api/auth/register returns 201 with token", r2.status === 201 && !!r2.data.token && r2.data.user.role === "user");

    // 3. Login
    const r3 = await request("POST", "/api/auth/login", {
      email: "phase4_userA@test.com",
      password: "Password@123"
    });
    userAToken = r3.data.token;
    assert(3, "POST /api/auth/login User A returns 200 with JWT", r3.status === 200 && !!userAToken);

    // Login User B and Admin for following tests
    const r3b = await request("POST", "/api/auth/login", { email: "phase4_userB@test.com", password: "Password@123" });
    userBToken = r3b.data.token;
    const r3c = await request("POST", "/api/auth/login", { email: "phase4_admin@test.com", password: "Password@123" });
    adminToken = r3c.data.token;

    // 4. Invalid login
    const r4 = await request("POST", "/api/auth/login", {
      email: "phase4_userA@test.com",
      password: "WrongPassword123"
    });
    assert(4, "POST /api/auth/login with wrong password returns 401", r4.status === 401);

    // 5. Protected route without token
    const r5 = await request("GET", "/api/orders");
    assert(5, "GET /api/orders without token returns 401", r5.status === 401);

    // 6. Invalid token
    const r6 = await request("GET", "/api/orders", null, "invalid.garbage.token");
    assert(6, "GET /api/orders with invalid token returns 401", r6.status === 401);

    // 7. Normal user accessing admin API -> 403
    const r7 = await request("GET", "/api/admin/stats", null, userAToken);
    assert(7, "Normal user accessing /api/admin/stats returns 403 Forbidden", r7.status === 403);

    // 8. Admin accessing admin API -> 200
    const r8 = await request("GET", "/api/admin/stats", null, adminToken);
    assert(8, "Admin accessing /api/admin/stats returns 200 with stats", r8.status === 200 && r8.data.success && typeof r8.data.stats.totalUsers === "number");

    // 9. Create product as admin
    const r9 = await request("POST", "/api/admin/products", {
      name: "Phase4 Test Frame B",
      description: "Admin Created Frame",
      price: 1899.00,
      stock: 15,
      gender: "Men",
      frame_type: "Rimless",
      frame_material: "Metal",
      lens_type: "Anti-glare",
      color: "Gold",
      image: "👓"
    }, adminToken);
    createdAdminProductId = r9.data.product_id;
    assert(9, "POST /api/admin/products as admin returns 201 with product_id", r9.status === 201 && !!createdAdminProductId);

    // 10. Update product as admin
    const r10 = await request("PUT", `/api/admin/products/${createdAdminProductId}`, {
      name: "Phase4 Test Frame B Updated",
      description: "Updated Description",
      price: 1999.00,
      stock: 25,
      gender: "Men",
      frame_type: "Rimless",
      frame_material: "Metal",
      lens_type: "Anti-glare",
      color: "Silver",
      image: "👓"
    }, adminToken);
    assert(10, "PUT /api/admin/products/:id as admin returns 200", r10.status === 200 && r10.data.success);

    // 11. Delete product as admin
    const r11 = await request("DELETE", `/api/admin/products/${createdAdminProductId}`, null, adminToken);
    assert(11, "DELETE /api/admin/products/:id as admin returns 200", r11.status === 200 && r11.data.success);

    // 12. Normal user cannot modify product
    const r12 = await request("POST", "/api/admin/products", {
      name: "Hacker Glasses",
      price: 10,
      stock: 10
    }, userAToken);
    assert(12, "Normal user attempting to POST /api/admin/products returns 403", r12.status === 403);

    // 13. Admin can view all orders
    const r13 = await request("GET", "/api/admin/orders", null, adminToken);
    assert(13, "Admin GET /api/admin/orders returns 200 with list of orders", r13.status === 200 && Array.isArray(r13.data.orders));

    // 14. Normal user sees only own orders
    const r14 = await request("GET", "/api/orders", null, userAToken);
    assert(14, "User A GET /api/orders returns 200 with user-specific orders", r14.status === 200 && Array.isArray(r14.data.orders));

    // Place an order for User A to test ownership & stock
    const [[prodBefore]] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    const initialStock = prodBefore.stock;

    const r20 = await request("POST", "/api/orders", {
      customer_name: "Test Phase4 UserA",
      mobile: "9870000001",
      address: "123 Test Street, Apartment 4B",
      payment_method: "Cash on Delivery",
      items: [{ product_id: testProductId, quantity: 2 }]
    }, userAToken);
    testOrderId = r20.data.order_id;
    assert(20, "POST /api/orders for COD returns 201 with order_id", r20.status === 201 && !!testOrderId);

    // 17. Stock decreases after order
    const [[prodAfterOrder]] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    assert(17, "Stock decreases exactly by ordered quantity (20 - 2 = 18)", prodAfterOrder.stock === initialStock - 2, `(Stock: ${prodAfterOrder.stock})`);

    // 15. User B cannot access User A order
    const r15 = await request("GET", `/api/orders/${testOrderId}`, null, userBToken);
    assert(15, "User B attempting to view User A's order returns 403 Forbidden", r15.status === 403);

    // 16. User B cannot cancel User A order
    const r16 = await request("PATCH", `/api/orders/${testOrderId}/cancel`, null, userBToken);
    assert(16, "User B attempting to cancel User A's order returns 403 Forbidden", r16.status === 403);

    // 18. Stock restores after valid cancellation by User A
    const r18 = await request("PATCH", `/api/orders/${testOrderId}/cancel`, null, userAToken);
    const [[prodAfterCancel]] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    assert(18, "Valid cancellation succeeds and restores stock back to initial", r18.status === 200 && prodAfterCancel.stock === initialStock);

    // 19. Double cancellation prevented
    const r19 = await request("PATCH", `/api/orders/${testOrderId}/cancel`, null, userAToken);
    assert(19, "Repeated cancellation on already-cancelled order returns 400", r19.status === 400);

    // 21. Razorpay create-order endpoint test
    const r21 = await request("POST", "/api/payments/create-order", {
      items: [{ product_id: testProductId, quantity: 1 }]
    }, userAToken);
    assert(21, "POST /api/payments/create-order returns valid order info or safe gateway/fallback response", [200, 400, 502].includes(r21.status));

    // 22. Fake payment signature rejected
    const r22 = await request("POST", "/api/payments/verify", {
      razorpay_order_id: "order_test_fake_123",
      razorpay_payment_id: "pay_test_fake_456",
      razorpay_signature: "fake_invalid_signature_hash",
      order_data: {
        customer_name: "Test Phase4 UserA",
        mobile: "9870000001",
        address: "789 Razorpay Lane",
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    }, userAToken);
    assert(22, "POST /api/payments/verify with fake signature returns 400", r22.status === 400);

    // 23 & 24. Successful payment verification with valid HMAC SHA-256
    const validRzpOrderId = "order_rzp_mock_" + Date.now();
    const validRzpPaymentId = "pay_rzp_mock_" + Date.now();
    const validSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${validRzpOrderId}|${validRzpPaymentId}`)
      .digest("hex");

    const r23 = await request("POST", "/api/payments/verify", {
      razorpay_order_id: validRzpOrderId,
      razorpay_payment_id: validRzpPaymentId,
      razorpay_signature: validSignature,
      order_data: {
        customer_name: "Test Phase4 UserA",
        mobile: "9870000001",
        address: "789 Razorpay Lane",
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    }, userAToken);
    assert(23, "POST /api/payments/verify with valid HMAC signature succeeds with 201", r23.status === 201 && !!r23.data.order_id);

    const paidOrderId = r23.data.order_id;
    const [[paidOrderRow]] = await promiseDb.query("SELECT payment_status, status FROM orders WHERE id = ?", [paidOrderId]);
    assert(24, "Verified order has payment_status='Paid'", paidOrderRow.payment_status === "Paid" && paidOrderRow.status === "Processing");

    // 25. Duplicate payment verification prevented (idempotency check)
    const r25 = await request("POST", "/api/payments/verify", {
      razorpay_order_id: validRzpOrderId,
      razorpay_payment_id: validRzpPaymentId,
      razorpay_signature: validSignature,
      order_data: {
        customer_name: "Test Phase4 UserA",
        mobile: "9870000001",
        address: "789 Razorpay Lane",
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    }, userAToken);
    assert(25, "Duplicate verification for same payment returns 409 Conflict", r25.status === 409);

    // 26. No price manipulation (backend computes price from database, not client)
    const r26 = await request("POST", "/api/orders", {
      customer_name: "Test Phase4 UserA",
      mobile: "9870000001",
      address: "123 Test Street",
      payment_method: "Cash on Delivery",
      items: [{ product_id: testProductId, quantity: 1, price: 1.00 }] // attempting to send Rs. 1
    }, userAToken);
    const [[manipCheckOrder]] = await promiseDb.query("SELECT total FROM orders WHERE id = ?", [r26.data.order_id]);
    assert(26, "Total is calculated from DB price (1299.00), ignoring client manipulated price (1.00)", parseFloat(manipCheckOrder.total) === 1299.00);

    // 27. No user_id manipulation (req.user.id used exclusively, ignoring body user_id)
    const r27 = await request("POST", "/api/orders", {
      customer_name: "Test Phase4 UserA",
      mobile: "9870000001",
      address: "123 Test Street",
      payment_method: "Cash on Delivery",
      user_id: userBId, // user A trying to impersonate user B
      items: [{ product_id: testProductId, quantity: 1 }]
    }, userAToken);
    const [[impersonationCheck]] = await promiseDb.query("SELECT user_id FROM orders WHERE id = ?", [r27.data.order_id]);
    assert(27, "Order user_id strictly set from verified JWT (User A ID), ignoring body user_id", impersonationCheck.user_id === userAId);

    // 28. Invalid product ID rejected
    const r28 = await request("POST", "/api/orders", {
      customer_name: "Test Phase4 UserA",
      mobile: "9870000001",
      address: "123 Test Street",
      payment_method: "Cash on Delivery",
      items: [{ product_id: 99999999, quantity: 1 }]
    }, userAToken);
    assert(28, "Invalid product ID rejected with 400", r28.status === 400);

    // 29. Invalid quantity rejected
    const r29 = await request("POST", "/api/orders", {
      customer_name: "Test Phase4 UserA",
      mobile: "9870000001",
      address: "123 Test Street",
      payment_method: "Cash on Delivery",
      items: [{ product_id: testProductId, quantity: -5 }]
    }, userAToken);
    assert(29, "Negative quantity rejected with 400", r29.status === 400);

    // 30. Invalid order status rejected
    const r30 = await request("PATCH", `/api/admin/orders/${paidOrderId}/status`, {
      status: "InvalidHackedStatus"
    }, adminToken);
    assert(30, "Invalid order status rejected with 400", r30.status === 400);

    console.log("\n==================================================");
    console.log(`ALL 30 BACKEND TESTS COMPLETED: ${passedCount}/30 PASSED!`);
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("Test execution aborted:", err.message);
    process.exit(1);
  }
}

runPhase4Tests();
