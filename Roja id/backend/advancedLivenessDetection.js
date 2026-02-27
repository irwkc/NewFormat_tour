const ImageAnalyzer = require('./imageAnalysis');

/**
 * Продвинутая система liveness detection с множественными проверками
 */
class AdvancedLivenessDetection {
  constructor() {
    this.config = {
      minBlinks: 2,
      minHeadMovements: 3,
      minDuration: 2000, // 2 секунды минимум (было 3)
      minFrames: 10, // Было 15, снижено до 10
      maxDuration: 20000, // 20 секунд максимум (было 15)
      blinkIntervalMin: 200, // Минимальный интервал между миганиями (мс)
      blinkIntervalMax: 6000, // Максимальный интервал (было 5000, увеличено)
      headMovementThreshold: 20 // Минимальное движение для засчета
    };
  }

  /**
   * Основная функция обнаружения живого человека
   */
  async detectLiveness(livenessData, imagePath, frameSequence = null) {
    if (!livenessData || typeof livenessData !== 'object') {
      return { isLive: false, reason: 'Отсутствуют данные liveness' };
    }

    // Извлекаем временные метки для проверки FPS
    const timestamps = livenessData.frameTimestamps || null;

    // Собираем все проверки
    const checks = {
      temporal: this.checkTemporalConsistency(livenessData),
      movement: this.checkMovementQuality(livenessData),
      blinking: this.checkBlinkingPattern(livenessData),
      frames: this.checkFrameSequence(frameSequence || livenessData.frameSequence, timestamps),
      image: await this.checkImageAnalysis(imagePath)
    };

    // Взвешенная оценка
    const weights = {
      temporal: 0.2,
      movement: 0.25,
      blinking: 0.25,
      frames: 0.15,
      image: 0.15
    };

    let totalScore = 0;
    let maxScore = 0;
    const reasons = [];

    for (const [key, weight] of Object.entries(weights)) {
      if (checks[key] && checks[key].passed) {
        totalScore += weight * checks[key].confidence;
        maxScore += weight;
      } else {
        if (checks[key] && checks[key].reason) {
          reasons.push(checks[key].reason);
        }
      }
    }

    const finalScore = maxScore > 0 ? totalScore / maxScore : 0;
    // Снижаем требования: 60%+ и не более 2 провалов (было 70% и 1 провал)
    const isLive = finalScore > 0.6 && reasons.length < 3;

    return {
      isLive,
      confidence: finalScore,
      checks,
      reasons: reasons.length > 0 ? reasons : ['Все проверки пройдены'],
      recommendation: isLive ? 'ACCEPT' : 'REJECT'
    };
  }

  /**
   * Проверка временной согласованности
   * Проверяет, что процесс аутентификации занимает естественное время
   */
  checkTemporalConsistency(livenessData) {
    if (!livenessData.timestamp || !livenessData.startTime) {
      return { passed: false, reason: 'Отсутствуют временные метки', confidence: 0 };
    }

    const duration = livenessData.timestamp - livenessData.startTime;
    const frameCount = livenessData.frameCount || 0;
    const frameRate = duration > 0 ? (frameCount / duration) * 1000 : 0;

    // Проверка минимальной длительности
    if (duration < this.config.minDuration) {
      return {
        passed: false,
        reason: `Слишком короткая длительность: ${duration}ms (минимум ${this.config.minDuration}ms)`,
        confidence: 0
      };
    }

    // Проверка максимальной длительности (слишком долго может означать попытку обмана)
    if (duration > this.config.maxDuration) {
      return {
        passed: false,
        reason: `Слишком длительная длительность: ${duration}ms (максимум ${this.config.maxDuration}ms)`,
        confidence: 0.5
      };
    }

    // Проверка частоты кадров (должна быть в разумных пределах) - более мягкая
    if (frameRate < 3 || frameRate > 50) { // Было 5-30, стало 3-50
      return {
        passed: false,
        reason: `Необычная частота кадров: ${frameRate.toFixed(2)} fps (ожидается 3-50 fps)`,
        confidence: 0.5 // Снижена уверенность, чтобы не блокировать жестко
      };
    }

    // Оценка естественности длительности
    const idealDuration = 4000; // Идеальная длительность ~4 секунды
    const durationScore = 1 - Math.min(Math.abs(duration - idealDuration) / idealDuration, 1);

    return {
      passed: true,
      confidence: durationScore,
      details: { duration, frameRate, frameCount }
    };
  }

