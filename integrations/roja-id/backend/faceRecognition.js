const faceapi = require('face-api.js');
const { Canvas, Image, ImageData, createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const ImagePreprocessor = require('./imagePreprocessing');
const FaceAlignment = require('./faceAlignment');

// Конфигурация для face-api.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

// Загрузка моделей face-api.js
async function loadModels() {
  if (modelsLoaded) return;

  const modelsPath = path.join(__dirname, 'models');
  
  // Проверяем наличие моделей
  if (!fs.existsSync(modelsPath)) {
    console.warn('⚠️  Модели face-api.js не найдены в папке backend/models/');
    console.warn('⚠️  Backend будет использовать только анализ изображений без распознавания лиц на сервере');
    console.warn('ℹ️  Frontend модели загружаются автоматически из CDN');
    console.warn('ℹ️  Frontend будет извлекать дескриптор лица и отправлять его на сервер');
    console.warn('ℹ️  Для полной функциональности скачайте модели: https://github.com/justadudewhohacks/face-api.js-models');
    // Возвращаем false вместо null, чтобы было понятнее
    modelsLoaded = false;
    return false;
  }

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
    faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
    faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath),
    faceapi.nets.faceExpressionNet.loadFromDisk(modelsPath)
  ]);

  modelsLoaded = true;
  console.log('Модели face-api.js загружены');
}

// Извлечение дескриптора лица из изображения с улучшениями
async function extractFaceDescriptor(imagePath, options = {}) {
  const {
    usePreprocessing = true,
    useAlignment = true,
    useFaceRegion = true
  } = options;

  try {
    const modelsResult = await loadModels();
    if (modelsResult === false) {
      // Модели не загружены, возвращаем null
      // Frontend будет отправлять уже извлеченные дескрипторы
      return null;
    }
  } catch (error) {
    // Если загрузка моделей вызвала ошибку (например, файлы не найдены)
    console.warn('Модели не могут быть загружены:', error.message);
    return null;
  }

  try {
    // Предобработка изображения (если включена)
    let processedImagePath = imagePath;
    if (usePreprocessing) {
      try {
        processedImagePath = await ImagePreprocessor.preprocessImage(imagePath);
      } catch (preprocessError) {
        console.warn('Ошибка предобработки изображения, используем оригинал:', preprocessError.message);
        processedImagePath = imagePath;
      }
    }

    const imageBuffer = fs.readFileSync(processedImagePath);
    let img = await faceapi.bufferToImage(imageBuffer);

    // Обнаружение лиц с landmarks
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks();

    if (!detection) {
      // Удаляем обработанное изображение если оно было создано
      if (processedImagePath !== imagePath && fs.existsSync(processedImagePath)) {
        fs.unlinkSync(processedImagePath);
      }
      return null;
    }

    // Face Alignment (если включено) - упрощенная версия
    // Выравнивание выполняется через face-api.js автоматически при использовании landmarks
    // Дополнительное выравнивание можно добавить позже если нужно

    // Извлечение дескриптора
    const finalDetection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!finalDetection) {
      if (processedImagePath !== imagePath && fs.existsSync(processedImagePath)) {
        fs.unlinkSync(processedImagePath);
      }
      return null;
    }

    // Удаляем временный обработанный файл
    if (processedImagePath !== imagePath && fs.existsSync(processedImagePath)) {
      try {
        fs.unlinkSync(processedImagePath);
      } catch (unlinkError) {
        console.warn('Не удалось удалить временный файл:', unlinkError.message);
      }
    }

    // Возвращаем дескриптор как обычный массив
    return Array.from(finalDetection.descriptor);
  } catch (error) {
    console.error('Ошибка извлечения дескриптора:', error.message);
    return null;
  }
}

// Вычисление евклидова расстояния между двумя дескрипторами
function computeDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2) {
    return Infinity;
  }

  if (descriptor1.length !== descriptor2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Сравнение дескриптора с массивом дескрипторов (множественная регистрация)
 * Возвращает минимальное расстояние
 */
function computeMinDistance(queryDescriptor, descriptorsArray) {
  if (!queryDescriptor || !descriptorsArray || !Array.isArray(descriptorsArray)) {
    return Infinity;
  }

  let minDistance = Infinity;
  for (const descriptor of descriptorsArray) {
    const distance = computeDistance(queryDescriptor, descriptor);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

module.exports = {
  extractFaceDescriptor,
  computeDistance,
  computeMinDistance,
  loadModels
};
