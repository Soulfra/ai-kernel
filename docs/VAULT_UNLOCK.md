# Vault Unlock

The runtime includes a simple payment and referral stub.
Before accessing Claude or Cal features you must run one of:

```
make pay      # process a $1 payment
make refer    # create a referral token
make unlock   # unlock using an existing token
```

These commands call `scripts/payments/stripe-hook.js` which can be extended with real Stripe integration.
