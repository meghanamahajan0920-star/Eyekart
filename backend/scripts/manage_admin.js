require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const { promiseDb } = require("../db");

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || !["promote", "create", "demote", "list"].includes(command)) {
    console.log(`
EyeKart Admin Management Utility
--------------------------------
Usage:
  node scripts/manage_admin.js list
    List all administrators.

  node scripts/manage_admin.js promote <email>
    Promote an existing user to admin.

  node scripts/manage_admin.js demote <email>
    Demote an admin user to standard 'user' role.

  node scripts/manage_admin.js create <email> <password> [name] [mobile]
    Create a new administrator account (password securely hashed with bcrypt).
`);
    process.exit(0);
  }

  try {
    if (command === "list") {
      const [admins] = await promiseDb.query("SELECT id, name, email, mobile, role, created_at FROM users WHERE role = 'admin'");
      console.log(`Found ${admins.length} administrator(s):`);
      console.table(admins);
      process.exit(0);
    }

    if (command === "promote") {
      const email = args[1];
      if (!email) {
        console.error("Error: Please provide the email address to promote.");
        process.exit(1);
      }
      const cleanEmail = email.trim().toLowerCase();
      const [users] = await promiseDb.query("SELECT id, name, email, role FROM users WHERE email = ?", [cleanEmail]);
      if (users.length === 0) {
        console.error(`Error: User with email "${cleanEmail}" does not exist.`);
        process.exit(1);
      }
      await promiseDb.query("UPDATE users SET role = 'admin' WHERE id = ?", [users[0].id]);
      console.log(`✓ Successfully promoted ${users[0].name} (${cleanEmail}) to admin.`);
      process.exit(0);
    }

    if (command === "demote") {
      const email = args[1];
      if (!email) {
        console.error("Error: Please provide the email address to demote.");
        process.exit(1);
      }
      const cleanEmail = email.trim().toLowerCase();
      const [users] = await promiseDb.query("SELECT id, name, email, role FROM users WHERE email = ?", [cleanEmail]);
      if (users.length === 0) {
        console.error(`Error: User with email "${cleanEmail}" does not exist.`);
        process.exit(1);
      }
      await promiseDb.query("UPDATE users SET role = 'user' WHERE id = ?", [users[0].id]);
      console.log(`✓ Successfully demoted ${users[0].name} (${cleanEmail}) to user.`);
      process.exit(0);
    }

    if (command === "create") {
      const email = args[1];
      const password = args[2];
      const name = args[3] || "EyeKart Admin";
      const mobile = args[4] || "9999999999";

      if (!email || !password) {
        console.error("Error: Email and password are required. (node scripts/manage_admin.js create <email> <password>)");
        process.exit(1);
      }

      if (password.length < 8) {
        console.error("Error: Password must be at least 8 characters long.");
        process.exit(1);
      }

      const cleanEmail = email.trim().toLowerCase();
      const [existing] = await promiseDb.query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
      if (existing.length > 0) {
        console.error(`Error: User with email "${cleanEmail}" already exists. Use 'promote' command instead.`);
        process.exit(1);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await promiseDb.query(
        "INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, 'admin')",
        [name.trim(), cleanEmail, mobile.trim(), hashedPassword]
      );

      console.log(`✓ Successfully created admin user "${cleanEmail}" with ID ${result.insertId}.`);
      process.exit(0);
    }
  } catch (err) {
    console.error("Admin management error:", err.message);
    process.exit(1);
  }
}

main();