  /**
   * Проверка качества движения
   * Проверяет естественность и разнообразие движений
   */
  checkMovementQuality(livenessData) {
    const headMovements = livenessData.headMovements || 0;
    const movementHistory = livenessData.movementHistory || [];
    const frameCount = livenessData.frameCount || 0;

    // Минимальное количество движений
    if (headMovements < this.config.minHeadMovements) {
      return {
        passed: false,
        reason: `Недостаточно движений головы: ${headMovements} (минимум ${this.config.minHeadMovements})`,
        confidence: 0
      };
    }

    // Проверка разнообразия движений (должны быть движения в разные стороны)
    if (movementHistory.length > 0) {
      const directions = new Set(movementHistory.map(m => m.direction));
      if (directions.size < 2) {
        return {
          passed: false,
          reason: 'Недостаточное разнообразие направлений движения',
          confidence: 0.5
        };
      }

      // Проверка естественности скорости движений
      const movementTimes = movementHistory.map(m => m.timestamp);
      const intervals = [];
      for (let i = 1; i < movementTimes.length; i++) {
        intervals.push(movementTimes[i] - movementTimes[i - 1]);
      }

      // Движения должны происходить с естественными интервалами
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval < 200 || avgInterval > 3000) {
        return {
          passed: false,
          reason: `Неестественные интервалы между движениями: ${avgInterval.toFixed(0)}ms`,
          confidence: 0.6
        };
      }
    }

    // Оценка на основе количества и разнообразия движений
    const movementScore = Math.min(headMovements / this.config.minHeadMovements, 1.0);

