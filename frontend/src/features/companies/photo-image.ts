/**
 * 공연사 사진을 올리기 전에 브라우저에서 줄인다. 휴대폰 원본(수 MB~수십 MB, HEIC, 세로로 찍은 사진)을 그대로 거절하지 않고
 * 긴 변 1600px JPEG로 다시 그려 올린다. 다시 그리면서 사진 방향을 바로잡고, 촬영 위치 같은 EXIF 정보는 남지 않는다.
 */

/** 브라우저가 열어 볼 원본 크기 상한. 이보다 크면 줄이는 중에 메모리가 부족할 수 있다. */
export const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
export const MAX_EDGE = 1600;
/** 서버 상한(10MB)보다 넉넉히 작게 맞춘다. */
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const QUALITIES = [0.85, 0.75, 0.6] as const;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?)$/i;

export class PhotoProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoProcessingError";
  }
}

/** 사진으로 보이는 파일인지. 일부 기기는 HEIC의 형식을 비워 보내므로 확장자도 본다. */
export function isLikelyImage(file: Pick<File, "name" | "type">): boolean {
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.test(file.name);
}

/** 비율을 지키면서 긴 변이 {@link MAX_EDGE}를 넘지 않는 크기. 작은 사진은 키우지 않는다. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** 고른 파일을 확인하고 줄인 JPEG로 바꾼다. 열 수 없는 파일이면 {@link PhotoProcessingError}를 던진다. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  if (!isLikelyImage(file)) throw new PhotoProcessingError("사진 파일만 올릴 수 있어요.");
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PhotoProcessingError(`사진이 너무 커요. ${MAX_SOURCE_BYTES / 1024 / 1024}MB 이하로 골라 주세요.`);
  }
  const image = await decode(file);
  try {
    const size = fitWithin(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new PhotoProcessingError("이 브라우저에서는 사진을 줄일 수 없어요.");
    // 투명한 PNG가 JPEG에서 검게 보이지 않게 흰 배경을 깐다.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image.source, 0, 0, size.width, size.height);
    for (const quality of QUALITIES) {
      const blob = await toJpeg(canvas, quality);
      if (blob.size <= MAX_OUTPUT_BYTES) return blob;
    }
    throw new PhotoProcessingError("사진을 충분히 줄이지 못했어요. 다른 사진을 골라 주세요.");
  } finally {
    image.close();
  }
}

type DecodedImage = {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  readonly close: () => void;
};

/** EXIF 방향을 반영해 연다. createImageBitmap이 없거나 실패하면 img 요소로 다시 연다. */
async function decode(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // HEIC처럼 createImageBitmap이 못 여는 형식은 img 요소가 열 수 있는 브라우저(사파리)가 있다.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const element = new Image();
    element.decoding = "async";
    element.src = url;
    await element.decode();
    return {
      source: element,
      width: element.naturalWidth,
      height: element.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoProcessingError("이 사진은 열 수 없어요. JPG나 PNG로 바꿔서 올려 주세요.");
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new PhotoProcessingError("사진을 저장하지 못했어요. 다시 시도해 주세요.")),
      "image/jpeg",
      quality,
    );
  });
}
