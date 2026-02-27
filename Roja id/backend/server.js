const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const faceRecognition = require('./faceRecognition');
const { detectLiveness } = require('./livenessDetection');
const AdvancedLivenessDetection = require('./advancedLivenessDetection');
const FaceDatabase = require('./database');
const ImageAnalyzer = require('./imageAnalysis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Создаем директорию для временных файлов
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Инициализация базы данных и продвинутого liveness detection
const faceDatabase = new FaceDatabase();
const advancedLiveness = new AdvancedLivenessDetection();

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Регистрация нового пользователя
app.post('/api/register', upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.body;
    const imagePath = req.file.path;

    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }

    // Проверка существования пользователя
    const existingUser = faceDatabase.getUser(userId);
    if (existingUser) {
      fs.unlinkSync(imagePath);
      return res.status(400).json({ error: 'Пользователь уже зарегистрирован' });
    }

    // Анализ изображения перед регистрацией (делаем опциональным, чтобы не блокировать)
    let imageAnalysis = null;
    try {
      imageAnalysis = await ImageAnalyzer.fullAnalysis(imagePath);
      if (imageAnalysis.isLikelyFake) {
        fs.unlinkSync(imagePath);
        return res.status(400).json({ 
          error: 'Изображение не прошло проверку подлинности. Возможна попытка использования фото/видео.',
          details: imageAnalysis
        });
      }
    } catch (analysisError) {
      console.warn('Ошибка анализа изображения (продолжаем регистрацию):', analysisError.message);
      // Продолжаем регистрацию даже если анализ не удался
    }

    // Извлекаем дескриптор лица с улучшениями (предобработка, выравнивание)
    let descriptor = null;
    try {
      descriptor = await faceRecognition.extractFaceDescriptor(imagePath, {
        usePreprocessing: true,
        useAlignment: true,
        useFaceRegion: true
      });
    } catch (extractError) {
      console.warn('Ошибка извлечения дескриптора на backend:', extractError.message);
      descriptor = null;
    }

    // Если дескриптор не извлечен на backend, проверяем, отправлен ли он с frontend
    if (!descriptor) {
      if (req.body.descriptor) {
        // Frontend отправил дескриптор
        try {
          descriptor = typeof req.body.descriptor === 'string' 
            ? JSON.parse(req.body.descriptor) 
            : req.body.descriptor;
          console.log('Используется дескриптор, отправленный с frontend при регистрации');
        } catch (parseError) {
          fs.unlinkSync(imagePath);
          return res.status(400).json({ 
            error: 'Ошибка парсинга дескриптора от frontend',
            details: parseError.message
          });
        }
      } else {
        fs.unlinkSync(imagePath);
        // Если модели не загружены, frontend должен отправлять дескриптор
        return res.status(400).json({ 
          error: 'Не удалось обнаружить лицо на изображении на сервере. Frontend должен извлечь дескриптор и отправить его.',
          hint: 'Модели на backend не найдены. Frontend извлечет дескриптор автоматически.'
        });
      }
    }

    // Множественная регистрация: сохраняем дескриптор как массив
    // Если это первая регистрация, создаем массив с одним дескриптором
    // В будущем можно добавить возможность добавления дополнительных дескрипторов
    const descriptors = [descriptor];

    // Сохраняем дескриптор(ы) в базе данных
    await faceDatabase.registerUser(userId, descriptors, {
      imageAnalysis: imageAnalysis ? imageAnalysis.recommendation : 'ACCEPT',
      registeredAt: new Date().toISOString(),
      registrationMethod: 'single' // Можно изменить на 'multiple' при множественной регистрации
    });

    // Удаляем временный файл
    fs.unlinkSync(imagePath);

    res.json({ 
      success: true, 
      message: 'Пользователь успешно зарегистрирован',
      imageCheck: imageAnalysis.recommendation
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    console.error('Stack trace:', error.stack);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Ошибка удаления временного файла:', unlinkError);
      }
    }
    res.status(500).json({ 
      error: 'Ошибка при регистрации',
      message: error.message || 'Неизвестная ошибка',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Аутентификация по лицу
app.post('/api/authenticate', upload.single('image'), async (req, res) => {
  try {
    const { userId, livenessData } = req.body;
    const imagePath = req.file.path;

    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }

    // Продвинутая проверка liveness detection
    let livenessResult = null;
    if (livenessData) {
      try {
        const parsedLivenessData = typeof livenessData === 'string' 
          ? JSON.parse(livenessData) 
          : livenessData;

        const frameSequence = parsedLivenessData.frameSequence || null;
        // Включаем временные метки для анализа FPS и промежуточных кадров
        if (parsedLivenessData.frameTimestamps) {
          parsedLivenessData.frameTimestamps = parsedLivenessData.frameTimestamps;
        }
        livenessResult = await advancedLiveness.detectLiveness(
          parsedLivenessData, 
          imagePath, 
          frameSequence
        );

        if (!livenessResult.isLive) {
          // Логируем детали для отладки
          console.log('Liveness detection failed:', {
            score: livenessResult.confidence,
            reasons: livenessResult.reasons,
            checks: Object.keys(livenessResult.checks || {}).map(key => ({
              check: key,
              passed: livenessResult.checks[key]?.passed,
              reason: livenessResult.checks[key]?.reason
            }))
          });
          
          fs.unlinkSync(imagePath);
          await faceDatabase.updateAuthStats(userId, false);
          return res.status(403).json({ 
            error: 'Liveness detection не пройден. Возможна попытка использования фото/видео.',
            details: livenessResult,
            checks: livenessResult.checks,
            reasons: livenessResult.reasons,
            score: livenessResult.confidence,
            debug: process.env.NODE_ENV === 'development' ? {
              blinks: parsedLivenessData.blinks,
              headMovements: parsedLivenessData.headMovements,
              duration: parsedLivenessData.timestamp - parsedLivenessData.startTime,
              frameCount: parsedLivenessData.frameCount
            } : undefined
          });
        }
      } catch (error) {
        console.error('Ошибка liveness detection:', error);
        // Продолжаем с базовой проверкой
      }
    }

    // Дополнительный анализ изображения на сервере
    const imageAnalysis = await ImageAnalyzer.fullAnalysis(imagePath);
    if (imageAnalysis.isLikelyFake) {
      fs.unlinkSync(imagePath);
      await faceDatabase.updateAuthStats(userId, false);
      return res.status(403).json({ 
        error: 'Анализ изображения выявил признаки подделки',
        details: imageAnalysis
      });
    }

    // Извлекаем дескриптор с изображения
    let descriptor = null;
    try {
      descriptor = await faceRecognition.extractFaceDescriptor(imagePath);
    } catch (extractError) {
      console.warn('Ошибка извлечения дескриптора на backend:', extractError.message);
      descriptor = null;
    }

    // Если дескриптор не извлечен на backend, проверяем, отправлен ли он с frontend
    if (!descriptor) {
      if (req.body.descriptor) {
        // Frontend отправил дескриптор
        try {
          descriptor = typeof req.body.descriptor === 'string' 
            ? JSON.parse(req.body.descriptor) 
            : req.body.descriptor;
          console.log('Используется дескриптор, отправленный с frontend при аутентификации');
        } catch (parseError) {
          fs.unlinkSync(imagePath);
          await faceDatabase.updateAuthStats(userId, false);
          return res.status(400).json({ 
            error: 'Ошибка парсинга дескриптора от frontend',
            details: parseError.message
          });
        }
      } else {
        fs.unlinkSync(imagePath);
        await faceDatabase.updateAuthStats(userId, false);
        return res.status(400).json({ 
          error: 'Не удалось обнаружить лицо на изображении на сервере. Frontend должен извлечь дескриптор и отправить его.',
          hint: 'Модели на backend не найдены. Frontend извлечет дескриптор автоматически.'
        });
      }
    }

    // Получаем дескрипторы из базы (пользователь уже проверен выше)
    const storedDescriptors = faceDatabase.getUserDescriptor(userId);
    // Эта проверка не должна срабатывать, так как мы проверили выше, но оставляем на всякий случай
    if (!storedDescriptors || !Array.isArray(storedDescriptors) || storedDescriptors.length === 0) {
      fs.unlinkSync(imagePath);
      console.error(`Дескриптор не найден для пользователя ${userId}, хотя пользователь существует в базе`);
      return res.status(500).json({ 
        error: 'Ошибка: дескриптор пользователя не найден в базе данных',
        hint: 'Попробуйте зарегистрироваться заново.'
      });
    }

    // Сравниваем дескриптор со всеми сохраненными (множественная регистрация)
    // Берем минимальное расстояние
    const distance = faceRecognition.computeMinDistance(descriptor, storedDescriptors);
    
    // Используем адаптивный порог если доступен, иначе дефолтный
    const defaultThreshold = 0.6; // Порог сходства (чем меньше, тем строже)
    const adaptiveThreshold = faceDatabase.getAdaptiveThreshold(userId);
    const threshold = adaptiveThreshold || defaultThreshold;

    // Удаляем временный файл
    fs.unlinkSync(imagePath);

    const authenticated = distance < threshold;
    
    // Обновляем статистику аутентификации с расстоянием (для адаптивного порога)
    await faceDatabase.updateAuthStats(userId, authenticated, distance);

    if (authenticated) {
      res.json({ 
        success: true, 
        authenticated: true,
        confidence: (1 - distance).toFixed(2),
        distance: distance.toFixed(3),
        message: 'Аутентификация успешна',
        liveness: livenessResult ? {
          passed: livenessResult.isLive,
          confidence: livenessResult.confidence
        } : null,
        imageAnalysis: {
          passed: !imageAnalysis.isLikelyFake,
          recommendation: imageAnalysis.recommendation
        }
      });
    } else {
      res.json({ 
        success: true, 
        authenticated: false,
        confidence: (1 - distance).toFixed(2),
        distance: distance.toFixed(3),
        message: 'Лицо не совпадает',
        threshold: threshold
      });
    }

  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    console.error('Stack trace:', error.stack);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Ошибка удаления временного файла:', unlinkError);
      }
    }
    res.status(500).json({ 
      error: 'Ошибка при аутентификации',
      message: error.message || 'Неизвестная ошибка',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Получить список зарегистрированных пользователей
app.get('/api/users', (req, res) => {
  res.json({ users: faceDatabase.getAllUsers() });
});

// Получить статистику пользователя
app.get('/api/users/:userId/stats', (req, res) => {
  const { userId } = req.params;
  const stats = faceDatabase.getUserStats(userId);
  
  if (!stats) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  
  res.json(stats);
});

// Получить общую статистику
app.get('/api/stats', (req, res) => {
  res.json(faceDatabase.getStats());
});

// Удалить пользователя
app.delete('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const deleted = await faceDatabase.deleteUser(userId);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  
  res.json({ success: true, message: 'Пользователь удален' });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🌐 API доступен: http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   - POST /api/register - Регистрация`);
  console.log(`   - POST /api/authenticate - Аутентификация`);
  console.log(`   - GET /api/users - Список пользователей`);
});

// Обработка неперехваченных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
