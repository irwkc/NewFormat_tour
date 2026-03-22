// Глобальные переменные
let registerStream = null;
let loginStream = null;
let registerModelsLoaded = false;
let loginModelsLoaded = false;
let illuminationHelper = null; // Многоспектральная подсветка
let qualityAnalyzer = null; // Анализатор качества захвата
let faceDetectionInterval = null; // Интервал для обнаружения лица и рисования рамки
let qualityUpdateInterval = null; // Интервал для обновления качества захвата
let livenessData = {
    blinks: 0,
    headMovements: 0,
    startTime: null,
    frameCount: 0,
    previousLandmarks: null,
    frameHistory: [], // История кадров для временного анализа
    frameTimestamps: [] // Временные метки кадров для FPS анализа
};

// API URL (измените на ваш сервер)
const API_URL = 'http://localhost:3000';

// Переключение вкладок
function showTab(tabName, tabButton) {
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Показать выбранную вкладку
    const tabElement = document.getElementById(`${tabName}-tab`);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    if (tabButton) {
        tabButton.classList.add('active');
    }

    // Остановить все потоки при переключении
    stopRegister();
    stopLogin();
}

// ==================== РЕГИСТРАЦИЯ ====================

async function startRegister() {
    const userId = document.getElementById('register-userId').value;
    if (!userId) {
        showStatus('register-status', 'Введите ID пользователя', 'error');
        return;
    }

    // Проверка протокола (камера работает только через http/https)
    if (window.location.protocol === 'file:') {
        showStatus('register-status', '⚠️ Откройте через http://localhost:8000 (не file://). Камера работает только через HTTP/HTTPS.', 'error');
        return;
    }

    // Проверка наличия MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showStatus('register-status', 'Ваш браузер не поддерживает доступ к камере. Используйте Chrome, Firefox или Safari.', 'error');
        return;
    }

    try {
        // Загрузка моделей face-api.js
        if (!registerModelsLoaded) {
            showStatus('register-status', 'Загрузка моделей...', 'info');
            await loadFaceModels('register');
            registerModelsLoaded = true;
        }

        // Получение доступа к камере с улучшенной обработкой ошибок
        const video = document.getElementById('register-video');
        showStatus('register-status', 'Запрос доступа к камере...', 'info');
        
        registerStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                facingMode: 'user' // Предпочитаем фронтальную камеру
            } 
        });
        
        video.srcObject = registerStream;

        // Инициализируем overlay canvas для рисования рамки
        const overlay = document.getElementById('register-overlay');
        overlay.width = video.videoWidth || 640;
        overlay.height = video.videoHeight || 480;

        // Запускаем обнаружение лица и рисование рамки в реальном времени
        startFaceDetection('register', video, overlay);

        document.getElementById('register-start-btn').style.display = 'none';
        document.getElementById('register-capture-btn').style.display = 'inline-block';
        document.getElementById('register-stop-btn').style.display = 'inline-block';
        showStatus('register-status', 'Наведите камеру на лицо и нажмите "Захватить лицо"', 'info');

    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
        let errorMessage = 'Ошибка доступа к камере. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Разрешите доступ к камере в настройках браузера. Обновите страницу и попробуйте снова.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'Камера не найдена. Убедитесь, что камера подключена и не используется другим приложением.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Камера используется другим приложением. Закройте другие программы, использующие камеру.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage += 'Камера не поддерживает запрашиваемые параметры. Попробуйте другое устройство.';
        } else {
            errorMessage += `Ошибка: ${error.message || error.name}`;
        }
        
        showStatus('register-status', errorMessage, 'error');
    }
}

