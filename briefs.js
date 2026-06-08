/**
 * Brief submission routes
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db/index');
const { createBrief, getPageByUuid, updatePageStatus } = require('../db/pages');
const { generateLandingPage } = require('../lib/agent');
const { buildLandingContext } = require('../lib/landing-context');
const { findByEmail } = require('../db/users');

const PAGES_DIR = path.join(__dirname, '..', 'public', 'pages');

async function requireSubscription(req, res) {
  const email = req.query.email;
  if (!email) {
    return res.redirect('/pricing');
  }
  const client = await pool.connect();
  try {
    const user = await findByEmail(client, email);
    if (!user || user.subscription_status !== 'active') {
      return res.redirect('/pricing');
    }
  } finally {
    client.release();
  }
}

/**
 * POST /briefs - Submit a new brief and start page generation
 */
router.post('/', async (req, res) => {
  await requireSubscription(req, res);
  if (res.headersSent) return;

  const { product_name, description, audience, cta_copy } = req.body;

  const errors = [];
  if (!product_name || product_name.trim().length === 0) {
    errors.push('Product name is required');
  }
  if (!description || description.trim().length === 0) {
    errors.push('Description is required');
  }
  if (!audience || audience.trim().length === 0) {
    errors.push('Audience is required');
  }
  if (!cta_copy || cta_copy.trim().length === 0) {
    errors.push('CTA copy is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const client = await pool.connect();
  try {
    const page = await createBrief(client, {
      product_name: product_name.trim(),
      description: description.trim(),
      audience: audience.trim(),
      cta_copy: cta_copy.trim(),
    });

    generatePageAsync(page.uuid, {
      product_name: product_name.trim(),
      description: description.trim(),
      audience: audience.trim(),
      cta_copy: cta_copy.trim(),
    });

    res.json({
      uuid: page.uuid,
      status_url: `/briefs/${page.uuid}/status`,
    });
  } catch (err) {
    console.error('Error creating brief:', err);
    res.status(500).json({ error: 'Failed to create brief' });
  } finally {
    client.release();
  }
});

/**
 * GET /briefs/:uuid/status - Get current status of a page
 */
router.get('/:uuid/status', async (req, res) => {
  const { uuid } = req.params;

  const client = await pool.connect();
  try {
    const page = await getPageByUuid(client, uuid);

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({
      uuid: page.uuid,
      status: page.status,
      product_name: page.product_name,
      generated_url: page.status === 'shipped' ? `/p/${page.uuid}` : null,
    });
  } catch (err) {
    console.error('Error fetching page status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  } finally {
    client.release();
  }
});

/**
 * GET /briefs/new - Render brief form
 */
router.get('/new', async (req, res) => {
  await requireSubscription(req, res);
  if (res.headersSent) return;

  const context = buildLandingContext();
  res.render('brief-form', context);
});

/**
 * Generate page asynchronously
 * @param {string} uuid - Page UUID
 * @param {Object} brief - Brief data
 */
async function generatePageAsync(uuid, brief) {
  const client = await pool.connect();
  try {
    await updatePageStatus(client, uuid, 'generating');

    const html = await generateLandingPage(brief);

    await savePage(uuid, html);
    await updatePageStatus(client, uuid, 'shipped', uuid);
  } catch (err) {
    console.error('Error generating page:', uuid, err);
    try {
      await updatePageStatus(client, uuid, 'failed');
    } catch (updateErr) {
      console.error('Error updating failed status:', updateErr);
    }
  } finally {
    client.release();
  }
}

/**
 * Save generated HTML to a static file
 * @param {string} uuid - Page UUID
 * @param {string} html - Generated HTML
 */
async function savePage(uuid, html) {
  const pageDir = path.join(PAGES_DIR, uuid);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, 'index.html'), html, 'utf8');
}

module.exports = router;
