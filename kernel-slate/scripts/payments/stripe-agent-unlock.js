const fs = require('fs');
const path = require('path');
let Stripe;
try {
  Stripe = require('stripe');
} catch {
  Stripe = null;
}
const purchasesFile = path.resolve(__dirname, '../../purchases.json');

async function chargeAgentInstall(agentName) {
  if (!Stripe || !process.env.STRIPE_SECRET) {
    console.log('Stripe not configured; skipping charge.');
    return;
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET, {
    apiVersion: '2022-11-15'
  });
  const intent = await stripe.paymentIntents.create({
    amount: 100,
    currency: 'usd',
    description: `Unlock ${agentName}`
  });
  const purchases = fs.existsSync(purchasesFile)
    ? JSON.parse(fs.readFileSync(purchasesFile, 'utf8'))
    : [];
  purchases.push({ agent: agentName, id: intent.id, timestamp: new Date().toISOString() });
  fs.writeFileSync(purchasesFile, JSON.stringify(purchases, null, 2));
}

module.exports = { chargeAgentInstall };
