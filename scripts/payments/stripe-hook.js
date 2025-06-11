#!/usr/bin/env node
// Stripe payment stub for unlock and referral

const cmd = process.argv[2];

switch (cmd) {
  case 'pay':
    console.log('Processing payment... (stub)');
    break;
  case 'refer':
    console.log('Creating referral token... (stub)');
    break;
  case 'unlock':
    console.log('Unlocking vault... (stub)');
    break;
  default:
    console.log('Usage: node stripe-hook.js <pay|refer|unlock>');
}
