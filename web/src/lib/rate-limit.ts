/**
 * 内存级速率限制（固定窗口）
 * 用 globalThis 持久化 Map，避免 Vercel serverless 冷启动重置
 * 注意：多实例间不共享，仅单实例限流；不引入外部依赖
 */

const globalForRateLimit = globalThis as unknown as {
  __rateLimitMap?: Map<string, { count: number; resetAt: number }>;
};

const rateLimitMap =
  globalForRateLimit.__rateLimitMap ?? new Map<string, { count: number; resetAt: number }>();
globalForRateLimit.__rateLimitMap = rateLimitMap;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * 检查指定 key（如 IP）的速率限制
 * @param key 限流维度标识，如客户端 IP
 * @param limit 窗口内最大请求数，默认 30
 * @param windowMs 窗口大小（毫秒），默认 60_000
 */
export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // 无记录或窗口已过期：开启新窗口
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  // 窗口内已有记录：累加
  if (entry.count < limit) {
    entry.count += 1;
    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // 超限
  return {
    success: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}
