// Neetpix Remove Background Engine
// Uses onnxruntime-web with RMBG-1.4 model (briaai/RMBG-1.4)
// Fallback: canvas-based edge detection + color sampling
import type { Tensor } from "onnxruntime-web";

interface ModelInput {

  image: HTMLImageElement;
  onProgress?: (progress: number) => void;
}

// RMBG-1.4 preprocessing: normalize with mean=0.5, std=1.0
function preprocess(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement
): { tensor: Float32Array; originalW: number; originalH: number } {
  const targetSize = 1024;

  // Calculate aspect-ratio-preserving dimensions
  const originalW = img.width;
  const originalH = img.height;
  const scale = Math.min(targetSize / originalW, targetSize / originalH);
  const w = Math.round(originalW * scale);
  const h = Math.round(originalH * scale);

  // Draw resized image centered on 1024x1024 canvas
  canvas.width = targetSize;
  canvas.height = targetSize;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, targetSize, targetSize);
  ctx.drawImage(img, (targetSize - w) / 2, (targetSize - h) / 2, w, h);

  // Get pixel data and normalize
  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const pixels = imageData.data;
  const tensor = new Float32Array(3 * targetSize * targetSize);

  // Normalize: mean=0.5, std=1.0 → pixel = pixel / 255 - 0.5
  for (let i = 0; i < targetSize * targetSize; i++) {
    tensor[i] = pixels[i * 4] / 255 - 0.5;           // R
    tensor[targetSize * targetSize + i] = pixels[i * 4 + 1] / 255 - 0.5;  // G
    tensor[2 * targetSize * targetSize + i] = pixels[i * 4 + 2] / 255 - 0.5; // B
  }

  return { tensor, originalW, originalH };
}

function postprocess(
  maskOutput: Float32Array,
  originalW: number,
  originalH: number,
  sourceData: ImageData
): ImageData {
  const targetSize = 1024;
  const scale = Math.min(targetSize / originalW, targetSize / originalH);
  const w = Math.round(originalW * scale);
  const h = Math.round(originalH * scale);
  const offsetX = (targetSize - w) / 2;
  const offsetY = (targetSize - h) / 2;

  // 创建结果 ImageData (RGBA)
  const result = new ImageData(originalW, originalH);
  const srcPixels = sourceData.data;

  // 将 mask 缩放回原始尺寸，并应用软 alpha 渐变（避免硬阈值导致的锯齿）
  for (let y = 0; y < originalH; y++) {
    for (let x = 0; x < originalW; x++) {
      const srcIdx = (y * originalW + x) * 4;
      const dstIdx = (y * originalW + x) * 4;

      // 映射回 1024x1024 坐标空间
      const mx = Math.round(x * scale + offsetX);
      const my = Math.round(y * scale + offsetY);
      const maskIdx = my * targetSize + mx;

      // sigmoid + 软 alpha 渐变
      const maskVal = 1 / (1 + Math.exp(-maskOutput[maskIdx]));
      let alpha: number;
      if (maskVal < 0.1) {
        alpha = 0;                                       // 完全透明
      } else if (maskVal > 0.9) {
        alpha = 255;                                     // 完全不透明
      } else {
        alpha = Math.round(((maskVal - 0.1) / 0.8) * 255); // 线性渐变
      }

      result.data[dstIdx] = srcPixels[srcIdx];         // R
      result.data[dstIdx + 1] = srcPixels[srcIdx + 1]; // G
      result.data[dstIdx + 2] = srcPixels[srcIdx + 2]; // B
      result.data[dstIdx + 3] = alpha;                 // A
    }
  }

  // 边缘羽化：用 Canvas filter 对 alpha 通道做轻度模糊，平滑边缘
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = originalW;
  blurCanvas.height = originalH;
  const blurCtx = blurCanvas.getContext("2d")!;
  blurCtx.putImageData(result, 0, 0);

  const featherCanvas = document.createElement("canvas");
  featherCanvas.width = originalW;
  featherCanvas.height = originalH;
  const featherCtx = featherCanvas.getContext("2d")!;
  featherCtx.filter = "blur(1px)";
  featherCtx.drawImage(blurCanvas, 0, 0);

  return featherCtx.getImageData(0, 0, originalW, originalH);
}

