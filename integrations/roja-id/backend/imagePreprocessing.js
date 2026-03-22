const { createCanvas, loadImage } = require('canvas');

/**
 * Предобработка изображений для улучшения качества распознавания
 */
class ImagePreprocessor {
  /**
   * Нормализация освещения через histogram equalization
   */
  static histogramEqualization(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixels = width * height;

    // Строим гистограмму яркости
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[gray]++;
    }

    // Вычисляем cumulative distribution function (CDF)
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Нормализуем CDF
    const cdfMin = cdf.find(val => val > 0);
    const cdfMax = cdf[255];
    const normalizedCdf = cdf.map(val => 
      Math.round(((val - cdfMin) / (cdfMax - cdfMin)) * 255)
    );

    // Применяем преобразование
    const newData = new Uint8ClampedArray(data);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
      const newGray = normalizedCdf[gray];
      const ratio = newGray / (gray || 1);

      newData[i] = Math.min(255, Math.max(0, data[i] * ratio));     // R
      newData[i + 1] = Math.min(255, Math.max(0, data[i + 1] * ratio)); // G
      newData[i + 2] = Math.min(255, Math.max(0, data[i + 2] * ratio)); // B
      newData[i + 3] = data[i + 3]; // Alpha
    }

    return new ImageData(newData, width, height);
  }

  /**
   * Gamma correction для улучшения контраста
   */
  static gammaCorrection(imageData, gamma = 1.2) {
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    const invGamma = 1.0 / gamma;

    for (let i = 0; i < data.length; i += 4) {
      newData[i] = Math.pow(data[i] / 255, invGamma) * 255;     // R
      newData[i + 1] = Math.pow(data[i + 1] / 255, invGamma) * 255; // G
      newData[i + 2] = Math.pow(data[i + 2] / 255, invGamma) * 255; // B
      newData[i + 3] = data[i + 3]; // Alpha
    }

    return new ImageData(newData, imageData.width, imageData.height);
  }

  /**
   * Увеличение резкости через unsharp masking
   */
  static unsharpMask(imageData, amount = 0.5, radius = 1, threshold = 0) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);

    // Простой blur для создания маски
    const blurData = this.gaussianBlur(imageData, radius);

    for (let i = 0; i < data.length; i += 4) {
      const diff = data[i] - blurData[i];
      if (Math.abs(diff) > threshold) {
        newData[i] = Math.min(255, Math.max(0, data[i] + diff * amount));
        newData[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (data[i + 1] - blurData[i + 1]) * amount));
        newData[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (data[i + 2] - blurData[i + 2]) * amount));
      } else {
        newData[i] = data[i];
        newData[i + 1] = data[i + 1];
        newData[i + 2] = data[i + 2];
      }
      newData[i + 3] = data[i + 3];
    }

    return new ImageData(newData, width, height);
  }

  /**
   * Простой Gaussian blur
   */
  static gaussianBlur(imageData, radius = 1) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);

    const kernelSize = radius * 2 + 1;
    const kernel = this.createGaussianKernel(kernelSize, radius);

    // Применяем blur по горизонтали
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, weightSum = 0;

        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const idx = (y * width + px) * 4;
          const weight = kernel[kx + radius];

          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          weightSum += weight;
        }

        const idx = (y * width + x) * 4;
        newData[idx] = r / weightSum;
        newData[idx + 1] = g / weightSum;
        newData[idx + 2] = b / weightSum;
      }
    }

    // Применяем blur по вертикали
    const finalData = new Uint8ClampedArray(newData);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, weightSum = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const idx = (py * width + x) * 4;
          const weight = kernel[ky + radius];

          r += newData[idx] * weight;
          g += newData[idx + 1] * weight;
          b += newData[idx + 2] * weight;
          weightSum += weight;
        }

        const idx = (y * width + x) * 4;
        finalData[idx] = r / weightSum;
        finalData[idx + 1] = g / weightSum;
        finalData[idx + 2] = b / weightSum;
        finalData[idx + 3] = data[idx + 3];
      }
    }

    return new ImageData(finalData, width, height);
  }

  /**
   * Создание Gaussian kernel
   */
  static createGaussianKernel(size, sigma) {
    const kernel = new Array(size);
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - center;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }

    // Нормализуем
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  }

  /**
   * Нормализация яркости и контраста
   */
  static normalizeBrightnessContrast(imageData, targetBrightness = 128, targetContrast = 1.0) {
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);

    // Вычисляем среднюю яркость
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = sum / (data.length / 4);

    // Вычисляем контраст (стандартное отклонение)
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      variance += Math.pow(brightness - avgBrightness, 2);
    }
    const stdDev = Math.sqrt(variance / (data.length / 4));
    const currentContrast = stdDev / 128; // Нормализуем

    // Применяем коррекцию
    const brightnessDiff = targetBrightness - avgBrightness;
    const contrastRatio = targetContrast / (currentContrast || 1);

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const adjustedBrightness = (brightness - avgBrightness) * contrastRatio + targetBrightness;

      const ratio = adjustedBrightness / (brightness || 1);
      newData[i] = Math.min(255, Math.max(0, data[i] * ratio));
      newData[i + 1] = Math.min(255, Math.max(0, data[i + 1] * ratio));
      newData[i + 2] = Math.min(255, Math.max(0, data[i + 2] * ratio));
      newData[i + 3] = data[i + 3];
    }

    return new ImageData(newData, imageData.width, imageData.height);
  }

  /**
   * Полная предобработка изображения
   */
  static async preprocessImage(imagePath) {
    const img = await loadImage(imagePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let imageData = ctx.getImageData(0, 0, img.width, img.height);

    // 1. Нормализация яркости и контраста
    imageData = this.normalizeBrightnessContrast(imageData, 128, 1.0);

    // 2. Histogram equalization для улучшения освещения
    imageData = this.histogramEqualization(imageData);

    // 3. Gamma correction для улучшения контраста
    imageData = this.gammaCorrection(imageData, 1.1);

    // 4. Легкое увеличение резкости
    imageData = this.unsharpMask(imageData, 0.3, 1, 5);

    // Применяем обработанное изображение
    ctx.putImageData(imageData, 0, 0);

    // Сохраняем обработанное изображение
    const processedPath = imagePath.replace(/(\.[^.]+)$/, '_processed$1');
    const fs = require('fs');
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
    fs.writeFileSync(processedPath, buffer);

    return processedPath;
  }

  /**
   * Обрезка изображения до центральной области лица
   * Использует landmarks для определения области глаз-нос-рот
   */
  static cropFaceRegion(imageData, landmarks) {
    if (!landmarks) {
      return imageData; // Возвращаем оригинал если landmarks нет
    }

    // Находим границы области лица
    const points = landmarks.positions || landmarks;
    
    // Находим минимальные и максимальные координаты
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // Используем точки глаз, носа и рта
    const eyePoints = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]; // Глаза
    const nosePoints = [27, 28, 29, 30, 31, 32, 33, 34, 35]; // Нос
    const mouthPoints = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59]; // Рот

    const relevantPoints = [...eyePoints, ...nosePoints, ...mouthPoints];

    relevantPoints.forEach(idx => {
      if (points[idx]) {
        minX = Math.min(minX, points[idx].x);
        minY = Math.min(minY, points[idx].y);
        maxX = Math.max(maxX, points[idx].x);
        maxY = Math.max(maxY, points[idx].y);
      }
    });

    // Добавляем отступы (20% сверху и снизу)
    const paddingY = (maxY - minY) * 0.2;
    const paddingX = (maxX - minX) * 0.1;

    const x = Math.max(0, Math.floor(minX - paddingX));
    const y = Math.max(0, Math.floor(minY - paddingY));
    const width = Math.min(imageData.width - x, Math.ceil(maxX - minX + paddingX * 2));
    const height = Math.min(imageData.height - y, Math.ceil(maxY - minY + paddingY * 2));

    // Обрезаем изображение
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const croppedData = ctx.createImageData(width, height);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const srcX = x + px;
        const srcY = y + py;
        const srcIdx = (srcY * imageData.width + srcX) * 4;
        const dstIdx = (py * width + px) * 4;

        if (srcIdx >= 0 && srcIdx < imageData.data.length) {
          croppedData.data[dstIdx] = imageData.data[srcIdx];
          croppedData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
          croppedData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
          croppedData.data[dstIdx + 3] = imageData.data[srcIdx + 3];
        }
      }
    }

    return croppedData;
  }
}

module.exports = ImagePreprocessor;
