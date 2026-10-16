/**
 * OTP service.
 *
 * In development (default) OTPs are generated and returned/logged so the
 * system is fully testable without an SMS provider.
 *
 * In production, set OTP_PROVIDER and the relevant credentials in .env and
 * implement the send() branch for Twilio / MSG91 / Firebase.
 */

const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '5', 10);

// In-memory OTP store: identifier -> { otp, expiresAt, attempts }
// (A real deployment would use Redis or a DB collection.)
const otpStore = new Map();

const generateOtp = () => {
  // 6-digit numeric OTP
  return String(Math.floor(100000 + Math.random() * 900000));
};

const saveOtp = (identifier, otp) => {
  otpStore.set(identifier, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MINUTES * 60 * 1000,
    attempts: 0
  });
};

const verifyOtp = (identifier, otp) => {
  const record = otpStore.get(identifier);
  if (!record) return { ok: false, reason: 'No OTP was requested for this identifier.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(identifier);
    return { ok: false, reason: 'OTP has expired. Please request a new one.' };
  }
  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(identifier);
    return { ok: false, reason: 'Too many incorrect attempts. Please request a new OTP.' };
  }
  if (record.otp !== String(otp)) {
    return { ok: false, reason: 'Incorrect OTP.' };
  }
  otpStore.delete(identifier);
  return { ok: true };
};

/**
 * "Send" the OTP. In dev mode we just log it and (optionally) return it.
 */
const sendOtp = async (identifier, otp) => {
  const provider = process.env.OTP_PROVIDER || 'dev';

  if (provider === 'dev') {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('Development OTP delivery is disabled in production. Use Firebase email sign-in.');
      error.statusCode = 503;
      throw error;
    }
    console.log(`📲 [DEV OTP] ${identifier} → ${otp}`);
    return { delivered: true, provider: 'dev' };
  }

  // --- Production provider stubs -------------------------------------------
  // if (provider === 'twilio') { ... twilio client ... }
  // if (provider === 'msg91')  { ... msg91 api ... }
  // if (provider === 'firebase') { ... firebase admin ... }
  throw new Error(`OTP provider "${provider}" is not configured yet.`);
};

module.exports = { generateOtp, saveOtp, verifyOtp, sendOtp, OTP_TTL_MINUTES };
