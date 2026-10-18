import nodemailer from 'nodemailer';
import axios from 'axios';
import { env } from '../config/env';

export class DeliveryError extends Error {
  constructor(public code: string, public retryable = false, public uncertain = false) { super(code); }
}
const configuredValue = (value: string) => Boolean(value.trim()) && !/^(?:your[_-]|replace[_-]|change[_-]|<|\$\{)/i.test(value.trim());
export const emailConfigured = () => [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS, env.EMAIL_FROM].every(configuredValue) && Number.isInteger(env.SMTP_PORT) && env.SMTP_PORT > 0 && env.SMTP_PORT < 65536;
export const smsConfigured = () => env.SMS_PROVIDER === 'twilio' && [env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN].every(configuredValue) && /^\+[1-9]\d{7,14}$/.test(env.TWILIO_FROM);
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export async function sendEmail(to: string, subject: string, text: string, html: string, id: string) {
  if (!emailConfigured()) throw new DeliveryError('provider_not_configured');
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    const info = await transport.sendMail({ from: env.EMAIL_FROM, to, subject, text, html,
      // Stable message ID aids reconciliation; SMTP does not promise deduplication.
      messageId: `<${id.replace(/[^a-zA-Z0-9.-]/g, '-') }@civictrack.local>` });
    if (!info.accepted?.length) throw new DeliveryError('provider_rejected');
    return String(info.messageId);
  } catch (error: any) {
    if (error instanceof DeliveryError) throw error;
    const temporary = error.command === 'CONN' || (error.responseCode >= 400 && error.responseCode < 500);
    const definite = temporary || error.responseCode >= 500 || ['EAUTH', 'EENVELOPE'].includes(error.code);
    throw new DeliveryError(definite ? 'provider_rejected' : 'delivery_outcome_unknown', temporary, !definite);
  } finally { transport.close(); }
}

export async function sendSms(to: string, body: string) {
  if (!smsConfigured()) throw new DeliveryError('provider_not_configured');
  if (!/^\+[1-9]\d{7,14}$/.test(to)) throw new DeliveryError('phone_requires_e164');
  try {
    const response = await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID)}/Messages.json`,
      new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: body }).toString(), {
        auth: { username: env.TWILIO_ACCOUNT_SID, password: env.TWILIO_AUTH_TOKEN },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000, maxRedirects: 0,
      });
    if (!response.data.sid || ['failed', 'undelivered'].includes(response.data.status)) throw new DeliveryError('provider_rejected');
    return String(response.data.sid);
  } catch (error: any) {
    if (error instanceof DeliveryError) throw error;
    const status = error.response?.status;
    const retryable = status === 429 || ['ECONNREFUSED', 'ENOTFOUND'].includes(error.code);
    const definite = retryable || status >= 400 && status < 500;
    throw new DeliveryError(definite ? 'provider_rejected' : 'delivery_outcome_unknown', retryable, !definite);
  }
}
