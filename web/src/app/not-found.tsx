import Link from "next/link";

// 根级 404 页面：不在 [locale] 路由内，无法使用 useTranslations，
// 因此采用中英双语兜底文案 + 返回首页链接。
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-teal mb-4">404</h1>
        <h2 className="text-xl font-semibold text-text mb-2">
          Page Not Found / 页面未找到
        </h2>
        <p className="text-text-secondary mb-8">
          The page you&apos;re looking for doesn&apos;t exist. /
          你访问的页面不存在。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
        >
          Back to Home / 返回首页
        </Link>
      </div>
    </div>
  );
}
