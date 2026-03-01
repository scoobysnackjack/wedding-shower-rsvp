const { parsePhoneNumberFromString, isValidPhoneNumber } = require('libphonenumber-js');

const DEFAULT_COUNTRY = 'US';

function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, e164: null, error: 'Phone number is required' };
  }
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!trimmed) {
    return { valid: false, e164: null, error: 'Phone number is empty' };
  }

  let parsed = parsePhoneNumberFromString(trimmed, DEFAULT_COUNTRY);
  if (!parsed) {
    const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
    parsed = parsePhoneNumberFromString(withPlus, DEFAULT_COUNTRY);
  }
  if (!parsed) {
    return { valid: false, e164: null, error: 'Invalid phone number format' };
  }
  if (!isValidPhoneNumber(parsed.number)) {
    return { valid: false, e164: null, error: 'Invalid phone number' };
  }
  return { valid: true, e164: parsed.format('E.164') };
}

module.exports = { normalizePhone };
