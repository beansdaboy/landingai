/**
 * Users database module - subscription management
 */

/**
 * Find a user by email
 * @param {import('pg').PoolClient} client - Database client
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User record or null
 */
async function findByEmail(client, email) {
  const result = await client.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
};
