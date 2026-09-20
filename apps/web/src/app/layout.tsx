import type { Metadata } from 'next';
import { AuthProvider } from '../components/auth/auth-context';
import { Footer } from '../components/layout/footer';
import { Header } from '../components/layout/header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Oherbtracker',
  description: 'Shipment tracking platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <Header />
            <main className="app-main">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
