export type ProcessingSettings = {
  noiseMethod: "median" | "gaussian";
  kernelSize: number;
  contrastMethod: "clahe" | "equalize";
  clipLimit: number;
  tileGrid: number;
  sharpenStrength: number;
  sharpenSigma: number;
  forceGrayscale: boolean;
};

export type ImageStats = {
  width: number;
  height: number;
  mean: number;
  contrast: number;
  entropy: number;
  sharpness: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(255, value));
}

function grayscale(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
}

function blur(source: ImageData, radius: number, sigma: number) {
  const { width, height, data } = source;
  const output = new Uint8ClampedArray(data.length);
  const weights: number[] = [];
  let total = 0;
  for (let offset = -radius; offset <= radius; offset++) {
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    weights.push(weight);
    total += weight;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset++) {
          const px = Math.max(0, Math.min(width - 1, x + offset));
          sum += data[(y * width + px) * 4 + channel] * weights[offset + radius];
        }
        output[(y * width + x) * 4 + channel] = sum / total;
      }
      output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }
  const vertical = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset++) {
          const py = Math.max(0, Math.min(height - 1, y + offset));
          sum += output[(py * width + x) * 4 + channel] * weights[offset + radius];
        }
        vertical[(y * width + x) * 4 + channel] = sum / total;
      }
      vertical[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }
  return vertical;
}

function equalize(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  settings: ProcessingSettings,
) {
  const grid = settings.contrastMethod === "clahe" ? settings.tileGrid : 1;
  const maps: Uint8Array[] = [];
  const tileWidth = Math.ceil(width / grid);
  const tileHeight = Math.ceil(height / grid);
  for (let tileY = 0; tileY < grid; tileY++) {
    for (let tileX = 0; tileX < grid; tileX++) {
      const left = tileX * tileWidth;
      const top = tileY * tileHeight;
      const right = Math.min(width, left + tileWidth);
      const bottom = Math.min(height, top + tileHeight);
      const histogram = new Uint32Array(256);
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const i = (y * width + x) * 4;
          histogram[Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)]++;
        }
      }
      const area = Math.max(1, (right - left) * (bottom - top));
      if (settings.contrastMethod === "clahe") {
        const limit = Math.max(1, Math.floor(settings.clipLimit * area / 256));
        let excess = 0;
        for (let i = 0; i < 256; i++) {
          if (histogram[i] > limit) { excess += histogram[i] - limit; histogram[i] = limit; }
        }
        const perBin = Math.floor(excess / 256);
        const remainder = excess - perBin * 256;
        for (let i = 0; i < 256; i++) histogram[i] += perBin + (i < remainder ? 1 : 0);
      }
      const map = new Uint8Array(256);
      let accumulated = 0;
      let first = 0;
      while (first < 256 && histogram[first] === 0) first++;
      const denominator = area - (histogram[first] ?? 0);
      for (let i = 0; i < 256; i++) {
        accumulated += histogram[i];
        map[i] = denominator > 0 ? Math.round(((accumulated - histogram[first]) / denominator) * 255) : i;
      }
      maps.push(map);
    }
  }
  for (let y = 0; y < height; y++) {
    const gridY = Math.min(grid - 1, Math.floor(y / tileHeight));
    const nextGridY = Math.min(grid - 1, gridY + 1);
    const blendY = (y - gridY * tileHeight) / tileHeight;
    for (let x = 0; x < width; x++) {
      const gridX = Math.min(grid - 1, Math.floor(x / tileWidth));
      const nextGridX = Math.min(grid - 1, gridX + 1);
      const blendX = (x - gridX * tileWidth) / tileWidth;
      const i = (y * width + x) * 4;
      const old = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      const topLeft = maps[gridY * grid + gridX][old];
      const topRight = maps[gridY * grid + nextGridX][old];
      const bottomLeft = maps[nextGridY * grid + gridX][old];
      const bottomRight = maps[nextGridY * grid + nextGridX][old];
      const mapped = (topLeft * (1 - blendX) + topRight * blendX) * (1 - blendY) + (bottomLeft * (1 - blendX) + bottomRight * blendX) * blendY;
      const ratio = old ? mapped / old : 0;
      data[i] = clamp(data[i] * ratio);
      data[i + 1] = clamp(data[i + 1] * ratio);
      data[i + 2] = clamp(data[i + 2] * ratio);
    }
  }
}

