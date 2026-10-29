# OTP registration and complaint-resolution delivery

This change extends the existing Express/Mongoose, Expo and WebSocket implementation.
It does not replace authentication, dashboards, complaint decisions, AI or GPS.

## Configure the existing backend

1. Run `npm install` in `backend` for Nodemailer and its TypeScript definitions.
2. Edit the ignored `backend/.env` directly. Never paste credentials into chat,
   commit them, put them in Expo variables, or enable SMTP protocol debug logging.
   Replace any exposed app password or provider token before use.
3. Set a stable, random `JWT_SECRET`. Production requires at least 32 characters.
   An optional independent `OTP_HASH_SECRET` protects OTP/contact hashes; otherwise
   the JWT key is used. All replicas must share the same keys. Changing a key
   invalidates pending verification sessions; changing the JWT key invalidates login tokens.
4. Configure the following values, then restart the backend using its existing
   `npm run dev` or `npm run build` followed by `npm start` commands.

| Variable | Meaning/default |
| --- | --- |
| `SMTP_HOST` | SMTP server hostname; required for new password registration |
| `SMTP_PORT` | 587 by default; required STARTTLS. Port 465 uses implicit TLS |
| `SMTP_USER`, `SMTP_PASS` | Sender's SMTP login and current provider credential |
| `EMAIL_FROM` | Provider-authorized sending address |
| `OTP_EXPIRY_MINUTES` | Exactly 5; other durations are rejected |
| `OTP_RESEND_COOLDOWN_SECONDS` | 60; may be increased up to 3600 |
| `OTP_MAX_ATTEMPTS` | 5; may be reduced to 1–4 |
| `OTP_HOURLY_LIMIT` | 5 requests/contact/hour; accepted range 1–10 |
| `OTP_REQUIRE_PHONE` | false by default; true requires separate SMS verification for password sign-up |
| `SMS_PROVIDER` | Empty disables SMS; set `twilio` to enable |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Backend-only Twilio account credentials |
| `TWILIO_FROM` | The actual Twilio SMS sender, e.g. a provisioned E.164 number |
| `DELIVERY_WORKER_ENABLED` | true unless explicitly false |

The README backend configuration example keeps credential placeholders empty. All active settings live in the single `backend/.env` file. Empty settings use documented
defaults where available; empty SMTP credentials do not simulate sending.