// Fallback: simple canvas-based background removal using edge/color detection
function fallbackRemoveBackground(
  img: HTMLImageElement,
  maxDim: number = 1024
): HTMLCanvasElement {
  const w = Math.min(img.width, maxDim);
  const h = Math.min(img.height, maxDim);
  const ratio = Math.min(w / img.width, h / img.height);
  const cw = Math.round(img.width * ratio);
  const ch = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, cw, ch);

  const imageData = ctx.getImageData(0, 0, cw, ch);
  const data = imageData.data;

  // Sample edge pixels to determine background color
  const edgePixels: number[][] = [];
  const sampleStep = 5;

  // Top edge
  for (let x = 0; x < cw; x += sampleStep) {
    const idx = (0 * cw + x) * 4;
    edgePixels.push([data[idx], data[idx + 1], data[idx + 2]]);
  }
  // Bottom edge
  for (let x = 0; x < cw; x += sampleStep) {
    const idx = ((ch - 1) * cw + x) * 4;
    edgePixels.push([data[idx], data[idx + 1], data[idx + 2]]);
  }
  // Left edge
  for (let y = 0; y < ch; y += sampleStep) {
    const idx = (y * cw + 0) * 4;
    edgePixels.push([data[idx], data[idx + 1], data[idx + 2]]);
  }
  // Right edge
  for (let y = 0; y < ch; y += sampleStep) {
    const idx = (y * cw + (cw - 1)) * 4;
    edgePixels.push([data[idx], data[idx + 1], data[idx + 2]]);
  }

  // Calculate median background color
  const bgR = Math.round(edgePixels.map((p) => p[0]).sort((a, b) => a - b)[Math.floor(edgePixels.length / 2)]);
  const bgG = Math.round(edgePixels.map((p) => p[1]).sort((a, b) => a - b)[Math.floor(edgePixels.length / 2)]);
  const bgB = Math.round(edgePixels.map((p) => p[2]).sort((a, b) => a - b)[Math.floor(edgePixels.length / 2)]);

  // Threshold for background detection
  const threshold = 40;

  // Create output with alpha transparency
  const output = ctx.createImageData(cw, ch);
  for (let i = 0; i < data.length; i += 4) {
    const dr = Math.abs(data[i] - bgR);
    const dg = Math.abs(data[i + 1] - bgG);
    const db = Math.abs(data[i + 2] - bgB);
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    output.data[i] = data[i];
    output.data[i + 1] = data[i + 1];
    output.data[i + 2] = data[i + 2];
    output.data[i + 3] = distance > threshold ? 255 : 0;
  }

  ctx.putImageData(output, 0, 0);
  return canvas;
}

// 模型 URL（HuggingFace CDN）
const modelUrl = "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx";

// 通过 Cache API 缓存模型，避免重复下载 178MB 的模型文件
async function loadModel(): Promise<ArrayBuffer> {
  const cache = await caches.open("neetpix-models");
  const cached = await cache.match(modelUrl);
  if (cached) {
    return await cached.arrayBuffer();
  }
  // 从网络加载
  const res = await fetch(modelUrl);
  const buffer = await res.arrayBuffer();
  // 存入缓存，下次直接读取
  await cache.put(modelUrl, new Response(buffer));
  return buffer;
}

export async function removeBackgroundAI(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = async () => {
        try {
          onProgress?.(10);

          // Try to load ONNX model and run inference
          let resultCanvas: HTMLCanvasElement;

          try {
            const ort = await import("onnxruntime-web");
            onProgress?.(5); // 开始加载模型

            // 通过 Cache API 加载模型（优先使用缓存，避免重复下载）
            const modelBuffer = await loadModel();
            onProgress?.(15); // 模型加载完成

            // 优先使用 WebGPU，其次 WebGL，最后回退到 WASM
            const session = await ort.InferenceSession.create(modelBuffer, {
              executionProviders: ["webgpu", "webgl", "wasm"],
            });
            onProgress?.(40);

            // Preprocess
            const preprocessCanvas = document.createElement("canvas");
            const preprocessCtx = preprocessCanvas.getContext("2d")!;
            const { tensor, originalW, originalH } = preprocess(preprocessCanvas, preprocessCtx, img);
            onProgress?.(50);

            // Create ONNX tensor
            const inputTensor = new ort.Tensor("float32", tensor, [1, 3, 1024, 1024]);
            onProgress?.(60);

            // Run inference
            const feeds: Record<string, Tensor> = {};
            feeds[session.inputNames[0]] = inputTensor;
            const results = await session.run(feeds);
            onProgress?.(75);

            // Get output mask
            const outputTensor = results[session.outputNames[0]];
            const maskData = outputTensor.data as Float32Array;

            // Create source image data for postprocessing
            const sourceCanvas = document.createElement("canvas");
            sourceCanvas.width = originalW;
            sourceCanvas.height = originalH;
            const sourceCtx = sourceCanvas.getContext("2d")!;
            sourceCtx.drawImage(img, 0, 0, originalW, originalH);
            const sourceData = sourceCtx.getImageData(0, 0, originalW, originalH);

            // Postprocess
            const resultImageData = postprocess(maskData, originalW, originalH, sourceData);
            onProgress?.(85);

            resultCanvas = document.createElement("canvas");
            resultCanvas.width = originalW;
            resultCanvas.height = originalH;
            resultCanvas.getContext("2d")!.putImageData(resultImageData, 0, 0);
          } catch (modelError) {
            console.warn("ONNX model failed, using fallback:", modelError);
            // Fallback to canvas-based detection
            resultCanvas = fallbackRemoveBackground(img);
          }

          onProgress?.(95);

          // Convert to data URL
          const resultUrl = resultCanvas.toDataURL("image/png");
          URL.revokeObjectURL(url);
          onProgress?.(100);
          resolve(resultUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}