async function captureRegister() {
    const video = document.getElementById('register-video');
    const canvas = document.getElementById('register-canvas');
    const userId = document.getElementById('register-userId').value;

    try {
        // Проверяем доступность illuminationHelper
        let useIllumination = false;
        if (typeof IlluminationHelper !== 'undefined') {
            if (!illuminationHelper) {
                illuminationHelper = new IlluminationHelper();
            }
            useIllumination = true;
        }

        showStatus('register-status', useIllumination ? 'Захват лица с улучшенной подсветкой...' : 'Захват лица...', 'info');

        let bestCanvas = null;
        let bestDescriptor = null;
        let bestQuality = 0;

        // Используем многоспектральную подсветку если доступна
        if (useIllumination) {
            try {
                // Создаем массив для хранения кадров вне callback
                const captures = [];
                
                // Функция для захвата кадра (будет вызываться для каждого цвета)
                const captureFrame = async (color, index) => {
                    try {
                        // Захватываем кадр при текущем цвете подсветки
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = video.videoWidth;
                        tempCanvas.height = video.videoHeight;
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.drawImage(video, 0, 0);

                        // Применяем предобработку
                        let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                        imageData = preprocessImageData(imageData);
                        tempCtx.putImageData(imageData, 0, 0);

                        // Обнаружение лица на кадре
                        const detection = await faceapi
                            .detectSingleFace(tempCanvas, new faceapi.SsdMobilenetv1Options())
                            .withFaceLandmarks()
                            .withFaceDescriptor();

                        if (detection && detection.descriptor) {
                            captures.push({
                                canvas: tempCanvas,
                                descriptor: Array.from(detection.descriptor),
                                detection: detection
                            });
                        }

                        return tempCanvas;
                    } catch (err) {
                        console.error('Ошибка при захвате кадра с подсветкой:', err);
                        return null;
                    }
                };
                
                // Запускаем последовательность подсветки
                await illuminationHelper.illuminateSequence(captureFrame);

                // Выбираем лучший кадр из захваченных
                if (captures.length > 0) {
                    captures.forEach(({ canvas: tempCanvas, descriptor }) => {
                        const quality = illuminationHelper.assessFrameQuality(tempCanvas);
                        if (quality > bestQuality) {
                            bestQuality = quality;
                            bestCanvas = tempCanvas;
                            bestDescriptor = descriptor;
                        }
                    });
                }
            } catch (err) {
                console.error('Ошибка при подсветке:', err);
                useIllumination = false;
            }
        }

        // Если подсветка не использовалась или не помогла, используем обычный захват
        if (!bestCanvas || !bestDescriptor) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            imageData = preprocessImageData(imageData);
            ctx.putImageData(imageData, 0, 0);

            const detection = await faceapi
                .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                showStatus('register-status', 'Лицо не обнаружено. Убедитесь, что ваше лицо хорошо видно.', 'error');
                return;
            }

            bestDescriptor = detection.descriptor ? Array.from(detection.descriptor) : null;

            if (!bestDescriptor) {
                showStatus('register-status', 'Не удалось извлечь дескриптор лица. Попробуйте снова.', 'error');
                return;
            }

            bestCanvas = canvas;
        } else {
            // Используем лучший кадр с подсветкой
            canvas.width = bestCanvas.width;
            canvas.height = bestCanvas.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bestCanvas, 0, 0);
        }

        // Сохраняем лучший дескриптор
        const faceDescriptor = bestDescriptor;

        // Конвертируем canvas в blob
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'face.jpg');
            formData.append('userId', userId);
            
            // Отправляем дескриптор лица на сервер (если backend не может его извлечь)
            formData.append('descriptor', JSON.stringify(faceDescriptor));

            showStatus('register-status', 'Отправка данных на сервер...', 'info');

            // Добавляем таймаут для запроса (30 секунд)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch(`${API_URL}/api/register`, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Проверяем, что ответ - это JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('Неожиданный ответ сервера:', text);
                    showStatus('register-status', `Ошибка сервера: ${response.status} ${response.statusText}. Ответ: ${text.substring(0, 100)}`, 'error');
                    return;
                }

                const result = await response.json();

            if (response.ok && result.success) {
                showStatus('register-status', 'Регистрация успешна! Система готова к использованию.', 'success');
                stopRegister();
            } else {
                showStatus('register-status', result.error || 'Ошибка регистрации', 'error');
            }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                if (fetchError.name === 'AbortError') {
                    showStatus('register-status', 'Таймаут запроса. Сервер не отвечает. Проверьте, что сервер запущен на http://localhost:3000', 'error');
                } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
                    showStatus('register-status', `Ошибка соединения с сервером: ${API_URL}. Проверьте, что сервер запущен.`, 'error');
                } else {
                    console.error('Ошибка запроса:', fetchError);
                    showStatus('register-status', `Ошибка при отправке данных: ${fetchError.message || fetchError}`, 'error');
                }
            }
        }, 'image/jpeg', 0.95);

    } catch (error) {
        console.error('Ошибка захвата:', error);
        showStatus('register-status', 'Ошибка при захвате лица', 'error');
    }
}

function stopRegister() {
    if (registerStream) {
        registerStream.getTracks().forEach(track => track.stop());
        registerStream = null;
    }
    
    // Останавливаем обнаружение лица
    stopFaceDetection('register');
    
    const video = document.getElementById('register-video');
    const overlay = document.getElementById('register-overlay');
    video.srcObject = null;
    
    // Очищаем overlay
    if (overlay) {
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
    }
    
    document.getElementById('register-start-btn').style.display = 'inline-block';
    document.getElementById('register-capture-btn').style.display = 'none';
    document.getElementById('register-stop-btn').style.display = 'none';
}

