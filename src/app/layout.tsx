import './globals.css';

export const metadata = {
  title: '日報管理システム',
  description: '営業活動の日報管理システム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
