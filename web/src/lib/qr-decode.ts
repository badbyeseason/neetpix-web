import jsQR from "jsqr";

export type QrContentType = "url" | "wifi" | "vcard" | "email" | "phone" | "text";

export interface QrContentInfo {
  type: QrContentType;
  meta: {
    url?: string;
    wifiSsid?: string;
    wifiPassword?: string;
    wifiEnc?: string;
    vcardName?: string;
    vcardPhone?: string;
    vcardEmail?: string;
    email?: string;
    phone?: string;
  };
}

// 从 File 解析二维码，返回解码字符串或 null
export async function decodeQrFromImage(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    return code?.data ?? null;
  } catch {
    return null;
  }
}

// 检测二维码内容类型
export function detectContentType(text: string): QrContentInfo {
  const trimmed = text.trim();
  // URL
  if (/^https?:\/\//i.test(trimmed)) {
    return { type: "url", meta: { url: trimmed } };
  }
  // mailto:
  if (/^mailto:/i.test(trimmed)) {
    const email = trimmed.slice(7).split("?")[0];
    return { type: "email", meta: { email } };
  }
  // email 纯地址
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { type: "email", meta: { email: trimmed } };
  }
  // tel:
  if (/^tel:/i.test(trimmed)) {
    const phone = trimmed.slice(4);
    return { type: "phone", meta: { phone } };
  }
  // WiFi
  if (/^WIFI:/i.test(trimmed)) {
    const ssidMatch = trimmed.match(/S:([^;]*);/);
    const pwdMatch = trimmed.match(/P:([^;]*);/);
    const encMatch = trimmed.match(/T:([^;]*);/);
    return {
      type: "wifi",
      meta: {
        wifiSsid: ssidMatch?.[1] ?? "",
        wifiPassword: pwdMatch?.[1] ?? "",
        wifiEnc: encMatch?.[1] ?? "WPA",
      },
    };
  }
  // vCard
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    const nameMatch = trimmed.match(/^FN:(.+)$/m);
    const phoneMatch = trimmed.match(/^TEL:(.+)$/m);
    const emailMatch = trimmed.match(/^EMAIL:(.+)$/m);
    return {
      type: "vcard",
      meta: {
        vcardName: nameMatch?.[1] ?? "",
        vcardPhone: phoneMatch?.[1] ?? "",
        vcardEmail: emailMatch?.[1] ?? "",
      },
    };
  }
  return { type: "text", meta: {} };
}
