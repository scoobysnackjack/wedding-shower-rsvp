const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { supabase, requireSupabase } = require('../config/supabase');
const { normalizePhone } = require('../utils/phone');
const { adminAuth } = require('../middleware/adminAuth');
const { sendSmsInvites } = require('../services/smsSender');

const router = express.Router();
router.use(requireSupabase);

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', adminAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'CSV file is required' });

    const raw = req.file.buffer.toString('utf-8');
    let rows;
    try {
      rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid CSV format', detail: e.message });
    }

    const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');
    const created = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || row.Name || '').trim();
      const phoneRaw = (row.phone || row.Phone || row.phone_number || '').trim();
      const totalInvitedRaw = row.total_invited || row['Total Invited'] || row.totalInvited || row['total invited'] || '';

      if (!name) {
        errors.push({ row: i + 2, message: 'Missing name' });
        continue;
      }
      const { valid, e164, error: phoneError } = normalizePhone(phoneRaw);
      if (!valid) {
        errors.push({ row: i + 2, name, message: phoneError || 'Invalid phone' });
        continue;
      }

      const totalInvited = parseTotalInvited(totalInvitedRaw);
      if (totalInvited == null) {
        errors.push({ row: i + 2, name, message: 'Invalid Total Invited value (must be a positive whole number)' });
        continue;
      }

      let { data: guest, error } = await supabase
        .from('guests')
        .insert({ name, phone: e164, total_invited: totalInvited })
        .select('id, name, phone, total_invited')
        .single();

      if (error && isMissingColumnError(error, 'total_invited')) {
        const fallback = await supabase
          .from('guests')
          .insert({ name, phone: e164 })
          .select('id, name, phone')
          .single();
        guest = { ...fallback.data, total_invited: 1 };
        error = fallback.error;
      }

      if (error) {
        errors.push({ row: i + 2, name, message: error.message });
        continue;
      }

      const rsvpLink = `${baseUrl}/rsvp?guest_id=${guest.id}`;
      created.push({ ...guest, rsvp_link: rsvpLink });
    }

    res.json({
      created: created.length,
      guests: created,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/send-invites', adminAuth, async (req, res, next) => {
  try {
    const eventTitle = req.body.event_title || "Jesston & Kerston's Couple's Shower";
    const result = await sendSmsInvites(eventTitle);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

function parseTotalInvited(rawValue) {
  if (rawValue == null || String(rawValue).trim() === '') return 1;
  const parsed = Number.parseInt(String(rawValue).trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

function isMissingColumnError(err, columnName) {
  if (!err || !err.message) return false;
  const msg = String(err.message).toLowerCase();
  return (
    msg.includes(`column guests.${columnName}`.toLowerCase()) ||
    msg.includes(`could not find the '${columnName}' column`)
  );
}