    return {
      passed: true,
      confidence: movementScore,
      details: { headMovements, directions: movementHistory.map(m => m.direction) }
    };
  }

  /**
   * Проверка паттерна мигания
   * Проверяет естественность мигания (частота, ритм)
   */
  checkBlinkingPattern(livenessData) {
    const blinks = livenessData.blinks || 0;
    const blinkHistory = livenessData.blinkHistory || [];
    const duration = livenessData.timestamp ? 
      (livenessData.timestamp - livenessData.startTime) : 0;

    // Минимальное количество миганий
    if (blinks < this.config.minBlinks) {
      return {
        passed: false,
        reason: `Недостаточно миганий: ${blinks} (минимум ${this.config.minBlinks})`,
        confidence: 0
      };
    }

    // Проверка ритма мигания
    if (blinkHistory.length >= 2) {
      const intervals = [];
      for (let i = 1; i < blinkHistory.length; i++) {
        intervals.push(blinkHistory[i].timestamp - blinkHistory[i - 1].timestamp);
      }

      // Проверка минимальных интервалов (слишком быстрые мигания неестественны)
      const tooFast = intervals.some(interval => interval < this.config.blinkIntervalMin);
      if (tooFast) {
        return {
          passed: false,
          reason: 'Обнаружены слишком быстрые мигания (возможно подделка)',
          confidence: 0.3
        };
      }

      // Проверка максимальных интервалов (человек обычно мигает чаще)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > this.config.blinkIntervalMax) {
        return {
          passed: false,
          reason: `Слишком редкие мигания: ${avgInterval.toFixed(0)}ms`,
          confidence: 0.7
        };
      }

      // Проверка вариативности (естественные мигания имеют некоторую вариативность)
      const variance = this.calculateVariance(intervals);
      const coefficientOfVariation = avgInterval > 0 ? Math.sqrt(variance) / avgInterval : 0;
      
      if (coefficientOfVariation < 0.1) {
        // Слишком регулярные мигания подозрительны (как у робота)
        return {
          passed: false,
          reason: 'Слишком регулярный ритм мигания',
          confidence: 0.5
        };
      }
    }

    // Частота миганий должна быть естественной (~15-20 в минуту)
    const blinksPerMinute = duration > 0 ? (blinks / duration) * 60000 : 0;
    const naturalBlinkRate = blinksPerMinute >= 10 && blinksPerMinute <= 30;

    const blinkScore = Math.min(blinks / this.config.minBlinks, 1.0) * (naturalBlinkRate ? 1.0 : 0.8);

    return {
      passed: true,
      confidence: blinkScore,
      details: { blinks, blinksPerMinute, intervals: blinkHistory }
    };
  }

  /**
   * Проверка последовательности кадров
   * Анализирует согласованность между кадрами
   */
  checkFrameSequence(frameSequence) {
    // Делаем проверку более мягкой - если кадры есть, даже мало - это нормально
    if (!frameSequence || frameSequence.length === 0) {
      return {
        passed: false,
        reason: `Нет данных о последовательности кадров`,
        confidence: 0.3 // Низкая уверенность, но не блокирует
      };
    }
    
    if (frameSequence.length < this.config.minFrames) {
      // Предупреждаем, но не блокируем жестко
      return {
        passed: true, // Разрешаем пройти
        reason: `Мало кадров для анализа: ${frameSequence.length} (рекомендуется ${this.config.minFrames}+)`,
        confidence: 0.7 // Сниженная уверенность
      };
    }

    // Проверка изменчивости между кадрами
    // Статичное фото не будет иметь изменений между кадрами
    let totalVariation = 0;
    let variationCount = 0;

    for (let i = 1; i < frameSequence.length; i++) {
      const prev = frameSequence[i - 1];
      const curr = frameSequence[i];

      if (prev && curr && prev.faceBox && curr.faceBox) {
        // Сравниваем позицию лица
        const positionDiff = Math.abs(prev.faceBox.x - curr.faceBox.x) +
                            Math.abs(prev.faceBox.y - curr.faceBox.y);

        // Сравниваем размер (может изменяться при движении к/от камеры)
        const sizeDiff = Math.abs(prev.faceBox.width - curr.faceBox.width);

        const frameVariation = (positionDiff + sizeDiff) / (prev.faceBox.width + 1);
        totalVariation += frameVariation;
        variationCount++;
      }
    }

    if (variationCount === 0) {
      return {
        passed: false,
        reason: 'Не удалось сравнить кадры',
        confidence: 0
      };
    }

    const avgVariation = totalVariation / variationCount;

    // Слишком маленькие изменения могут означать статичное фото
    // Снижаем порог для более мягкой проверки
    if (avgVariation < 0.2) { // Было 0.5, стало 0.2
      return {
        passed: false,
        reason: 'Недостаточные изменения между кадрами (возможно статичное фото)',
        confidence: avgVariation * 2 // Увеличиваем уверенность
      };
    }

    // Слишком большие изменения могут означать подделку или ошибку
    if (avgVariation > 50) {
      return {
        passed: false,
        reason: 'Слишком большие изменения между кадрами',
        confidence: 0.5
      };
    }

    return {
      passed: true,
      confidence: Math.min(avgVariation / 5, 1.0), // Нормализуем
      details: { frameCount: frameSequence.length, avgVariation }
    };
  }

  /**
   * Проверка изображения через анализ текстуры и освещения
   */
  async checkImageAnalysis(imagePath) {
    try {
      const analysis = await ImageAnalyzer.fullAnalysis(imagePath);

      if (analysis.isLikelyFake) {
        return {
          passed: false,
          reason: `Анализ изображения выявил признаки подделки: ${analysis.recommendation}`,
          confidence: analysis.confidence,
          details: analysis
        };
      }

      return {
        passed: true,
        confidence: 1 - analysis.confidence, // Инвертируем (высокая уверенность в подделке = низкая уверенность в подлинности)
        details: analysis
      };
    } catch (error) {
      console.error('Ошибка анализа изображения:', error);
      // Если анализ не удался, не блокируем, но снижаем уверенность
      return {
        passed: true,
        confidence: 0.5,
        reason: 'Не удалось выполнить анализ изображения'
      };
    }
  }

  /**
   * Вычисление дисперсии массива
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}

module.exports = AdvancedLivenessDetection;
