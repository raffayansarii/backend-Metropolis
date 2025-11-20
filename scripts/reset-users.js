// Script to reset users.json with properly hashed passwords
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '../data/users.json');
const DB_DIR = path.dirname(DB_FILE);

async function resetUsers() {
  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Hash password for all default users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const defaultUsers = {
    1: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    },
    2: {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    },
    3: {
      id: 3,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    },
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(defaultUsers, null, 2));
  console.log('✅ Users reset successfully!');
  console.log('Default users created with password: password123');
  console.log('Emails: john@example.com, jane@example.com, alice@example.com');
}

resetUsers().catch(console.error);

