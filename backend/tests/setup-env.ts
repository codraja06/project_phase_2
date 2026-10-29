// Tests must never connect to the application's configured database.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/civictrack_isolated_test';
process.env.JWT_SECRET = 'isolated-test-signing-key-not-used-by-application';
process.env.OTP_HASH_SECRET = 'isolated-otp-test-hash-key-not-for-production';
process.env.OTP_EXPIRY_MINUTES = '5';
process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';
process.env.OTP_MAX_ATTEMPTS = '5';
process.env.OTP_HOURLY_LIMIT = '5';
process.env.OTP_REQUIRE_PHONE = 'false';
process.env.DELIVERY_WORKER_ENABLED = 'false';
process.env.RESOLUTION_TARGET_HOURS = '';
// Never inherit real delivery credentials from backend/.env in automated tests.
for (const name of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'SMS_PROVIDER', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'ALLOW_DEV_OTP']) process.env[name] = '';
