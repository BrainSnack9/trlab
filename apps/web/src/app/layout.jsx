import '../styles.css';

export const metadata = {
  title: 'TrLab',
  description: 'Marketing Signal Factory',
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
