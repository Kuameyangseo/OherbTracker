export type ServerConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  mongoUri?: string;
  webUrl: string;
  webUrls: string[];
  apiUrl: string;
  authSecret: string;
  authCookieName: string;
  trackerApiKey?: string;
  emailProvider: 'console' | 'disabled';
  smsProvider: 'console' | 'disabled';
  emailFrom: string;
  appName: string;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const serverConfig: ServerConfig = {
  nodeEnv:
    nodeEnv === 'production' || nodeEnv === 'test' ? nodeEnv : 'development',
  port: Number(process.env.PORT ?? 3333),
  mongoUri: process.env.MONGODB_URI,
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  webUrls: (
    process.env.WEB_URLS ??
    process.env.WEB_URL ??
    'http://localhost:3100'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  apiUrl: process.env.API_URL ?? 'http://localhost:3333',
  authSecret: process.env.AUTH_SECRET ?? 'development-secret-change-me',
  authCookieName: process.env.AUTH_COOKIE_NAME ?? 'swifttrack_session',
  trackerApiKey: process.env.TRACKER_API_KEY,
  emailProvider:
    process.env.EMAIL_PROVIDER === 'disabled' ? 'disabled' : 'console',
  smsProvider: process.env.SMS_PROVIDER === 'disabled' ? 'disabled' : 'console',
  emailFrom: process.env.EMAIL_FROM ?? 'notifications@localhost.invalid',
  appName: process.env.APP_NAME ?? 'OherbTracker',
};
