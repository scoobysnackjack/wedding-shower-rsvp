const express = require('express');
const { supabase, requireSupabase } = require('../config/supabase');

const router = express.Router();
router.use(requireSupabase);

router.get('/guest', async (req, res, next) => {
  try {
    const guestId = req.query.guest_id;
    if (!guestId) return res.status(400).json({ error: 'guest_id is required' });

    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Guest not found' });
      throw error;
    }

    res.json({
      id: guest.id,
      name: guest.name,
      response: guest.response,
      responded_at: guest.responded_at,
      total_invited: guest.total_invited || 1,
      attending_count: guest.attending_count || 0,
      already_responded: guest.response != null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/submit', async (req, res, next) => {
  try {
    const { guest_id: guestId, response, attending_count: attendingCountRaw } = req.body;
    if (!guestId) return res.status(400).json({ error: 'guest_id is required' });
    if (!response || !['yes', 'no'].includes(response)) {
      return res.status(400).json({ error: 'response must be "yes" or "no"' });
    }

    const { data: current, error: fetchError } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Guest not found' });
      throw fetchError;
    }

    if (current.response != null) {
      return res.status(409).json({
        error: 'Already responded',
        response: current.response,
        attending_count: current.attending_count || 0,
      });
    }

    const maxInvites = Math.max(1, Number.parseInt(String(current.total_invited || 1), 10));
    let attendingCount = 0;
    if (response === 'yes') {
      const parsedAttending = Number.parseInt(String(attendingCountRaw || 1), 10);
      if (!Number.isFinite(parsedAttending) || parsedAttending < 1 || parsedAttending > maxInvites) {
        return res.status(400).json({ error: `attending_count must be between 1 and ${maxInvites}` });
      }
      attendingCount = parsedAttending;
    }

    let { data: updated, error: updateError } = await supabase
      .from('guests')
      .update({
        response,
        attending_count: attendingCount,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', guestId)
      .select('id, name, response, responded_at, attending_count, total_invited')
      .single();

    if (updateError && isMissingColumnError(updateError, 'attending_count')) {
      const fallback = await supabase
        .from('guests')
        .update({
          response,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', guestId)
        .select('id, name, response, responded_at')
        .single();
      updated = {
        ...fallback.data,
        attending_count: response === 'yes' ? attendingCount : 0,
        total_invited: maxInvites,
      };
      updateError = fallback.error;
    }
    if (updateError) throw updateError;

    res.json({ success: true, guest: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

function isMissingColumnError(err, columnName) {
  if (!err || !err.message) return false;
  const msg = String(err.message).toLowerCase();
  return (
    msg.includes(`column guests.${columnName}`.toLowerCase()) ||
    msg.includes(`could not find the '${columnName}' column`)
  );
}
