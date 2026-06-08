// Analytics: PostHog client and helpers
// Owns: PostHog initialization, event tracking helpers
// Does NOT own: Meta Pixel (injected directly in EJS)

const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '';
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com';

function isEnabled() {
  return POSTHOG_PROJECT_ID && POSTHOG_API_KEY;
}

function snippet() {
  return `<script>
    !function(t,e){var n,o;Object.defineProperty(t,e,{get:function(){return n},set:function(o){n=o,queue.push(o),function(t,e){e&&e.__esModule&&(e=e.default);var n=document.createElement("script");n.textContent=e,n.async=!0,document.head.appendChild(n)}(t,o)}})}("posthog",[]);
    posthog.init('${POSTHOG_API_KEY}',{api_host:'${POSTHOG_HOST}',person_profiles:'always',capture_pageview:false});
  </script>`;
}

// Events to fire from EJS templates via inline script blocks
const events = {
  // CTA click — takes button label and destination
  ctaClick: (label, destination) => ({
    event: '$custom CTA Click',
    properties: { label, destination, site: 'landingai' }
  }),
  // Pricing page view
  pricingView: () => ({ event: '$custom Pricing View', properties: { site: 'landingai' } }),
  // Form focus on pricing
  pricingFormFocus: () => ({ event: '$custom Pricing Form Focus', properties: { site: 'landingai' } }),
  // Checkout initiated
  checkoutInitiated: (email) => ({ event: '$custom Checkout Initiated', properties: { email_hash: hashEmail(email), site: 'landingai' } }),
};

// Lightweight email hash for pseudonymous tracking without storing raw emails
function hashEmail(email) {
  if (!email || typeof email !== 'string') return '';
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

module.exports = { isEnabled, snippet, events, POSTHOG_PROJECT_ID, POSTHOG_HOST };