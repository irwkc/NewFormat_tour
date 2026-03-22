/**
 * Модуль для оценки качества захвата лица
 * 
 * Анализирует:
 * - Качество лица (четкость, резкость)
 * - Угол наклона лица
 * - Освещение (яркость, равномерность)
 * - Позиционирование (расстояние, центр кадра)
 * - 3D-глубина (базовая оценка структуры лица)
 */

class QualityAnalyzer {
  constructor() {
    // Пороги для оценки качества
    this.thresholds = {
      // Качество лица (0-1)
      faceQualityMin: 0.5,
      faceQualityGood: 0.7,
      
      // Угол наклона (градусы)
      angleTolerance: 15, // Максимальный допустимый наклон
      angleGood: 10, // Хороший угол
      
      // Освещение (0-255)
      brightnessMin: 50,
      brightnessMax: 200,
      brightnessIdeal: 100, // Идеальная яркость
      brightnessGoodRange: 70, // Диапазон хорошей яркости
      
      // Контраст (0-1)
      contrastMin: 0.3,
      contrastGood: 0.5,
      
      // Размер лица (% от кадра)
      sizeMin: 0.15, // 15% от высоты кадра
      sizeMax: 0.6,  // 60% от высоты кадра
      sizeIdeal: 0.3, // 30% идеально
      
      // Позиционирование (% от центра)
      centerTolerance: 0.3, // 30% от центра допустимо
      centerGood: 0.2, // 20% идеально
    };
  }

  /**
   * Полный анализ качества захвата лица
   * @param {Object} detection - Результат обнаружения лица от face-api.js
   * @param {HTMLVideoElement} video - Видео элемент
   * @returns {Object} Объект с оценками качества и рекомендациями
   */
  analyzeQuality(detection, video) {
    if (!detection || !video) {
      return {
        overall: 0,
        faceQuality: 0,
        angle: 0,
        lighting: 0,
        positioning: 0,
        depth3D: 0,
        recommendations: ['Лицо не обнаружено. Убедитесь, что ваше лицо хорошо видно.']
      };
    }

    const analysis = {
      faceQuality: this.analyzeFaceQuality(detection, video),
      angle: this.analyzeFaceAngle(detection),
      lighting: this.analyzeLighting(detection, video),
      positioning: this.analyzePositioning(detection, video),
      depth3D: this.analyzeDepth3D(detection),
    };

    // Общая оценка (взвешенная сумма)
    analysis.overall = (
      analysis.faceQuality * 0.3 +
      analysis.angle * 0.2 +
      analysis.lighting * 0.25 +
      analysis.positioning * 0.15 +
      analysis.depth3D * 0.1
    );

    // Генерируем рекомендации
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Анализ качества лица (четкость, резкость, детали)
   */
  analyzeFaceQuality(detection, video) {
    if (!detection.landmarks) return 0.5;

    // Оценка на основе размера лица
    const box = detection.detection.box;
    const faceArea = box.width * box.height;
    const frameArea = video.videoWidth * video.videoHeight;
    const faceSizeRatio = faceArea / frameArea;

    // Идеальный размер: 15-35% от кадра
    let sizeScore = 1;
    if (faceSizeRatio < this.thresholds.sizeMin) {
      sizeScore = faceSizeRatio / this.thresholds.sizeMin;
    } else if (faceSizeRatio > 0.35) {
      sizeScore = 1 - (faceSizeRatio - 0.35) / 0.25;
    }

    // Оценка симметрии (базовая проверка четкости)
    const landmarks = detection.landmarks.positions;
    if (landmarks.length >= 68) {
      // Сравниваем симметрию глаз
      const leftEye = this.getEyeCenter(landmarks, 36, 41);
      const rightEye = this.getEyeCenter(landmarks, 42, 47);
      const eyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) + 
        Math.pow(rightEye.y - leftEye.y, 2)
      );
      
      // Оценка на основе расстояния между глазами (должно быть разумным)
      const faceWidth = box.width;
      const eyeDistanceRatio = eyeDistance / faceWidth;
      // Идеальное соотношение: ~0.3-0.4
      const eyeScore = Math.abs(eyeDistanceRatio - 0.35) < 0.1 ? 1 : 0.7;
      
      return (sizeScore * 0.6 + eyeScore * 0.4);
    }

