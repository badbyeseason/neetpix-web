"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import Peer, { DataConnection } from "peerjs";
import {
  createPeer,
  createJoiningPeer,
  sendFile,
  receiveFile,
  downloadBlob,
  generateRoomId,
  createCancelToken,
  MAX_FILE_SIZE,
  type TransferProgress,
  type TransferCancelToken,
} from "@/lib/file-transfer";
import { generateQrPng } from "@/lib/qr-generator";
import Logo from "@/components/ui/Logo";

type Phase =
  | "initial"
  | "hosting"
  | "joining"
  | "connected"
  | "transferring"
  | "done"
  | "disconnected"
  | "error";

type TransferRole = "sender" | "receiver" | null;

// 房间码字符集：A-Z (排除 I/O) + 2-9，正则用于校验输入
const ROOM_ID_RE = /^[A-HJ-NP-Z2-9]{6}$/;

// 文件大小自适应格式化
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// 构建 PeerJS join 链接（localePrefix: "as-needed"，en 无前缀）
function buildJoinUrl(locale: string, roomId: string): string {
  if (typeof window === "undefined") return "";
  const path =
    locale === "en" ? `/tools/file-transfer` : `/zh/tools/file-transfer`;
  return `${window.location.origin}${path}?room=${roomId}`;
}

