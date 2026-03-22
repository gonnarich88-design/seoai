export interface AlertEmailParams {
  alertType: string;
  brandName: string;
  keywordLabel: string;
  previousValue: string | null;
  currentValue: string;
  providerId: string;
}

export function renderAlertEmail(params: AlertEmailParams): {
  subject: string;
  html: string;
} {
  const { alertType, brandName, keywordLabel, previousValue, currentValue, providerId } = params;

  const subject = `[SEO AI Monitor] ${alertType} - ${brandName} on ${keywordLabel}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
    <h2 style="margin: 0 0 16px; color: #0f172a;">Alert: ${alertType}</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Brand</td>
        <td style="padding: 8px 0; font-weight: 600;">${brandName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Keyword</td>
        <td style="padding: 8px 0; font-weight: 600;">${keywordLabel}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Provider</td>
        <td style="padding: 8px 0; font-weight: 600;">${providerId}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Previous Value</td>
        <td style="padding: 8px 0; font-weight: 600;">${previousValue ?? 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Current Value</td>
        <td style="padding: 8px 0; font-weight: 600;">${currentValue}</td>
      </tr>
    </table>
  </div>
  <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">SEO AI Monitor - Automated Alert</p>
</body>
</html>`.trim();

  return { subject, html };
}
