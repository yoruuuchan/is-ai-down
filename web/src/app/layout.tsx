import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 状态看板 · AI Status Board",
  description:
    "聚合 ChatGPT、Claude、Gemini、Cursor、DeepSeek、Kimi 等 AI 服务的官方状态页与公开页面可访问性。",
};

const themeBootstrap = `
(function () {
  try {
    var stored = localStorage.getItem('ai-status-board-theme');
    var theme = stored;
    if (theme !== 'akari' && theme !== 'yoru') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'yoru' : 'akari';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'akari');
  }
})();
`;

const localeBootstrap = `
(function () {
  try {
    var stored = localStorage.getItem('ai-status-board-locale');
    var locale = stored;
    if (locale !== 'zh' && locale !== 'en') {
      var nav = (navigator.language || '').toLowerCase();
      locale = nav.indexOf('zh') === 0 ? 'zh' : 'en';
    }
    document.documentElement.setAttribute('data-locale', locale);
    document.documentElement.setAttribute('lang', locale === 'en' ? 'en' : 'zh-CN');
  } catch (e) {
    document.documentElement.setAttribute('data-locale', 'zh');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      data-theme="akari"
      data-locale="zh"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <script dangerouslySetInnerHTML={{ __html: localeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
