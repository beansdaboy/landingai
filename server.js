const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
const { pool } = require('./db/index');

const app = express();
const port = process.env.PORT || 3000;

// Fail fast if DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

app.use(express.json());

// Stripe webhook route with raw body parser for signature verification
app.use('/webhook/stripe', require('./routes/stripe'));

// Stripe checkout and success routes
app.use('/', require('./routes/stripe'));

// EJS view engine. Templates live in ./views/ (entry point: layout.ejs).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check endpoint (required for Render)
// Note: Does NOT query database to allow Neon auto-suspend
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.use(cookieParser());

// Serve static files from public folder.
// `index: false` disables auto-serving public/index.html as the directory
// index — `/` always hits the EJS render route below, which is the only
// thing that should ever serve the landing page on this template.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Landing page
app.get('/', (_req, res) => {
  res.render('layout', buildLandingContext());
});

// Brief submission routes
app.use('/briefs', require('./routes/briefs'));

// Dashboard routes
app.use('/dashboard', require('./routes/dashboard'));

// Serve generated landing pages at /p/:uuid
app.use('/p', express.static(path.join(__dirname, 'public', 'pages')));

// Redirect /p/:uuid to the static file
app.get('/p/:uuid', (req, res) => {
  res.redirect(`/p/${req.params.uuid}/index.html`);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
