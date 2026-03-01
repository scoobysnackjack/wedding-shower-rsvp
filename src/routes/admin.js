const express = require('express');
const { supabase, requireSupabase } = require('../config/supabase');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();
router.use(adminAuth);
router.use(requireSupabase);

router.get('/guests', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('guests').select('*').order('name');
    if (error) throw error;
    res.json({ guests: data || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const { data: guests, error } = await supabase.from('guests').select('response');
    if (error) throw error;
    const total = (guests || []).length;
    const yes = (guests || []).filter((g) => g.response === 'yes').length;
    const no = (guests || []).filter((g) => g.response === 'no').length;
    res.json({ total, yes, no, not_responded: total - yes - no });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const { data: guests, error } = await supabase.from('guests').select('*').order('name');
    if (error) throw error;
    const header = 'name,phone,total_invited,attending_count,response,responded_at\n';
    const rows = (guests || []).map((g) => {
      const name = escapeCsv(g.name);
      const phone = escapeCsv(g.phone);
      const totalInvited = escapeCsv(g.total_invited || 1);
      const attendingCount = escapeCsv(g.attending_count || 0);
      const response = escapeCsv(g.response || '');
      const respondedAt = g.responded_at ? escapeCsv(new Date(g.responded_at).toISOString()) : '';
      return `${name},${phone},${totalInvited},${attendingCount},${response},${respondedAt}`;
    });
    const csv = header + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rsvp-responses.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

function escapeCsv(value) {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

module.exports = router;
