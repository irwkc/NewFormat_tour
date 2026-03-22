const { createCanvas, loadImage, ImageData } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * Анализ изображения для определения подлинности
 * Проверяет различные признаки, которые могут указывать на спуфинг
 */
class ImageAnalyzer {
  /**
   * Анализ текстуры изображения для определения печати на бумаге
   * Печатные фото имеют характерные артефакты: полосы принтера, точки растра и т.д.
   */
  static analyzeTexture(imagePath) {
    return new Promise(async (resolve) => {
      try {
        const img = await loadImage(imagePath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // 1. Анализ вариаций яркости (Variance of Laplacian)
        const laplacianVariance = this.calculateLaplacianVariance(imageData);
        
        // 2. Анализ гистограммы для обнаружения характерных паттернов принтера
        const histogramFeatures = this.analyzeHistogram(imageData);
        
        // 3. Анализ частотных характеристик (FFT-like features через локальные паттерны)
        const frequencyFeatures = this.analyzeFrequencyPatterns(imageData);
        
        // 4. Анализ градиентов для обнаружения неестественных переходов
        const gradientFeatures = this.analyzeGradients(imageData);

        // Суммарная оценка
        const textureScore = this.combineTextureFeatures({
          laplacianVariance,
          histogramFeatures,
          frequencyFeatures,
          gradientFeatures
        });

        resolve({
          isLikelyPrinted: textureScore.isLikelyPrinted,
          confidence: textureScore.confidence,
          details: {
            laplacianVariance,
            histogramFeatures,
            frequencyFeatures,
            gradientFeatures
          }
        });
      } catch (error) {
        console.error('Ошибка анализа текстуры:', error);
        resolve({ isLikelyPrinted: false, confidence: 0, details: {} });
      }
    });
  }

  /**
   * Вычисление дисперсии лапласиана для определения резкости
   * Низкая дисперсия может указывать на размытое или печатное фото
   */
  static calculateLaplacianVariance(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const laplacianKernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
    const laplacianValues = [];

    // Применяем ядро Лапласа для вычисления второй производной
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        let kernelIndex = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            sum += gray * laplacianKernel[kernelIndex++];
          }
        }
        
