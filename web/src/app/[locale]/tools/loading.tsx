// 路由级骨架屏：模拟工具页 3 段布局（上传区/操作区/结果区）。
// 纯占位，无文字，不需要 i18n。server component。
// 放在 tools/ 父段级，覆盖所有 27 个静态工具页的客户端导航 loading 状态。
// 注意：原 [tool]/loading.tsx 因 [tool] 无 page.tsx 而孤立，对静态路由不生效。
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      {/* 标题 + 面包屑占位 */}
      <div className="animate-pulse mb-8">
        <div className="h-3 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-8 w-64 bg-gray-200 rounded mb-3" />
        <div className="h-4 w-96 max-w-full bg-gray-200 rounded" />
      </div>

      {/* 上传区 + spinner */}
      <div className="animate-pulse mb-8">
        <div className="relative h-48 w-full bg-gray-200 rounded-xl border border-border flex items-center justify-center">
          <div
            aria-hidden="true"
            className="w-8 h-8 border-2 border-gray-300 border-t-teal rounded-full animate-spin"
          />
        </div>
      </div>

      {/* 操作区 */}
      <div className="animate-pulse mb-8">
        <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-32 bg-gray-200 rounded-full" />
          <div className="h-10 w-32 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* 结果 / 下载区 */}
      <div className="animate-pulse">
        <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
        <div className="h-24 w-full bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