// ==================== ВХОД ====================

async function startLogin() {
    const userId = document.getElementById('login-userId').value;
    if (!userId) {
        showStatus('login-status', 'Введите ID пользователя', 'error');
        return;
    }

    // Проверка протокола (камера работает только через http/https)
    if (window.location.protocol === 'file:') {
        showStatus('login-status', '⚠️ Откройте через http://localhost:8000 (не file://). Камера работает только через HTTP/HTTPS.', 'error');
        return;
    }

    // Проверка наличия MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showStatus('login-status', 'Ваш браузер не поддерживает доступ к камере. Используйте Chrome, Firefox или Safari.', 'error');
        return;
    }

    try {
        // Загрузка моделей
        if (!loginModelsLoaded) {
            showStatus('login-status', 'Загрузка моделей...', 'info');
            await loadFaceModels('login');
            loginModelsLoaded = true;
        }

        // Получение доступа к камере с улучшенной обработкой ошибок
        const video = document.getElementById('login-video');
        showStatus('login-status', 'Запрос доступа к камере...', 'info');
        
        loginStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                facingMode: 'user' // Предпочитаем фронтальную камеру
            } 
        });
        
        video.srcObject = loginStream;

        // Инициализируем overlay canvas для рисования рамки
        const overlay = document.getElementById('login-overlay');
        overlay.width = video.videoWidth || 640;
        overlay.height = video.videoHeight || 480;

        // Инициализация liveness detection с расширенными данными
        livenessData = {
            blinks: 0,
            headMovements: 0,
            startTime: Date.now(),
            frameCount: 0,
            previousLandmarks: null,
            blinkHistory: [],
            movementHistory: [],
            frameSequence: [],
            frameTimestamps: [] // Временные метки кадров для анализа FPS
        };

        // Запускаем обнаружение лица и рисование рамки в реальном времени
        startFaceDetection('login', video, overlay);

        document.getElementById('login-start-btn').style.display = 'none';
        document.getElementById('login-stop-btn').style.display = 'inline-block';
        showStatus('login-status', 'Выполните проверку подлинности...', 'info');
        
        // Показываем индикаторы точек
        document.getElementById('liveness-instructions').style.display = 'block';
        resetLivenessDots();

        // Запуск liveness detection
        startLivenessDetection();

    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
        let errorMessage = 'Ошибка доступа к камере. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Разрешите доступ к камере в настройках браузера. Обновите страницу и попробуйте снова.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'Камера не найдена. Убедитесь, что камера подключена и не используется другим приложением.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Камера используется другим приложением. Закройте другие программы, использующие камеру.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage += 'Камера не поддерживает запрашиваемые параметры. Попробуйте другое устройство.';
        } else {
            errorMessage += `Ошибка: ${error.message || error.name}`;
        }
        
        showStatus('login-status', errorMessage, 'error');
    }
}

