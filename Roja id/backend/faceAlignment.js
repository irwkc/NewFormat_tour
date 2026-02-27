const { createCanvas, loadImage } = require('canvas');

/**
 * Выравнивание лица (Face Alignment) для улучшения точности распознавания
 */
class FaceAlignment {
  /**
   * Выравнивание лица на основе landmarks
   * Поворачивает и масштабирует лицо до стандартного положения
   */
  static alignFace(imageData, landmarks) {
    if (!landmarks || !landmarks.positions) {
      return imageData; // Возвращаем оригинал если landmarks нет
    }

    const points = landmarks.positions;
    const width = imageData.width;
    const height = imageData.height;

    // Находим центр глаз
    const leftEye = this.getEyeCenter(points, 'left');
    const rightEye = this.getEyeCenter(points, 'right');

    if (!leftEye || !rightEye) {
      return imageData;
    }

    // Вычисляем угол поворота
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const angleDegrees = angle * (180 / Math.PI);

    // Вычисляем расстояние между глазами
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + 
      Math.pow(rightEye.y - leftEye.y, 2)
    );

    // Целевое расстояние между глазами (стандартизированное)
    const targetEyeDistance = width * 0.3; // 30% от ширины изображения
    const scale = targetEyeDistance / eyeDistance;

    // Центр между глазами
    const centerX = (leftEye.x + rightEye.x) / 2;
    const centerY = (leftEye.y + rightEye.y) / 2;

    // Создаем canvas для выровненного изображения
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Применяем трансформации
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-angle); // Поворачиваем обратно
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    // Рисуем изображение
    const tempCanvas = createCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);

    ctx.restore();

    // Получаем выровненное изображение
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Получение центра глаза
   */
  static getEyeCenter(points, side) {
    let eyeIndices;
    
    if (side === 'left') {
      // Левый глаз: точки 36-41
      eyeIndices = [36, 37, 38, 39, 40, 41];
    } else {
      // Правый глаз: точки 42-47
      eyeIndices = [42, 43, 44, 45, 46, 47];
    }

    let sumX = 0, sumY = 0, count = 0;

    eyeIndices.forEach(idx => {
      if (points[idx]) {
        sumX += points[idx].x;
        sumY += points[idx].y;
        count++;
      }
    });

    if (count === 0) return null;

    return {
      x: sumX / count,
      y: sumY / count
    };
  }

  /**
   * Масштабирование лица до стандартного размера
   */
  static scaleToStandardSize(imageData, landmarks, targetSize = 224) {
    if (!landmarks || !landmarks.positions) {
      return imageData;
    }

    const points = landmarks.positions;
    
    // Находим границы лица
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    points.forEach(point => {
      if (point) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    });

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const faceSize = Math.max(faceWidth, faceHeight);

    if (faceSize === 0) return imageData;

    const scale = targetSize / faceSize;

    const newWidth = Math.floor(imageData.width * scale);
    const newHeight = Math.floor(imageData.height * scale);

    const canvas = createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    
    const tempCanvas = createCanvas(imageData.width, imageData.height);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

    return ctx.getImageData(0, 0, newWidth, newHeight);
  }

  /**
   * Полное выравнивание: поворот + масштабирование
   */
  static fullAlignment(imageData, landmarks) {
    // Сначала выравниваем по углу
    let aligned = this.alignFace(imageData, landmarks);
    
    // Затем масштабируем
    aligned = this.scaleToStandardSize(aligned, landmarks);
    
    return aligned;
  }
}

module.exports = FaceAlignment;
