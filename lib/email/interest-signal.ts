function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type InterestSignalEmailInput = {
  studentName: string;
  studentTopInterests: string[];
  studentMessage: string;
  reviewUrl: string;
};

export function buildInterestSignalEmail({
  studentName,
  studentTopInterests,
  studentMessage,
  reviewUrl,
}: InterestSignalEmailInput) {
  const safeStudentName = escapeHtml(studentName);
  const safeMessage = escapeHtml(studentMessage);
  const safeReviewUrl = escapeHtml(reviewUrl);
  const safeInterestList =
    studentTopInterests.length > 0
      ? studentTopInterests.map((interest) => `<li style="margin:0 0 4px;">${escapeHtml(interest)}</li>`).join("")
      : "<li style=\"margin:0;\">No interests listed yet</li>";

  return `
  <div style="background:#f7f6f2;padding:28px 16px;font-family:Inter,Arial,sans-serif;color:#28251d;">
    <div style="max-width:560px;margin:0 auto;background:#fdfcf9;border:1px solid #dad4c7;border-radius:14px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e6e2d9;">
        <p style="margin:0;font-size:20px;line-height:1.2;font-weight:600;">Researcher</p>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;">New interest signal from ${safeStudentName}</h1>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#4f4a40;">
          A student expressed interest in your lab on Researcher.
        </p>
        <h2 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#66635b;">Top Interests</h2>
        <ul style="margin:0 0 18px;padding-left:18px;color:#38352e;font-size:14px;line-height:1.6;">${safeInterestList}</ul>
        <h2 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#66635b;">Why They're Interested</h2>
        <p style="margin:0 0 18px;padding:12px;border:1px solid #dad4c7;border-radius:10px;background:#f7f6f2;font-size:14px;line-height:1.7;color:#38352e;">${safeMessage}</p>
        <a href="${safeReviewUrl}" style="display:inline-block;padding:11px 18px;background:#01696f;color:#f7f6f2;text-decoration:none;border-radius:9px;font-weight:600;">
          Review in Dashboard
        </a>
      </div>
    </div>
  </div>`;
}