export default function FileTransferClient() {
  const t = useTranslations("fileTransfer");
  const locale = useLocale();

  // 状态机
  const [phase, setPhase] = useState<Phase>("initial");
  const [roomId, setRoomId] = useState("");
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [transferRole, setTransferRole] = useState<TransferRole>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // refs：PeerJS 资源（不触发重渲染）
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const cancelTokenRef = useRef<TransferCancelToken | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 清理 PeerJS 资源（用于取消 / 重试 / 卸载）
  const cleanup = useCallback(() => {
    cancelTokenRef.current?.cancel();
    cancelTokenRef.current = null;
    const conn = connRef.current;
    const peer = peerRef.current;
    connRef.current = null;
    peerRef.current = null;
    if (conn) {
      try {
        conn.close();
      } catch {
        /* noop */
      }
    }
    if (peer) {
      try {
        peer.destroy();
      } catch {
        /* noop */
      }
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // QR 二维码生成：hosting 状态下生成 join 链接的 QR
  useEffect(() => {
    if (phase !== "hosting" || !roomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    const url = buildJoinUrl(locale, roomId);
    (async () => {
      try {
        const dataUrl = await generateQrPng(url, {
          size: 256,
          color: "#000000",
          background: "#FFFFFF",
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("QR generation error:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, roomId, locale]);

  // 检查 URL ?room=XXX 自动进入 joining 状态
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room && ROOM_ID_RE.test(room.toUpperCase())) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJoinRoomInput(room.toUpperCase());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("joining");
    }
  }, []);

  // 复制 join 链接
  const handleCopyLink = useCallback(async () => {
    if (!roomId) return;
    const url = buildJoinUrl(locale, roomId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, [roomId, locale]);

  // host: 创建房间
  const handleCreateRoom = useCallback(() => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setSelectedFile(null);
    setProgress(null);
    setTransferRole(null);
    setErrorMsg("");
    setPhase("hosting");

    const peer = createPeer(newRoomId);
    peerRef.current = peer;

    peer.on("error", (err: Error) => {
      console.error("Peer error:", err);
      setErrorMsg(err?.message ?? String(err));
      cleanup();
      setPhase("error");
    });

    peer.on("disconnected", () => {
      setPhase("disconnected");
    });

    peer.on("connection", (conn) => {
      connRef.current = conn;
      conn.on("open", () => {
        setPhase("connected");
      });
      conn.on("close", () => {
        setPhase("disconnected");
      });
      conn.on("error", (err: Error) => {
        console.error("Conn error:", err);
        setErrorMsg(err?.message ?? String(err));
        setPhase("error");
      });
      // 作为接收方：监听 incoming 数据（被发送时触发）
      receiveFile(
        conn,
        (p) => {
          setProgress(p);
          setTransferRole("receiver");
          setPhase("transferring");
        },
        (blob, metadata) => {
          downloadBlob(blob, metadata.name);
          setProgress(null);
          setTransferRole("receiver");
          setPhase("done");
        },
        () => {
          // sender cancelled
          setProgress(null);
          setTransferRole(null);
          setPhase("connected");
        }
      );
    });
  }, [cleanup]);

  // joiner: 加入房间
  const handleJoinRoom = useCallback(() => {
    const code = joinRoomInput.trim().toUpperCase();
    if (!ROOM_ID_RE.test(code)) {
      setErrorMsg(t("invalidRoomCode"));
      setPhase("error");
      return;
    }
    setRoomId(code);
    setSelectedFile(null);
    setProgress(null);
    setTransferRole(null);
    setErrorMsg("");
    setPhase("joining");

    const peer = createJoiningPeer();
    peerRef.current = peer;

    peer.on("error", (err: Error) => {
      console.error("Peer error:", err);
      setErrorMsg(err?.message ?? String(err));
      cleanup();
      setPhase("error");
    });

    peer.on("open", () => {
      const conn = peer.connect(code, { reliable: true });
      connRef.current = conn;
      conn.on("open", () => {
        setPhase("connected");
      });
      conn.on("close", () => {
        setPhase("disconnected");
      });
      conn.on("error", (err: Error) => {
        console.error("Conn error:", err);
        setErrorMsg(err?.message ?? String(err));
        setPhase("error");
      });
      // 作为接收方：监听 incoming 数据
      receiveFile(
        conn,
        (p) => {
          setProgress(p);
          setTransferRole("receiver");
          setPhase("transferring");
        },
        (blob, metadata) => {
          downloadBlob(blob, metadata.name);
          setProgress(null);
          setTransferRole("receiver");
          setPhase("done");
        },
        () => {
          setProgress(null);
          setTransferRole(null);
          setPhase("connected");
        }
      );
    });
  }, [joinRoomInput, t, cleanup]);

  // 选择文件（点击 + 拖拽）
  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (file && file.size > MAX_FILE_SIZE) {
        setErrorMsg(t("fileTooLarge"));
        setPhase("error");
        return;
      }
      setSelectedFile(file);
    },
    [t]
  );

  // 发送文件
  const handleSendFile = useCallback(async () => {
    const conn = connRef.current;
    const file = selectedFile;
    if (!conn || !file) return;

    const token = createCancelToken();
    cancelTokenRef.current = token;
    setTransferRole("sender");
    setProgress({
      bytesTransferred: 0,
      totalBytes: file.size,
      percentage: 0,
    });
    setPhase("transferring");

    try {
      await sendFile(
        conn,
        file,
        (p) => setProgress(p),
        token
      );
      setProgress(null);
      setTransferRole("sender");
      setPhase("done");
    } catch (err) {
      console.error("Send error:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    } finally {
      cancelTokenRef.current = null;
    }
  }, [selectedFile]);

  // 取消传输（sender 视角）
  const handleCancelTransfer = useCallback(() => {
    cancelTokenRef.current?.cancel();
    setProgress(null);
    setTransferRole(null);
    setSelectedFile(null);
    setPhase("connected");
  }, []);

  // 断开连接，回到 initial
  const handleDisconnect = useCallback(() => {
    cleanup();
    setRoomId("");
    setJoinRoomInput("");
    setSelectedFile(null);
    setProgress(null);
    setTransferRole(null);
    setErrorMsg("");
    setPhase("initial");
  }, [cleanup]);

  // 重试：从 error 回到 initial
  const handleRetry = useCallback(() => {
    cleanup();
    setRoomId("");
    setJoinRoomInput("");
    setSelectedFile(null);
    setProgress(null);
    setTransferRole(null);
    setErrorMsg("");
    setPhase("initial");
  }, [cleanup]);

  // "再传一个"：回到 connected 状态，清理上一次传输状态
  const handleSendAnother = useCallback(() => {
    setSelectedFile(null);
    setProgress(null);
    setTransferRole(null);
    setPhase("connected");
  }, []);

  // ─── UI 渲染 ───────────────────────────────────────────────────────────

  // 通用样式
  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal";
  const primaryBtn =
    "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors bg-teal text-white hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryBtn =
    "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors bg-bg-warm text-text border border-border hover:border-teal-light";

  return (
    <div>
      {/* 标题区 */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Logo className="w-12 h-12" />
        </div>
        <h1
          id="top"
          className="text-3xl sm:text-4xl font-bold text-text tracking-tight scroll-mt-20"
        >
          {t("title")}
        </h1>
        <p className="mt-2 text-text-secondary max-w-lg mx-auto">
          {t("description")}
        </p>
      </div>

      {/* 主体卡片 */}
      <div className="rounded-2xl border border-border bg-bg-article p-6 sm:p-8 shadow-sm">
        {/* ── initial：选择 创建/加入 ── */}
        {phase === "initial" && (
          <div className="text-center space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              <button
                type="button"
                onClick={handleCreateRoom}
                className="group rounded-xl border border-border bg-bg-warm p-6 hover:border-teal-light transition-all hover:shadow-md text-left"
              >
                <div className="text-3xl mb-2" aria-hidden="true">
                  📡
                </div>
                <div className="text-lg font-semibold text-text">
                  {t("createRoom")}
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {t("hostHint")}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPhase("joining")}
                className="group rounded-xl border border-border bg-bg-warm p-6 hover:border-teal-light transition-all hover:shadow-md text-left"
              >
                <div className="text-3xl mb-2" aria-hidden="true">
                  🔑
                </div>
                <div className="text-lg font-semibold text-text">
                  {t("joinRoom")}
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {t("joinHint")}
                </p>
              </button>
            </div>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              {t("privacyNote")}
            </p>
          </div>
        )}

        {/* ── hosting：显示房间码 + QR + 链接 ── */}
        {phase === "hosting" && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-text-secondary mb-2">
                {t("roomCode")}
              </p>
              <p className="text-4xl sm:text-5xl font-bold text-text tracking-[0.3em] font-mono">
                {roomId}
              </p>
              <p className="mt-2 text-sm text-text-secondary animate-pulse">
                {t("waitingForPeer")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 items-center">
              {/* QR */}
              <div className="flex flex-col items-center">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={t("scanToJoin")}
                    className="w-48 h-48 rounded-lg border border-border bg-white p-2"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-lg border border-border bg-bg-warm animate-pulse" />
                )}
                <p className="mt-2 text-xs text-text-secondary">
                  {t("scanToJoin")}
                </p>
              </div>

              {/* 加入链接 */}
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-text-secondary">
                    {t("joinLink")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={buildJoinUrl(locale, roomId)}
                      className={inputClass + " text-xs font-mono"}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="shrink-0 px-3 py-2 rounded-lg border border-border bg-bg-warm text-text text-xs font-medium hover:border-teal-light"
                    >
                      {copied ? t("copied") : t("copyLink")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleDisconnect}
                className={secondaryBtn}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        {/* ── joining：输入房间码 ── */}
        {phase === "joining" && (
          <div className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="block mb-2 text-sm font-medium text-text">
                {t("enterRoomCode")}
              </label>
              <input
                type="text"
                value={joinRoomInput}
                onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABCDEF"
                autoComplete="off"
                className={inputClass + " text-center text-2xl tracking-[0.3em] font-mono uppercase"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoinRoom();
                }}
              />
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleJoinRoom}
                disabled={!ROOM_ID_RE.test(joinRoomInput.toUpperCase())}
                className={primaryBtn}
              >
                {t("connect")}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className={secondaryBtn}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        {/* ── connected：选择文件 + 发送 ── */}
        {phase === "connected" && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-success">
                {t("connected")}
              </span>
            </div>

            {/* 文件选择区（点击 + 拖拽） */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0] ?? null;
                handleFileSelect(file);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-bg-warm p-8 text-center hover:border-teal-light transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  handleFileSelect(file);
                  // 重置 input value 允许重复选择同一文件
                  e.target.value = "";
                }}
              />
              <div className="text-3xl mb-2" aria-hidden="true">
                📎
              </div>
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-text">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  {t("dragDropHint")}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleSendFile}
                disabled={!selectedFile}
                className={primaryBtn}
              >
                {t("send")}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className={secondaryBtn}
              >
                {t("disconnect")}
              </button>
            </div>
          </div>
        )}

        {/* ── transferring：进度条 ── */}
        {phase === "transferring" && progress && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-medium text-text-secondary">
                {transferRole === "sender" ? t("youAreSender") : t("youAreReceiver")}
              </span>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-text mb-2">
                {transferRole === "sender" ? t("sending") : t("receiving")}
              </p>
              <div className="w-full h-3 rounded-full bg-bg-warm overflow-hidden">
                <div
                  className="h-full bg-teal transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-text-secondary font-mono">
                {t("transferProgress", {
                  percent: progress.percentage.toFixed(1),
                  transferred: formatBytes(progress.bytesTransferred),
                  total: formatBytes(progress.totalBytes),
                })}
              </p>
            </div>

            {transferRole === "sender" && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleCancelTransfer}
                  className={secondaryBtn}
                >
                  {t("cancel")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── done：完成提示 ── */}
        {phase === "done" && (
          <div className="text-center space-y-4">
            <div className="text-4xl" aria-hidden="true">
              ✅
            </div>
            <p className="text-lg font-semibold text-text">
              {t("transferComplete")}
            </p>
            <p className="text-sm text-text-secondary">
              {transferRole === "sender" ? t("fileSent") : t("fileReceived")}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleSendAnother}
                className={primaryBtn}
              >
                {t("sendAnother")}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className={secondaryBtn}
              >
                {t("disconnect")}
              </button>
            </div>
          </div>
        )}

        {/* ── disconnected ── */}
        {phase === "disconnected" && (
          <div className="text-center space-y-4">
            <div className="text-4xl" aria-hidden="true">
              🔌
            </div>
            <p className="text-lg font-semibold text-text">
              {t("disconnected")}
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              className={primaryBtn}
            >
              {t("back")}
            </button>
          </div>
        )}

        {/* ── error ── */}
        {phase === "error" && (
          <div className="text-center space-y-4">
            <div className="text-4xl" aria-hidden="true">
              ⚠️
            </div>
            <p className="text-lg font-semibold text-coral">{errorMsg}</p>
            <button
              type="button"
              onClick={handleRetry}
              className={primaryBtn}
            >
              {t("retry")}
            </button>
          </div>
        )}
      </div>

      {/* 隐私提示 */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-secondary">
        <svg
          className="w-4 h-4 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.618 5.884l-8-3.6a2 2 0 00-1.618 0l-8 3.6A2 2 0 002 7.692V12c0 5.523 3.832 9.832 8.5 11.286a2 2 0 001 0C16.168 21.832 20 17.523 20 12V7.692a2 2 0 00-1.382-1.808z"
          />
        </svg>
        {t("privacyNote")}
      </div>
    </div>
  );
}
