import { BRANCHES, BUSINESS, type AppointmentStatus } from '@mab/shared'

type DeliveryResult = {
  sent: boolean
  reason?: 'not_configured' | 'no_recipient' | 'invalid_recipient' | 'provider_error'
  messageId?: string
}

type AppointmentEmailContext = {
  recipient?: string
  patientName: string
  publicCode: string
  branchName?: string
  branchSlug?: string
  serviceName?: string
  serviceSlug?: string
  requestedStartAt: string
  confirmedStartAt?: string
  status?: AppointmentStatus
}

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'
const DEFAULT_PUBLIC_SITE_URL = 'https://mabdental.vercel.app'

function config() {
  return {
    apiKey: process.env.BREVO_API_KEY?.trim(),
    senderEmail: process.env.BREVO_SENDER_EMAIL?.trim(),
    senderName: process.env.BREVO_SENDER_NAME?.trim() || BUSINESS.name,
    replyTo: process.env.BREVO_REPLY_TO_EMAIL?.trim(),
    publicSiteUrl: (process.env.MAB_PUBLIC_SITE_URL?.trim() || DEFAULT_PUBLIC_SITE_URL).replace(/\/$/, ''),
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isDeliverableEmail(value?: string) {
  const email = value?.trim().toLowerCase()
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith('.invalid'))
}

function formatDate(value?: string) {
  if (!value) return 'To be confirmed by the clinic'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'To be confirmed by the clinic'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: BUSINESS.timezone,
  }).format(date)
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || 'there'
}

function appointmentLink(context: AppointmentEmailContext) {
  const siteUrl = config().publicSiteUrl
  const params = new URLSearchParams()
  if (context.branchSlug) params.set('branch', context.branchSlug)
  if (context.serviceSlug) params.set('service', context.serviceSlug)
  const query = params.toString()
  return `${siteUrl}/book${query ? '?' + query : ''}`
}

function statusDetails(status: AppointmentStatus) {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        color: '#146c4a',
        title: 'Your visit is confirmed.',
        copy: 'The clinic team has reviewed your request and reserved this schedule for you.',
      }
    case 'RESCHEDULE_PROPOSED':
      return {
        label: 'New time proposed',
        color: '#8a5b00',
        title: 'The clinic proposed a new time.',
        copy: 'Please contact the clinic to confirm the proposed schedule or ask for another option.',
      }
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        color: '#9f2f2f',
        title: 'Your appointment was cancelled.',
        copy: 'If you still need care, you can send a new request or message the clinic for assistance.',
      }
    case 'DECLINED':
      return {
        label: 'Unable to accommodate',
        color: '#9f2f2f',
        title: 'The clinic could not accommodate this request.',
        copy: 'Please message the clinic so the team can help you find another schedule.',
      }
    case 'COMPLETED':
      return {
        label: 'Visit completed',
        color: '#146c4a',
        title: 'Thank you for visiting M.A.B.',
        copy: 'Your appointment has been marked complete. We look forward to caring for your smile again.',
      }
    case 'NO_SHOW':
      return {
        label: 'Missed visit',
        color: '#9f2f2f',
        title: 'We missed you at the clinic.',
        copy: 'Please contact the clinic if you would like help arranging another visit.',
      }
    default:
      return {
        label: 'Clinic update',
        color: '#123b68',
        title: 'There is an update to your appointment.',
        copy: 'Please contact the clinic if you have any questions about your request.',
      }
  }
}

