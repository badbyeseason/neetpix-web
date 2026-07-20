import Peer, { DataConnection } from "peerjs";

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface TransferCancelToken {
  cancelled: boolean;
  cancel: () => void;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export const CHUNK_SIZE = 16 * 1024; // 16KB
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// 生成 6 位房间码（base32 字符集，去除易混淆字符 0/O/1/I）
export function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function createCancelToken(): TransferCancelToken {
  const token = { cancelled: false } as TransferCancelToken;
  token.cancel = () => { token.cancelled = true; };
  return token;
}

// 创建 Peer 实例（使用公共 broker）
export function createPeer(roomId: string): Peer {
  return new Peer(roomId, {
    debug: 1,
  });
}

// 创建临时 Peer（加入方使用，使用随机 ID）
export function createJoiningPeer(): Peer {
  return new Peer({
    debug: 1,
  });
}

// 发送文件：通过 DataConnection 分块传输
export async function sendFile(
  conn: DataConnection,
  file: File,
  onProgress: (progress: TransferProgress) => void,
  cancelToken: TransferCancelToken,
): Promise<void> {
  // 1. 发送文件元数据
  const metadata: FileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
  };
  conn.send({ type: "metadata", payload: metadata });

  // 2. 分块发送
  let offset = 0;
  while (offset < file.size) {
    if (cancelToken.cancelled) {
      conn.send({ type: "cancel" });
      return;
    }
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    conn.send({ type: "chunk", payload: buffer });

    offset += buffer.byteLength;
    onProgress({
      bytesTransferred: offset,
      totalBytes: file.size,
      percentage: (offset / file.size) * 100,
    });

    // 缓冲控制：等待 drain
    // PeerJS 内部使用 bufferedAmount 限制，但我们手动延迟避免内存爆炸
    if (offset % (CHUNK_SIZE * 64) === 0) {
      // 每 1MB 让出一次事件循环
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // 3. 发送完成信号
  conn.send({ type: "done" });
}

// 接收文件：监听 DataConnection 数据
export function receiveFile(
  conn: DataConnection,
  onProgress: (progress: TransferProgress) => void,
  onComplete: (blob: Blob, metadata: FileMetadata) => void,
  onCancel: () => void,
): void {
  const chunks: ArrayBuffer[] = [];
  let metadata: FileMetadata | null = null;
  let receivedBytes = 0;

  conn.on("data", (data: unknown) => {
    const msg = data as { type: string; payload?: unknown };
    switch (msg.type) {
      case "metadata":
        metadata = msg.payload as FileMetadata;
        chunks.length = 0;
        receivedBytes = 0;
        break;
      case "chunk": {
        const chunk = msg.payload as ArrayBuffer;
        chunks.push(chunk);
        receivedBytes += chunk.byteLength;
        if (metadata) {
          onProgress({
            bytesTransferred: receivedBytes,
            totalBytes: metadata.size,
            percentage: (receivedBytes / metadata.size) * 100,
          });
        }
        break;
      }
      case "done": {
        if (!metadata) return;
        const blob = new Blob(chunks, { type: metadata.type });
        onComplete(blob, metadata);
        break;
      }
      case "cancel":
        onCancel();
        break;
    }
  });
}

// 触发浏览器下载
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