async function startLivenessDetection() {
    const video = document.getElementById('login-video');
    const canvas = document.getElementById('login-canvas');
    let lastBlinkTime = 0;
    let blinkState = 'open';
    let headPosition = 'center';
    let lastHeadMovementTime = 0;
    const minBlinkInterval = 200; // Минимальный интервал между миганиями (мс)
    const minHeadMovementInterval = 300; // Минимальный интервал между движениями головы (мс)
    const headMovementThreshold = 25; // Порог для засчета движения головы

    const detectionInterval = setInterval(async () => {
        if (!loginStream) {
            clearInterval(detectionInterval);
            return;
        }

        try {
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks();

            if (detection) {
                const currentTime = Date.now();
                livenessData.frameCount++;

                // Сохраняем данные кадра в последовательность
                const faceBox = detection.detection.box;
                if (livenessData.frameSequence.length < 50) { // Ограничиваем размер
                    livenessData.frameSequence.push({
                        timestamp: currentTime,
                        faceBox: {
                            x: faceBox.x,
                            y: faceBox.y,
                            width: faceBox.width,
                            height: faceBox.height
                        }
                    });
                }

                // Определение мигания с расширенной логикой
                const leftEye = detection.landmarks.getLeftEye();
                const rightEye = detection.landmarks.getRightEye();
                const eyeAspectRatio = calculateEyeAspectRatio(leftEye, rightEye);

                // Снижаем порог для более чувствительного обнаружения мигания
                const blinkThreshold = 0.3; // Увеличен с 0.2 до 0.3 для более легкого обнаружения
                const openThreshold = 0.35; // Увеличен с 0.25 до 0.35

                if (eyeAspectRatio < blinkThreshold) {
                    // Глаза закрыты или почти закрыты
                    if (blinkState === 'open') {
                        // Только что закрылись - это начало мигания
                        blinkState = 'closed';
                        const timeSinceLastBlink = currentTime - lastBlinkTime;
                        
                        // Проверяем интервал между миганиями
                        if (timeSinceLastBlink > minBlinkInterval || livenessData.blinks === 0) {
                            livenessData.blinks++;
                            lastBlinkTime = currentTime;
                            
                            // Сохраняем историю миганий
                            livenessData.blinkHistory.push({
                                timestamp: currentTime,
                                interval: timeSinceLastBlink,
                                eyeAspectRatio: eyeAspectRatio
                            });

                            console.log(`Мигание #${livenessData.blinks} обнаружено (EAR: ${eyeAspectRatio.toFixed(3)})`);
                            
                            // Обновляем первую точку при мигании
                            if (livenessData.blinks >= 2) {
                                updateLivenessDot(1);
                            }
                        }
                    }
                    // Если уже в состоянии 'closed', продолжаем отслеживать
                } else if (eyeAspectRatio > openThreshold) {
                    // Глаза открыты - возвращаемся в состояние 'open'
                    if (blinkState === 'closed') {
                        // Мигание завершено
                        blinkState = 'open';
                        console.log(`Мигание #${livenessData.blinks} завершено`);
                    }
                }

                // Определение движения головы с расширенной логикой
                const nose = detection.landmarks.getNose();
                const noseX = nose[3].x; // Центр носа
                const noseY = nose[3].y;

                if (livenessData.previousLandmarks) {
                    const prevNose = livenessData.previousLandmarks.getNose();
                    const prevNoseX = prevNose[3].x;
                    const prevNoseY = prevNose[3].y;
                    
                    const movementX = Math.abs(noseX - prevNoseX);
                    const movementY = Math.abs(noseY - prevNoseY);
                    const totalMovement = Math.sqrt(movementX * movementX + movementY * movementY);

                    if (totalMovement > headMovementThreshold) {
                        const timeSinceLastMovement = currentTime - lastHeadMovementTime;
                        
                        // Определяем направление движения
                        let direction = 'center';
                        if (Math.abs(noseX - prevNoseX) > Math.abs(noseY - prevNoseY)) {
                            // Горизонтальное движение
                            direction = noseX < prevNoseX ? 'left' : 'right';
                        } else {
                            // Вертикальное движение
                            direction = noseY < prevNoseY ? 'up' : 'down';
                        }

                        if (timeSinceLastMovement > minHeadMovementInterval) {
                            // Проверяем, что это новое направление
                            const lastMovement = livenessData.movementHistory[livenessData.movementHistory.length - 1];
                            const isNewDirection = !lastMovement || lastMovement.direction !== direction;

                            if (isNewDirection) {
                                livenessData.headMovements++;
                                lastHeadMovementTime = currentTime;

                                // Сохраняем историю движений
                                livenessData.movementHistory.push({
                                    timestamp: currentTime,
                                    direction: direction,
                                    movementX: movementX,
                                    movementY: movementY,
                                    totalMovement: totalMovement,
                                    interval: timeSinceLastMovement
                                });

                                headPosition = direction;
                                
                                // Обновляем вторую точку при движениях головы
                                if (livenessData.headMovements >= 3) {
                                    updateLivenessDot(2);
                                }
                            }
                        }
                    }
                }

                livenessData.previousLandmarks = detection.landmarks;

                // Автоматическая аутентификация после выполнения всех проверок
                const elapsedTime = currentTime - livenessData.startTime;
                const minDuration = 3000; // Минимальная длительность 3 секунды
                const minBlinksRequired = 2;
                const minHeadMovementsRequired = 3;

                if (livenessData.blinks >= minBlinksRequired && 
                    livenessData.headMovements >= minHeadMovementsRequired && 
                    elapsedTime >= minDuration) {
                    
                    clearInterval(detectionInterval);
                    // Обновляем третью точку при завершении всех проверок
                    updateLivenessDot(3);
                    
                    // Небольшая задержка перед отправкой для завершения процесса
                    setTimeout(async () => {
                        await authenticateLogin();
                    }, 500);
                }

                // Таймаут безопасности (максимум 20 секунд)
                if (elapsedTime > 20000) {
                    clearInterval(detectionInterval);
                    showStatus('login-status', 'Таймаут проверки. Попробуйте снова.', 'error');
                    stopLogin();
                }

            }
        } catch (error) {
            console.error('Ошибка liveness detection:', error);
        }
    }, 200); // Проверка каждые 200мс
}

