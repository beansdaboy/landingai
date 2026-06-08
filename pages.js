/**
 * Pages database module - CRUD operations for landing page briefs
 */

/**
 * Create a new brief submission
 * @param {import('pg').PoolClient} client - Database client
 * @param {{ product_name: string, description: string, audience: string, cta_copy: string }} brief
 * @returns {Promise<Object>} Created page record
 */
async function createBrief(client, brief) {
  const { product_name, description, audience, cta_copy } = brief;

  const uuid = generateUuid();
  const result = await client.query(
    `INSERT INTO pages (uuid, product_name, description, audience, cta_copy, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [uuid, product_name, description, audience, cta_copy]
  );

  return result.rows[0];
}

/**
 * Fetch a page by UUID
 * @param {import('pg').PoolClient} client - Database client
 * @param {string} uuid - Page UUID
 * @returns {Promise<Object|null>} Page record or null
 */
async function getPageByUuid(client, uuid) {
  const result = await client.query(
    'SELECT * FROM pages WHERE uuid = $1',
    [uuid]
  );
  return result.rows[0] || null;
}

/**
 * List pages, optionally filtered by status
 * @param {import('pg').PoolClient} client - Database client
 * @param {string|null} status - Optional status filter
 * @returns {Promise<Array>} Array of page records
 */
async function listPages(client, status = null) {
  let query = 'SELECT * FROM pages';
  const params = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await client.query(query, params);
  return result.rows;
}

/**
 * Update page status and store generated HTML
 * @param {import('pg').PoolClient} client - Database client
 * @param {string} uuid - Page UUID
 * @param {string} status - New status (generating/shipped/failed)
 * @param {string|null} html - Generated HTML (optional)
 * @returns {Promise<Object|null>} Updated page record or null
 */
async function updatePageStatus(client, uuid, status, html = null) {
  let query = 'UPDATE pages SET status = $1, updated_at = NOW()';
  const params = [status];

  if (html !== null) {
    query += ', generated_html = $2';
    params.push(html);
  }

  query += ' WHERE uuid = $' + (params.length + 1) + ' RETURNING *';
  params.push(uuid);

  const result = await client.query(query, params);
  return result.rows[0] || null;
}

/**
 * Generate a UUID v4
 * @returns {string} UUID
 */
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = {
  createBrief,
  getPageByUuid,
  listPages,
  updatePageStatus,
};