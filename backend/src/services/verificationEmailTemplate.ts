/** A self-contained email: no remote images, fonts, or application links required. */
export function verificationEmailTemplate(code: string, expiresInMinutes: number) {
  if (!/^\d{6}$/.test(code) || !Number.isInteger(expiresInMinutes) || expiresInMinutes < 1) {
    throw new Error('Invalid verification email content');
  }
  const expiry = `${expiresInMinutes} minute${expiresInMinutes === 1 ? '' : 's'}`;
  return {
    subject: 'Your CivicTrack verification code',
    text: `CivicTrack — Verify your email\n\nYour CivicTrack email verification code is ${code}. It expires in ${expiry}.\n\nReturn to the CivicTrack registration screen and enter this code to continue creating your account. Use the most recent code if you requested another email.\n\nDo not share this code with anyone. If you did not request it, you can safely ignore this email.\n\nCivicTrack | Cleaner cities. Brighter tomorrows.`,
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Verify your email — CivicTrack</title>
<style>@media(prefers-color-scheme:dark){.email-bg{background-color:#18181b!important}.email-card{background-color:#242427!important;border-color:#3f3f46!important}.email-heading{color:#fafafa!important}.email-copy{color:#d4d4d8!important}.email-muted{color:#a1a1aa!important}.email-code{background-color:#3a2022!important;border-color:#744044!important;color:#fecaca!important}.email-divider{border-color:#3f3f46!important}.email-brand{color:#fca5a5!important}}</style></head>
<body class="email-bg" style="margin:0;padding:0;background-color:#f5f5f4;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Confirm your email to finish creating your CivicTrack account. Your code expires in ${expiry}.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:20px;overflow:hidden;">
<tr><td style="height:5px;background-color:#b71c1c;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 24px 22px;"><span class="email-brand" style="color:#b71c1c;font-size:23px;font-weight:700;letter-spacing:-0.6px;">CivicTrack</span><br><span class="email-muted" style="display:inline-block;padding-top:6px;color:#52525b;font-size:12px;line-height:18px;">Cleaner cities. Brighter tomorrows.</span></td></tr>
<tr><td style="padding:0 24px 28px;">
<p class="email-brand" style="margin:0 0 10px;color:#7f1416;font-size:11px;font-weight:700;letter-spacing:1.4px;">ACCOUNT VERIFICATION</p>
<h1 class="email-heading" style="margin:0 0 12px;color:#18181b;font-size:28px;line-height:35px;letter-spacing:-0.7px;">Your next step: verify your email.</h1>
<p class="email-copy" style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:24px;">Enter this six-digit code on the CivicTrack registration screen to continue creating your account.</p>
<table role="presentation" class="email-code" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#7f1416;"><tr><td align="center" style="padding:22px 8px;">
<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.5px;">YOUR VERIFICATION CODE</p>
<p dir="ltr" style="margin:0;font-family:'Courier New',monospace;font-size:36px;font-weight:700;line-height:44px;letter-spacing:6px;white-space:nowrap;">${code}</p>
<p style="margin:10px 0 0;font-size:13px;line-height:20px;">Expires in ${expiry}</p>
</td></tr></table>
<p class="email-muted" style="margin:16px 0 0;color:#52525b;font-size:13px;line-height:21px;">Requested another code? Use the most recent email.</p>
</td></tr>
<tr><td class="email-divider" style="padding:20px 24px;border-top:1px solid #e4e4e7;"><p class="email-heading" style="margin:0 0 6px;color:#18181b;font-size:13px;font-weight:700;line-height:20px;">Keep this code private.</p><p class="email-muted" style="margin:0;color:#52525b;font-size:12px;line-height:20px;">Do not share it with anyone. If you didn’t request this email, you can safely ignore it.</p></td></tr>
</table>
<p class="email-muted" style="margin:20px 0 0;color:#52525b;font-size:12px;line-height:20px;">CivicTrack &middot; Email verification</p>
</td></tr></table></body></html>`,
  };
}
