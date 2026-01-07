// database.js - Исправленная версия с синхронизацией через GitHub Gist
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GITHUB_TOKEN: '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'
};

let sitecoreDB = null;
let isInitialized = false;

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

// Загрузка данных из Gist
async function loadDatabaseFromGist() {
    try {
        console.log('Загрузка данных из GitHub Gist...');
        
        const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
            headers: {
                'Authorization': `token ${DB_CONFIG.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const gist = await response.json();
        const content = gist.files['gistfile1.txt']?.content || gist.files['sitecore_db.json']?.content;
        
        if (!content) {
            throw new Error('Файл базы данных не найден в Gist');
        }
        
        const data = JSON.parse(content);
        console.log('Данные успешно загружены из Gist');
        return data;
        
    } catch (error) {
        console.error('Ошибка загрузки из Gist:', error.message);
        throw error;
    }
}

// Сохранение данных в Gist
async function saveDatabaseToGist(data) {
    try {
        console.log('Сохранение данных в GitHub Gist...');
        
        const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${DB_CONFIG.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'sitecore_db.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('Данные успешно сохранены в Gist');
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения в Gist:', error.message);
        throw error;
    }
}

// Инициализация базы данных
async function initDatabase() {
    try {
        // Сначала пробуем загрузить из Gist
        const gistData = await loadDatabaseFromGist();
        sitecoreDB = gistData;
        console.log('База данных загружена из Gist');
    } catch (error) {
        console.log('Используем локальную базу данных');
        // Пробуем загрузить из localStorage
        const localData = localStorage.getItem('sitecore_db');
        if (localData) {
            sitecoreDB = JSON.parse(localData);
        } else {
            // Используем базу по умолчанию
            sitecoreDB = DEFAULT_DB;
        }
    }
    
    // Всегда сохраняем локальную копию
    localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
    
    isInitialized = true;
    console.log('База данных SiteCore инициализирована');
    return sitecoreDB;
}

// Сохранение базы данных
async function saveDatabase() {
    if (!sitecoreDB) return false;
    
    try {
        // Сохраняем локально
        localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
        
        // Пытаемся сохранить в Gist
        await saveDatabaseToGist(sitecoreDB);
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения базы данных:', error);
        // Все равно сохраняем локально
        localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
        return false;
    }
}

// Ожидание инициализации
async function ensureDatabase() {
    if (!isInitialized) {
        await initDatabase();
    }
    return sitecoreDB;
}

// === ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ===

// Добавление пользователя
async function addUser(user) {
    await ensureDatabase();
    
    // Проверяем, нет ли уже пользователя с таким email
    const existingUser = sitecoreDB.users.clients.find(u => u.email === user.email);
    if (existingUser) {
        return false;
    }
    
    // Создаем нового пользователя
    const newUser = {
        id: 'client_' + Date.now(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        telegram: user.telegram,
        password: user.password,
        avatar: user.name.charAt(0).toUpperCase(),
        createdAt: new Date().toISOString()
    };
    
    sitecoreDB.users.clients.push(newUser);
    await saveDatabase();
    return newUser;
}

// Проверка входа клиента
async function checkClientLogin(email, password) {
    await ensureDatabase();
    return sitecoreDB.users.clients.find(client => 
        client.email === email && client.password === password
    );
}

// Проверка входа разработчика
async function checkDeveloperLogin(name, password) {
    await ensureDatabase();
    return sitecoreDB.users.developers.find(dev => 
        dev.name === name && dev.password === password
    );
}

// Получение всех заказов
async function getAllOrders() {
    await ensureDatabase();
    return sitecoreDB.orders || [];
}

// Получение заказов клиента
async function getClientOrders(clientId) {
    await ensureDatabase();
    return (sitecoreDB.orders || []).filter(order => order.clientId === clientId);
}

// Получение заказов разработчика
async function getDeveloperOrders(developerId) {
    await ensureDatabase();
    return (sitecoreDB.orders || []).filter(order => 
        order.assignedTo === developerId || !order.assignedTo
    );
}

// Создание заказа
async function createOrder(orderData) {
    await ensureDatabase();
    
    const newOrder = {
        id: 'order_' + Date.now(),
        ...orderData,
        status: 'new',
        assignedTo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (!sitecoreDB.orders) {
        sitecoreDB.orders = [];
    }
    
    sitecoreDB.orders.push(newOrder);
    await saveDatabase();
    return newOrder;
}

// Обновление заказа
async function updateOrder(orderId, updates) {
    await ensureDatabase();
    
    const orderIndex = sitecoreDB.orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) return false;
    
    sitecoreDB.orders[orderIndex] = {
        ...sitecoreDB.orders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    await saveDatabase();
    return true;
}

// Добавление сообщения
async function addMessage(messageData) {
    await ensureDatabase();
    
    const newMessage = {
        id: 'msg_' + Date.now(),
        ...messageData,
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) {
        sitecoreDB.messages = [];
    }
    
    sitecoreDB.messages.push(newMessage);
    await saveDatabase();
    return newMessage;
}

// Получение сообщений заказа
async function getOrderMessages(orderId) {
    await ensureDatabase();
    
    if (!sitecoreDB.messages) return [];
    
    return sitecoreDB.messages
        .filter(msg => msg.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Получение разработчиков
async function getDevelopers() {
    await ensureDatabase();
    return sitecoreDB.users.developers || [];
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Инициализация базы данных...');
    await initDatabase();
});

// Экспорт функций
window.db = {
    initDatabase,
    saveDatabase,
    addUser,
    checkClientLogin,
    checkDeveloperLogin,
    getAllOrders,
    getClientOrders,
    getDeveloperOrders,
    createOrder,
    updateOrder,
    addMessage,
    getOrderMessages,
    getDevelopers
};
