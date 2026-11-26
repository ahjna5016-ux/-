/**
 * Compresses an uploaded image file in-browser using Canvas so the resulting
 * JPEG data URL stays comfortably below Firestore's volumetric limit (<= 180KB).
 */
export async function compressImageForDiary(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일(JPG, PNG, WebP 등)만 업로드할 수 있습니다.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('이미지를 읽을 수 없습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지 디코딩에 실패했습니다.'));
    image.src = dataUrl;
  });

  const maxDimension = 760;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('브라우저 이미지 처리 컨텍스트를 생성할 수 없습니다.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.78;
  let output = canvas.toDataURL('image/jpeg', quality);

  while (output.length > 180000 && quality > 0.32) {
    quality -= 0.1;
    output = canvas.toDataURL('image/jpeg', quality);
  }

  if (output.length > 240000) {
    const smallerCanvas = document.createElement('canvas');
    smallerCanvas.width = Math.round(width * 0.7);
    smallerCanvas.height = Math.round(height * 0.7);
    const sCtx = smallerCanvas.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
      output = smallerCanvas.toDataURL('image/jpeg', 0.65);
    }
  }

  if (output.length > 245000) {
    throw new Error('사진 용량이 너무 큽니다. 다른 사진을 선택해 주세요.');
  }

  return output;
}
