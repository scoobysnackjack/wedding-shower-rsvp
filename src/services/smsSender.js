const twilio = require('twilio');
const { supabase } = require('../config/supabase');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendSmsInvites(eventTitle) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
  }

  const client = twilio(accountSid, authToken);
  const { data: guests, error } = await supabase.from('guests').select('id, name, phone');
  if (error) throw error;
  if (!guests || guests.length === 0) return { sent: 0, failed: 0, log: [] };

  let sent = 0;
  let failed = 0;
  const log = [];

  for (const guest of guests) {
    const rsvpLink = `${baseUrl}/rsvp?guest_id=${guest.id}`;
    const body = `You're invited to ${eventTitle}! RSVP here: ${rsvpLink}`;
    try {
      await client.messages.create({ body, from: fromNumber, to: guest.phone });
      sent++;
      log.push({ name: guest.name, phone: guest.phone, status: 'success' });
    } catch (err) {
      failed++;
      log.push({ name: guest.name, phone: guest.phone, status: 'failed', error: err.message || String(err) });
    }
    await delay(1000);
  }
  return { sent, failed, log };
}

module.exports = { sendSmsInvites };
