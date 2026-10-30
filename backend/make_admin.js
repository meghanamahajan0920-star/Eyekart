require('dotenv').config();
const { promiseDb } = require('./db');

async function makeAdmin() {
  try {
    const email = 'admin@eyekart.com';

    const [result] = await promiseDb.execute(
      `UPDATE users
       SET role = 'admin'
       WHERE email = ?`,
      [email]
    );

    if (result.affectedRows === 0) {
      console.log('ERROR: Admin user not found.');
      console.log('First run the register command, or create one with scripts/manage_admin.js create, then run this script again.');
      return;
    }

    const [rows] = await promiseDb.execute(
      `SELECT id, name, email, mobile, role
       FROM users
       WHERE email = ?`,
      [email]
    );

    console.log('');
    console.log('================================');
    console.log('EYE-KART ADMIN CREATED / UPDATED');
    console.log('================================');
    console.table(rows);
    console.log('Email:    admin@eyekart.com');
    console.log('================================');
  } catch (error) {
    console.error('Failed to make admin:', error.message);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode || 0);
  }
}

makeAdmin();
