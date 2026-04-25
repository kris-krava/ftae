// HTML for the username-change confirmation email. Mirrors the visual
// pattern of the Supabase Auth templates we customized (Rock Salt
// wordmark, all-caps subtitle, body, button, fallback link, footer
// disclaimer + tagline). Inline styles only — most email clients strip
// <style> blocks.

interface TemplateInput {
  newUsername: string;
  confirmUrl: string;
}

export const CONFIRM_USERNAME_CHANGE_SUBJECT = 'Confirm your new username — Free Trade Art Exchange';

export function renderConfirmUsernameChangeHtml({ newUsername, confirmUrl }: TemplateInput): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Rock+Salt&display=swap');
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f2d2c8; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2d2c8; padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; background-color:#ffffff; border-radius:12px; padding:40px 32px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-family:'Rock Salt', 'Brush Script MT', cursive; font-weight:400; font-size:32px; line-height:44px; color:#333333;">
                Free Trade Art Exchange
              </span>
            </td>
          </tr>
          <tr>
            <td align="center" style="font-size:12px; font-weight:600; letter-spacing:2px; line-height:18px; color:#6d6360; padding-bottom:24px;">
              CHANGE USERNAME
            </td>
          </tr>
          <tr>
            <td style="font-size:16px; line-height:26px; color:#333333; padding-bottom:32px;">
              You&rsquo;re updating your FTAE username to <strong style="color:#333333;">@${escapeHtml(newUsername)}</strong>. Tap the button below to confirm. This single-use link will work once and expire in an hour.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${escapeHtml(confirmUrl)}" style="display:inline-block; background-color:#c45c3a; color:#ffffff; font-family:'Inter', sans-serif; font-weight:600; font-size:16px; line-height:24px; padding:14px 32px; border-radius:8px; text-decoration:none;">
                Confirm new username
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px; line-height:20px; color:#6d6360; padding-bottom:8px;">
              If the button doesn&rsquo;t work, paste this into your browser:
            </td>
          </tr>
          <tr>
            <td style="font-size:13px; line-height:20px; padding-bottom:24px; word-break:break-all;">
              <a href="${escapeHtml(confirmUrl)}" style="color:#c45c3a; text-decoration:underline;">${escapeHtml(confirmUrl)}</a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #d0b2aa; padding-top:20px; font-size:13px; line-height:20px; color:#6d6360;">
              You&rsquo;re receiving this because someone (hopefully you) requested to change your FTAE username. If it wasn&rsquo;t you, don&rsquo;t click the link &mdash; your username won&rsquo;t change without confirmation. Email me right away so I can secure your account &mdash; <a href="mailto:help@freetradeartexchange.com" style="color:#c45c3a; text-decoration:underline;">help@freetradeartexchange.com</a>.
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; padding-top:24px;">
          <tr>
            <td align="center" style="font-family:'Inter', sans-serif; font-size:12px; line-height:18px; color:#6d6360;">
              Trade art you&rsquo;ve made for the art you love.<br>
              <a href="https://freetradeartexchange.com" style="color:#6d6360; text-decoration:underline;">freetradeartexchange.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Defense against any caller passing user input into the template — both
// fields are validated upstream, but a misuse here would inject HTML.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
