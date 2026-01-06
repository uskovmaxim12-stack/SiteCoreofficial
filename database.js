// database.js
// Конфигурация базы данных через ваш Gist
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    API_URL: 'https://api.github.com/gists/30dbe17ad2208d9eb8809574ee8ef012',
    TOKEN: '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'
};

// База данных по умолчанию
let sitecoreDB = {
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

// Загрузка базы данных из Gist
async function loadDatabaseFromGist() {
    try {
        console.log('Загрузка данных из GitHub Gist...');
        
        const response = await fetch(DB_CONFIG.API_URL, {
            headers: {
                'Authorization': `token ${DB_CONFIG.TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const gistData = await response.json();
        const content = gistData.files['gistfile1.txt'].content;
        const data = JSON.parse(content);
        
        if (data && data.users && data.users.developers) {
            sitecoreDB = data;
            console.log('Данные успешно загружены из Gist');
            localStorage.setItem('sitecore_db_cache', JSON.stringify({
                data: sitecoreDB,
                timestamp: Date.now()
            }));
            return true;
        } else {
            throw new Error('Неверная структура данных в Gist');
        }
    } catch (error) {
        console.warn('Ошибка загрузки из Gist:', error.message);
        return false;
    }
}

// Сохранение базы данных в Gist
async function saveDatabaseToGist() {
    try {
        const response = await fetch(DB_CONFIG.API_URL, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${DB_CONFIG.TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'gistfile1.txt': {
                        content: JSON.stringify(sitecoreDB, null, 2)
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
        console.error('Ошибка сохранения в Gist:', error);
        return false;
    }
}

// Загрузка данных (из кэша или Gist)
async function loadDatabase() {
    // Сначала пробуем загрузить из Gist
    const gistLoaded = await loadDatabaseFromGist();
    
    if (!gistLoaded) {
        // Если не удалось из Gist, пробуем из localStorage
        const cache = localStorage.getItem('sitecore_db_cache');
        if (cache) {
            try {
                const cached = JSON.parse(cache);
                sitecoreDB = cached.data;
                console.log('Данные загружены из localStorage');
            } catch (e) {
                console.warn('Ошибка загрузки из localStorage, используется база по умолчанию');
            }
        }
    }
    
    return sitecoreDB;
}

// Сохранение данных
async function saveDatabase() {
    // Сохраняем в localStorage
    localStorage.setItem('sitecore_db_cache', JSON.stringify({
        data: sitecoreDB,
        timestamp: Date.now()
    }));
    
    // Пытаемся сохранить в Gist
    await saveDatabaseToGist().catch(error => {
        console.warn('Не удалось сохранить в Gist, данные сохранены локально:', error.message);
    });
    
    return true;
}

// Добавление нового пользователя (клиента)
async function addUser(user) {
    // Проверяем, нет ли уже пользователя с таким email
    const existingUser = sitecoreDB.users.clients.find(u => u.email === user.email);
    if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
    }
    
    // Добавляем ID и аватар
    user.id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    user.avatar = user.name.charAt(0).toUpperCase();
    user.createdAt = new Date().toISOString();
    
    // Добавляем в базу
    sitecoreDB.users.clients.push(user);
    
    // Сохраняем
    await saveDatabase();
    return user;
}

// Проверка входа клиента
async function checkClientLogin(email, password) {
    return sitecoreDB.users.clients.find(client => 
        client.email === email && client.password === password
    );
}

// Проверка входа разработчика
async function checkDeveloperLogin(name, password) {
    return sitecoreDB.users.developers.find(dev => 
        dev.name === name && dev.password === password
    );
}

// Получение всех заказов
function getAllOrders() {
    return sitecoreDB.orders || [];
}

// Получение заказов клиента
function getClientOrders(clientId) {
    return (sitecoreDB.orders || []).filter(order => order.clientId === clientId);
}

// Получение заказов разработчика
function getDeveloperOrders(developerId) {
    return (sitecoreDB.orders || []).filter(order => 
        order.assignedTo === developerId || !order.assignedTo
    );
}

// Создание нового заказа
async function createOrder(orderData) {
    const newOrder = {
        id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
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
    const orderIndex = sitecoreDB.orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
        throw new Error('Заказ не найден');
    }
    
    sitecoreDB.orders[orderIndex] = {
        ...sitecoreDB.orders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    await saveDatabase();
    return sitecoreDB.orders[orderIndex];
}

// Добавление сообщения
async function addMessage(messageData) {
    const newMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
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
function getOrderMessages(orderId) {
    return (sitecoreDB.messages || [])
        .filter(msg => msg.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Получение разработчиков
function getDevelopers() {
    return sitecoreDB.users.developers;
}

// Инициализация
async function initialize() {
    await loadDatabase();
    console.log('База данных SiteCore инициализирована');
    return sitecoreDB;
}

// Экспортируем функции
window.db = {
    initialize,
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
    getDevelopers,
    loadDatabase,
    saveDatabase
};

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('Инициализация...');
    window.db.initialize().catch(error => {
        console.error('Ошибка инициализации:', error);
    });
});