function shell({ preheader, eyebrow, title, copy, context, statusLabel, statusColor, ctaLabel, ctaUrl }: {
  preheader: string
  eyebrow: string
  title: string
  copy: string
  context: AppointmentEmailContext
  statusLabel: string
  statusColor: string
  ctaLabel: string
  ctaUrl: string
}) {
  const branch = context.branchName || 'M.A.B. Dental Clinic'
  const service = context.serviceName || 'Consultation / assessment'
  const schedule = formatDate(context.confirmedStartAt || context.requestedStartAt)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(eyebrow)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { width: 100% !important; }
        .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
        .email-title { font-size: 30px !important; line-height: 1.1 !important; }
        .email-detail { display: block !important; width: 100% !important; padding: 8px 0 !important; }
        .email-cta { width: 100% !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:#f3f5f7;color:#16324f;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f5f7;">
      <tr><td align="center" style="padding:32px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" class="email-shell" width="600" style="width:600px;max-width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(20,48,75,.10);">
          <tr><td style="height:6px;background:#c79b4b;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td class="email-pad" style="padding:28px 42px 20px;background:#123b68;color:#ffffff;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
              <td style="font-size:24px;font-weight:700;letter-spacing:.08em;">M.A.B.</td>
              <td align="right" style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#e6c982;font-weight:700;">DENTAL CLINIC</td>
            </tr></table>
          </td></tr>
          <tr><td class="email-pad" style="padding:42px 42px 12px;">
            <div style="font-size:11px;letter-spacing:.16em;color:#9a6c1d;font-weight:700;">${escapeHtml(eyebrow)}</div>
            <h1 class="email-title" style="margin:14px 0 14px;color:#123b68;font-size:38px;line-height:1.12;letter-spacing:-.03em;font-weight:700;">${escapeHtml(title)}</h1>
            <p style="margin:0;color:#5f7182;font-size:16px;line-height:1.65;">Hi ${escapeHtml(firstName(context.patientName))},<br />${escapeHtml(copy)}</p>
          </td></tr>
          <tr><td class="email-pad" style="padding:22px 42px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e4e9ee;border-radius:16px;background:#fbfcfd;">
              <tr><td style="padding:20px 22px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
                  <td><div style="font-size:11px;letter-spacing:.13em;color:#7d8c9a;font-weight:700;">REQUEST REFERENCE</div><div style="margin-top:7px;color:#123b68;font-size:20px;font-weight:700;letter-spacing:.04em;">${escapeHtml(context.publicCode)}</div></td>
                  <td align="right" valign="top"><span style="display:inline-block;border-radius:999px;padding:7px 11px;background:${escapeHtml(statusColor)};color:#ffffff;font-size:11px;font-weight:700;">${escapeHtml(statusLabel)}</span></td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:10px 22px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr><td class="email-detail" width="50%" style="padding:10px 12px 10px 0;vertical-align:top;"><div style="font-size:11px;letter-spacing:.12em;color:#7d8c9a;font-weight:700;">BRANCH</div><div style="margin-top:5px;color:#234766;font-size:15px;line-height:1.4;">${escapeHtml(branch)}</div></td><td class="email-detail" width="50%" style="padding:10px 0 10px 12px;vertical-align:top;"><div style="font-size:11px;letter-spacing:.12em;color:#7d8c9a;font-weight:700;">SERVICE</div><div style="margin-top:5px;color:#234766;font-size:15px;line-height:1.4;">${escapeHtml(service)}</div></td></tr>
                  <tr><td colspan="2" style="border-top:1px solid #e4e9ee;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr><td class="email-detail" colspan="2" style="padding:15px 0 4px;vertical-align:top;"><div style="font-size:11px;letter-spacing:.12em;color:#7d8c9a;font-weight:700;">SCHEDULE</div><div style="margin-top:5px;color:#234766;font-size:15px;line-height:1.4;">${escapeHtml(schedule)}</div></td></tr>
                </table>
              </td></tr>
            </table>
          </td></tr>
          <tr><td class="email-pad" style="padding:24px 42px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" class="email-cta" style="width:auto;"><tr><td style="border-radius:999px;background:#c79b4b;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(ctaLabel)} &nbsp;→</a></td></tr></table>
          </td></tr>
          <tr><td class="email-pad" style="padding:24px 42px 34px;"><p style="margin:0;color:#7d8c9a;font-size:13px;line-height:1.7;">Need help? Message the clinic or call your selected branch. A preferred schedule is a request until the clinic team confirms availability.</p></td></tr>
          <tr><td class="email-pad" style="padding:20px 42px;background:#f7f1e6;"><p style="margin:0;color:#123b68;font-size:13px;font-weight:700;">${escapeHtml(BUSINESS.name)}</p><p style="margin:5px 0 0;color:#71808e;font-size:12px;line-height:1.6;">${escapeHtml(BUSINESS.hours.weekdayLabel)} · ${escapeHtml(BUSINESS.hours.weekday)}<br />${escapeHtml(BUSINESS.email)}</p></td></tr>
        </table>
        <p style="margin:18px 0 0;color:#8a99a6;font-size:11px;text-align:center;">This is an operational appointment message from ${escapeHtml(BUSINESS.name)}.</p>
      </td></tr>
    </table>
  </body>
</html>`
}

function textBody({ title, copy, context, statusLabel }: { title: string; copy: string; context: AppointmentEmailContext; statusLabel: string }) {
  return `${title}\n\nHi ${firstName(context.patientName)},\n${copy}\n\n${statusLabel} · ${context.publicCode}\nBranch: ${context.branchName || BUSINESS.name}\nService: ${context.serviceName || 'Consultation / assessment'}\nSchedule: ${formatDate(context.confirmedStartAt || context.requestedStartAt)}\n\n${config().publicSiteUrl}/book\n\n${BUSINESS.name}\n${BUSINESS.email}`
}

async function sendBrevoMessage({ recipient, recipientName, subject, htmlContent, textContent, tags }: { recipient: string; recipientName: string; subject: string; htmlContent: string; textContent: string; tags: string[] }): Promise<DeliveryResult> {
  if (!recipient.trim()) return { sent: false, reason: 'no_recipient' }
  if (!isDeliverableEmail(recipient)) return { sent: false, reason: 'invalid_recipient' }
  const settings = config()
  if (!settings.apiKey || !settings.senderEmail) return { sent: false, reason: 'not_configured' }
  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': settings.apiKey,
      },
      body: JSON.stringify({
        sender: { email: settings.senderEmail, name: settings.senderName },
        to: [{ email: recipient.trim(), name: recipientName.trim() || undefined }],
        ...(settings.replyTo ? { replyTo: { email: settings.replyTo } } : {}),
        subject,
        htmlContent,
        textContent,
        tags,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const body = await response.json().catch(() => ({})) as { messageId?: string }
    if (!response.ok) {
      console.warn('[brevo] delivery failed', { status: response.status })
      return { sent: false, reason: 'provider_error' }
    }
    return { sent: true, messageId: typeof body.messageId === 'string' ? body.messageId : undefined }
  } catch (error) {
    console.warn('[brevo] delivery request failed', { error: error instanceof Error ? error.name : 'unknown' })
    return { sent: false, reason: 'provider_error' }
  }
}

export async function sendAppointmentRequestEmail(context: AppointmentEmailContext): Promise<DeliveryResult> {
  const settings = config()
  const title = 'We received your request.'
  const copy = 'Your preferred schedule is now with the clinic team for review. We will contact you through the details you provided once availability is checked.'
  const statusLabel = 'Pending clinic review'
  const statusColor = '#8a5b00'
  const htmlContent = shell({
    preheader: `${context.publicCode} is now pending clinic review.`,
    eyebrow: 'APPOINTMENT REQUEST RECEIVED',
    title,
    copy,
    context,
    statusLabel,
    statusColor,
    ctaLabel: 'View booking page',
    ctaUrl: appointmentLink(context),
  })
  const result = await sendBrevoMessage({
    recipient: context.recipient || '',
    recipientName: context.patientName,
    subject: `${context.publicCode} · Appointment request received`,
    htmlContent,
    textContent: textBody({ title, copy, context, statusLabel }),
    tags: ['mab-dental', 'appointment-request'],
  })
  if (!result.sent && result.reason !== 'no_recipient' && result.reason !== 'invalid_recipient') {
    console.warn('[brevo] appointment request notification unavailable', { code: context.publicCode, reason: result.reason })
  }
  return result
}

export async function sendAppointmentStatusEmail(context: AppointmentEmailContext & { status: AppointmentStatus }): Promise<DeliveryResult> {
  const details = statusDetails(context.status)
  const htmlContent = shell({
    preheader: `${context.publicCode} · ${details.label}`,
    eyebrow: 'APPOINTMENT UPDATE',
    title: details.title,
    copy: details.copy,
    context,
    statusLabel: details.label,
    statusColor: details.color,
    ctaLabel: context.status === 'CONFIRMED' ? 'Review booking details' : 'Contact the clinic',
    ctaUrl: appointmentLink(context),
  })
  return sendBrevoMessage({
    recipient: context.recipient || '',
    recipientName: context.patientName,
    subject: `${context.publicCode} · ${details.label}`,
    htmlContent,
    textContent: textBody({ title: details.title, copy: details.copy, context, statusLabel: details.label }),
    tags: ['mab-dental', 'appointment-status', context.status.toLowerCase()],
  })
}

export async function sendBrevoTestEmail(recipient: string): Promise<DeliveryResult> {
  const context: AppointmentEmailContext = {
    recipient,
    patientName: 'Morgan Lee',
    publicCode: 'MAB-BREVO-TEST',
    branchName: BRANCHES[0]?.name,
    branchSlug: BRANCHES[0]?.slug,
    serviceName: 'Consultation / assessment',
    requestedStartAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  }
  const title = 'Your premium email preview is ready.'
  const copy = 'This is a safe delivery test for the M.A.B. Dental Clinic appointment notification system. No patient record was created or changed.'
  const statusLabel = 'Brevo delivery test'
  const htmlContent = shell({
    preheader: 'M.A.B. Dental Clinic Brevo delivery test.',
    eyebrow: 'TRANSACTIONAL EMAIL TEST',
    title,
    copy,
    context,
    statusLabel,
    statusColor: '#123b68',
    ctaLabel: 'Open booking page',
    ctaUrl: appointmentLink(context),
  })
  return sendBrevoMessage({
    recipient,
    recipientName: 'MAB test recipient',
    subject: 'M.A.B. Dental Clinic · Brevo email test',
    htmlContent,
    textContent: textBody({ title, copy, context, statusLabel }),
    tags: ['mab-dental', 'brevo-test'],
  })
}

export function brevoStatus() {
  const settings = config()
  return {
    configured: Boolean(settings.apiKey && settings.senderEmail),
    senderEmail: settings.senderEmail || null,
    senderName: settings.senderName,
  }
}
