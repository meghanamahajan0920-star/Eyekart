const http = require("http");
const bcrypt = require("bcryptjs");

async function runPhase6Tests() {
  console.log("==================================================");
  console.log("    STARTING EYE-KART PHASE 6 BACKEND TEST SUITE    ");
  console.log("==================================================");

  process.env.PORT = "5003";
  process.env.JWT_SECRET = "eyekart_phase6_test_jwt_secret_xyz123";

  const { promiseDb } = require("./db");

  // Cleanup test users & orders
  await promiseDb.query("DELETE FROM reviews WHERE review LIKE 'Phase6 Test%'");
  await promiseDb.query("DELETE FROM wishlist WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'phase6_%@test.com')");
  await promiseDb.query("DELETE FROM order_prescriptions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'phase6_%@test.com')");
  await promiseDb.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_name LIKE 'Phase6%')");
  await promiseDb.query("DELETE FROM orders WHERE customer_name LIKE 'Phase6%'");
  await promiseDb.query("DELETE FROM products WHERE name LIKE 'Phase6 Test Frame%'");
  await promiseDb.query("DELETE FROM users WHERE email LIKE 'phase6_%@test.com'");

  // Create User A, User B, Admin
  const hashedPass = await bcrypt.hash("Password@123", 10);
  const [uARes] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES ('Phase6 UserA', 'phase6_usera@test.com', '9890000001', ?, 'user')",
    [hashedPass]
  );
  const userAId = uARes.insertId;

  const [uBRes] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES ('Phase6 UserB', 'phase6_userb@test.com', '9890000002', ?, 'user')",
    [hashedPass]
  );
  const userBId = uBRes.insertId;

  const [adminRes] = await promiseDb.query(
    "INSERT INTO users (name, email, mobile, password, role) VALUES ('Phase6 Admin', 'phase6_admin@test.com', '9890000003', ?, 'admin')",
    [hashedPass]
  );
  const adminId = adminRes.insertId;

  // Insert a test product
  const [prodRes] = await promiseDb.query(
    "INSERT INTO products (name, description, price, stock, gender, frame_type, frame_material, lens_type, color, image) VALUES ('Phase6 Test Frame', 'Phase6 Test Product', 1999.00, 25, 'Unisex', 'Full Rim', 'Acetate', 'Clear', 'Black', '👓')"
  );
  const productId = prodRes.insertId;

  // Require server on port 5003
  require("./server");
  await new Promise((r) => setTimeout(r, 1200));

  function request(method, path, body = null, token = null) {
    return new Promise((resolve) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = { "Content-Type": "application/json" };
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const req = http.request(
        { hostname: "localhost", port: 5003, path, method, headers },
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
      if (payload) req.write(payload);
      req.end();
    });
  }

  // Login tokens
  const loginA = await request("POST", "/api/auth/login", { email: "phase6_usera@test.com", password: "Password@123" });
  const tokenA = loginA.data.token;

  const loginB = await request("POST", "/api/auth/login", { email: "phase6_userb@test.com", password: "Password@123" });
  const tokenB = loginB.data.token;

  const loginAdmin = await request("POST", "/api/auth/login", { email: "phase6_admin@test.com", password: "Password@123" });
  const tokenAdmin = loginAdmin.data.token;

  let passed = 0;
  let total = 0;
  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ [TEST ${total}] PASSED: ${message}`);
      passed++;
    } else {
      console.error(`✗ [TEST ${total}] FAILED: ${message}`);
      process.exit(1);
    }
  }

  // 1. Wishlist without token returns 401
  const wNoToken = await request("GET", "/api/wishlist");
  assert(wNoToken.status === 401, "GET /api/wishlist without token rejected with 401");

  // 2. Add product to wishlist
  const wAdd = await request("POST", `/api/wishlist/${productId}`, {}, tokenA);
  assert(wAdd.status === 200 && wAdd.data.inWishlist === true, "POST /api/wishlist/:id adds item to user wishlist");

  // 3. Check wishlist status
  const wCheck = await request("GET", `/api/wishlist/check/${productId}`, null, tokenA);
  assert(wCheck.status === 200 && wCheck.data.inWishlist === true, "GET /api/wishlist/check/:id confirms wishlisted status");

  // 4. Retrieve user wishlist
  const wGet = await request("GET", "/api/wishlist", null, tokenA);
  assert(wGet.status === 200 && wGet.data.wishlist.some(p => p.id === productId), "GET /api/wishlist returns wishlisted product");

  // 5. User B wishlist is separate
  const wGetB = await request("GET", "/api/wishlist", null, tokenB);
  assert(wGetB.status === 200 && wGetB.data.wishlist.length === 0, "User B cannot see User A wishlist");

  // 6. Remove product from wishlist
  const wDel = await request("DELETE", `/api/wishlist/${productId}`, null, tokenA);
  assert(wDel.status === 200 && wDel.data.inWishlist === false, "DELETE /api/wishlist/:id removes item from wishlist");

  // 7. Check wishlist status after removal
  const wCheckAfter = await request("GET", `/api/wishlist/check/${productId}`, null, tokenA);
  assert(wCheckAfter.status === 200 && wCheckAfter.data.inWishlist === false, "GET /api/wishlist/check/:id confirms item is no longer in wishlist");

  // 8. Public reviews endpoint returns 200
  const revPublic = await request("GET", `/api/products/${productId}/reviews`);
  assert(revPublic.status === 200 && Array.isArray(revPublic.data.reviews), "GET /api/products/:id/reviews returns public reviews list and stats");

  // 9. Ineligible user (has not purchased) submitting review returns 403
  const revIneligible = await request("POST", `/api/products/${productId}/reviews`, { rating: 5, review: "Phase6 Test Review" }, tokenA);
  assert(revIneligible.status === 403, "User who hasn't purchased product cannot review (returns 403)");

  // 10. User A buys product (COD order)
  const orderRes = await request("POST", "/api/orders", {
    customer_name: "Phase6 UserA",
    mobile: "9890000001",
    address: "123 MG Road, Bangalore",
    payment_method: "Cash on Delivery",
    items: [{ product_id: productId, quantity: 1 }],
    prescription: {
      has_prescription: true,
      right_sph: "-1.50",
      left_sph: "-1.25",
      pupillary_distance: "62"
    }
  }, tokenA);
  assert(orderRes.status === 201 && orderRes.data.order_id, "Order created with attached prescription details");
  const orderId = orderRes.data.order_id;

  // 11. Fetch order details to verify prescription attachment
  const orderDetail = await request("GET", `/api/orders/${orderId}`, null, tokenA);
  assert(orderDetail.status === 200 && orderDetail.data.prescription && orderDetail.data.prescription.right_sph === "-1.50", "GET /api/orders/:id returns attached prescription data");

  // 12. Eligible User A submitting review succeeds with 201
  const revSubmit = await request("POST", `/api/products/${productId}/reviews`, {
    rating: 5,
    review: "Phase6 Test: Excellent lightweight frame, highly recommended!"
  }, tokenA);
  assert(revSubmit.status === 201 && revSubmit.data.review_id, "Eligible customer can submit verified product review");
  const reviewId = revSubmit.data.review_id;

  // 13. Invalid rating (e.g. 6) rejected with 400
  const revBadRating = await request("POST", `/api/products/${productId}/reviews`, {
    rating: 6,
    review: "Phase6 Test invalid"
  }, tokenA);
  assert(revBadRating.status === 400, "Review rating greater than 5 rejected with 400");

  // 14. User A editing their own review succeeds with 200
  const revEdit = await request("PUT", `/api/reviews/${reviewId}`, {
    rating: 4,
    review: "Phase6 Test: Updated review to 4 stars"
  }, tokenA);
  assert(revEdit.status === 200, "Review owner can edit their review");

  // 15. User B attempting to edit User A review returns 403
  const revEditB = await request("PUT", `/api/reviews/${reviewId}`, {
    rating: 1,
    review: "Phase6 Test unauthorized edit"
  }, tokenB);
  assert(revEditB.status === 403, "User B cannot edit User A review (returns 403)");

  // 16. Admin view all reviews returns 200
  const revAdmin = await request("GET", "/api/admin/reviews", null, tokenAdmin);
  assert(revAdmin.status === 200 && revAdmin.data.reviews.length > 0, "GET /api/admin/reviews returns list of all reviews");

  // 17. Non-admin accessing admin reviews returns 403
  const revAdminB = await request("GET", "/api/admin/reviews", null, tokenB);
  assert(revAdminB.status === 403, "Non-admin accessing /api/admin/reviews returns 403");

  // 18. Prescription upload endpoint rejecting invalid file format
  const badUpload = await request("POST", "/api/prescriptions/upload", {
    file_data: "data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA",
    file_name: "malware.exe"
  }, tokenA);
  assert(badUpload.status === 400, "Executable file upload safely rejected with 400");

  // 19. Prescription upload endpoint accepting valid JPG/PNG base64
  const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const goodUpload = await request("POST", "/api/prescriptions/upload", {
    file_data: sampleBase64,
    file_name: "my_doctor_rx.png"
  }, tokenA);
  assert(goodUpload.status === 201 && goodUpload.data.file_url, "Valid prescription image upload returns 201 with file_url");

  // 20. User A deleting their own review succeeds with 200
  const revDel = await request("DELETE", `/api/reviews/${reviewId}`, null, tokenA);
  assert(revDel.status === 200, "Review owner can delete their review");

  console.log("==================================================");
  console.log(`ALL ${total} PHASE 6 BACKEND TESTS COMPLETED: ${passed}/${total} PASSED!`);
  console.log("==================================================");
  process.exit(0);
}

runPhase6Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