function calculateEyeAspectRatio(leftEye, rightEye) {
    // Упрощенный расчет соотношения глаз (EAR - Eye Aspect Ratio)
    const leftEAR = getEyeAspectRatio(leftEye);
    const rightEAR = getEyeAspectRatio(rightEye);
    return (leftEAR + rightEAR) / 2;
}

function getEyeAspectRatio(eye) {
    // Вычисляем расстояние между вертикальными точками
    const vertical1 = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
    const vertical2 = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
    // Горизонтальное расстояние
    const horizontal = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
    
    // Защита от деления на ноль
    if (horizontal === 0) {
        return 0.5; // Возвращаем среднее значение если горизонтальное расстояние = 0
    }
    
    const ear = (vertical1 + vertical2) / (2 * horizontal);
    
    // Возвращаем нормализованное значение (обычно от 0.1 до 0.4)
    return Math.max(0, Math.min(1, ear));
}

/**
 * Сброс всех точек в начальное состояние
 */
function resetLivenessDots() {
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById(`liveness-dot-${i}`);
        if (dot) {
            dot.classList.remove('completed');
        }
    }
}

/**
 * Обновление точки прогресса (делает её зеленой)
 * @param {number} dotNumber - Номер точки (1, 2 или 3)
 */
function updateLivenessDot(dotNumber) {
    const dot = document.getElementById(`liveness-dot-${dotNumber}`);
    if (dot) {
        dot.classList.add('completed');
    }
}

/**
 * Обновление UI с метриками качества
 * @param {string} mode - 'register' или 'login'
 * @param {Object} qualityAnalysis - Результат анализа качества
 */
function updateQualityUI(mode, qualityAnalysis) {
    if (!qualityAnalysis) return;

    const prefix = mode === 'register' ? 'register' : 'login';
    const panel = document.getElementById(`${prefix}-quality-panel`);
    
    if (!panel) return;

    // Показываем панель качества
    panel.style.display = 'block';

    // Обновляем метрики качества
    updateQualityBar(`${prefix}-face-quality`, qualityAnalysis.faceQuality, 'Качество лица');
    updateQualityBar(`${prefix}-angle`, qualityAnalysis.angle, 'Угол лица');
    updateQualityBar(`${prefix}-lighting`, qualityAnalysis.lighting, 'Освещение');
    updateQualityBar(`${prefix}-positioning`, qualityAnalysis.positioning, 'Позиция');

    // Обновляем рекомендации
    const recommendationsList = document.getElementById(`${prefix}-recommendations-list`);
    if (recommendationsList && qualityAnalysis.recommendations) {
        recommendationsList.innerHTML = '';
        qualityAnalysis.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationsList.appendChild(li);
        });
    }
}

/**
 * Обновление одного индикатора качества
 */
function updateQualityBar(idPrefix, value, label) {
    const bar = document.getElementById(`${idPrefix}-bar`);
    const text = document.getElementById(`${idPrefix}-text`);
    
    if (bar) {
        const percentage = Math.round(value * 100);
        bar.style.width = percentage + '%';
        
        // Цвет в зависимости от качества
        if (value >= 0.7) {
            bar.setAttribute('data-quality', 'good');
            bar.style.background = '#4caf50';
        } else if (value >= 0.5) {
            bar.setAttribute('data-quality', 'medium');
            bar.style.background = '#ff9800';
        } else {
            bar.setAttribute('data-quality', 'poor');
            bar.style.background = '#f44336';
        }
    }
    
    if (text) {
        const percentage = Math.round(value * 100);
        let qualityText = '';
        if (value >= 0.7) qualityText = 'Отлично';
        else if (value >= 0.5) qualityText = 'Хорошо';
        else if (value >= 0.3) qualityText = 'Средне';
        else qualityText = 'Плохо';
        
        text.textContent = `${qualityText} (${percentage}%)`;
    }
}

/**
 * Запуск обнаружения лица и рисования рамки в реальном времени
 * @param {string} mode - 'register' или 'login'
 * @param {HTMLVideoElement} video - Видео элемент
 * @param {HTMLCanvasElement} overlay - Canvas для рисования
 */