    return sizeScore;
  }

  /**
   * Анализ угла наклона лица
   */
  analyzeFaceAngle(detection) {
    if (!detection.landmarks) return 0.5;

    const landmarks = detection.landmarks.positions;
    if (landmarks.length < 68) return 0.5;

    // Определяем угол по положению глаз
    const leftEye = this.getEyeCenter(landmarks, 36, 41);
    const rightEye = this.getEyeCenter(landmarks, 42, 47);

    // Угол поворота вокруг вертикальной оси (yaw)
    const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
    const yawAngle = Math.abs(eyeAngle); // Ожидаем ~0 для прямого лица

    // Угол наклона (pitch) по положению носа относительно глаз
    const nose = landmarks[30]; // Кончик носа
    const eyesCenterY = (leftEye.y + rightEye.y) / 2;
    const noseToEyesDistance = nose.y - eyesCenterY;
    const faceHeight = Math.abs(leftEye.y - landmarks[8].y); // От глаз до подбородка
    const pitchRatio = noseToEyesDistance / faceHeight;
    // Идеальное соотношение: ~0.2-0.3
    const pitchAngle = Math.abs(pitchRatio - 0.25) * 180;

    // Угол наклона влево/вправо (roll)
    const rollAngle = Math.abs(eyeAngle);

    // Общая оценка угла (чем ближе к 0, тем лучше)
    const maxAngle = Math.max(yawAngle, pitchAngle, rollAngle);
    const angleScore = Math.max(0, 1 - (maxAngle / this.thresholds.angleTolerance));

    return Math.min(1, angleScore);
  }

  /**
   * Анализ освещения
   */
  analyzeLighting(detection, video) {
    const box = detection.detection.box;
    
    // Создаем временный canvas для анализа области лица
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Извлекаем область лица
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const width = Math.min(canvas.width - x, Math.floor(box.width));
    const height = Math.min(canvas.height - y, Math.floor(box.height));

    if (width <= 0 || height <= 0) return 0.5;

    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;

    // Вычисляем среднюю яркость
    let sumBrightness = 0;
    let sumContrast = 0;
    let minBrightness = 255;
    let maxBrightness = 0;
    const pixelCount = width * height;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sumBrightness += brightness;
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);
    }

    const avgBrightness = sumBrightness / pixelCount;
    const contrast = (maxBrightness - minBrightness) / 255;

    // Оценка яркости (идеальная: ~100)
    let brightnessScore = 1;
    if (avgBrightness < this.thresholds.brightnessMin) {
      brightnessScore = avgBrightness / this.thresholds.brightnessMin;
    } else if (avgBrightness > this.thresholds.brightnessMax) {
      brightnessScore = 1 - (avgBrightness - this.thresholds.brightnessMax) / 55;
    } else {
      // В допустимом диапазоне, проверяем близость к идеалу
      const distanceFromIdeal = Math.abs(avgBrightness - this.thresholds.brightnessIdeal);
      brightnessScore = Math.max(0.7, 1 - distanceFromIdeal / this.thresholds.brightnessGoodRange);
    }

    // Оценка контраста
    const contrastScore = Math.min(1, contrast / this.thresholds.contrastGood);

    return (brightnessScore * 0.7 + contrastScore * 0.3);
  }

  /**
   * Анализ позиционирования (расстояние, центр кадра)
   */
  analyzePositioning(detection, video) {
    const box = detection.detection.box;
    
    // Позиция лица относительно центра кадра
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const frameCenterX = video.videoWidth / 2;
    const frameCenterY = video.videoHeight / 2;

    const distanceX = Math.abs(faceCenterX - frameCenterX) / frameCenterX;
    const distanceY = Math.abs(faceCenterY - frameCenterY) / frameCenterY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    // Оценка центрирования
    const centerScore = Math.max(0, 1 - distance / this.thresholds.centerTolerance);

    // Оценка размера лица
    const faceHeight = box.height;
    const frameHeight = video.videoHeight;
    const sizeRatio = faceHeight / frameHeight;
    
    let sizeScore = 1;
    if (sizeRatio < this.thresholds.sizeMin) {
      sizeScore = sizeRatio / this.thresholds.sizeMin;
    } else if (sizeRatio > this.thresholds.sizeMax) {
      sizeScore = 1 - (sizeRatio - this.thresholds.sizeMax) / 0.2;
    } else if (Math.abs(sizeRatio - this.thresholds.sizeIdeal) < 0.05) {
      sizeScore = 1; // Идеальный размер
    } else {
      // В допустимом диапазоне, но не идеально
      sizeScore = 0.8;
    }

    return (centerScore * 0.5 + sizeScore * 0.5);
  }

  /**
   * Базовая 3D-оценка глубины (анализ структуры лица)
   */
  analyzeDepth3D(detection) {
    if (!detection.landmarks) return 0.5;

    const landmarks = detection.landmarks.positions;
    if (landmarks.length < 68) return 0.5;

    // Анализируем структуру лица для оценки глубины
    // Проверяем соотношение различных частей лица

    // 1. Соотношение лица (ширина к высоте)
    const leftFace = landmarks[0].x;
    const rightFace = landmarks[16].x;
    const topFace = landmarks[27].y; // Переносица
    const bottomFace = landmarks[8].y; // Подбородок

    const faceWidth = rightFace - leftFace;
    const faceHeight = bottomFace - topFace;
    const aspectRatio = faceWidth / faceHeight;

    // Идеальное соотношение для прямого лица: ~0.65-0.75
    const aspectScore = Math.abs(aspectRatio - 0.7) < 0.1 ? 1 : 0.7;

    // 2. Соотношение глаз к лицу (для оценки перспективы)
    const leftEye = this.getEyeCenter(landmarks, 36, 41);
    const rightEye = this.getEyeCenter(landmarks, 42, 47);
    const eyeWidth = rightEye.x - leftEye.x;
    const eyeToFaceRatio = eyeWidth / faceWidth;

    // Идеальное соотношение: ~0.4-0.5
    const eyeScore = Math.abs(eyeToFaceRatio - 0.45) < 0.05 ? 1 : 0.8;

    // 3. Положение носа относительно глаз и рта (оценка глубины)
    const nose = landmarks[30];
    const mouth = this.getMouthCenter(landmarks);
    const noseToMouth = Math.abs(nose.y - mouth.y);
    const eyeToMouth = Math.abs(leftEye.y - mouth.y);
    const noseRatio = noseToMouth / eyeToMouth;

    // Идеальное соотношение: ~0.4-0.5
    const noseScore = Math.abs(noseRatio - 0.45) < 0.05 ? 1 : 0.8;

    // Комбинируем оценки
    return (aspectScore * 0.4 + eyeScore * 0.3 + noseScore * 0.3);
  }

  /**
   * Генерация рекомендаций на основе анализа
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Рекомендации по качеству лица
    if (analysis.faceQuality < this.thresholds.faceQualityMin) {
      recommendations.push('Приблизьте лицо к камере или отойдите дальше');
    }

    // Рекомендации по углу
    if (analysis.angle < 0.7) {
      recommendations.push('Смотрите прямо в камеру, не наклоняйте голову');
    }

    // Рекомендации по освещению
    if (analysis.lighting < 0.6) {
      recommendations.push('Улучшите освещение: избегайте теней и слишком яркого света');
    }

    // Рекомендации по позиционированию
    if (analysis.positioning < 0.7) {
      recommendations.push('Расположите лицо по центру кадра');
    }

    // Общие рекомендации
    if (analysis.overall < 0.6) {
      recommendations.push('Общее качество захвата низкое. Убедитесь в хорошем освещении и прямом ракурсе');
    }

    // Положительная обратная связь
    if (analysis.overall >= 0.8 && recommendations.length === 0) {
      recommendations.push('✓ Качество захвата отличное!');
    }

    return recommendations.length > 0 ? recommendations : ['Подготовка к захвату...'];
  }

  /**
   * Вспомогательные функции
   */
  getEyeCenter(landmarks, startIdx, endIdx) {
    let sumX = 0, sumY = 0, count = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      sumX += landmarks[i].x;
      sumY += landmarks[i].y;
      count++;
    }
    return { x: sumX / count, y: sumY / count };
  }

  getMouthCenter(landmarks) {
    const mouthPoints = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59];
    let sumX = 0, sumY = 0;
    mouthPoints.forEach(idx => {
      sumX += landmarks[idx].x;
      sumY += landmarks[idx].y;
    });
    return { x: sumX / mouthPoints.length, y: sumY / mouthPoints.length };
  }
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QualityAnalyzer;
}
