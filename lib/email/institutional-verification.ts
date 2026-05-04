function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type InstitutionalEmailTemplateProps = {
  verifyUrl: string;
  institutionalEmail: string;
};

export function buildInstitutionalVerificationUrl(appUrl: string, token: string) {
  return `${appUrl}/onboarding/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildInstitutionalVerificationEmail({
  verifyUrl,
  institutionalEmail,
}: InstitutionalEmailTemplateProps) {
  const escapedUrl = escapeHtml(verifyUrl);
  const escapedEmail = escapeHtml(institutionalEmail);

  return `
  <div style="background:#f7f6f2;padding:28px 16px;font-family:Inter,Arial,sans-serif;color:#28251d;">
    <div style="max-width:560px;margin:0 auto;background:#fdfcf9;border:1px solid #dad4c7;border-radius:14px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e6e2d9;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:28px;height:28px;border-radius:8px;background:#01696f1f;display:inline-flex;align-items:center;justify-content:center;color:#01696f;font-weight:700;">R</div>
          <p style="margin:0;font-size:20px;line-height:1.2;font-weight:600;">Researcher</p>
        </div>
      </div>
      <div style="padding:26px 24px;">
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Verify your Researcher affiliation</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#4f4a40;">
          Confirm your institutional email to unlock full access to Researcher.
        </p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4f4a40;">
          Verification email: <strong>${escapedEmail}</strong>
        </p>
        <a href="${escapedUrl}" style="display:inline-block;padding:11px 18px;background:#01696f;color:#f7f6f2;text-decoration:none;border-radius:9px;font-weight:600;">
          Verify affiliation
        </a>
        <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#66635b;">
          This verification link expires in 24 hours.
        </p>
      </div>
    </div>
  </div>`;
}