function startFaceDetection(mode, video, overlay) {
    // Останавливаем предыдущее обнаружение, если запущено
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
    }
    if (qualityUpdateInterval) {
        clearInterval(qualityUpdateInterval);
    }

    // Инициализируем анализатор качества
    if (typeof QualityAnalyzer !== 'undefined' && !qualityAnalyzer) {
        qualityAnalyzer = new QualityAnalyzer();
    }

    // Обновляем размер overlay при изменении размера видео
    const updateOverlaySize = () => {
        if (video.videoWidth && video.videoHeight) {
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
        }
    };

    // Обновляем размер сразу
    updateOverlaySize();

    let lastDetection = null;

    // Запускаем обнаружение лица каждые 100мс
    faceDetectionInterval = setInterval(async () => {
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        try {
            // Обновляем размер overlay при необходимости
            if (overlay.width !== video.videoWidth || overlay.height !== video.videoHeight) {
                updateOverlaySize();
            }

            // Обнаружение лица
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                lastDetection = detection;
                // Рисуем рамку вокруг лица
                drawFaceBox(detection, overlay, video);
                
                // Обновляем временную историю для анализа FPS
                if (mode === 'login') {
                    const now = Date.now();
                    livenessData.frameTimestamps.push(now);
                    // Храним только последние 30 кадров (~3 секунды при 10 FPS)
                    if (livenessData.frameTimestamps.length > 30) {
                        livenessData.frameTimestamps.shift();
                    }
                }
            } else {
                lastDetection = null;
                // Очищаем overlay, если лицо не обнаружено
                const ctx = overlay.getContext('2d');
                ctx.clearRect(0, 0, overlay.width, overlay.height);
            }
        } catch (error) {
            // Игнорируем ошибки при обнаружении (могут быть временными)
            console.debug('Ошибка обнаружения лица:', error);
        }
    }, 100);

    // Запускаем обновление качества каждые 300мс (реже для производительности)
    if (qualityAnalyzer) {
        qualityUpdateInterval = setInterval(() => {
            // Обновление качества больше не показывается в UI
        }, 300);
    }
}

/**
 * Остановка обнаружения лица
 * @param {string} mode - 'register' или 'login'
 */
function stopFaceDetection(mode) {
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
        faceDetectionInterval = null;
    }
    
    if (qualityUpdateInterval) {
        clearInterval(qualityUpdateInterval);
        qualityUpdateInterval = null;
    }
    
    // Скрываем индикаторы точек
    if (mode === 'login') {
        const instructions = document.getElementById('liveness-instructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
        resetLivenessDots();
    }

    // Очищаем overlay
    const overlayId = mode === 'register' ? 'register-overlay' : 'login-overlay';
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
    }
}

/**
 * Рисование полупрозрачной рамки вокруг лица
 * @param {Object} detection - Результат обнаружения лица от face-api.js
 * @param {HTMLCanvasElement} overlay - Canvas для рисования
 * @param {HTMLVideoElement} video - Видео элемент
 */
function drawFaceBox(detection, overlay, video) {
    if (!detection || !overlay || !video) return;

    const ctx = overlay.getContext('2d');
    const scaleX = overlay.width / video.videoWidth;
    const scaleY = overlay.height / video.videoHeight;

    // Очищаем canvas
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Рисуем полупрозрачную рамку вокруг лица
    const box = detection.detection.box;
    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const width = box.width * scaleX;
    const height = box.height * scaleY;

    // Полупрозрачный зеленый цвет рамки (rgba с alpha = 0.5 для прозрачности)
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
}

/**
 * Предобработка изображения для улучшения качества распознавания
 * @param {ImageData} imageData - Исходные данные изображения
 * @returns {ImageData} - Обработанные данные изображения
 */
function preprocessImageData(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Улучшение контраста и яркости
    const alpha = 1.2; // Контраст (1.0 = без изменений, >1.0 = больше контраста)
    const beta = 10; // Яркость (0 = без изменений, >0 = ярче)
    
    for (let i = 0; i < data.length; i += 4) {
        // Применяем формулу: newPixel = alpha * pixel + beta
        data[i] = Math.min(255, Math.max(0, alpha * data[i] + beta));     // R
        data[i + 1] = Math.min(255, Math.max(0, alpha * data[i + 1] + beta)); // G
        data[i + 2] = Math.min(255, Math.max(0, alpha * data[i + 2] + beta)); // B
        // Alpha канал не изменяем (data[i + 3])
    }
    
    return imageData;
}

