const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const Database = require('../src/config/database');

(async () => {
  const [emailArg, passwordArg, displayNameArg, roleArg] = process.argv.slice(2);
  const email = String(emailArg || '').trim().toLowerCase();
  const password = String(passwordArg || '');
  const displayName = String(displayNameArg || '').trim();
  const role = String(roleArg || 'admin').trim();

  if (!email || !password || !displayName) {
    console.error('Użycie: node scripts/create-zmc-user.js email haslo "Imię Nazwisko" [admin|designer|social|photographer]');
    process.exit(1);
  }
  if (!['admin','designer','social','photographer'].includes(role)) {
    console.error('Nieprawidłowa rola.');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Hasło musi mieć co najmniej 10 znaków.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const db = Database.getInstance();
  await db.query(
    `INSERT INTO cg_users (email, password_hash, display_name, role, is_active)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), display_name=VALUES(display_name), role=VALUES(role), is_active=1`,
    [email, hash, displayName, role]
  );

  console.log(`Użytkownik ${email} zapisany jako ${role}.`);
  await db.getPool().end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
