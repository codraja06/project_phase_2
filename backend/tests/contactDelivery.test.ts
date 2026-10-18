import nodemailer from 'nodemailer';
import axios from 'axios';
import { env } from '../src/config/env';
import { sendEmail, sendSms, emailConfigured, smsConfigured } from '../src/services/contactDeliveryService';

describe('Real provider adapters using mocked network transports', () => {
  const original = { ...env };
  const sendMail = jest.fn(), close = jest.fn();
  beforeEach(() => {
    Object.assign(env, { SMTP_HOST: 'smtp.example.test', SMTP_PORT: 587, SMTP_USER: 'fixture-user', SMTP_PASS: 'fixture-only', EMAIL_FROM: 'test@example.test', SMS_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'fixture-account', TWILIO_AUTH_TOKEN: 'fixture-only', TWILIO_FROM: '+15005550006' });
    sendMail.mockReset(); close.mockReset();
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail, close } as any);
  });
  afterEach(() => { Object.assign(env, original); jest.restoreAllMocks(); });
  it('requires actual configuration and enables encrypted SMTP with logging and external file/URL loading disabled', async () => {
    expect(emailConfigured()).toBe(true); env.SMTP_PASS = ''; expect(emailConfigured()).toBe(false);
    await expect(sendEmail('to@example.test', 'subject', 'text', '<p>text</p>', 'event')).rejects.toMatchObject({ code: 'provider_not_configured' });
    expect(nodemailer.createTransport).not.toHaveBeenCalled(); env.SMTP_PASS = 'fixture-only';
    sendMail.mockResolvedValue({ accepted: ['to@example.test'], messageId: 'accepted-id' });
    expect(await sendEmail('to@example.test', 'subject', 'text', '<p>text</p>', 'event:1')).toBe('accepted-id');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ requireTLS: true, secure: false, logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ text: 'text', html: '<p>text</p>', messageId: '<event-1@civictrack.local>' })); expect(close).toHaveBeenCalledTimes(1);
  });
  it.each([
    [{ responseCode: 451, message: 'sensitive-provider-error' }, true, false],
    [{ responseCode: 535, code: 'EAUTH', message: 'sensitive-provider-error' }, false, false],
    [{ code: 'ETIMEDOUT', command: 'DATA', message: 'sensitive-provider-error' }, false, true],
  ])('classifies SMTP failures without exposing the raw provider error', async (failure, retryable, uncertain) => {
    sendMail.mockRejectedValue(failure);
    await expect(sendEmail('to@example.test', 'subject', 'text', '<p>text</p>', 'event')).rejects.toMatchObject({ retryable, uncertain });
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('does not claim SMTP success when the provider accepts no recipients', async () => {
    sendMail.mockResolvedValue({ accepted: [], messageId: 'rejected-id' });
    await expect(sendEmail('to@example.test', 'subject', 'text', '<p>text</p>', 'event')).rejects.toMatchObject({ code: 'provider_rejected' });
  });
  it('rejects pasted example placeholders and an SMS sender without an international country code', () => {
    env.SMTP_USER = 'your_gmail@gmail.com'; env.SMTP_PASS = 'your_new_gmail_app_password';
    expect(emailConfigured()).toBe(false);
    env.TWILIO_ACCOUNT_SID = 'your_twilio_account_sid'; expect(smsConfigured()).toBe(false);
    env.TWILIO_ACCOUNT_SID = 'fixture-account'; env.TWILIO_FROM = '9876543210'; expect(smsConfigured()).toBe(false);
  });
  it('posts the actual Twilio API format, validates E.164, and distinguishes accepted from missing provider setup', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: { sid: 'accepted-sms', status: 'queued' } });
    expect(smsConfigured()).toBe(true); expect(await sendSms('+919876543210', 'Message')).toBe('accepted-sms');
    expect(post).toHaveBeenCalledWith('https://api.twilio.com/2010-04-01/Accounts/fixture-account/Messages.json', 'To=%2B919876543210&From=%2B15005550006&Body=Message', expect.objectContaining({ timeout: 15000, maxRedirects: 0 }));
    await expect(sendSms('9876543210', 'Message')).rejects.toMatchObject({ code: 'phone_requires_e164' });
    env.TWILIO_AUTH_TOKEN = ''; expect(smsConfigured()).toBe(false); await expect(sendSms('+919876543210', 'Message')).rejects.toMatchObject({ code: 'provider_not_configured' });
    expect(post).toHaveBeenCalledTimes(1);
  });
  it.each([[429, true, false], [401, false, false], [503, false, true]])('classifies Twilio HTTP %i safely', async (status, retryable, uncertain) => {
    jest.spyOn(axios, 'post').mockRejectedValue({ response: { status }, message: 'sensitive-provider-error' });
    await expect(sendSms('+919876543210', 'Message')).rejects.toMatchObject({ retryable, uncertain });
  });
});
