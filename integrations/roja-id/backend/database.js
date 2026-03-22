const fs = require('fs');
const path = require('path');

/**
 * Простая файловая база данных для хранения дескрипторов лиц
 * В продакшене рекомендуется использовать SQLite, PostgreSQL или другую БД
 */
class FaceDatabase {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, 'face_database.json');
    this.data = this.loadDatabase();
  }

  /**
   * Загрузка базы данных из файла
   */
  loadDatabase() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileData = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(fileData);
      }
    } catch (error) {
      console.error('Ошибка загрузки базы данных:', error);
    }

    // Создаем новую структуру базы
    return {
      users: {},
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        totalUsers: 0
      }
    };
  }

  /**
   * Сохранение базы данных в файл
   */
  saveDatabase() {
    try {
      this.data.metadata.lastModified = new Date().toISOString();
      this.data.metadata.totalUsers = Object.keys(this.data.users).length;
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Ошибка сохранения базы данных:', error);
      return false;
    }
  }

  /**
   * Регистрация нового пользователя
   * Поддерживает множественную регистрацию (несколько дескрипторов)
   */
  async registerUser(userId, descriptor, metadata = {}) {
    if (!userId || !descriptor || !Array.isArray(descriptor)) {
      throw new Error('Некорректные данные пользователя');
    }

    if (this.data.users[userId]) {
      throw new Error('Пользователь уже зарегистрирован');
    }

    // Сохраняем дескриптор как массив (для поддержки множественной регистрации)
    const descriptors = Array.isArray(descriptor[0]) ? descriptor : [descriptor];

    this.data.users[userId] = {
      id: userId,
      descriptors: descriptors, // Массив дескрипторов для множественной регистрации
      descriptor: descriptors[0], // Первый дескриптор для обратной совместимости
      createdAt: new Date().toISOString(),
      lastAuthAttempt: null,
      authSuccessCount: 0,
      authFailureCount: 0,
      authHistory: [], // История успешных входов для адаптивного порога
      adaptiveThreshold: null, // Адаптивный порог для этого пользователя
      metadata: metadata
    };

    return this.saveDatabase();
  }

  /**
   * Добавление дополнительного дескриптора к существующему пользователю
   */
  async addDescriptor(userId, descriptor) {
    if (!this.data.users[userId]) {
      throw new Error('Пользователь не найден');
    }

    if (!descriptor || !Array.isArray(descriptor)) {
      throw new Error('Некорректный дескриптор');
    }

    const user = this.data.users[userId];
    
    // Инициализируем descriptors если его нет (для старых записей)
    if (!user.descriptors) {
      user.descriptors = user.descriptor ? [user.descriptor] : [];
    }

    // Добавляем новый дескриптор
    user.descriptors.push(descriptor);
    
    // Ограничиваем количество дескрипторов (максимум 5)
    if (user.descriptors.length > 5) {
      user.descriptors = user.descriptors.slice(-5);
    }

    return this.saveDatabase();
  }

  /**
   * Обновление дескриптора пользователя
   */
  async updateUserDescriptor(userId, descriptor) {
    if (!this.data.users[userId]) {
      throw new Error('Пользователь не найден');
    }

    this.data.users[userId].descriptor = descriptor;
    this.data.users[userId].updatedAt = new Date().toISOString();

    return this.saveDatabase();
  }

  /**
   * Получение дескриптора пользователя
   * Возвращает массив дескрипторов для множественной регистрации
   */
  getUserDescriptor(userId) {
    if (!this.data.users[userId]) {
      return null;
    }

    const user = this.data.users[userId];
    
    // Если есть массив дескрипторов, возвращаем его
    if (user.descriptors && Array.isArray(user.descriptors)) {
      return user.descriptors;
    }
    
    // Обратная совместимость: если есть старый формат (один дескриптор)
    if (user.descriptor) {
      return [user.descriptor];
    }
    
    return null;
  }

  /**
   * Получение адаптивного порога для пользователя
   */
  getAdaptiveThreshold(userId) {
    const user = this.data.users[userId];
    if (!user) return null;

    // Если адаптивный порог уже вычислен, возвращаем его
    if (user.adaptiveThreshold !== null && user.adaptiveThreshold !== undefined) {
      return user.adaptiveThreshold;
    }

    // Вычисляем на основе истории успешных входов
    if (user.authHistory && user.authHistory.length > 0) {
      const distances = user.authHistory
        .filter(entry => entry.success && entry.distance !== undefined)
        .map(entry => entry.distance);

      if (distances.length > 0) {
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const stdDev = Math.sqrt(
          distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length
        );
        
        // Порог = среднее + 2 стандартных отклонения (охватывает ~95% случаев)
        const threshold = avgDistance + (stdDev * 2);
        user.adaptiveThreshold = Math.min(threshold, 0.8); // Максимум 0.8
        this.saveDatabase();
        return user.adaptiveThreshold;
      }
    }

    return null; // Используем дефолтный порог
  }

  /**
   * Обновление истории аутентификации для адаптивного порога
   */
  async updateAuthHistory(userId, success, distance) {
    if (!this.data.users[userId]) {
      return false;
    }

    const user = this.data.users[userId];
    
    // Инициализируем историю если её нет
    if (!user.authHistory) {
      user.authHistory = [];
    }

    // Добавляем запись
    user.authHistory.push({
      timestamp: new Date().toISOString(),
      success: success,
      distance: distance
    });

    // Ограничиваем размер истории (последние 20 записей)
    if (user.authHistory.length > 20) {
      user.authHistory = user.authHistory.slice(-20);
    }

    // Пересчитываем адаптивный порог
    user.adaptiveThreshold = null; // Сбрасываем для пересчета
    this.getAdaptiveThreshold(userId); // Пересчитываем

    return this.saveDatabase();
  }

  /**
   * Получение данных пользователя
   */
  getUser(userId) {
    return this.data.users[userId] || null;
  }

  /**
   * Обновление статистики аутентификации
   */
  async updateAuthStats(userId, success, distance = null) {
    if (!this.data.users[userId]) {
      return false;
    }

    const user = this.data.users[userId];
    user.lastAuthAttempt = new Date().toISOString();

    if (success) {
      user.authSuccessCount = (user.authSuccessCount || 0) + 1;
    } else {
      user.authFailureCount = (user.authFailureCount || 0) + 1;
    }

    // Обновляем историю для адаптивного порога
    if (distance !== null) {
      await this.updateAuthHistory(userId, success, distance);
    }

    return this.saveDatabase();
  }

  /**
   * Удаление пользователя
   */
  async deleteUser(userId) {
    if (!this.data.users[userId]) {
      return false;
    }

    delete this.data.users[userId];
    return this.saveDatabase();
  }

  /**
   * Получение списка всех пользователей
   */
  getAllUsers() {
    return Object.keys(this.data.users);
  }

  /**
   * Получение статистики пользователя
   */
  getUserStats(userId) {
    const user = this.getUser(userId);
    if (!user) {
      return null;
    }

    const totalAttempts = (user.authSuccessCount || 0) + (user.authFailureCount || 0);
    const successRate = totalAttempts > 0 
      ? ((user.authSuccessCount || 0) / totalAttempts * 100).toFixed(2)
      : 0;

    return {
      userId: user.id,
      createdAt: user.createdAt,
      lastAuthAttempt: user.lastAuthAttempt,
      authSuccessCount: user.authSuccessCount || 0,
      authFailureCount: user.authFailureCount || 0,
      totalAttempts,
      successRate: `${successRate}%`
    };
  }

  /**
   * Получение общей статистики
   */
  getStats() {
    const users = Object.values(this.data.users);
    const totalSuccess = users.reduce((sum, u) => sum + (u.authSuccessCount || 0), 0);
    const totalFailure = users.reduce((sum, u) => sum + (u.authFailureCount || 0), 0);
    const totalAttempts = totalSuccess + totalFailure;
    const successRate = totalAttempts > 0 ? (totalSuccess / totalAttempts * 100).toFixed(2) : 0;

    return {
      totalUsers: users.length,
      totalAuthAttempts: totalAttempts,
      totalSuccess,
      totalFailure,
      successRate: `${successRate}%`,
      metadata: this.data.metadata
    };
  }

  /**
   * Поиск пользователя по дескриптору (для восстановления ID)
   * Поддерживает множественные дескрипторы
   */
  findUserByDescriptor(queryDescriptor, threshold = 0.6) {
    const { computeDistance } = require('./faceRecognition');
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const [userId, userData] of Object.entries(this.data.users)) {
      // Получаем все дескрипторы пользователя
      const userDescriptors = userData.descriptors || (userData.descriptor ? [userData.descriptor] : []);
      
      // Сравниваем со всеми дескрипторами и берем минимальное расстояние
      let minDistance = Infinity;
      for (const descriptor of userDescriptors) {
        const distance = computeDistance(queryDescriptor, descriptor);
        minDistance = Math.min(minDistance, distance);
      }

      // Используем адаптивный порог если доступен
      const userThreshold = this.getAdaptiveThreshold(userId) || threshold;
      
      if (minDistance < userThreshold && minDistance < bestDistance) {
        bestDistance = minDistance;
        bestMatch = {
          userId,
          distance: minDistance,
          confidence: 1 - minDistance
        };
      }
    }

    return bestMatch;
  }

  /**
   * Резервное копирование
   */
  async backup(backupPath = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = backupPath || path.join(
      __dirname,
      'backups',
      `face_database_backup_${timestamp}.json`
    );

    // Создаем директорию для бэкапов
    const backupDir = path.dirname(backupFile);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    try {
      fs.writeFileSync(backupFile, JSON.stringify(this.data, null, 2), 'utf8');
      return backupFile;
    } catch (error) {
      console.error('Ошибка создания резервной копии:', error);
      return null;
    }
  }
}

module.exports = FaceDatabase;
