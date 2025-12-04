export const CONFIG = {
  APP_NAME: 'PecunAI',
  SUPPORT_EMAIL: 'support@pecunai.com', // Replace with actual support email
  DEFAULT_LOCALE: 'de',
  
  SIGNTEQ: {
    API_URL: 'https://api.signteq.io/v1',
    IFRAME_ORIGIN: 'https://signteq.io',
    USER_AGENT: 'signteq.io API',
  },

  SIGND: {
    API_URL: process.env.SIGND_API_URL || 'https://st-api.signd.id',
    WEB_BASE: process.env.SIGND_WEB_BASE || 'https://st-web.signd.id',
  },

  EXTERNAL: {
    PDF_WORKER_URL: 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js',
    WEBSITE_URL: 'https://www.4money.at',
  },

  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',

  AUTH: {
    OTP_EXPIRY_MINUTES: 5,
    OTP_RESEND_LIMIT: 3,
    OTP_WINDOW_MINUTES: 5,
    SESSION_EXPIRY_DAYS: 7,
  }
};
