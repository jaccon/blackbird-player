const crypto = require('crypto');

/**
 * Middleware to authenticate requests using client_id and client_secret.
 * Credentials can be sent via:
 *   - Headers: x-client-id and x-client-secret
 *   - Body: client_id and client_secret
 *   - Query: client_id and client_secret
 */
function authenticate(req, res, next) {
  const clientId =
    req.headers['x-client-id'] ||
    req.body?.client_id ||
    req.query?.client_id;

  const clientSecret =
    req.headers['x-client-secret'] ||
    req.body?.client_secret ||
    req.query?.client_secret;

  if (!clientId || !clientSecret) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing client_id or client_secret',
    });
  }

  const validId = process.env.CLIENT_ID;
  const validSecret = process.env.CLIENT_SECRET;

  // Constant-time comparison to prevent timing attacks
  const idMatch =
    clientId.length === validId.length &&
    crypto.timingSafeEqual(Buffer.from(clientId), Buffer.from(validId));

  const secretMatch =
    clientSecret.length === validSecret.length &&
    crypto.timingSafeEqual(Buffer.from(clientSecret), Buffer.from(validSecret));

  if (!idMatch || !secretMatch) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid client_id or client_secret',
    });
  }

  next();
}

module.exports = { authenticate };
