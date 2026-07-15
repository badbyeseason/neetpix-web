// qpdf-wasm 运行时加载器
//
// @jspawn/qpdf-wasm 的 ESM 入口 (qpdf.mjs) 和 CJS 入口 (qpdf.js) 都在
// `if (globalThis.process)` / `if (ia)` 分支中引用了 Node.js 内置模块
// (path / module / fs / crypto)。虽然浏览器端永远不会执行这些分支，
// 但 Turbopack 会静态分析 import() / require() 调用并报 "Module not found"。
//
// 解决方案：将 qpdf.js 复制到 public/ 目录，在运行时用 fetch + new Function
// 加载执行，完全绕过 Turbopack 的静态分析。qpdf.wasm 同样放在 public/。

type QpdfModule = {
  FS: {
    writeFile: (name: string, data: Uint8Array) => void;
    readFile: (name: string) => Uint8Array<ArrayBuffer>;
  };
  callMain: (args: string[]) => number;
};

type QpdfFactory = (config: {
  locateFile?: (path: string) => string;
}) => Promise<QpdfModule>;

let factoryCache: QpdfFactory | null = null;

/**
 * 加载 qpdf.js 并返回 Module 工厂函数。
 * qpdf.js 通过 fetch 从 /public/qpdf.js 获取，用 new Function 执行，
 * 避免被 Turbopack 静态分析其中的 require("path") 等调用。
 */
async function getQpdfFactory(): Promise<QpdfFactory> {
  if (factoryCache) return factoryCache;

  // qpdf.js 末尾的导出逻辑会检查 `typeof exports === 'object'`，
  // 满足后执行 `exports["Module"] = Module`（工厂函数）。
  // 我们提供 exports 参数来接收它。
  const exportsObj: Record<string, unknown> = {};

  // 从 public 目录获取 qpdf.js 源码
  const response = await fetch("/qpdf.js");
  if (!response.ok) {
    throw new Error(`Failed to fetch qpdf.js: ${response.status}`);
  }
  const code = await response.text();

  // 用 new Function 执行代码，绕过 Turbopack 静态分析。
  // 代码内部的 require("path") 等调用都在 `if (ia)` (Node.js 检测) 分支中，
  // 浏览器端 ia=false 不会执行，也不会报错。
  const executor = new Function("exports", code) as (
    exports: Record<string, unknown>,
  ) => void;
  executor(exportsObj);

  const factory = exportsObj.Module as QpdfFactory | undefined;
  if (typeof factory !== "function") {
    throw new Error("qpdf.js did not export a Module factory");
  }

  factoryCache = factory;
  return factory;
}

/**
 * 初始化并返回 qpdf WASM Module。
 * qpdf.wasm 从 /public/qpdf.wasm 加载。
 */
export async function getQpdfModule(): Promise<QpdfModule> {
  const factory = await getQpdfFactory();
  return factory({
    locateFile: () => "/qpdf.wasm",
  });
}
