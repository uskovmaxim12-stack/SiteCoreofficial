// database.js
// Конфигурация базы данных через ваш Gist
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_FILE: 'gistfile1.txt',
    API_URL: 'https://api.github.com/gists',
    TOKEN: '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'
};

// База данных по умолчанию
const DEFAULT_DB = {
    users: {
        clients: [],
        developers: [
            {
                id: "dev_1",
                name: "Максим",
                password: "140612",
                avatar: "М",
                email: "maxim@sitecore.ru",
                phone: "+7 (999) 123-45-67",
                telegram: "@maxim_dev",
                specialty: "Full-stack разработчик",
                experience: "5 лет"
            },
            {
                id: "dev_2",
                name: "Александр", 
                password: "789563",
                avatar: "А",
                email: "alexander@sitecore.ru",
                phone: "+7 (999) 987-65-43",
                telegram: "@alexander_dev",
                specialty: "Frontend разработчик",
                experience: "3 года"
            }
        ]
    },
    orders: [],
    messages: []
};

// Глобальная переменная
let sitecoreDB = null;

// Функция для работы с GitHub API
async function makeGitHubRequest(url, method = 'GET', data = null) {
    const headers = {
        'Authorization': `token ${DB_CONFIG.TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
    };
    
    const config = {
        method: method,
        headers: headers,
    };
    
    if (data) {
        config.body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
    }
    
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка запроса к GitHub API:', error);
        throw error;
    }
}

// Загрузка базы данных
async function loadDatabase() {
    console.log('🔄 Загрузка базы данных...');
    
    try {
        // Пробуем загрузить из Gist с токеном
        const gist = await makeGitHubRequest(`${DB_CONFIG.API_URL}/${DB_CONFIG.GIST_ID}`);
        const file = gist.files[DB_CONFIG.GIST_FILE];
        
        if (file && file.content) {
            sitecoreDB = JSON.parse(file.content);
            console.log('✅ База данных загружена из Gist');
            
            // Сохраняем локальную копию
            localStorage.setItem('sitecore_db', JSON.stringify({
                data: sitecoreDB,
                timestamp: Date.now()
            }));
            
            return sitecoreDB;
        }
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить из Gist:', error.message);
        
        // Пробуем загрузить из localStorage
        const localData = localStorage.getItem('sitecore_db');
        if (localData) {
            const cached = JSON.parse(localData);
            // Если кэш не старше 1 часа
            if (Date.now() - cached.timestamp < 60 * 60 * 1000) {
                sitecoreDB = cached.data;
                console.log('📁 База данных загружена из localStorage');
                return sitecoreDB;
            }
        }
        
        // Используем базу по умолчанию
        sitecoreDB = JSON.parse(JSON.stringify(DEFAULT_DB));
        console.log('🔄 Используется база данных по умолчанию');
        
        // Сохраняем базу по умолчанию
        localStorage.setItem('sitecore_db', JSON.stringify({
            data: sitecoreDB,
            timestamp: Date.now()
        }));
        
        // Пробуем сохранить в Gist
        try {
            await saveDatabase();
        } catch (e) {
            console.log('⚠️ Не удалось сохранить в Gist при инициализации');
        }
    }
    
    return sitecoreDB;
}

// Сохранение базы данных
async function saveDatabase() {
    if (!sitecoreDB) return false;
    
    console.log('💾 Сохранение базы данных...');
    
    try {
        // Сохраняем в Gist
        const update = {
            files: {
                [DB_CONFIG.GIST_FILE]: {
                    content: JSON.stringify(sitecoreDB, null, 2)
                }
            }
        };
        
        await makeGitHubRequest(`${DB_CONFIG.API_URL}/${DB_CONFIG.GIST_ID}`, 'PATCH', update);
        console.log('✅ База данных сохранена в Gist');
        
        // Сохраняем локальную копию
        localStorage.setItem('sitecore_db', JSON.stringify({
            data: sitecoreDB,
            timestamp: Date.now()
        }));
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения в Gist:', error);
        
        // Сохраняем только локально
        localStorage.setItem('sitecore_db', JSON.stringify({
            data: sitecoreDB,
            timestamp: Date.now()
        }));
        
        return false;
    }
}

// Добавление клиента
async function addClient(client) {
    await loadDatabase();
    
    // Проверяем существование email
    const existingClient = sitecoreDB.users.clients.find(c => c.email === client.email);
    if (existingClient) {
        throw new Error('Пользователь с таким email уже существует');
    }
    
    // Создаем ID
    client.id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    client.avatar = client.name.charAt(0).toUpperCase();
    client.createdAt = new Date().toISOString();
    
    // Добавляем клиента
    sitecoreDB.users.clients.push(client);
    
    // Сохраняем
    const saved = await saveDatabase();
    if (!saved) {
        throw new Error('Не удалось сохранить данные');
    }
    
    return client;
}

// Проверка входа клиента
async function checkClientLogin(email, password) {
    await loadDatabase();
    return sitecoreDB.users.clients.find(c => c.email === email && c.password === password);
}

// Проверка входа разработчика
async function checkDeveloperLogin(name, password) {
    await loadDatabase();
    return sitecoreDB.users.developers.find(d => d.name === name && d.password === password);
}

// Создание заказа
async function createOrder(order) {
    await loadDatabase();
    
    const newOrder = {
        id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ...order,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    sitecoreDB.orders.push(newOrder);
    
    // Добавляем системное сообщение
    const systemMessage = {
        id: 'msg_' + Date.now(),
        orderId: newOrder.id,
        text: `Заказ "${order.projectName}" создан. Ожидайте, пока разработчик возьмет его в работу.`,
        sender: 'system',
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) sitecoreDB.messages = [];
    sitecoreDB.messages.push(systemMessage);
    
    await saveDatabase();
    return newOrder;
}

// Получение заказов клиента
async function getClientOrders(clientId) {
    await loadDatabase();
    return sitecoreDB.orders.filter(o => o.clientId === clientId);
}

// Получение доступных заказов для разработчика
async function getAvailableOrders() {
    await loadDatabase();
    return sitecoreDB.orders.filter(o => !o.assignedTo && o.status === 'new');
}

// Получение заказов разработчика
async function getDeveloperOrders(developerId) {
    await loadDatabase();
    return sitecoreDB.orders.filter(o => o.assignedTo === developerId);
}

// Взятие заказа в работу
async function takeOrder(orderId, developerId) {
    await loadDatabase();
    
    const order = sitecoreDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Заказ не найден');
    
    order.assignedTo = developerId;
    order.status = 'in-progress';
    order.updatedAt = new Date().toISOString();
    
    // Добавляем системное сообщение
    const developer = sitecoreDB.users.developers.find(d => d.id === developerId);
    const systemMessage = {
        id: 'msg_' + Date.now(),
        orderId: orderId,
        text: `Заказ взят в работу разработчиком ${developer.name}`,
        sender: 'system',
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) sitecoreDB.messages = [];
    sitecoreDB.messages.push(systemMessage);
    
    await saveDatabase();
    return order;
}

// Обновление статуса заказа
async function updateOrderStatus(orderId, status, developerId = null) {
    await loadDatabase();
    
    const order = sitecoreDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Заказ не найден');
    
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    if (developerId) {
        order.assignedTo = developerId;
    }
    
    // Добавляем системное сообщение
    const statusTexts = {
        'new': 'Новый',
        'in-progress': 'В работе',
        'review': 'На проверке',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    
    const systemMessage = {
        id: 'msg_' + Date.now(),
        orderId: orderId,
        text: `Статус заказа изменен на "${statusTexts[status]}"`,
        sender: 'system',
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) sitecoreDB.messages = [];
    sitecoreDB.messages.push(systemMessage);
    
    await saveDatabase();
    return order;
}

// Добавление сообщения
async function addMessage(message) {
    await loadDatabase();
    
    const newMessage = {
        id: 'msg_' + Date.now(),
        ...message,
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) sitecoreDB.messages = [];
    sitecoreDB.messages.push(newMessage);
    
    await saveDatabase();
    return newMessage;
}

// Получение сообщений заказа
async function getOrderMessages(orderId) {
    await loadDatabase();
    
    if (!sitecoreDB.messages) return [];
    return sitecoreDB.messages
        .filter(m => m.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Получение разработчиков
async function getDevelopers() {
    await loadDatabase();
    return sitecoreDB.users.developers;
}

// Получение клиента по ID
async function getClientById(clientId) {
    await loadDatabase();
    return sitecoreDB.users.clients.find(c => c.id === clientId);
}

// Получение всех заказов (для админа)
async function getAllOrders() {
    await loadDatabase();
    return sitecoreDB.orders;
}

// Инициализация базы данных
async function initDatabase() {
    if (!sitecoreDB) {
        return await loadDatabase();
    }
    return sitecoreDB;
}

// Экспорт функций
window.db = {
    initDatabase,
    addClient,
    checkClientLogin,
    checkDeveloperLogin,
    createOrder,
    getClientOrders,
    getAvailableOrders,
    getDeveloperOrders,
    takeOrder,
    updateOrderStatus,
    addMessage,
    getOrderMessages,
    getDevelopers,
    getClientById,
    getAllOrders,
    saveDatabase
};

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Инициализация системы SiteCore...');
    await initDatabase();
    console.log('✅ Система готова к работе');
});
