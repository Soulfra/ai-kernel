// Premium feature check for Soulfra/CLARITY_ENGINE

function checkPremiumAccess(action = 'premium feature') {
  const token = process.env.SOULFRA_USER_TOKEN;
  if (!token) {
    throw new Error(`Access denied: ${action} requires a Soulfra user token. Please register and set SOULFRA_USER_TOKEN in your .env file. See .env.example for details.`);
  }
  // TODO: Call remote API to validate credits/tier
  // For now, always allow if token is present
  return true;
}

module.exports = { checkPremiumAccess }; 