const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { pool } = require('../db/index');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe not configured — webhook ignored');
    return res.status(200).send('Stripe not configured');
  }
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (typeof fbq === 'function') {
      fbq('track', 'Purchase', {
        currency: session.currency,
        value: session.amount_total / 100,
      });
    }

    // Persist subscription to users table
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO users (email, stripe_subscription_id, subscription_status, subscription_plan, subscription_expires_at, subscription_updated_at)
         VALUES ($1, $2, 'active', 'pro', NOW() + INTERVAL '30 days', NOW())
         ON CONFLICT (email) DO UPDATE SET
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           subscription_status = 'active',
           subscription_plan = 'pro',
           subscription_expires_at = NOW() + INTERVAL '30 days',
           subscription_updated_at = NOW()`,
        [session.customer_details.email, session.subscription]
      );
    } catch (err) {
      console.error('Error upserting subscription:', err);
    } finally {
      client.release();
    }
  }

  res.json({ received: true });
});

// Stripe subscription link — created via Polsia Stripe MCP (Jun 2026)
const STRIPE_SUBSCRIPTION_URL = 'https://buy.stripe.com/dRm6oJ2X5cDl95tbriaR200';

/**
 * POST /checkout - Store email in cookie, redirect to Stripe subscription page
 */
router.post('/checkout', (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email || !email.includes('@')) {
    return res.redirect('/pricing?error=invalid_email');
  }
  // Store email in cookie so success page can retrieve it
  // Cookie max-age 1 hour — enough time to complete payment
  res.cookie('checkout_email', email, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000,
  });
  // Redirect to Stripe subscription page with email pre-filled via query param
  res.redirect(`${STRIPE_SUBSCRIPTION_URL}?prefill_email=${encodeURIComponent(email)}`);
});

/**
 * GET /checkout/success - Stripe redirects here after payment with ?session_id=xxx
 * 1. Retrieve session from Stripe to get customer email (if key is configured)
 * 2. Upsert user in DB with active subscription
 * 3. Clear cookie, redirect to brief form
 */
router.get('/checkout/success', async (req, res) => {
  const sessionId = req.query.session_id || req.query.payment_intent;
  const cookieEmail = req.cookies?.checkout_email;
  let customerEmail = cookieEmail || null;

  // Retrieve session from Stripe to confirm payment and get email
  // (gracefully skips if STRIPE_SECRET_KEY is not configured)
  if (sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        customerEmail = session.customer_details?.email || customerEmail;
        // Upsert user with active subscription
        const client = await pool.connect();
        try {
          await client.query(
            `INSERT INTO users (email, stripe_subscription_id, subscription_status, subscription_plan, subscription_expires_at, subscription_updated_at)
             VALUES ($1, $2, 'active', 'pro', NOW() + INTERVAL '30 days', NOW())
             ON CONFLICT (email) DO UPDATE SET
               stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, users.stripe_subscription_id),
               subscription_status = 'active',
               subscription_plan = 'pro',
               subscription_expires_at = NOW() + INTERVAL '30 days',
               subscription_updated_at = NOW()`,
            [customerEmail, session.subscription || session.id]
          );
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.error('[/checkout/success] Error retrieving Stripe session:', err.message);
    }
  }

  // Clear checkout cookie
  res.clearCookie('checkout_email');

  if (!customerEmail) {
    return res.redirect('/pricing?error=no_email');
  }

  // Redirect to brief form with email for subscription check
  res.redirect(`/briefs/new?email=${encodeURIComponent(customerEmail)}`);
});

router.get('/pricing', (req, res) => {
  res.render('pricing');
});

module.exports = router;