        laplacianValues.push(sum * sum);
      }
    }

    // Вычисляем дисперсию
    const mean = laplacianValues.reduce((a, b) => a + b, 0) / laplacianValues.length;
    const variance = laplacianValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / laplacianValues.length;

    return {
      variance,
      mean,
      isBlurry: variance < 100 // Порог для размытых изображений
    };
  }

  /**
   * Анализ гистограммы для обнаружения характерных паттернов печати
   */
  static analyzeHistogram(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const histogram = new Array(256).fill(0);

    // Строим гистограмму яркости
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[gray]++;
    }

    // Нормализуем гистограмму
    const total = width * height;
    const normalizedHist = histogram.map(h => h / total);

    // Анализ характеристик гистограммы
    // Печатные фото часто имеют характерные "зубцы" в гистограмме
    const peaks = this.countHistogramPeaks(normalizedHist);
    const entropy = this.calculateHistogramEntropy(normalizedHist);
    const uniformity = this.calculateHistogramUniformity(normalizedHist);

    return {
      peaks,
      entropy,
      uniformity,
      // Много пиков может указывать на печать (характерные артефакты)
      suspiciousPattern: peaks > 8 && entropy < 5
    };
  }

  /**
   * Подсчет пиков в гистограмме
   */
  static countHistogramPeaks(histogram) {
    let peaks = 0;
    const threshold = 0.001; // Минимальная высота пика

    for (let i = 1; i < histogram.length - 1; i++) {
      if (histogram[i] > threshold &&
          histogram[i] > histogram[i - 1] &&
          histogram[i] > histogram[i + 1]) {
        peaks++;
      }
    }

    return peaks;
  }

  /**
   * Вычисление энтропии гистограммы
   */
  static calculateHistogramEntropy(histogram) {
    let entropy = 0;
    for (let i = 0; i < histogram.length; i++) {
      if (histogram[i] > 0) {
        entropy -= histogram[i] * Math.log2(histogram[i]);
      }
    }
    return entropy;
  }

  /**
   * Вычисление однородности гистограммы
   */
  static calculateHistogramUniformity(histogram) {
    let uniformity = 0;
    for (let i = 0; i < histogram.length; i++) {
      uniformity += histogram[i] * histogram[i];
    }
    return uniformity;
  }

  /**
   * Анализ частотных паттернов для обнаружения регулярных артефактов
   */
  static analyzeFrequencyPatterns(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Анализируем локальные паттерны для обнаружения регулярности
    const patternRegularity = this.checkPatternRegularity(imageData);
    
    // Анализ локальных вариаций
    const localVariance = this.calculateLocalVariance(imageData);

    return {
      patternRegularity,
      localVariance,
      // Высокая регулярность может указывать на печать
      isTooRegular: patternRegularity > 0.7
    };
  }

  /**
   * Проверка регулярности паттернов
   */
  static checkPatternRegularity(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const blockSize = 8;
    const blocks = [];

    // Разбиваем изображение на блоки
    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        let blockSum = 0;
        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            const idx = ((y + by) * width + (x + bx)) * 4;
            blockSum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          }
        }
        blocks.push(blockSum / (blockSize * blockSize));
      }
    }

    // Вычисляем коэффициент вариации (регулярность)
    const mean = blocks.reduce((a, b) => a + b, 0) / blocks.length;
    const variance = blocks.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / blocks.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? 1 - (stdDev / mean) : 0; // 1 = полностью регулярно
  }

  /**
   * Вычисление локальной вариации
   */
  static calculateLocalVariance(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const windowSize = 5;
    const variances = [];

    for (let y = windowSize; y < height - windowSize; y += windowSize) {
      for (let x = windowSize; x < width - windowSize; x += windowSize) {
        const values = [];
        for (let wy = -windowSize; wy <= windowSize; wy++) {
          for (let wx = -windowSize; wx <= windowSize; wx++) {
            const idx = ((y + wy) * width + (x + wx)) * 4;
            values.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
          }
        }
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        variances.push(variance);
      }
    }

    return {
      mean: variances.reduce((a, b) => a + b, 0) / variances.length,
      stdDev: Math.sqrt(
        variances.reduce((sum, val, _, arr) => {
          const m = arr.reduce((a, b) => a + b, 0) / arr.length;
          return sum + Math.pow(val - m, 2);
        }, 0) / variances.length
      )
    };
  }

  /**
   * Анализ градиентов для обнаружения неестественных переходов
   */
  static analyzeGradients(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const gradients = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx1 = (y * width + (x - 1)) * 4;
        const idx2 = (y * width + (x + 1)) * 4;
        const idx3 = ((y - 1) * width + x) * 4;
        const idx4 = ((y + 1) * width + x) * 4;

        const gray1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
        const gray2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
        const gray3 = (data[idx3] + data[idx3 + 1] + data[idx3 + 2]) / 3;
        const gray4 = (data[idx4] + data[idx4 + 1] + data[idx4 + 2]) / 3;

        const gradX = Math.abs(gray2 - gray1);
        const gradY = Math.abs(gray4 - gray3);
        const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);

        gradients.push(magnitude);
      }
    }

    // Анализ распределения градиентов
    gradients.sort((a, b) => a - b);
    const median = gradients[Math.floor(gradients.length / 2)];
    const q75 = gradients[Math.floor(gradients.length * 0.75)];
    const q25 = gradients[Math.floor(gradients.length * 0.25)];

    return {
      median,
      iqr: q75 - q25, // Interquartile range
      // Неестественно резкие или мягкие переходы могут указывать на манипуляции
      suspiciousGradients: (q75 / (median + 1)) > 3 || median < 5
    };
  }

  /**
   * Комбинирование признаков текстуры для финальной оценки
   */
  static combineTextureFeatures(features) {
    let suspicionScore = 0;
    const weights = {
      blur: 0.2,
      histogram: 0.3,
      regularity: 0.3,
      gradients: 0.2
    };

    // Проверка размытости
    if (features.laplacianVariance.isBlurry) {
      suspicionScore += weights.blur * 0.5;
    }

    // Проверка гистограммы
    if (features.histogramFeatures.suspiciousPattern) {
      suspicionScore += weights.histogram;
    }

    // Проверка регулярности
    if (features.frequencyFeatures.isTooRegular) {
      suspicionScore += weights.regularity;
    }

    // Проверка градиентов
    if (features.gradientFeatures.suspiciousGradients) {
      suspicionScore += weights.gradients;
    }

    return {
      isLikelyPrinted: suspicionScore > 0.4, // Порог подозрения
      confidence: Math.min(suspicionScore, 1.0),
      score: suspicionScore
    };
  }

  /**
   * Анализ освещения для определения 3D-структуры
   */
  static async analyzeLighting(imagePath, faceRegion) {
    return new Promise(async (resolve) => {
      try {
        const img = await loadImage(imagePath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        if (!faceRegion) {
          // Используем центральную область лица как fallback
          faceRegion = {
            x: Math.floor(img.width * 0.25),
            y: Math.floor(img.height * 0.25),
            width: Math.floor(img.width * 0.5),
            height: Math.floor(img.height * 0.5)
          };
        }

        // Анализ направления освещения по градиентам яркости
        const lightingDirection = this.estimateLightingDirection(imageData, faceRegion);
        
        // Анализ вариаций освещения (3D-структура должна создавать тени)
        const lightingVariation = this.analyzeLightingVariation(imageData, faceRegion);

        resolve({
          hasNaturalLighting: lightingVariation.hasVariation,
          lightingDirection,
          variationScore: lightingVariation.score,
          // Плоское освещение может указывать на фото
          isFlat: lightingVariation.score < 0.3
        });
      } catch (error) {
        console.error('Ошибка анализа освещения:', error);
        resolve({ hasNaturalLighting: true, lightingDirection: null, isFlat: false });
      }
    });
  }

  /**
   * Оценка направления освещения
   */
  static estimateLightingDirection(imageData, region) {
    const data = imageData.data;
    const width = imageData.width;
    let leftBrightness = 0;
    let rightBrightness = 0;
    let topBrightness = 0;
    let bottomBrightness = 0;
    let count = 0;

    const sampleSize = 10;
    const stepX = Math.floor(region.width / sampleSize);
    const stepY = Math.floor(region.height / sampleSize);

    for (let y = region.y; y < region.y + region.height; y += stepY) {
      for (let x = region.x; x < region.x + region.width; x += stepX) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Разделяем на области
        const relativeX = x - region.x;
        const relativeY = y - region.y;

        if (relativeX < region.width / 2) leftBrightness += brightness;
        else rightBrightness += brightness;

        if (relativeY < region.height / 2) topBrightness += brightness;
        else bottomBrightness += brightness;

        count++;
      }
    }

    return {
      horizontal: (rightBrightness - leftBrightness) / count,
      vertical: (bottomBrightness - topBrightness) / count
    };
  }

  /**
   * Анализ вариаций освещения
   */
  static analyzeLightingVariation(imageData, region) {
    const data = imageData.data;
    const width = imageData.width;
    const brightnessValues = [];

    const sampleSize = 20;
    const stepX = Math.floor(region.width / sampleSize);
    const stepY = Math.floor(region.height / sampleSize);

    for (let y = region.y; y < region.y + region.height; y += stepY) {
      for (let x = region.x; x < region.x + region.width; x += stepX) {
        const idx = (y * width + x) * 4;
        brightnessValues.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
      }
    }

    const mean = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
    const variance = brightnessValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / brightnessValues.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

    return {
      hasVariation: coefficientOfVariation > 0.05,
      score: Math.min(coefficientOfVariation * 10, 1.0), // Нормализуем до 0-1
      variance,
      stdDev
    };
  }

  /**
   * Полный анализ изображения
   */
  static async fullAnalysis(imagePath, faceRegion = null) {
    const textureAnalysis = await this.analyzeTexture(imagePath);
    const lightingAnalysis = await this.analyzeLighting(imagePath, faceRegion);

    const overallScore = (textureAnalysis.confidence * 0.6) + (lightingAnalysis.isFlat ? 0.4 : 0);
    const isLikelyFake = textureAnalysis.isLikelyPrinted || lightingAnalysis.isFlat;

    return {
      isLikelyFake,
      confidence: overallScore,
      texture: textureAnalysis,
      lighting: lightingAnalysis,
      recommendation: isLikelyFake ? 'REJECT' : 'ACCEPT'
    };
  }
}

module.exports = ImageAnalyzer;
