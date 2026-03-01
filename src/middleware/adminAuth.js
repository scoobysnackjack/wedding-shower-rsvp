function adminAuth(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Admin not configured (ADMIN_SECRET missing)' });
  }
  const provided = req.query.admin_key || req.headers['x-admin-key'];
  if (provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { adminAuth };
