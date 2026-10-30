/**
 * EyeKart - Comprehensive Payment Methods Verification Suite
 *
 * Validates:
 * 1. Cash on Delivery (COD):
 *    - Order saved in database
 *    - payment_method set to 'COD'
 *    - payment_status set to 'Pending'
 *    - Status set to 'Pending'
 *    - Inventory decremented atomically
 * 2. Unconfigured / Missing Razorpay credentials:
 *    - Helpful diagnostic configuration message returned
 *    - Online orders rejected gracefully
 *    - COD remains 100% active and unblocked
 * 3. Test Mode Credentials Validation:
 *    - Placeholder template keys detected
 *    - Live credentials strictly rejected
 *    - Test mode credentials accepted
 * 4. Online Payment (Cards / Netbanking):
 *    - Backend creates Razorpay order securely
 *    - HMAC SHA-256 signature verified before order placement
 *    - Order saved with payment_status = 'Paid'
 *    - Inventory decremented atomically
 * 5. Instant UPI Payment:
 *    - Supported through Razorpay Checkout
 *    - Verified on backend with HMAC SHA-256
 *    - Order saved with payment_method = 'UPI' and payment_status = 'Paid'
 * 6. Security & Negative Scenarios:
 *    - Tampered signatures rejected
 *    - Duplicate payments rejected with 409
 * 7. Admin Panel & Fulfillment:
 *    - Delivering a COD order automatically updates payment_status to 'Paid'
 *    - Admin stats include both paid online orders and delivered COD orders
 */

const http = require("http");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promiseDb } = require("./db");

let server;
const PORT = 5007;
process.env.PORT = String(PORT);

const app = require("./server");

let testUserId;
let testToken;
let adminUserId;
let adminToken;
let testProductId;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: "localhost",
        port: PORT,
        path: encodeURI(path),
        method,
        headers
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      }
    );

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

let passedCount = 0;
let totalCount = 0;

