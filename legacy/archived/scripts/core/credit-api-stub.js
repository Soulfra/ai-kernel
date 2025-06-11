// Soulfra Credit/Token API Stub

const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(process.cwd(), 'soulfra-credits.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function checkBalance(userToken) {
  const db = loadDB();
  return db[userToken]?.credits || 0;
}

function deductCredits(userToken, amount) {
  const db = loadDB();
  if (!db[userToken] || db[userToken].credits < amount) return false;
  db[userToken].credits -= amount;
  saveDB(db);
  console.log(`Deducted ${amount} credits from ${userToken}`);
  return true;
}

function registerUser(userToken) {
  const db = loadDB();
  if (!db[userToken]) db[userToken] = { credits: 10 };
  saveDB(db);
  console.log(`Registered user ${userToken} with 10 credits`);
}

module.exports = { checkBalance, deductCredits, registerUser }; 