For Gmail, set `SMTP_HOST` to `smtp.gmail.com`, port 587, and use your actual
sender address for `SMTP_USER` and `EMAIL_FROM`. Generate a new app password in
an eligible Google account with 2-Step Verification. App-password availability
depends on account security and organization settings. See
[Google's app-password guide](https://support.google.com/accounts/answer/185833).
Use [Nodemailer's SMTP guide](https://nodemailer.com/smtp) for another SMTP provider.

For SMS, use a sender authorized by your Twilio account, enable the destination
and complete the provider's account/sender setup. Trial accounts may restrict
recipients. The submitted citizen phone must include `+` and its country code.
`TWILIO_PHONE_NUMBER` is not read by this implementation; use `TWILIO_FROM`.
See [Twilio's Messages API](https://www.twilio.com/docs/messaging/api/message-resource).
Provider configuration alone does not verify a citizen phone or grant SMS consent.

### If a code appeared on screen but no SMS arrived

A former development fallback displayed/returned a code and marked email delivery
as sent without contacting a provider. That fallback and its logging/autofill have
been removed. `NODE_ENV=development` and the obsolete `ALLOW_DEV_OTP` setting cannot
enable it. Missing or example credentials now produce a setup error, never a code.

`your_gmail@gmail.com`, `your_new_gmail_app_password`, `your_twilio_account_sid`,
`your_new_twilio_auth_token` and `+your_authorized_twilio_number` are examples, not
working values. Obtain actual sender credentials from your provider and enter them
privately in `backend/.env`. SMTP is required for this email-based sign-up flow.
SMS additionally needs `SMS_PROVIDER=twilio`, the real account credentials and an
authorized Twilio sender with a country code. The citizen's receiving number is
entered in the sign-up form; it is not the `TWILIO_FROM` sender setting.

The backend now retains a provider acceptance reference before allowing contact
verification. Old pending sessions without this reference are rejected; existing
user/complaint records are preserved. After updating settings, restart the backend,
reload the app and begin a new registration. A code displayed by the former fallback
does not establish email or phone possession and cannot be used to complete signup.

Verified sessions are no longer deleted before account creation succeeds. A
temporary account-save failure releases an atomic completion claim so the citizen
can retry without reusing the OTP. Duplicate details consistently offer sign-in or
changing registration details. A stale completion claim can be retried after two
minutes; completed accounts remain protected by the existing unique indexes.

## Registration API and interface

Before submission the sign-up screen calls `GET /api/auth/signup/options` for
`emailAvailable`, `smsAvailable` and `phoneVerificationRequired`. These are safe
configuration flags, not a guarantee that the provider will accept a message.
If a required channel is unavailable, the screen explains that no code can be sent
and disables the OTP request. Email-only registration explicitly says that no SMS
will be sent. A retry control refreshes availability after a connection/setup issue.
The backend still rechecks delivery and eligibility on every request.

The original sign-up form sends name, email, phone and password to:

```text
POST /api/auth/signup/request-otp
{ name, email, phone, password }

202 data: { challengeId, expiresAt, resendAvailableAt, smsStatus, phoneVerificationRequired }

POST /api/auth/signup/verify-otp
{ challengeId, channel: "email" | "sms", code: "six digits" }

200 data: { emailVerified, phoneVerified }

POST /api/auth/signup/complete
{ challengeId }

201 data: { user, token }

POST /api/auth/signup/resend-otp
{ challengeId }

202 data: new challengeId and timing/delivery metadata
```

The frontend reuses its existing authentication context and dashboard navigation.
The verification step supports numeric entry/paste, keyboard submit, expiry,
resend countdown, loading/errors, optional separate SMS entry, and changing details.
Pending challenge IDs stay in memory; passwords are cleared from the form after
request success. OTPs and pending credentials are not written to client storage.
After a final request timeout, try signing in before starting another registration.

Email is always required. Phone is marked verified only after its own SMS OTP,
independent of email verification. If optional SMS fails, the UI says so and email
can continue. If required SMS fails or is unconfigured, registration cannot finish.
There is no production OTP bypass, hardcoded code, fake sender, or fallback success.

`POST /api/auth/register` now accepts a verified `challengeId` as a compatibility
alias for completion. Old clients posting raw registration fields must be updated;
accepting those fields would bypass required verification. Password login and
existing Google sign-in/linking remain supported. A Google identity marks email
verified only after the existing backend validates Google's verified-email claim.
The phone-OTP requirement applies to this password sign-up flow; existing Google
registration retains its verified-email identity flow and does not verify phones.

Secure random six-digit codes are HMAC-SHA256 hashed with a server key and bound
to the opaque 256-bit challenge and channel. Pending passwords are bcrypt hashes.
Correct code consumption, attempt increments, quota claims and completion use
atomic MongoDB operations. A consumed challenge cannot create another account.
Prior challenges are invalidated before issuing a replacement.

OTP requests do not disclose whether a contact has an account. Eligibility is
checked only after required contact verification. A verified email's owner gets
an explicit existing-account message and a primary sign-in action, while a phone
conflict stays generic because optional email verification does not prove phone
ownership. This never creates a duplicate account or changes an existing password.
An optional SMS failure is informational: a new email can still complete registration.
Phone digits are compared against canonical new records and formatted legacy
values. When SMS is enabled, full E.164 input is required. Without a country code,
local numbers cannot be matched to every possible international representation.
There are persistent contact limits, plus IP limits of 60 requests/hour and 300
verify/complete calls/hour, subject to the existing 200 requests/15min API cap.
The existing IP limiter is process-local; contact/OTP limits persist in MongoDB.

Codes expire after five minutes using server time, regardless of MongoDB TTL
cleanup timing. Pending sessions can be resent for up to 15 minutes; successful
email verification gives five minutes to finish registration. TTL indexes clear
pending sessions and two-hour contact-throttle records. Successful completion
deletes the pending password/contact record. Resend starts a fresh challenge.

## Resolution and notification preferences

Authority-only `PATCH /api/authority/complaints/:id/status` keeps the existing
transition/review rules and compare-and-set status update. Entering Resolved
atomically stores the resolution timestamp and an outbox-pending flag. A repeated
Resolved save creates no event or sends. No notification code changes status.

The citizen gets the requested exact **Complaint Resolved** title/message,
category, resolution time and a complaint-details action. The existing recipient
notification collection, authenticated WebSocket update signal and unread badge
are reused. Fetch/read endpoints remain:

```text
GET   /api/management/notifications
PATCH /api/management/notifications/:id/read
PUT   /api/auth/notification-preferences
      { email: boolean, sms: boolean }
```

All use the authenticated account. Supplied recipient IDs are not trusted.
The preference endpoint records server-side SMS consent time only when explicitly
enabled; disabling SMS clears it. Changing the phone clears phone verification
and SMS consent. Existing local SMS settings are not imported as consent.

Email and SMS use the requested subject/body and actual stored complaint fields.
HTML is escaped; email includes plain text. External channels require verified
contacts, enabled preferences and configured providers; SMS also needs saved
consent and E.164 format. Missing requirements produce a visible Skipped reason.
Delivery eligibility is checked again immediately before sending.

## Durable worker and delivery limits

No Redis or additional service is required. `NotificationDelivery` records use
unique complaint-transition/channel keys. The Node worker runs every five seconds,
reconciles unresolved outbox flags and atomically claims due jobs with a two-minute
lease. Multiple workers can share MongoDB without claiming the same job normally.
An enqueue outage does not undo the complaint; the durable flag lets it recover.

| State | Meaning |
| --- | --- |
| Pending | Queued and eligible when created |
| Processing | Claimed by a worker |
| Sent | SMTP/Twilio accepted; the UI says “Accepted by provider” |
| Retry Scheduled | Definite temporary rejection; exponentially delayed retry |
| Failed | Permanent rejection, exhausted five attempts, or uncertain acceptance |
| Skipped | Unverified/missing contact, preference/consent absent, or provider missing |

Temporary failures retry after 1, 2, 4 and 8 minutes, up to five total attempts.
Safe error codes are stored; raw provider errors, OTPs and credentials are not.
Retries do not create new in-app events. A stable SMTP Message-ID aids investigation.

SMTP and the Twilio message-create request do not give this application a universal
exactly-once delivery guarantee. A timeout after possible acceptance, or a worker
crash with an expired Processing lease, becomes Failed with
`delivery_outcome_unknown_manual_review`; it is not blindly resent. An administrator
must reconcile the provider record before arranging any manual retry. There is no
automatic/manual retry endpoint exposed to citizens. Sent is not a delivery receipt;
inbox/handset confirmation and provider status callbacks are not implemented.

Keep at least one persistent worker-enabled backend process running. On request-only
or scale-to-zero hosting, configure an always-running instance for this worker.
Existing cross-instance WebSocket broadcasting and closed-app push limitations remain.
Jobs already marked Skipped are not automatically replayed when configuration changes.

## MongoDB rollout: additive, no destructive migration

- Users gain `emailVerifiedAt`, `phoneVerifiedAt`, optional `phoneNormalized` and
  server-owned notification preferences. Existing users remain unverified unless
  a trusted verification flow establishes possession; existing passwords still work.
- A partial unique index on string `phoneNormalized` protects canonical new entries.
  Do not bulk-fill it on old records: legacy phone duplicates must remain intact.
- New collections: `signupchallenges`, `signupthrottles`, `notificationdeliveries`.
  OTP/throttle TTL and unique event/contact indexes must be created before traffic.
- Complaints gain optional resolution-notice fields and a status/pending index;
  notifications gain optional resolution metadata. Old complaints are not replayed.
- Startup waits for Mongoose model initialization and declared indexes with the
  existing default index configuration.
  If deployment disables auto-indexing, explicitly run `createIndexes()` on User,
  SignupChallenge, SignupThrottle, NotificationDelivery, Complaint and Notification
  in your controlled database rollout. Do not run destructive `syncIndexes()` or
  delete old data. Resolve any pre-existing conflicting manually added canonical
  phone fields before enabling the unique index.
- Roll out backend and updated app together because raw registration is closed.

Legacy password accounts have no new contact-verification settings screen in this
scope; they receive in-app notices, while unverified external channels are skipped.
An existing account can establish verified email by its supported authenticated
Google-linking flow. Merely enabling a preference never verifies contact possession.

## Changed files for this request

Existing UI-restoration edits were already present and are preserved. This request adds:

| Area | Files |
| --- | --- |
| OTP and preferences controllers | `backend/src/controllers/signupController.ts`, `notificationPreferencesController.ts` |
| Provider/worker services | `backend/src/services/contactDeliveryService.ts`, `resolutionDeliveryService.ts` |
| New persistence | `backend/src/models/SignupChallenge.ts`, `NotificationDelivery.ts` |
| Existing backend integration | `config/env.ts`, `controllers/authController.ts`, `authorityController.ts`, `managementController.ts`, `middleware/errorHandler.ts`, `rateLimiter.ts`, `models/User.ts`, `Complaint.ts`, `Notification.ts`, `routes/authRoutes.ts`, `server.ts`, `services/notificationService.ts`, `services/aiService.ts`, `utils/apiError.ts`, `validators/authValidator.ts` under `backend/src` |
| Existing API UI integration | `mobile/src/api/authApi.ts`, `managementApi.ts`, `axiosClient.ts`, `types/auth.ts`, `validation/schemas.ts` |
| Existing citizen UI + new verification step | `mobile/src/screens/auth/CitizenRegisterScreen.tsx`, `SignupVerificationScreen.tsx`, `screens/citizen/ProfileScreen.tsx`, `components/NotificationCenter.tsx`, `NotificationItem.tsx` |
| Tests | `backend/tests/signupVerification.test.ts`, `resolutionDelivery.test.ts`, `contactDelivery.test.ts`; updated `auth.test.ts` and `setup-env.ts`, cleanup in `masterUpgrade.test.ts` and `features7to12.test.ts`; mobile `tests/e2e/otp-notifications.cjs`, `otp-live.cjs`, existing runner/fixtures and delivery-job cleanup in live suites |
| Setup/docs | `backend/package.json`, `package-lock.json`, the single ignored `backend/.env`, `README.md`, this guide and the verification report |

The AI-service adapter change retains its explicit missing-model message while
the global handler suppresses raw server errors. No model or prediction rule changed.

Run instructions and actual evidence are in [the verification report](OTP_NOTIFICATIONS_VERIFICATION.md).