async function authenticateLogin() {
    const video = document.getElementById('login-video');
    const canvas = document.getElementById('login-canvas');
    const userId = document.getElementById('login-userId').value;

    try {
        // Проверяем доступность illuminationHelper
        let useIllumination = false;
        if (typeof IlluminationHelper !== 'undefined') {
            if (!illuminationHelper) {
                illuminationHelper = new IlluminationHelper();
            }
            
            // Используем быструю подсветку белым цветом для улучшения качества
            try {
                await illuminationHelper.illuminateOnce('white', 150);
                useIllumination = true;
            } catch (err) {
                console.error('Ошибка при подсветке:', err);
            }
        }

        showStatus('login-status', 'Извлечение дескриптора лица...', 'info');

        // Фиксируем изображение после подсветки
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Применяем предобработку для улучшения качества
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        imageData = preprocessImageData(imageData);
        ctx.putImageData(imageData, 0, 0);

        // Извлекаем дескриптор лица ПЕРЕД отправкой (как при регистрации)
        const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            showStatus('login-status', 'Лицо не обнаружено на видео. Убедитесь, что ваше лицо хорошо видно.', 'error');
            return;
        }

        // Извлекаем дескриптор лица для отправки на сервер
        const faceDescriptor = detection.descriptor ? Array.from(detection.descriptor) : null;
        
        if (!faceDescriptor) {
            showStatus('login-status', 'Не удалось извлечь дескриптор лица. Попробуйте снова.', 'error');
            return;
        }

        livenessData.timestamp = Date.now();

        // Очистка frameSequence от лишних данных (оставляем только последние кадры)
        if (livenessData.frameSequence.length > 30) {
            livenessData.frameSequence = livenessData.frameSequence.slice(-30);
        }

        // Отправка на сервер
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'face.jpg');
            formData.append('userId', userId);
            
            // Отправляем дескриптор лица на сервер (если backend не может его извлечь)
            if (faceDescriptor) {
                formData.append('descriptor', JSON.stringify(faceDescriptor));
            }
            
            // Отправляем расширенные данные liveness
            const livenessPayload = {
                ...livenessData,
                frameSequence: livenessData.frameSequence, // Включаем последовательность кадров
                frameTimestamps: livenessData.frameTimestamps || [] // Включаем временные метки для анализа FPS
            };
            
            formData.append('livenessData', JSON.stringify(livenessPayload));

            showStatus('login-status', 'Проверка аутентификации...', 'info');

            // Добавляем таймаут для запроса (30 секунд)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch(`${API_URL}/api/authenticate`, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Проверяем, что ответ - это JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('Неожиданный ответ сервера:', text);
                    showStatus('login-status', `Ошибка сервера: ${response.status} ${response.statusText}. Ответ: ${text.substring(0, 100)}`, 'error');
                    return;
                }

                const result = await response.json();

            if (response.ok && result.authenticated) {
                showStatus('login-status', `Аутентификация успешна! Уверенность: ${(result.confidence * 100).toFixed(1)}%`, 'success');
                stopLogin();
            } else {
                // Улучшенная обработка ошибок
                let errorMessage = result.error || 'Аутентификация не пройдена';
                if (response.status === 404) {
                    // Пользователь не найден - добавляем подсказку
                    errorMessage = result.error || 'Пользователь не найден';
                    if (result.hint) {
                        errorMessage += `. ${result.hint}`;
                    }
                }
                showStatus('login-status', errorMessage, 'error');
            }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                if (fetchError.name === 'AbortError') {
                    showStatus('login-status', 'Таймаут запроса. Сервер не отвечает. Проверьте, что сервер запущен на http://localhost:3000', 'error');
                } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
                    showStatus('login-status', `Ошибка соединения с сервером: ${API_URL}. Проверьте, что сервер запущен.`, 'error');
                } else {
                    console.error('Ошибка запроса:', fetchError);
                    showStatus('login-status', `Ошибка при отправке данных: ${fetchError.message || fetchError}`, 'error');
                }
            }
        }, 'image/jpeg', 0.95);

    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        showStatus('login-status', 'Ошибка при аутентификации', 'error');
    }
}

function stopLogin() {
    if (loginStream) {
        loginStream.getTracks().forEach(track => track.stop());
        loginStream = null;
    }
    
    // Останавливаем обнаружение лица
    stopFaceDetection('login');
    
    const video = document.getElementById('login-video');
    const overlay = document.getElementById('login-overlay');
    video.srcObject = null;
    
    // Очищаем overlay
    if (overlay) {
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
    }
    
    document.getElementById('login-start-btn').style.display = 'inline-block';
    document.getElementById('login-stop-btn').style.display = 'none';
    
    // Скрываем индикаторы точек и сбрасываем их
    const instructions = document.getElementById('liveness-instructions');
    if (instructions) {
        instructions.style.display = 'none';
    }
    resetLivenessDots();
    
    // Сброс данных
    livenessData = {
        blinks: 0,
        headMovements: 0,
        startTime: null,
        frameCount: 0,
        previousLandmarks: null,
        blinkHistory: [],
        movementHistory: [],
        frameSequence: []
    };
}

