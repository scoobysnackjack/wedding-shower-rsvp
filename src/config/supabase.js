const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('SUPABASE_URL or SUPABASE_KEY not set. Guest and RSVP features will fail.');
}

function requireSupabase(req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_KEY.' });
  }
  next();
}

module.exports = { supabase, requireSupabase };
