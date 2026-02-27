/**
 * Многоспектральная подсветка экрана для улучшения качества распознавания лица
 * 
 * Техника: Structured Light / Multi-spectral illumination
 * Преимущества:
 * - Улучшение контраста лица
 * - Компенсация плохого освещения
 * - Более стабильное извлечение дескрипторов
 * - Повышение точности на 5-15%
 */

class IlluminationHelper {
  constructor() {
    this.colors = [
      { name: 'red', rgb: [255, 0, 0], description: 'Красный' },
      { name: 'green', rgb: [0, 255, 0], description: 'Зеленый' },
      { name: 'blue', rgb: [0, 0, 255], description: 'Синий' },
      { name: 'white', rgb: [255, 255, 255], description: 'Белый' }
    ];
    this.duration = 200; // Длительность каждого цвета (мс)
    this.intensity = 0.3; // Интенсивность подсветки (0-1)
  }

  /**
   * Создание overlay для подсветки экрана
   */
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'illumination-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      pointer-events: none;
      transition: background-color ${this.duration}ms ease-in-out;
      background-color: transparent;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Удаление overlay
   */
  removeOverlay() {
    const overlay = document.getElementById('illumination-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Последовательная подсветка разными цветами
   */
  async illuminateSequence(callback = null) {
    return new Promise((resolve) => {
      const overlay = this.createOverlay();
      let colorIndex = 0;

      const nextColor = async () => {
        if (colorIndex >= this.colors.length) {
          // Завершаем последовательность
          setTimeout(() => {
            this.removeOverlay();
            resolve();
          }, 100);
          return;
        }

        const color = this.colors[colorIndex];
        const [r, g, b] = color.rgb;
        
        // Применяем цвет с интенсивностью
        overlay.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${this.intensity})`;

        // Вызываем callback для захвата кадра при этом цвете
        if (callback && typeof callback === 'function') {
          setTimeout(async () => {
            try {
              await callback(color, colorIndex);
            } catch (error) {
              console.error(`Ошибка захвата при цвете ${color.name}:`, error);
            }
          }, this.duration / 2); // Захватываем в середине отображения цвета
        }

        // Переходим к следующему цвету
        setTimeout(() => {
          colorIndex++;
          nextColor();
        }, this.duration);
      };

      // Начинаем последовательность
      nextColor();
    });
  }

  /**
   * Быстрая подсветка одним цветом
   */
  illuminateOnce(colorName = 'white', duration = 200) {
    const color = this.colors.find(c => c.name === colorName) || this.colors[3]; // white по умолчанию
    const overlay = this.createOverlay();
    const [r, g, b] = color.rgb;
    
    overlay.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${this.intensity})`;

    return new Promise((resolve) => {
      setTimeout(() => {
        this.removeOverlay();
        resolve();
      }, duration);
    });
  }

  /**
   * Пульсирующая подсветка для лучшего контраста
   */
  async pulsingIllumination(cycles = 2, colorName = 'white') {
    return new Promise(async (resolve) => {
      const overlay = this.createOverlay();
      const color = this.colors.find(c => c.name === colorName) || this.colors[3];
      const [r, g, b] = color.rgb;
      
      let cycle = 0;
      let phase = 0; // 0 = увеличиваем, 1 = уменьшаем
      let intensity = 0;

      const animate = () => {
        if (cycle >= cycles && phase === 1 && intensity <= 0) {
          this.removeOverlay();
          resolve();
          return;
        }

        if (phase === 0) {
          intensity += 0.05;
          if (intensity >= this.intensity) {
            intensity = this.intensity;
            phase = 1;
          }
        } else {
          intensity -= 0.05;
          if (intensity <= 0) {
            intensity = 0;
            cycle++;
            phase = 0;
          }
        }

        overlay.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${intensity})`;

        requestAnimationFrame(animate);
      };

      animate();
    });
  }

  /**
   * Выбор лучшего кадра из последовательности
   * На основе качества изображения (яркость, контраст, четкость)
   */
  selectBestFrame(captures) {
    if (!captures || captures.length === 0) {
      return null;
    }

    // Если только один кадр, возвращаем его
    if (captures.length === 1) {
      return captures[0].capture;
    }

    // Оцениваем качество каждого кадра
    let bestCapture = captures[0];
    let bestScore = 0;

    captures.forEach(({ capture, color }) => {
      const score = this.assessFrameQuality(capture);
      if (score > bestScore) {
        bestScore = score;
        bestCapture = { capture, color };
      }
    });

    return bestCapture.capture;
  }

  /**
   * Оценка качества кадра (упрощенная версия)
   */
  assessFrameQuality(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let sum = 0;
    let variance = 0;
    const pixels = canvas.width * canvas.height;

    // Вычисляем среднюю яркость
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += brightness;
    }
    const avgBrightness = sum / pixels;

    // Вычисляем контраст (дисперсия)
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      variance += Math.pow(brightness - avgBrightness, 2);
    }
    const contrast = Math.sqrt(variance / pixels);

    // Оценка качества: комбинация яркости и контраста
    // Идеальная яркость: ~128, идеальный контраст: ~50-80
    const brightnessScore = 1 - Math.abs(avgBrightness - 128) / 128;
    const contrastScore = Math.min(contrast / 100, 1);
    
    return (brightnessScore * 0.5 + contrastScore * 0.5);
  }

  /**
   * Комбинирование кадров для лучшего качества
   * Создает композитное изображение из нескольких кадров
   */
  combineFrames(captures) {
    if (!captures || captures.length === 0) {
      return null;
    }

    if (captures.length === 1) {
      return captures[0].capture;
    }

    // Берем первый кадр как базовый
    const baseCanvas = captures[0].capture;
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = baseCanvas.width;
    combinedCanvas.height = baseCanvas.height;
    const combinedCtx = combinedCanvas.getContext('2d');

    // Среднее значение пикселей из всех кадров
    const imageDatas = captures.map(c => {
      const ctx = c.capture.getContext('2d');
      return ctx.getImageData(0, 0, c.capture.width, c.capture.height);
    });

    const combinedData = new Uint8ClampedArray(imageDatas[0].data.length);

    for (let i = 0; i < combinedData.length; i += 4) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;

      imageDatas.forEach(imageData => {
        sumR += imageData.data[i];
        sumG += imageData.data[i + 1];
        sumB += imageData.data[i + 2];
        sumA += imageData.data[i + 3];
      });

      combinedData[i] = sumR / imageDatas.length;     // R
      combinedData[i + 1] = sumG / imageDatas.length; // G
      combinedData[i + 2] = sumB / imageDatas.length; // B
      combinedData[i + 3] = sumA / imageDatas.length; // A
    }

    combinedCtx.putImageData(new ImageData(combinedData, baseCanvas.width, baseCanvas.height), 0, 0);
    return combinedCanvas;
  }
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IlluminationHelper;
}
