/**
 * Dashboard routes
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db/index');
const { listPages } = require('../db/pages');
const { buildLandingContext } = require('../lib/landing-context');

/**
 * GET /dashboard - Render dashboard with pages in progress and shipped
 */
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const allPages = await listPages(client);

    // Group pages by status
    const pagesInProgress = allPages.filter((p) =>
      ['pending', 'generating'].includes(p.status)
    );
    const pagesShipped = allPages.filter((p) => p.status === 'shipped');

    const context = buildLandingContext();
    context.pagesInProgress = pagesInProgress;
    context.pagesShipped = pagesShipped;

    res.render('dashboard', context);
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).render('error', { message: 'Failed to load dashboard' });
  } finally {
    client.release();
  }
});

module.exports = router;
