/**
 * EyeKart - Razorpay Test Mode Configuration & Security Test Suite
 *
 * Verifies:
 * 1. Diagnostic response when keys are missing/empty in .env
 * 2. Diagnostic response when keys are template placeholders
 * 3. Strict rejection of live mode credentials (rzp_live_*)
 * 4. Validation of test key format (rzp_test_*)
 * 5. Secret is never leaked to API responses
 * 6. Payment signature verification (HMAC SHA-256) and idempotency
 * 7. Cash on Delivery (COD) functions independently regardless of gateway status
 */

const assert = require("assert");
const http = require("http");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const app = require("./server");
const { promiseDb } = require("./db");

let server;
const PORT = 5006;
let testUserId;
let testToken;
let testProductId;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      "Content-Type": "application/json"
    };
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
    console.log(`✓ [RZP TEST ${num}] PASSED: ${desc}`);
  } else {
    console.error(`✗ [RZP TEST ${num}] FAILED: ${desc}`);
    process.exitCode = 1;
  }
}

async function runRazorpaySuite() {
  console.log("==================================================");
  console.log("    STARTING RAZORPAY TEST MODE CONFIG TESTS      ");
  console.log("==================================================");

  // Setup test customer user in database
  const testEmail = `rzp_test_user_${Date.now()}@example.com`;
  const testMobile = "9" + Math.floor(100000000 + Math.random() * 900000000);
  const [userResult] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, 'hashed_pass_placeholder', 'user')",
    ["Razorpay Test Customer", testEmail, testMobile]
  );
  testUserId = userResult.insertId;

  const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret";
  testToken = jwt.sign({ id: testUserId, role: "user", email: testEmail }, jwtSecret, { expiresIn: "1h" });

  // Setup test product
  const [productResult] = await promiseDb.query(
    "INSERT INTO products (name, description, price, stock) VALUES ('Razorpay Test Spectacle', 'Testing gateway', 999.00, 50)"
  );
  testProductId = productResult.insertId;

  server = app.listen(PORT, async () => {
    try {
      // -------------------------------------------------------------
      // SCENARIO 1: Credentials completely empty / unconfigured
      // -------------------------------------------------------------
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      const r1 = await request("GET", "/api/payments/config");
      testAssert(
        1,
        "GET /api/payments/config returns configured=false when keys are missing",
        r1.status === 200 &&
        r1.data.configured === false &&
        r1.data.keyId === null &&
        r1.data.mode === "unconfigured"
      );

      testAssert(
        2,
        "GET /api/payments/config diagnostic message guides user to configure backend/.env",
        typeof r1.data.message === "string" && r1.data.message.includes("backend/.env")
      );

      testAssert(
        3,
        "Response never leaks keySecret property",
        !("keySecret" in r1.data)
      );

      const r4 = await request("POST", "/api/payments/create-order", {
        items: [{ product_id: testProductId, quantity: 1 }]
      }, testToken);
      testAssert(
        4,
        "POST /api/payments/create-order rejects online payment with 400 when keys are missing",
        r4.status === 400 && r4.data.configured === false
      );

      const r5 = await request("POST", "/api/payments/verify", {
        razorpay_order_id: "order_123",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "sig_123",
        order_data: {
          customer_name: "Test",
          mobile: "9876543210",
          address: "Test Address",
          items: [{ product_id: testProductId, quantity: 1 }]
        }
      }, testToken);
      testAssert(
        5,
        "POST /api/payments/verify rejects verification with 400 when keys are missing",
        r5.status === 400
      );

      // -------------------------------------------------------------
      // SCENARIO 2: Placeholder credentials from .env.example
      // -------------------------------------------------------------
      process.env.RAZORPAY_KEY_ID = "rzp_test_your_key_id";
      process.env.RAZORPAY_KEY_SECRET = "your_razorpay_key_secret";

      const r6 = await request("GET", "/api/payments/config");
      testAssert(
        6,
        "GET /api/payments/config detects placeholder template keys and returns configured=false",
        r6.status === 200 &&
        r6.data.configured === false &&
        r6.data.keyId === null &&
        r6.data.message.includes("Placeholder")
      );

      // -------------------------------------------------------------
      // SCENARIO 3: Live credentials strictly rejected in Test Mode
      // -------------------------------------------------------------
      process.env.RAZORPAY_KEY_ID = "rzp_live_abc1234567890";
      process.env.RAZORPAY_KEY_SECRET = "live_secret_key_sample";

      const r7 = await request("GET", "/api/payments/config");
      testAssert(
        7,
        "Live credentials (rzp_live_*) are rejected and mode='live_rejected'",
        r7.status === 200 &&
        r7.data.configured === false &&
        r7.data.keyId === null &&
        r7.data.mode === "live_rejected"
      );

      const r8 = await request("POST", "/api/payments/create-order", {
        items: [{ product_id: testProductId, quantity: 1 }]
      }, testToken);
      testAssert(
        8,
        "POST /api/payments/create-order blocks order creation when live key is present",
        r8.status === 400 && r8.data.message.includes("Live mode")
      );

      // -------------------------------------------------------------
      // SCENARIO 4: Malformed Key ID prefix (not starting with rzp_test_)
      // -------------------------------------------------------------
      process.env.RAZORPAY_KEY_ID = "invalid_prefix_key_12345";
      process.env.RAZORPAY_KEY_SECRET = "some_secret_key";

      const r9 = await request("GET", "/api/payments/config");
      testAssert(
        9,
        "Malformed key prefix rejected with mode='invalid_format'",
        r9.status === 200 &&
        r9.data.configured === false &&
        r9.data.mode === "invalid_format"
      );

      // -------------------------------------------------------------
      // SCENARIO 5: Valid Test Mode credentials
      // -------------------------------------------------------------
      const mockTestKeyId = "rzp_test_eyekart_valid_suite";
      const mockTestSecret = "eyekart_mock_secret_signature_test";
      process.env.RAZORPAY_KEY_ID = mockTestKeyId;
      process.env.RAZORPAY_KEY_SECRET = mockTestSecret;

      const r10 = await request("GET", "/api/payments/config");
      testAssert(
        10,
        "Valid test key yields configured=true, mode='test', and public keyId",
        r10.status === 200 &&
        r10.data.configured === true &&
        r10.data.mode === "test" &&
        r10.data.keyId === mockTestKeyId &&
        !("keySecret" in r10.data)
      );

      // -------------------------------------------------------------
      // SCENARIO 6: Payment Signature Verification (HMAC SHA-256)
      // -------------------------------------------------------------
      // 6a: Forged signature rejected
      const r11 = await request("POST", "/api/payments/verify", {
        razorpay_order_id: "order_mock_test_111",
        razorpay_payment_id: "pay_mock_test_222",
        razorpay_signature: "forged_invalid_signature_hex_code",
        order_data: {
          customer_name: "Razorpay Test Customer",
          mobile: "9876543210",
          address: "456 Test Blvd, Apt 101",
          items: [{ product_id: testProductId, quantity: 1 }]
        }
      }, testToken);
      testAssert(
        11,
        "POST /api/payments/verify rejects tampered signature with 400",
        r11.status === 400 && r11.data.message.includes("signature verification failed")
      );

      // 6b: Valid signature succeeds
      const validRzpOrderId = `order_test_${Date.now()}`;
      const validRzpPaymentId = `pay_test_${Date.now()}`;
      const validSignature = crypto
        .createHmac("sha256", mockTestSecret)
        .update(`${validRzpOrderId}|${validRzpPaymentId}`)
        .digest("hex");

      const r12 = await request("POST", "/api/payments/verify", {
        razorpay_order_id: validRzpOrderId,
        razorpay_payment_id: validRzpPaymentId,
        razorpay_signature: validSignature,
        order_data: {
          customer_name: "Razorpay Test Customer",
          mobile: "9876543210",
          address: "456 Test Blvd, Apt 101",
          items: [{ product_id: testProductId, quantity: 2 }]
        }
      }, testToken);
      testAssert(
        12,
        "POST /api/payments/verify succeeds with 201 for authentic signature",
        r12.status === 201 && typeof r12.data.order_id === "number"
      );

      const verifiedOrderId = r12.data.order_id;
      const [[orderRecord]] = await promiseDb.query(
        "SELECT payment_method, payment_status, status FROM orders WHERE id = ?",
        [verifiedOrderId]
      );
      testAssert(
        13,
        "Verified online order is marked as payment_status='Paid' and payment_method='Online Payment'",
        orderRecord.payment_status === "Paid" &&
        orderRecord.payment_method === "Online Payment" &&
        orderRecord.status === "Processing"
      );

      // 6c: Idempotent duplicate verification rejected with 409
      const r14 = await request("POST", "/api/payments/verify", {
        razorpay_order_id: validRzpOrderId,
        razorpay_payment_id: validRzpPaymentId,
        razorpay_signature: validSignature,
        order_data: {
          customer_name: "Razorpay Test Customer",
          mobile: "9876543210",
          address: "456 Test Blvd, Apt 101",
          items: [{ product_id: testProductId, quantity: 2 }]
        }
      }, testToken);
      testAssert(
        14,
        "Duplicate payment verification prevented with 409 Conflict",
        r14.status === 409
      );

      // -------------------------------------------------------------
      // SCENARIO 7: Cash on Delivery (COD) works completely independent
      // -------------------------------------------------------------
      // Unset keys again to verify COD works even when gateway is unconfigured
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      const r15 = await request("POST", "/api/orders", {
        customer_name: "Cash Delivery Customer",
        mobile: "9876543210",
        address: "789 COD Highway, Floor 2",
        payment_method: "Cash on Delivery",
        items: [{ product_id: testProductId, quantity: 1 }]
      }, testToken);
      testAssert(
        15,
        "Cash on Delivery order succeeds even when Razorpay keys are unconfigured",
        r15.status === 201 && typeof r15.data.order_id === "number"
      );

      console.log("==================================================");
      console.log(`ALL ${totalCount} RAZORPAY CONFIG TESTS COMPLETED: ${passedCount}/${totalCount} PASSED!`);
      console.log("==================================================");
    } catch (err) {
      console.error("Test execution exception:", err);
      process.exitCode = 1;
    } finally {
      // Clean up test data
      try {
        if (testUserId) {
          await promiseDb.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)", [testUserId]);
          await promiseDb.query("DELETE FROM orders WHERE user_id = ?", [testUserId]);
          await promiseDb.query("DELETE FROM users WHERE id = ?", [testUserId]);
        }
        if (testProductId) {
          await promiseDb.query("DELETE FROM products WHERE id = ?", [testProductId]);
        }
      } catch (cleanupErr) {
        console.warn("Cleanup warning:", cleanupErr.message);
      }
      server.close();
      process.exit(process.exitCode || 0);
    }
  });
}

runRazorpaySuite();
