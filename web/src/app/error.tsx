"use client";

// 根级错误边界：作为 client 组件捕获子树渲染错误，
// 不在 [locale] 路由内，无法使用 useTranslations，故使用英文兜底。
export default function Error({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text mb-2">
          Something went wrong
        </h1>
        <p className="text-text-secondary mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
