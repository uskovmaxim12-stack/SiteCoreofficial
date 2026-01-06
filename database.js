// database.js - ОБНОВЛЕННЫЙ ФАЙЛ С СИНХРОНИЗАЦИЕЙ
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GITHUB_TOKEN: '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', // Вставьте ваш токен сюда
    GIST_URL: 'https://api.github.com/gists/30dbe17ad2208d9eb8809574ee8ef012'
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

let sitecoreDB = null;
let isInitialized = false;

// Загрузка базы данных
async function loadDatabase() {
    try {
        console.log('Загрузка базы данных...');
        
        if (DB_CONFIG.GITHUB_TOKEN && DB_CONFIG.GITHUB_TOKEN !== 'ВАШ_ТОКЕН_ЗДЕСЬ') {
            // Загружаем из Gist с токеном
            const response = await fetch(DB_CONFIG.GIST_URL, {
                headers: {
                    'Authorization': `token ${DB_CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const gist = await response.json();
                const content = gist.files['sitecore_db.json']?.content || gist.files['gistfile1.txt']?.content;
                
                if (content) {
                    sitecoreDB = JSON.parse(content);
                    console.log('✅ Данные загружены из Gist');
                } else {
                    throw new Error('Не найден файл в Gist');
                }
            } else {
                throw new Error(`Ошибка Gist: ${response.status}`);
            }
        } else {
            throw new Error('Токен не настроен');
        }
    } catch (error) {
        console.warn('⚠️ Используем локальные данные:', error.message);
        
        // Пробуем загрузить из localStorage
        const localData = localStorage.getItem('sitecore_db');
        if (localData) {
            sitecoreDB = JSON.parse(localData);
        } else {
            sitecoreDB = JSON.parse(JSON.stringify(DEFAULT_DB));
        }
    }
    
    // Сохраняем локальную копию
    saveToLocalStorage();
    isInitialized = true;
    
    return sitecoreDB;
}

// Сохранение базы данных
async function saveDatabase() {
    if (!sitecoreDB) return false;
    
    // Всегда сохраняем в localStorage
    saveToLocalStorage();
    
    // Пытаемся сохранить в Gist если есть токен
    if (DB_CONFIG.GITHUB_TOKEN && DB_CONFIG.GITHUB_TOKEN !== 'ВАШ_ТОКЕН_ЗДЕСЬ') {
        try {
            const response = await fetch(DB_CONFIG.GIST_URL, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${DB_CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'sitecore_db.json': {
                            content: JSON.stringify(sitecoreDB, null, 2)
                        }
                    }
                })
            });
            
            if (response.ok) {
                console.log('✅ Данные сохранены в Gist');
                return true;
            } else {
                console.warn('⚠️ Не удалось сохранить в Gist');
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Ошибка синхронизации:', error.message);
            return false;
        }
    }
    
    return false;
}

// Локальное сохранение
function saveToLocalStorage() {
    if (sitecoreDB) {
        localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
        localStorage.setItem('sitecore_db_timestamp', Date.now().toString());
    }
}

// Геттеры
function getUsers() {
    return sitecoreDB ? sitecoreDB.users : { clients: [], developers: [] };
}

function getOrders() {
    return sitecoreDB ? sitecoreDB.orders : [];
}

function getMessages() {
    return sitecoreDB ? sitecoreDB.messages : [];
}

// Добавление клиента
async function addClient(client) {
    if (!sitecoreDB) return false;
    
    // Проверяем уникальность email
    if (sitecoreDB.users.clients.some(c => c.email === client.email)) {
        return false;
    }
    
    client.id = 'client_' + Date.now();
    client.createdAt = new Date().toISOString();
    client.avatar = client.name.charAt(0).toUpperCase();
    
    sitecoreDB.users.clients.push(client);
    await saveDatabase();
    return true;
}

// Проверка входа клиента
function checkClientLogin(email, password) {
    if (!sitecoreDB) return null;
    return sitecoreDB.users.clients.find(c => c.email === email && c.password === password);
}

// Проверка входа разработчика
function checkDeveloperLogin(name, password) {
    if (!sitecoreDB) return null;
    return sitecoreDB.users.developers.find(d => d.name === name && d.password === password);
}

// Создание заказа
async function createOrder(order) {
    if (!sitecoreDB) return null;
    
    const newOrder = {
        id: 'order_' + Date.now(),
        ...order,
        status: 'new',
        assignedTo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    sitecoreDB.orders.push(newOrder);
    await saveDatabase();
    return newOrder;
}

// Обновление заказа
async function updateOrder(orderId, updates) {
    if (!sitecoreDB) return false;
    
    const orderIndex = sitecoreDB.orders.findIndex(o => o.id === orderId);
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
async function addMessage(message) {
    if (!sitecoreDB) return null;
    
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
function getOrderMessages(orderId) {
    if (!sitecoreDB || !sitecoreDB.messages) return [];
    
    return sitecoreDB.messages
        .filter(msg => msg.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Получение заказов клиента
function getClientOrders(clientId) {
    if (!sitecoreDB) return [];
    return sitecoreDB.orders.filter(o => o.clientId === clientId);
}

// Получение заказов разработчика
function getDeveloperOrders(developerId) {
    if (!sitecoreDB) return [];
    return sitecoreDB.orders.filter(o => o.assignedTo === developerId || !o.assignedTo);
}

// Получение разработчиков
function getDevelopers() {
    return sitecoreDB ? sitecoreDB.users.developers : [];
}

// Инициализация
async function initialize() {
    if (!isInitialized) {
        await loadDatabase();
    }
    return sitecoreDB;
}

// Экспорт
window.db = {
    initialize,
    loadDatabase,
    saveDatabase,
    addClient,
    checkClientLogin,
    checkDeveloperLogin,
    createOrder,
    updateOrder,
    addMessage,
    getOrderMessages,
    getClientOrders,
    getDeveloperOrders,
    getDevelopers,
    getUsers,
    getOrders,
    getMessages
};

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await initialize();
    console.log('🚀 База данных SiteCore инициализирована');
});
