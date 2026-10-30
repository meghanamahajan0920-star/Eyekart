const http = require("http");

async function runJourney() {
  console.log("================================================================");
  console.log("        EYEKART PHASE 3 - COMPLETE END-TO-END VERIFICATION      ");
  console.log("================================================================");

  // Setup port 5002 for end-to-end journey test
  process.env.PORT = "5002";
  process.env.JWT_SECRET = "journey_test_jwt_secret_phase3_2026";
  const { promiseDb } = require("./db");

  // Clean test data
  await promiseDb.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name IN ('Journey User A', 'Journey User B'))");
  await promiseDb.query("DELETE FROM orders WHERE customer_name IN ('Journey User A', 'Journey User B')");
  await promiseDb.query("DELETE FROM users WHERE email IN ('journey_a@eyekart.com', 'journey_b@eyekart.com')");

  // Require server
  require("./server");
  await new Promise(r => setTimeout(r, 1500));

  function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = { "Content-Type": "application/json" };
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const req = http.request({
        hostname: "localhost",
        port: 5002,
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
    // Phase 3.1: Guest browses products
    console.log("\n[STEP 1] Guest browses products without auth...");
    const productsRes = await request("GET", "/api/products");
    console.log("✓ Retrieved products list. Total available products:", productsRes.data.products.length);
    const chosenProduct = productsRes.data.products[0];

    console.log("\n[STEP 2] Guest views single product details (#" + chosenProduct.id + ")...");
    const singleProduct = await request("GET", `/api/products/${chosenProduct.id}`);
    console.log("✓ Product:", singleProduct.data.product.name, "| Price: ₹" + singleProduct.data.product.price, "| Stock:", singleProduct.data.product.stock);

    // Phase 3.2: Guest tries to checkout without authentication
    console.log("\n[STEP 3] Guest tries to place order without login...");
    const unauthOrder = await request("POST", "/api/orders", {
      customer_name: "Guest Shopper",
      mobile: "9999988888",
      address: "Some guest address",
      payment_method: "Cash on Delivery",
      items: [{ product_id: chosenProduct.id, quantity: 1 }]
    });
    console.log("✓ Blocked by auth middleware. Status:", unauthOrder.status, "| Message:", unauthOrder.data.message);
    if (unauthOrder.status !== 401) throw new Error("Unauthenticated order placement was not blocked!");

    // Phase 3.3: User A Registers & Logs In
    console.log("\n[STEP 4] User A registers an account...");
    const regUserA = await request("POST", "/api/auth/register", {
      name: "Journey User A",
      email: "journey_a@eyekart.com",
      mobile: "9123456780",
      password: "SecurePassword123"
    });
    console.log("✓ User A registered successfully. User ID:", regUserA.data.user.id);
    const tokenA = regUserA.data.token;

    // Verify /api/auth/me for User A
    const meA = await request("GET", "/api/auth/me", null, tokenA);
    console.log("✓ /api/auth/me verified for User A:", meA.data.user.name, "(" + meA.data.user.email + ")");

    // Phase 3.4: User A places Cash on Delivery order
    console.log("\n[STEP 5] User A places Cash on Delivery order from checkout...");
    const orderARes = await request("POST", "/api/orders", {
      customer_name: "Journey User A",
      mobile: "9123456780",
      address: "Flat 401, Sapphire Heights, MG Road, Bengaluru",
      payment_method: "Cash on Delivery",
      items: [{ product_id: chosenProduct.id, quantity: 2 }]
    }, tokenA);
    console.log("✓ Order placed! Order ID:", orderARes.data.order_id);
    const orderAId = orderARes.data.order_id;

    // Phase 3.5: User A views their orders in My Orders
    console.log("\n[STEP 6] User A views their orders list...");
    const userAOrders = await request("GET", "/api/orders", null, tokenA);
    console.log("✓ Orders found for User A:", userAOrders.data.orders.length);
    console.log("  Order summary -> ID:", userAOrders.data.orders[0].id, "| Total: ₹" + userAOrders.data.orders[0].total, "| Status:", userAOrders.data.orders[0].status, "| Payment:", userAOrders.data.orders[0].payment_status);

    // Phase 3.6: User A views Order Details
    console.log("\n[STEP 7] User A views Order Details for #" + orderAId + "...");
    const userAOrderDetail = await request("GET", `/api/orders/${orderAId}`, null, tokenA);
    console.log("✓ Retrieved order details. Items count:", userAOrderDetail.data.items.length);
    console.log("  Item:", userAOrderDetail.data.items[0].product_name, "x", userAOrderDetail.data.items[0].quantity);

    // Phase 3.7: User B registers & attempts cross-tenant access to User A's order
    console.log("\n[STEP 8] Register User B...");
    const regUserB = await request("POST", "/api/auth/register", {
      name: "Journey User B",
      email: "journey_b@eyekart.com",
      mobile: "9123456789",
      password: "SecurePassword456"
    });
    const tokenB = regUserB.data.token;
    console.log("✓ User B registered successfully. User ID:", regUserB.data.user.id);

    console.log("\n[STEP 9] User B queries /api/orders (own orders)...");
    const userBOrders = await request("GET", "/api/orders", null, tokenB);
    console.log("✓ User B order count:", userBOrders.data.orders.length, "(Expected: 0, cannot see User A's orders)");
    if (userBOrders.data.orders.length !== 0) throw new Error("User B can see other users' orders!");

    console.log("\n[STEP 10] User B attempts to access User A's order #" + orderAId + " directly...");
    const userBStealOrder = await request("GET", `/api/orders/${orderAId}`, null, tokenB);
    console.log("✓ Blocked! Status:", userBStealOrder.status, "| Message:", userBStealOrder.data.message);
    if (userBStealOrder.status !== 403) throw new Error("User B was not forbidden (403) from accessing User A's order!");

    console.log("\n[STEP 11] User B attempts to cancel User A's order #" + orderAId + "...");
    const userBCancelA = await request("PATCH", `/api/orders/${orderAId}/cancel`, null, tokenB);
    console.log("✓ Blocked! Status:", userBCancelA.status, "| Message:", userBCancelA.data.message);
    if (userBCancelA.status !== 403) throw new Error("User B was not forbidden (403) from cancelling User A's order!");

    // Phase 3.8: User A cancels their order
    console.log("\n[STEP 12] User A cancels their order #" + orderAId + "...");
    const userACancel = await request("PATCH", `/api/orders/${orderAId}/cancel`, null, tokenA);
    console.log("✓ Order cancelled! Status:", userACancel.status, "| Message:", userACancel.data.message);
    if (userACancel.status !== 200) throw new Error("User A failed to cancel own order!");

    // Verify order status is now Cancelled
    const verifiedOrderA = await request("GET", `/api/orders/${orderAId}`, null, tokenA);
    console.log("✓ Verified updated status:", verifiedOrderA.data.order.status);
    if (verifiedOrderA.data.order.status !== "Cancelled") throw new Error("Order status did not update to Cancelled!");

    // Phase 3.9: User A attempts double cancellation
    console.log("\n[STEP 13] User A attempts to cancel already cancelled order...");
    const doubleCancel = await request("PATCH", `/api/orders/${orderAId}/cancel`, null, tokenA);
    console.log("✓ Blocked double cancellation. Status:", doubleCancel.status, "| Message:", doubleCancel.data.message);
    if (doubleCancel.status !== 400) throw new Error("Double cancellation was not blocked!");

    // Phase 3.10: Payment Gateway architecture check
    console.log("\n[STEP 14] Testing Online Payment Gateway Architecture...");
    const onlinePaymentAttempt = await request("POST", "/api/payments/create-order", {
      items: [{ product_id: chosenProduct.id, quantity: 1 }]
    }, tokenA);
    console.log("✓ Payment Order Creation response: Configured =", onlinePaymentAttempt.data.configured, "| Notice:", onlinePaymentAttempt.data.message);

    console.log("\n================================================================");
    console.log("  ALL 14 STEPS OF THE USER JOURNEY & SECURITY CHECKS PASSED! ✓  ");
    console.log("================================================================");
    process.exit(0);
  } catch (err) {
    console.error("\nFATAL ERROR IN JOURNEY TEST:", err);
    process.exit(1);
  }
}

runJourney();
