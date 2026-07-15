// NeetPix PDF Decrypt Engine
// 使用 qpdf-wasm 去除 PDF 密码保护
import { getQpdfModule } from "./qpdf-loader";

/**
 * 解密 PDF（去除密码保护）
 * @throws {Error} 密码错误时抛出 message="WRONG_PASSWORD"
 * @throws {Error} 解密失败时抛出 message="DECRYPT_FAILED"
 */
export async function decryptPdf(file: File, password: string): Promise<Blob> {
  const Module = await getQpdfModule();

  const inputBytes = new Uint8Array(await file.arrayBuffer());
  Module.FS.writeFile("input.pdf", inputBytes);

  // qpdf --decrypt --password=PASSWORD input.pdf output.pdf
  const exitCode = Module.callMain([
    "--decrypt",
    `--password=${password}`,
    "input.pdf", "output.pdf"
  ]);

  if (exitCode !== 0) {
    // qpdf 对错误密码返回非 0 退出码
    throw new Error("WRONG_PASSWORD");
  }

  const outputBytes = Module.FS.readFile("output.pdf");
  return new Blob([outputBytes], { type: "application/pdf" });
}