// ==================== УТИЛИТЫ ====================

async function loadFaceModels(prefix) {
    // Используем прямой путь к моделям из GitHub репозитория face-api.js-models
    // Это официальный репозиторий с моделями для face-api.js
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master';
    
    try {
        // Загружаем модели из GitHub - это надежный источник
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(`${MODEL_URL}/ssd_mobilenetv1`),
            faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_URL}/face_landmark_68`),
            faceapi.nets.faceRecognitionNet.loadFromUri(`${MODEL_URL}/face_recognition`),
            faceapi.nets.faceExpressionNet.loadFromUri(`${MODEL_URL}/face_expression`)
        ]);
        console.log('✅ Модели face-api.js успешно загружены из GitHub');
    } catch (error) {
        console.error('❌ Ошибка загрузки моделей из GitHub:', error);
        
        // Альтернативный вариант: используем unpkg CDN
        const ALT_MODEL_URL = 'https://unpkg.com/face-api.js@0.22.2/weights';
        
        try {
            console.log('Попытка загрузки моделей из unpkg CDN...');
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(ALT_MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(ALT_MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(ALT_MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(ALT_MODEL_URL)
            ]);
            console.log('✅ Модели загружены из unpkg CDN');
        } catch (altError) {
            console.error('❌ Ошибка загрузки моделей из unpkg:', altError);
            
            // Последняя попытка: только минимальный набор для базовой работы
            try {
                console.log('Загружаем минимальный набор моделей...');
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(`${MODEL_URL}/ssd_mobilenetv1`),
                    faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_URL}/face_landmark_68`)
                ]);
                console.warn('⚠️ Загружены только базовые модели (обнаружение и landmarks)');
            } catch (minError) {
                throw new Error('Не удалось загрузить модели face-api.js. Проверьте интернет-соединение или используйте локальные модели.');
            }
        }
    }
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status ${type}`;
}

// ==================== СЕРВИС-ВОРКЕР И УВЕДОМЛЕНИЯ ====================

function initServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker
        .register('service-worker.js')
        .catch(error => {
            console.debug('Service worker registration failed:', error);
        });
}

function isStandaloneMode() {
    const isStandaloneDisplayMode = window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = window.navigator.standalone === true;
    return isStandaloneDisplayMode || isIOSStandalone;
}

function initNotificationsUI() {
    const button = document.getElementById('notifications-settings-btn');
    const status = document.getElementById('notifications-status');

    if (!button) {
        return;
    }

    // Текущее состояние при загрузке
    if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
            if (status) {
                status.textContent = 'Уведомления уже включены в браузере.';
                status.className = 'status success';
            }
        } else if (Notification.permission === 'denied') {
            if (status) {
                status.textContent = 'Уведомления заблокированы в настройках браузера. Разрешите их вручную в настройках системы/браузера.';
                status.className = 'status error';
            }
        }
    }

    button.addEventListener('click', () => {
        const notificationsSupported = typeof Notification !== 'undefined';
        const swSupported = 'serviceWorker' in navigator;

        if (!notificationsSupported || !swSupported) {
            alert('Уведомления на этом устройстве/в этом браузере не поддерживаются или требуют HTTPS и установленное веб‑приложение.');
        } else {
            requestNotificationsPermission().then(() => {
                if (!status) return;

                if (Notification.permission === 'granted') {
                    status.textContent = 'Уведомления успешно включены.';
                    status.className = 'status success';
                } else if (Notification.permission === 'denied') {
                    status.textContent = 'Доступ к уведомлениям отклонён. Разрешите их в настройках браузера или системы.';
                    status.className = 'status error';
                } else {
                    status.textContent = 'Состояние уведомлений не изменилось.';
                    status.className = 'status info';
                }
            });
        }
    });
}

async function requestNotificationsPermission() {
    try {
        if (typeof Notification === 'undefined') {
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted' && 'serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                registration.showNotification('Уведомления включены', {
                    body: 'Вы будете получать важные уведомления от системы аутентификации.',
                    icon: 'icons/icon-192.png',
                    tag: 'auth-notifications-enabled'
                });
            } catch (error) {
                console.debug('Unable to show test notification:', error);
            }
        }
    } catch (error) {
        console.debug('Notification permission request failed:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initServiceWorker();
    initNotificationsUI();
});