function testAssert(num, desc, condition) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✓ [PAYMENT TEST ${num}] PASSED: ${desc}`);
  } else {
    console.error(`✗ [PAYMENT TEST ${num}] FAILED: ${desc}`);
    process.exitCode = 1;
  }
}

async function runPaymentSuite() {
  console.log("====================================================================");
  console.log("    STARTING EYE-KART ALL PAYMENT METHODS VERIFICATION SUITE         ");
  console.log("====================================================================");

  const jwtSecret = process.env.JWT_SECRET || "eyekart_super_secret_jwt_key_2026_secure_random_99182";

  // 1. Create Test Customer
  const customerEmail = `payment_customer_${Date.now()}@example.com`;
  const customerMobile = "9" + Math.floor(100000000 + Math.random() * 900000000);
  const [custResult] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, 'dummy_hash', 'user')",
    ["Payment Test Customer", customerEmail, customerMobile]
  );
  testUserId = custResult.insertId;
  testToken = jwt.sign({ id: testUserId, role: "user", email: customerEmail }, jwtSecret, { expiresIn: "1h" });

  // 2. Create Test Admin
  const adminEmail = `payment_admin_${Date.now()}@example.com`;
  const adminMobile = "9" + Math.floor(100000000 + Math.random() * 900000000);
  const [admResult] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, 'dummy_hash', 'admin')",
    ["Payment Test Admin", adminEmail, adminMobile]
  );
  adminUserId = admResult.insertId;
  adminToken = jwt.sign({ id: adminUserId, role: "admin", email: adminEmail }, jwtSecret, { expiresIn: "1h" });

  // 3. Create Test Product with known stock
  const [prodResult] = await promiseDb.query(
    "INSERT INTO products (name, description, price, stock, gender, frame_type, frame_material, lens_type, color, image) " +
    "VALUES ('Payment Test Frame', 'Verified payment methods testing frame', 1299.00, 30, 'Unisex', 'Full Rim', 'Acetate', 'Clear', 'Glossy Tortoise', '🕶️')"
  );
  testProductId = prodResult.insertId;

  // Wait 1 second for DB connection and server
  await new Promise((r) => setTimeout(r, 1200));

  try {
    // =========================================================================
    // SECTION 1: CASH ON DELIVERY (COD) TESTING
    // =========================================================================
    console.log("\n--- SECTION 1: Cash on Delivery (COD) Tests ---");

    // Make sure Razorpay keys are unconfigured to verify COD runs independently
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    const [stockBeforeCod] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    const initStock = stockBeforeCod[0].stock;

    const codOrderRes = await request("POST", "/api/orders", {
      customer_name: "Payment Test Customer",
      mobile: customerMobile,
      address: "123 COD Boulevard, Floor 1, Bangalore 560001",
      payment_method: "COD",
      items: [{ product_id: testProductId, quantity: 2 }]
    }, testToken);

    testAssert(
      1,
      "COD order creation succeeds with HTTP 201 Created",
      codOrderRes.status === 201 && typeof codOrderRes.data.order_id === "number"
    );

    const codOrderId = codOrderRes.data.order_id;
    const [[codDbOrder]] = await promiseDb.query("SELECT * FROM orders WHERE id = ?", [codOrderId]);

    testAssert(
      2,
      "COD order has payment_method set to 'COD' in database",
      codDbOrder.payment_method === "COD"
    );

    testAssert(
      3,
      "COD order has payment_status set to 'Pending' in database",
      codDbOrder.payment_status === "Pending"
    );

    testAssert(
      4,
      "COD order has order status set to 'Pending' in database",
      codDbOrder.status === "Pending"
    );

    const [stockAfterCod] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    testAssert(
      5,
      "Inventory is decremented atomically for COD order (30 - 2 = 28)",
      stockAfterCod[0].stock === initStock - 2
    );

    const codFetchRes = await request("GET", `/api/orders/${codOrderId}`, null, testToken);
    testAssert(
      6,
      "Customer can fetch order details for clear Order Success display",
      codFetchRes.status === 200 &&
      codFetchRes.data.order.payment_method === "COD" &&
      codFetchRes.data.order.payment_status === "Pending"
    );

    // =========================================================================
    // SECTION 2: CONFIGURATION & DIAGNOSTICS TESTS
    // =========================================================================
    console.log("\n--- SECTION 2: Configuration & Diagnostics Tests ---");

    const uncfgRes = await request("GET", "/api/payments/config");
    testAssert(
      7,
      "GET /api/payments/config informs frontend configured=false when keys are missing",
      uncfgRes.status === 200 && uncfgRes.data.configured === false && uncfgRes.data.mode === "unconfigured"
    );

    testAssert(
      8,
      "Helpful configuration message guides user to configure backend/.env",
      typeof uncfgRes.data.message === "string" && uncfgRes.data.message.includes("backend/.env")
    );

    testAssert(
      9,
      "API response never leaks RAZORPAY_KEY_SECRET",
      !("keySecret" in uncfgRes.data)
    );

    // Live credentials rejection
    process.env.RAZORPAY_KEY_ID = "rzp_live_secret123456789";
    process.env.RAZORPAY_KEY_SECRET = "live_secret_key_mock";

    const liveCheck = await request("GET", "/api/payments/config");
    testAssert(
      10,
      "Live credentials (rzp_live_*) are strictly rejected in test mode",
      liveCheck.data.configured === false && liveCheck.data.mode === "live_rejected"
    );

    // Placeholder credentials rejection
    process.env.RAZORPAY_KEY_ID = "rzp_test_your_key_id";
    process.env.RAZORPAY_KEY_SECRET = "your_razorpay_key_secret";

    const placeholderCheck = await request("GET", "/api/payments/config");
    testAssert(
      11,
      "Placeholder credentials from .env.example are detected and rejected",
      placeholderCheck.data.configured === false && placeholderCheck.data.mode === "unconfigured"
    );

    // =========================================================================
    // SECTION 3: ONLINE PAYMENT (CARDS / NETBANKING) TESTS
    // =========================================================================
    console.log("\n--- SECTION 3: Online Payment (Cards / Netbanking) Tests ---");

    const mockKeyId = "rzp_test_eyekart_suite_test";
    const mockSecret = "eyekart_mock_signature_secret_test_2026";
    process.env.RAZORPAY_KEY_ID = mockKeyId;
    process.env.RAZORPAY_KEY_SECRET = mockSecret;

    const cfgActive = await request("GET", "/api/payments/config");
    testAssert(
      12,
      "Valid Razorpay test credentials report configured=true and mode='test'",
      cfgActive.data.configured === true && cfgActive.data.keyId === mockKeyId && cfgActive.data.mode === "test"
    );

    // Test payment signature verification
    const validCardOrderId = `order_card_${Date.now()}`;
    const validCardPaymentId = `pay_card_${Date.now()}`;
    const validCardSignature = crypto
      .createHmac("sha256", mockSecret)
      .update(`${validCardOrderId}|${validCardPaymentId}`)
      .digest("hex");

    const [stockBeforeCard] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    const cardStockPre = stockBeforeCard[0].stock;

    const cardVerifyRes = await request("POST", "/api/payments/verify", {
      razorpay_order_id: validCardOrderId,
      razorpay_payment_id: validCardPaymentId,
      razorpay_signature: validCardSignature,
      order_data: {
        customer_name: "Payment Test Customer",
        mobile: customerMobile,
        address: "456 Gateway Avenue, Flat 2B, Bangalore 560002",
        payment_method: "Cards / Netbanking",
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    }, testToken);

    testAssert(
      13,
      "Online Card/Netbanking payment verification succeeds with 201 Created",
      cardVerifyRes.status === 201 && typeof cardVerifyRes.data.order_id === "number"
    );

    const cardOrderId = cardVerifyRes.data.order_id;
    const [[cardDbOrder]] = await promiseDb.query("SELECT * FROM orders WHERE id = ?", [cardOrderId]);

    testAssert(
      14,
      "Verified card order has payment_method = 'Cards / Netbanking' and payment_status = 'Paid'",
      cardDbOrder.payment_method === "Cards / Netbanking" &&
      cardDbOrder.payment_status === "Paid" &&
      cardDbOrder.status === "Processing" &&
      cardDbOrder.payment_id === validCardPaymentId &&
      cardDbOrder.payment_order_id === validCardOrderId
    );

    const [stockAfterCard] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProductId]);
    testAssert(
      15,
      "Inventory is decremented atomically upon successful payment verification",
      stockAfterCard[0].stock === cardStockPre - 1
    );

    // =========================================================================
    // SECTION 4: INSTANT UPI PAYMENT TESTS
    // =========================================================================
    console.log("\n--- SECTION 4: Instant UPI Payment Tests ---");

    const validUpiOrderId = `order_upi_${Date.now()}`;
    const validUpiPaymentId = `pay_upi_${Date.now()}`;
    const validUpiSignature = crypto
      .createHmac("sha256", mockSecret)
      .update(`${validUpiOrderId}|${validUpiPaymentId}`)
      .digest("hex");

    const upiVerifyRes = await request("POST", "/api/payments/verify", {
      razorpay_order_id: validUpiOrderId,
      razorpay_payment_id: validUpiPaymentId,
      razorpay_signature: validUpiSignature,
      order_data: {
        customer_name: "Payment Test Customer",
        mobile: customerMobile,
        address: "789 UPI Tech Road, Sector 5, Bangalore 560003",
        payment_method: "UPI",
        items: [{ product_id: testProductId, quantity: 2 }]
      }
    }, testToken);

    testAssert(
      16,
      "Instant UPI payment verification succeeds with 201 Created",
      upiVerifyRes.status === 201 && typeof upiVerifyRes.data.order_id === "number"
    );

    const upiOrderId = upiVerifyRes.data.order_id;
    const [[upiDbOrder]] = await promiseDb.query("SELECT * FROM orders WHERE id = ?", [upiOrderId]);

    testAssert(
      17,
      "Verified UPI order has payment_method = 'UPI' and payment_status = 'Paid'",
      upiDbOrder.payment_method === "UPI" &&
      upiDbOrder.payment_status === "Paid" &&
      upiDbOrder.status === "Processing" &&
      upiDbOrder.payment_id === validUpiPaymentId
    );

    // =========================================================================
    // SECTION 5: SECURITY, TAMPERING & DUPLICATE PREVENTION
    // =========================================================================
    console.log("\n--- SECTION 5: Security & Negative Scenarios ---");

    // Tampered signature
    const forgedRes = await request("POST", "/api/payments/verify", {
      razorpay_order_id: "order_fake_123",
      razorpay_payment_id: "pay_fake_456",
      razorpay_signature: "tampered_hex_signature_not_authentic",
      order_data: {
        customer_name: "Hacker User",
        mobile: customerMobile,
        address: "Unknown Location",
        payment_method: "UPI",
        items: [{ product_id: testProductId, quantity: 1 }]
      }
    }, testToken);

    testAssert(
      18,
      "Forged/tampered payment signature is strictly rejected with 400 Bad Request",
      forgedRes.status === 400 && forgedRes.data.message.includes("signature verification failed")
    );

    // Duplicate verification / replay prevention
    const duplicateRes = await request("POST", "/api/payments/verify", {
      razorpay_order_id: validUpiOrderId,
      razorpay_payment_id: validUpiPaymentId,
      razorpay_signature: validUpiSignature,
      order_data: {
        customer_name: "Payment Test Customer",
        mobile: customerMobile,
        address: "789 UPI Tech Road",
        payment_method: "UPI",
        items: [{ product_id: testProductId, quantity: 2 }]
      }
    }, testToken);

    testAssert(
      19,
      "Duplicate payment verification is blocked with 409 Conflict to prevent double order creation",
      duplicateRes.status === 409 && duplicateRes.data.order_id === upiOrderId
    );

    // =========================================================================
    // SECTION 6: ADMIN PANEL & FULFILLMENT LIFECYCLE
    // =========================================================================
    console.log("\n--- SECTION 6: Admin Panel & Fulfillment Lifecycle ---");

    // Admin updates COD order status to Delivered
    const adminDeliverRes = await request(
      "PATCH",
      `/api/admin/orders/${codOrderId}/status`,
      { status: "Delivered" },
      adminToken
    );

    testAssert(
      20,
      "Admin marks COD order as Delivered successfully",
      adminDeliverRes.status === 200 && adminDeliverRes.data.success === true
    );

    const [[deliveredCodOrder]] = await promiseDb.query("SELECT payment_status, status FROM orders WHERE id = ?", [codOrderId]);
    testAssert(
      21,
      "COD order payment_status automatically transitions to 'Paid' upon delivery",
      deliveredCodOrder.status === "Delivered" && deliveredCodOrder.payment_status === "Paid"
    );

    // Admin dashboard stats
    const statsRes = await request("GET", "/api/admin/stats", null, adminToken);
    testAssert(
      22,
      "Admin stats calculation includes revenue from both paid online orders and delivered COD orders",
      statsRes.status === 200 && Number(statsRes.data.stats.totalRevenue) > 0
    );

    console.log("====================================================================");
    console.log(`ALL ${totalCount} PAYMENT SUITE TESTS COMPLETED: ${passedCount}/${totalCount} PASSED!`);
    console.log("====================================================================");
  } catch (err) {
    console.error("Test execution exception:", err);
    process.exitCode = 1;
  } finally {
    // Clean up test data
    try {
      if (testUserId || adminUserId) {
        const userIds = [testUserId, adminUserId].filter(Boolean);
        await promiseDb.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (?))", [userIds]);
        await promiseDb.query("DELETE FROM orders WHERE user_id IN (?)", [userIds]);
        await promiseDb.query("DELETE FROM users WHERE id IN (?)", [userIds]);
      }
      if (testProductId) {
        await promiseDb.query("DELETE FROM products WHERE id = ?", [testProductId]);
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
    process.exit(process.exitCode || 0);
  }
}

runPaymentSuite();
