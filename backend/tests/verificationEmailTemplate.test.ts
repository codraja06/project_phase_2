import { verificationEmailTemplate } from '../src/services/verificationEmailTemplate';

describe('verification email content', () => {
  it('preserves leading zeros and supplies the same code in accessible plain text and HTML', () => {
    const email = verificationEmailTemplate('004291', 5);
    expect(email.subject).toBe('Your CivicTrack verification code');
    expect(email.text).toContain('code is 004291. It expires in 5 minutes.');
    expect(email.html).toContain('>004291</p>');
    expect(email.text).toContain('Do not share this code');
    expect(email.html).toContain('Keep this code private.');
    expect(email.html).toContain('name="viewport"');
    expect(email.html).not.toMatch(/<script|<img|https?:\/\//i);
  });

  it('uses the actual configured validity period in both versions', () => {
    const email = verificationEmailTemplate('004291', 1);
    expect(email.text).toContain('expires in 1 minute.');
    expect(email.html).toContain('Expires in 1 minute</p>');
    expect(email.html).not.toContain('5 minutes');
  });

  it.each([['<code>', 5], ['1234567', 5], ['12345', 5], ['123456', 0], ['123456', 1.5]])(
    'rejects invalid template input (%s, %s) instead of rendering it', (code, minutes) => {
      expect(() => verificationEmailTemplate(String(code), Number(minutes))).toThrow('Invalid verification email content');
    },
  );
});