function medianFilter(data: Uint8ClampedArray, width: number, height: number, kernel: number) {
  const radius = Math.floor(kernel / 2);
  const output = new Uint8ClampedArray(data.length);
  const values = new Array<number>(kernel * kernel);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const py = Math.max(0, Math.min(height - 1, y + dy));
          const px = Math.max(0, Math.min(width - 1, x + dx));
          values[count++] = data[(py * width + px) * 4];
        }
      }
      const ordered = values.slice(0, count).sort((a, b) => a - b);
      const value = ordered[Math.floor(count / 2)];
      const index = (y * width + x) * 4;
      output[index] = output[index + 1] = output[index + 2] = value;
      output[index + 3] = data[index + 3];
    }
  }
  return output;
}

export function processImage(source: ImageData, settings: ProcessingSettings) {
  const result = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  if (settings.forceGrayscale) grayscale(result.data);

  if (settings.noiseMethod === "median") {
    const gray = new Uint8ClampedArray(result.data.length);
    for (let i = 0; i < result.data.length; i += 4) {
      const value = Math.round(result.data[i] * 0.299 + result.data[i + 1] * 0.587 + result.data[i + 2] * 0.114);
      gray[i] = gray[i + 1] = gray[i + 2] = value;
      gray[i + 3] = result.data[i + 3];
    }
    const median = medianFilter(gray, source.width, source.height, settings.kernelSize);
    for (let i = 0; i < median.length; i += 4) {
      const oldLum = gray[i];
      const ratio = oldLum ? median[i] / oldLum : 0;
      result.data[i] = clamp(result.data[i] * ratio);
      result.data[i + 1] = clamp(result.data[i + 1] * ratio);
      result.data[i + 2] = clamp(result.data[i + 2] * ratio);
    }
  } else {
    const soft = blur(result, Math.min(3, Math.max(1, Math.ceil(settings.sharpenSigma))), Math.max(0.4, settings.sharpenSigma));
    for (let i = 0; i < result.data.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        result.data[i + channel] = clamp((result.data[i + channel] + soft[i + channel]) / 2);
      }
    }
  }

  equalize(result.data, source.width, source.height, settings);
  const soft = blur(result, 2, Math.max(0.5, settings.sharpenSigma));
  for (let i = 0; i < result.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      result.data[i + channel] = clamp(result.data[i + channel] + settings.sharpenStrength * (result.data[i + channel] - soft[i + channel]));
    }
  }
  return result;
}

export function measureImage(image: ImageData): ImageStats {
  const histogram = new Uint32Array(256);
  let sum = 0;
  let sumSquares = 0;
  let edgeSum = 0;
  let edgeCount = 0;
  const { data, width, height } = image;
  const pixel = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = pixel(x, y);
      histogram[value]++;
      sum += value;
      sumSquares += value * value;
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const laplacian = pixel(x - 1, y) + pixel(x + 1, y) + pixel(x, y - 1) + pixel(x, y + 1) - 4 * value;
        edgeSum += laplacian * laplacian;
        edgeCount++;
      }
    }
  }
  const count = width * height;
  let entropy = 0;
  for (const frequency of histogram) {
    if (frequency) {
      const probability = frequency / count;
      entropy -= probability * Math.log2(probability);
    }
  }
  const mean = sum / count;
  return {
    width,
    height,
    mean,
    contrast: Math.sqrt(Math.max(0, sumSquares / count - mean * mean)),
    entropy,
    sharpness: edgeCount ? edgeSum / edgeCount : 0,
  };
}
