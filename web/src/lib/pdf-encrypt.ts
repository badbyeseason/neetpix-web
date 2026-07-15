// NeetPix PDF Encrypt Engine
// 使用 pdf-lib 检测加密状态，使用 qpdf-wasm 执行 AES-256 加密
import { PDFDocument } from "pdf-lib";
import { getQpdfModule } from "./qpdf-loader";

/**
 * 检测 PDF 是否已加密
 */
export async function isPdfEncrypted(file: File): Promise<boolean> {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.isEncrypted;
  } catch {
    // 如果加载失败（可能加密），尝试不忽略加密
    try {
      const buf = await file.arrayBuffer();
      await PDFDocument.load(buf);
      return false;
    } catch {
      return true;
    }
  }
}

/**
 * 加密 PDF（AES-256）
 * @throws {Error} 加密失败时抛出 message="ENCRYPT_FAILED"
 */
export async function encryptPdf(file: File, password: string): Promise<Blob> {
  const Module = await getQpdfModule();

  // 写入输入文件到虚拟文件系统
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  Module.FS.writeFile("input.pdf", inputBytes);

  // 执行 qpdf 加密命令
  // qpdf --encrypt user-password owner-password 256 -- input.pdf output.pdf
  const exitCode = Module.callMain([
    "--encrypt", password, password, "256",
    "--", "input.pdf", "output.pdf"
  ]);

  if (exitCode !== 0) {
    throw new Error("ENCRYPT_FAILED");
  }

  // 读取输出文件
  const outputBytes = Module.FS.readFile("output.pdf");
  return new Blob([outputBytes], { type: "application/pdf" });
}
