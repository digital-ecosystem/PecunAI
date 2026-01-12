import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { SessionStatus } from '@/types';

type EmailLayoutInput = {
	preheader: string;
	title: string;
	contentHtml: string;
};

type SendEmailInput = {
	to: string;
	subject: string;
	html: string;
	text?: string;
	from?: string;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function getDefaultFrom(): string {
	return `"4money" <${process.env.EMAIL_FROM || 'office@4money.at'}>`;
}

function getBrandName(): string {
	return process.env.EMAIL_BRAND_NAME || '4money';
}

function buildEmailLayout(input: EmailLayoutInput): string {
	const brandName = escapeHtml(getBrandName());
	const title = escapeHtml(input.title);
	const preheader = escapeHtml(input.preheader);

	return `<!doctype html>
<html lang="de">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<meta name="x-apple-disable-message-reformatting" />
	<meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
	<title>${title}</title>
	<style>
		@media only screen and (max-width: 600px) {
			.content { padding: 20px !important; }
			.header { padding: 18px 20px !important; }
		}
	</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;min-height:100vh;">
		<tr>
			<td align="center" style="padding:40px 16px;">
				<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:100%;background:#ffffff;box-shadow:0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px 0 rgba(0,0,0,0.06);border-radius:12px;overflow:hidden;">
					<tr>
						<td class="header" style="padding:32px 36px;background:#1e40af;border-bottom:3px solid #1e3a8a;">
							<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${brandName}</div>
						</td>
					</tr>
					<tr>
						<td class="content" style="padding:40px 36px;">
							<h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:28px;line-height:36px;color:#111827;font-weight:700;margin:0 0 24px;letter-spacing:-0.5px;">${title}</h1>
							${input.contentHtml}
						</td>
					</tr>
					<tr>
						<td style="padding:24px 36px;border-top:1px solid #e5e7eb;background:#f9fafb;">
							<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:20px;color:#6b7280;text-align:center;">
								Dies ist eine automatische Nachricht. Bitte antworten Sie nicht auf diese E-Mail.
							</div>
						</td>
					</tr>
				</table>
				<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:18px;color:#9ca3af;margin-top:20px;text-align:center;max-width:600px;">
					© ${new Date().getFullYear()} ${brandName}. Alle Rechte vorbehalten.
				</div>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_SMTP_HOST || 'relay382.mysmtp2.com',
	port: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
	secure: false,
	auth: {
		user: process.env.EMAIL_SMTP_USER,
		pass: process.env.EMAIL_SMTP_PASSWORD,
	},
} satisfies SMTPTransport.Options);

export async function sendEmail(input: SendEmailInput) {
	return transporter.sendMail({
		from: input.from ?? getDefaultFrom(),
		to: input.to,
		subject: input.subject,
		html: input.html,
		text: input.text,
	});
}

type OtpEmailInput = {
	to: string;
	code: string;
	recipientName?: string | null;
	expiresInMinutes?: number;
};

function buildOtpEmail(params: Omit<OtpEmailInput, 'to'>): {
	subject: string;
	html: string;
	text: string;
} {
	const recipient = (params.recipientName ?? '').trim();
	const greeting = recipient ? `Hallo ${escapeHtml(recipient)},` : 'Guten Tag,';
	const expiresInMinutes = params.expiresInMinutes ?? 5;
	const safeCode = escapeHtml(params.code);

	const subject = `${getBrandName()} – Ihr Verifizierungscode`;

	const contentHtml = `
		<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:26px;color:#374151;">
			<p style="margin:0 0 20px;font-size:16px;">${greeting}</p>
			<p style="margin:0 0 28px;font-size:16px;">Bitte verwenden Sie den folgenden Code, um Ihre Anmeldung zu bestätigen:</p>
			
			<div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:28px 24px;text-align:center;margin:0 0 12px;">
				<div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:20px 32px;display:inline-block;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);">
					<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:36px;letter-spacing:10px;color:#0f172a;font-weight:700;line-height:1.3;user-select:all;-webkit-user-select:all;-moz-user-select:all;-ms-user-select:all;">${safeCode}</div>
				</div>
			</div>
			<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin:0 0 28px;">
				<div style="font-size:14px;line-height:22px;color:#92400e;">
					<div style="font-weight:700;margin:0 0 8px;font-size:15px;color:#78350f;">⚠️ Sicherheitshinweise</div>
					<ul style="margin:0;padding:0 0 0 20px;">
						<li style="margin:0 0 6px;">Dieser Code ist ${escapeHtml(String(expiresInMinutes))} Minuten gültig</li>
						<li style="margin:0 0 6px;">Geben Sie den Code niemals an Dritte weiter</li>
						<li style="margin:0;">Bei Nichtanforderung ignorieren Sie diese E-Mail</li>
					</ul>
				</div>
			</div>

			<div style="margin:32px 0 0;padding:20px 0 0;border-top:1px solid #e5e7eb;">
				<p style="margin:0;font-size:15px;color:#6b7280;">Mit freundlichen Grüßen<br /><span style="color:#111827;font-weight:600;">Ihr ${escapeHtml(getBrandName())} Team</span></p>
			</div>
		</div>
	`;

	const html = buildEmailLayout({
		preheader: `Ihr Verifizierungscode lautet ${params.code}. Gültig für ${expiresInMinutes} Minuten.`,
		title: 'Verifizierungscode',
		contentHtml,
	});

	const text = `${greeting}\n\nVielen Dank für Ihr Interesse. Ihr Verifizierungscode lautet:\n\n${params.code}\n\nDer Code ist ${expiresInMinutes} Minuten gültig.\n\nSicherheitshinweise:\n- Geben Sie den Code niemals an Dritte weiter\n- Bei Nichtanforderung ignorieren Sie diese E-Mail\n\nMit freundlichen Grüßen\nIhr ${getBrandName()} Team`;

	return { subject, html, text };
}

export async function sendOtpEmail(input: OtpEmailInput) {
	const { subject, html, text } = buildOtpEmail({
		code: input.code,
		recipientName: input.recipientName,
		expiresInMinutes: input.expiresInMinutes,
	});

	return sendEmail({
		to: input.to,
		subject,
		html,
		text,
	});
}

type SessionStatusEmailInput = {
	to: string;
	status: SessionStatus;
	qaSessionId: string;
	recipientName?: string | null;
	dashboardUrl?: string;
};

function buildSessionStatusEmail(params: Omit<SessionStatusEmailInput, 'to'>): {
	subject: string;
	html: string;
	text: string;
} {
	const dashboardUrl =
		params.dashboardUrl ?? `${process.env.NEXT_PUBLIC_FRONTEND_URL || ''}/customer/dashboard`;

	const displayStatus =
		params.status === SessionStatus.APPROVED
			? 'GENEHMIGT'
			: params.status === SessionStatus.REJECTED
				? 'ABGELEHNT'
				: params.status;

	const statusColor =
		params.status === SessionStatus.APPROVED
			? '#16a34a'
			: params.status === SessionStatus.REJECTED
				? '#dc2626'
				: '#2563eb';

	const recipient = (params.recipientName ?? '').trim();
	const greeting = recipient ? `Hallo ${escapeHtml(recipient)},` : 'Guten Tag,';

	const subject = `${getBrandName()} – Ihre Sitzung wurde ${displayStatus}`;

	const statusIcon = params.status === SessionStatus.APPROVED 
		? '✓' 
		: params.status === SessionStatus.REJECTED 
			? '✕' 
			: 'ℹ';

	const statusBg = params.status === SessionStatus.APPROVED
		? '#dcfce7'
		: params.status === SessionStatus.REJECTED
			? '#fee2e2'
			: '#dbeafe';

	const contentHtml = `
		<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:26px;color:#374151;">
			<p style="margin:0 0 20px;font-size:16px;">${greeting}</p>
			<p style="margin:0 0 28px;font-size:16px;">Wir möchten Sie über eine Aktualisierung Ihrer Sitzung informieren.</p>
			
			<div style="background:${statusBg};border:2px solid ${statusColor};border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
				<div style="font-size:48px;margin:0 0 12px;line-height:1;">${statusIcon}</div>
				<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Status</div>
				<div style="font-size:28px;font-weight:700;color:${statusColor};letter-spacing:-0.5px;">${displayStatus}</div>
			</div>

			<div style="text-align:center;margin:0 0 20px;">
				<a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:14px 32px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:600;box-shadow:0 2px 4px 0 rgba(30,64,175,0.3);transition:background 0.2s;">Zum Dashboard</a>
			</div>

			<div style="margin:32px 0 0;padding:20px 0 0;border-top:1px solid #e5e7eb;">
				<p style="margin:0;font-size:15px;color:#6b7280;">Mit freundlichen Grüßen<br /><span style="color:#111827;font-weight:600;">Ihr ${escapeHtml(getBrandName())} Team</span></p>
			</div>

			<p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#9ca3af;">Falls der Button nicht funktioniert: <span style="word-break:break-all;">${escapeHtml(dashboardUrl)}</span></p>
		</div>
	`;

	const html = buildEmailLayout({
		preheader: `Ihre Sitzung wurde ${displayStatus}.`,
		title: `Sitzung ${displayStatus}`,
		contentHtml,
	});

	const text = `${greeting}\n\nIhre Sitzung wurde ${displayStatus}.\nStatus: ${displayStatus}\n\nDashboard: ${dashboardUrl}`;

	return { subject, html, text };
}

export async function sendSessionStatusEmail(input: SessionStatusEmailInput) {
	const { subject, html, text } = buildSessionStatusEmail({
		status: input.status,
		qaSessionId: input.qaSessionId,
		recipientName: input.recipientName,
		dashboardUrl: input.dashboardUrl,
	});

	return sendEmail({
		to: input.to,
		subject,
		html,
		text,
	});
}
