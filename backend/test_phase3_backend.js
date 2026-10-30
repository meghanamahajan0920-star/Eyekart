const http = require("http");

// We will launch server and run all verification tests
async function runTests() {
  console.log("=== STARTING BACKEND PHASE 3 VERIFICATION TESTS ===");
  
  // Start server on port 5001 for test isolation
  process.env.PORT = "5001";
  process.env.JWT_SECRET = "test_jwt_secret_phase3_998877";
  const { promiseDb } = require("./db");
  
  // Clean up any old test users
  await promiseDb.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE 'Test User%')");
  await promiseDb.query("DELETE FROM orders WHERE customer_name LIKE 'Test User%'");
  await promiseDb.query("DELETE FROM users WHERE email IN ('usera@test.com', 'userb@test.com', 'dup@test.com')");

  // Spin up server
  const server = require("./server"); // this starts on 5001
  
  // Wait 1 second for DB connection & listen
  await new Promise(r => setTimeout(r, 1500));

  function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = {
        "Content-Type": "application/json"
      };
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const req = http.request({
        hostname: "localhost",
        port: 5001,
        path,
        method,
        headers
      }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch(e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  try {
    // 1. Health check
    const health = await request("GET", "/api/health");
    console.log("[TEST 1] GET /api/health -> Status:", health.status, health.data.message);
    if (health.status !== 200 || !health.data.success) throw new Error("Health check failed");

    // 2. Products check
    const productsRes = await request("GET", "/api/products");
    console.log("[TEST 2] GET /api/products -> Count:", productsRes.data.products?.length);
    if (productsRes.status !== 200 || !productsRes.data.products?.length) throw new Error("Products check failed");
    const testProduct = productsRes.data.products[0];

    // 3. Register User A Validation Checks
    console.log("\n--- Testing Auth Registration Validations ---");
    // Short password
    const shortPass = await request("POST", "/api/auth/register", {
      name: "Test User A", email: "usera@test.com", mobile: "9876543210", password: "123"
    });
    console.log("[TEST 3a] Short password -> Status:", shortPass.status, "(Expected 400):", shortPass.data.message);
    if (shortPass.status !== 400) throw new Error("Short password validation failed");

    // Invalid email
    const badEmail = await request("POST", "/api/auth/register", {
      name: "Test User A", email: "invalid-email", mobile: "9876543210", password: "password123"
    });
    console.log("[TEST 3b] Invalid email -> Status:", badEmail.status, "(Expected 400):", badEmail.data.message);
    if (badEmail.status !== 400) throw new Error("Invalid email validation failed");

    // Invalid mobile
    const badMobile = await request("POST", "/api/auth/register", {
      name: "Test User A", email: "usera@test.com", mobile: "123", password: "password123"
    });
    console.log("[TEST 3c] Invalid mobile -> Status:", badMobile.status, "(Expected 400):", badMobile.data.message);
    if (badMobile.status !== 400) throw new Error("Invalid mobile validation failed");

    // Valid Register User A
    const regUserA = await request("POST", "/api/auth/register", {
      name: "Test User A", email: "usera@test.com", mobile: "9876543210", password: "Password@123"
    });
    console.log("[TEST 3d] Valid Registration User A -> Status:", regUserA.status, regUserA.data.user);
    if (regUserA.status !== 201 || !regUserA.data.token) throw new Error("User A registration failed");
    if (regUserA.data.user.password || regUserA.data.user.password_hash) throw new Error("Password leaked in registration response!");

    // Duplicate email registration
    const dupEmail = await request("POST", "/api/auth/register", {
      name: "Test User A2", email: "usera@test.com", mobile: "9876543211", password: "Password@123"
    });
    console.log("[TEST 3e] Duplicate Email -> Status:", dupEmail.status, "(Expected 400):", dupEmail.data.message);
    if (dupEmail.status !== 400) throw new Error("Duplicate email check failed");

    // Duplicate mobile registration
    const dupMobile = await request("POST", "/api/auth/register", {
      name: "Test User A3", email: "usera3@test.com", mobile: "9876543210", password: "Password@123"
    });
    console.log("[TEST 3f] Duplicate Mobile -> Status:", dupMobile.status, "(Expected 400):", dupMobile.data.message);
    if (dupMobile.status !== 400) throw new Error("Duplicate mobile check failed");

    // 4. Register User B
    const regUserB = await request("POST", "/api/auth/register", {
      name: "Test User B", email: "userb@test.com", mobile: "9876543299", password: "Password@456"
    });
    console.log("[TEST 4] Valid Registration User B -> Status:", regUserB.status, regUserB.data.user);
    if (regUserB.status !== 201) throw new Error("User B registration failed");

    // 5. Test Login
    console.log("\n--- Testing Auth Login ---");
    // Wrong password
    const wrongPass = await request("POST", "/api/auth/login", {
      email: "usera@test.com", password: "wrongpassword"
    });
    console.log("[TEST 5a] Wrong password -> Status:", wrongPass.status, "(Expected 401):", wrongPass.data.message);
    if (wrongPass.status !== 401) throw new Error("Wrong password login check failed");

    // Correct Login User A
    const loginUserA = await request("POST", "/api/auth/login", {
      email: "usera@test.com", password: "Password@123"
    });
    console.log("[TEST 5b] Correct Login User A -> Status:", loginUserA.status, "Token exists:", Boolean(loginUserA.data.token));
    if (loginUserA.status !== 200 || !loginUserA.data.token) throw new Error("User A login failed");
    const tokenA = loginUserA.data.token;

    // Correct Login User B
    const loginUserB = await request("POST", "/api/auth/login", {
      email: "userb@test.com", password: "Password@456"
    });
    console.log("[TEST 5c] Correct Login User B -> Status:", loginUserB.status, "Token exists:", Boolean(loginUserB.data.token));
    const tokenB = loginUserB.data.token;

    // 6. Test Token Protection on Order Endpoints
    console.log("\n--- Testing Route Protection Without / With Invalid Token ---");
    const noToken = await request("GET", "/api/orders");
    console.log("[TEST 6a] GET /api/orders without token -> Status:", noToken.status, "(Expected 401):", noToken.data.message);
    if (noToken.status !== 401) throw new Error("Missing token check failed");

    const badToken = await request("GET", "/api/orders", null, "invalid.jwt.token");
    console.log("[TEST 6b] GET /api/orders with invalid token -> Status:", badToken.status, "(Expected 401):", badToken.data.message);
    if (badToken.status !== 401) throw new Error("Invalid token check failed");

    // 7. User A creates Order
    console.log("\n--- Testing Order Creation & User Ownership ---");
    const orderPayload = {
      customer_name: "Test User A",
      mobile: "9876543210",
      address: "123 Test Street, Bangalore",
      payment_method: "Cash on Delivery",
      items: [{ product_id: testProduct.id, quantity: 1 }]
    };

    const initialStock = testProduct.stock;
    const createOrderRes = await request("POST", "/api/orders", orderPayload, tokenA);
    console.log("[TEST 7] User A creates Order -> Status:", createOrderRes.status, "Order ID:", createOrderRes.data.order_id);
    if (createOrderRes.status !== 201 || !createOrderRes.data.order_id) throw new Error("Order creation failed");
    const orderAId = createOrderRes.data.order_id;

    // Verify stock was decremented
    const [updatedProduct] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProduct.id]);
    console.log(`[TEST 7b] Stock decremented from ${initialStock} to ${updatedProduct[0].stock}`);
    if (updatedProduct[0].stock !== initialStock - 1) throw new Error("Stock was not decremented!");

    // Verify User A sees order in list
    const userAOrders = await request("GET", "/api/orders", null, tokenA);
    console.log("[TEST 8a] User A GET /api/orders -> Found count:", userAOrders.data.orders?.length);
    if (userAOrders.data.orders?.length !== 1 || userAOrders.data.orders[0].id !== orderAId) {
      throw new Error("User A orders list check failed");
    }

    // Verify User A can fetch order details
    const userAOrderDetails = await request("GET", `/api/orders/${orderAId}`, null, tokenA);
    console.log("[TEST 8b] User A GET /api/orders/:id -> Found Order ID:", userAOrderDetails.data.order?.id);
    if (userAOrderDetails.status !== 200 || userAOrderDetails.data.order.id !== orderAId) {
      throw new Error("User A order details check failed");
    }

    // 8. MANDATORY STEP 29: User B tries to access User A's order
    console.log("\n--- MANDATORY STEP 29: Cross-User Authorization Test ---");
    // User B list orders -> should be empty
    const userBOrders = await request("GET", "/api/orders", null, tokenB);
    console.log("[TEST 9a] User B GET /api/orders -> Found count:", userBOrders.data.orders?.length, "(Expected 0)");
    if (userBOrders.data.orders?.length !== 0) throw new Error("User B saw another user's orders!");

    // User B tries to view User A's order -> 403 Forbidden
    const userBViewOrderA = await request("GET", `/api/orders/${orderAId}`, null, tokenB);
    console.log("[TEST 9b] User B GET /api/orders/" + orderAId + " -> Status:", userBViewOrderA.status, "(Expected 403):", userBViewOrderA.data.message);
    if (userBViewOrderA.status !== 403) throw new Error("User B was NOT forbidden from viewing User A's order!");

    // User B tries to cancel User A's order -> 403 Forbidden
    const userBCancelOrderA = await request("PATCH", `/api/orders/${orderAId}/cancel`, null, tokenB);
    console.log("[TEST 9c] User B PATCH /api/orders/" + orderAId + "/cancel -> Status:", userBCancelOrderA.status, "(Expected 403):", userBCancelOrderA.data.message);
    if (userBCancelOrderA.status !== 403) throw new Error("User B was NOT forbidden from cancelling User A's order!");

    // 9. Cancellation by Owner (User A)
    console.log("\n--- Testing Order Cancellation by Owner ---");
    const cancelRes = await request("PATCH", `/api/orders/${orderAId}/cancel`, null, tokenA);
    console.log("[TEST 10a] User A cancels Order -> Status:", cancelRes.status, cancelRes.data.message);
    if (cancelRes.status !== 200 || !cancelRes.data.success) throw new Error("Order cancellation failed");

    // Verify stock was restored!
    const [restoredProduct] = await promiseDb.query("SELECT stock FROM products WHERE id = ?", [testProduct.id]);
    console.log(`[TEST 10b] Stock restored back from ${initialStock - 1} to ${restoredProduct[0].stock}`);
    if (restoredProduct[0].stock !== initialStock) throw new Error("Stock was not restored upon cancellation!");

    // Verify trying to cancel an already cancelled order fails with 400
    const cancelAgainRes = await request("PATCH", `/api/orders/${orderAId}/cancel`, null, tokenA);
    console.log("[TEST 10c] User A cancels already cancelled order -> Status:", cancelAgainRes.status, "(Expected 400):", cancelAgainRes.data.message);
    if (cancelAgainRes.status !== 400) throw new Error("Double cancellation was not blocked!");

    // 10. Payment Gateway Architecture Test
    console.log("\n--- Testing Payment Gateway Architecture & Error Handling ---");
    const paymentReq = await request("POST", "/api/payments/create-order", {
      items: [{ product_id: testProduct.id, quantity: 1 }]
    }, tokenA);
    console.log("[TEST 11a] Create payment order when credentials unconfigured -> Status:", paymentReq.status, "(Expected 400):", paymentReq.data.message);
    if (paymentReq.status !== 400 || paymentReq.data.configured !== false) {
      throw new Error("Payment pending architecture failed");
    }

    const onlineOrderAttempt = await request("POST", "/api/orders", {
      customer_name: "Test User A",
      mobile: "9876543210",
      address: "123 Test Street",
      payment_method: "Credit Card",
      items: [{ product_id: testProduct.id, quantity: 1 }]
    }, tokenA);
    console.log("[TEST 11b] Order with online payment without gateway -> Status:", onlineOrderAttempt.status, "(Expected 400):", onlineOrderAttempt.data.message);
    if (onlineOrderAttempt.status !== 400) {
      throw new Error("Online order without gateway credentials was not safely rejected!");
    }

    console.log("\n========================================================");
    console.log("ALL 11 BACKEND PHASE 3 TEST SUITES PASSED FLAWLESSLY! ✓");
    console.log("========================================================");
    process.exit(0);
  } catch (err) {
    console.error("\nTEST SUITE FAILED:", err);
    process.exit(1);
  }
}

runTests();
