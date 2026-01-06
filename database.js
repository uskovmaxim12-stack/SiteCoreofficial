// Конфигурация базы данных (ваш Gist)
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_FILE: 'gistfile1.txt',
    RAW_URL: 'https://gist.githubusercontent.com/uskovmaxim12-stack/30dbe17ad2208d9eb8809574ee8ef012/raw/37a0fab472c6512b31fc1ee901e1e0dac2964250/gistfile1.txt',
    API_URL: 'https://api.github.com/gists/30dbe17ad2208d9eb8809574ee8ef012'
};

// Загрузка базы данных
async function loadDatabase() {
    try {
        // Пробуем загрузить из сети
        const response = await fetch(DB_CONFIG.RAW_URL + '?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить базу данных');
        }
        
        const data = await response.json();
        
        // Сохраняем локальную копию
        localStorage.setItem('sitecore_db_cache', JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
        
        return data;
        
    } catch (error) {
        console.log('Используем локальную копию:', error.message);
        
        // Пробуем загрузить из кэша
        const cache = localStorage.getItem('sitecore_db_cache');
        if (cache) {
            const cached = JSON.parse(cache);
            // Если кэш не старше 5 минут
            if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
                return cached.data;
            }
        }
        
        // Если нет кэша, возвращаем базовую структуру
        return {
            users: {
                clients: [],
                developers: [
                    {
                        id: "dev_1",
                        name: "Максим",
                        password: "140612",
                        avatar: "М",
                        email: "maxim@sitecore.ru"
                    },
                    {
                        id: "dev_2", 
                        name: "Александр",
                        password: "789563",
                        avatar: "А",
                        email: "alexander@sitecore.ru"
                    }
                ]
            },
            orders: [],
            messages: []
        };
    }
}

// Сохранение базы данных
async function saveDatabase(data) {
    try {
        // Сохраняем в локальный кэш
        localStorage.setItem('sitecore_db_cache', JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
        
        // Здесь должна быть логика сохранения на сервер
        // Но так как у нас нет доступа к GitHub API без токена,
        // мы будем хранить изменения только локально
        
        console.log('Данные сохранены локально');
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        throw error;
    }
}

// Добавление заказа
async function addOrder(order) {
    const db = await loadDatabase();
    db.orders.push(order);
    await saveDatabase(db);
    return order;
}

// Обновление заказа
async function updateOrder(orderId, updates) {
    const db = await loadDatabase();
    const orderIndex = db.orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
        db.orders[orderIndex] = { ...db.orders[orderIndex], ...updates };
        await saveDatabase(db);
        return db.orders[orderIndex];
    }
    
    return null;
}

// Добавление сообщения
async function addMessage(message) {
    const db = await loadDatabase();
    db.messages.push(message);
    await saveDatabase(db);
    return message;
}

// Получение сообщений по заказу
async function getOrderMessages(orderId) {
    const db = await loadDatabase();
    return db.messages
        .filter(m => m.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Получение заказов пользователя
async function getUserOrders(userId, userType) {
    const db = await loadDatabase();
    
    if (userType === 'client') {
        return db.orders.filter(o => o.clientId === userId);
    } else if (userType === 'developer') {
        return db.orders.filter(o => o.assignedTo === userId || !o.assignedTo);
    }
    
    return [];
}

// Обновление статуса заказа
async function updateOrderStatus(orderId, status, developerId = null) {
    const db = await loadDatabase();
    const orderIndex = db.orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
        const updateData = {
            status: status,
            updatedAt: new Date().toISOString()
        };
        
        if (developerId) {
            updateData.assignedTo = developerId;
        }
        
        db.orders[orderIndex] = { ...db.orders[orderIndex], ...updateData };
        await saveDatabase(db);
        return db.orders[orderIndex];
    }
    
    return null;
}

// ИИ помощник для клиентов
const assistantAI = {
    // Ответы на частые вопросы
    responses: {
        'привет|здравствуй|здравствуйте': 'Привет! Я помогу вам с созданием сайта. Что вас интересует?',
        'стоимость|цена|сколько стоит': 'Стоимость зависит от типа сайта:\n- Статический: от 20 000 ₽\n- Динамический: от 50 000 ₽\nТочную стоимость можно рассчитать при создании заказа.',
        'сроки|сколько времени|как долго': 'Сроки разработки:\n- Статический сайт: 7-14 дней\n- Динамический сайт: 14-30 дней\nСроки могут меняться в зависимости от сложности.',
        'типы сайтов|какие сайты': 'Мы разрабатываем:\n1. Статические сайты - визитки, лендинги\n2. Динамические сайты - интернет-магазины, корпоративные порталы\n3. Веб-приложения - CRM, личные кабинеты',
        'заказ|создать заказ|оформить': 'Чтобы создать заказ:\n1. Перейдите в раздел "Создать заказ"\n2. Заполните форму\n3. Опишите детали в промте\n4. Укажите бюджет и сроки',
        'промт|что написать в промте': 'В промте опишите:\n1. Цель сайта\n2. Целевую аудиторию\n3. Предпочитаемый дизайн\n4. Необходимый функционал\n5. Примеры похожих сайтов (если есть)',
        'оплата|как оплатить': 'Оплата поэтапная:\n1. 30% - начало работы\n2. 30% - готовый дизайн\n3. 40% - сдача проекта\nВозможна оплата картой или переводом.',
        'связь|контакты|как связаться': 'Вы можете связаться:\n1. Через чат в заказе\n2. Telegram менеджера\n3. Email: support@sitecore.ru',
        'гарантии|что если не понравится': 'Мы предоставляем:\n1. 3 бесплатных правки дизайна\n2. Тестовый период 7 дней\n3. Гарантию на работу 1 год\n4. Бесплатная техническая поддержка 1 месяц',
        'спасибо|благодарю': 'Всегда рады помочь! Если есть еще вопросы - обращайтесь.',
        'пока|до свидания': 'До свидания! Удачного дня!'
    },
    
    // Поиск ответа по вопросу
    findResponse(question) {
        const lowerQuestion = question.toLowerCase();
        
        for (const [keywords, response] of Object.entries(this.responses)) {
            const keywordList = keywords.split('|');
            if (keywordList.some(keyword => lowerQuestion.includes(keyword))) {
                return response;
            }
        }
        
        return 'Извините, я не понял вопрос. Можете переформулировать? Или задайте вопрос о стоимости, сроках, типах сайтов или создании заказа.';
    }
};
