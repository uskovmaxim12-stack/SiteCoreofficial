// database.js - система работы с данными через GitHub Gist
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_TOKEN: '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',
    GIST_FILE: 'sitecore_db.json'
};

// Глобальная переменная для базы данных
let sitecoreDB = null;
let isInitialized = false;

// Инициализация базы данных
async function initialize() {
    if (isInitialized) return sitecoreDB;
    
    console.log('Инициализация базы данных...');
    
    try {
        // Пробуем загрузить из GitHub Gist
        const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
            headers: {
                'Authorization': `token ${DB_CONFIG.GIST_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP ${response.status}: ${response.statusText}`);
        }
        
        const gistData = await response.json();
        const fileContent = gistData.files[DB_CONFIG.GIST_FILE]?.content;
        
        if (!fileContent) {
            throw new Error('Файл не найден в Gist');
        }
        
        sitecoreDB = JSON.parse(fileContent);
        console.log('Данные успешно загружены из GitHub Gist');
        
    } catch (error) {
        console.warn('Ошибка загрузки из Gist:', error.message);
        
        // Пробуем загрузить из localStorage
        const localData = localStorage.getItem('sitecore_db');
        if (localData) {
            sitecoreDB = JSON.parse(localData);
            console.log('Данные загружены из localStorage');
        } else {
            // Создаем новую базу по умолчанию
            sitecoreDB = {
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
            console.log('Создана новая база данных');
        }
    }
    
    // Сохраняем локальную копию
    saveToLocalStorage();
    isInitialized = true;
    
    return sitecoreDB;
}

// Сохранение в localStorage
function saveToLocalStorage() {
    if (sitecoreDB) {
        localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
        localStorage.setItem('sitecore_db_timestamp', Date.now().toString());
    }
}

// Синхронизация с GitHub Gist
async function syncWithGitHub() {
    if (!sitecoreDB || !DB_CONFIG.GIST_TOKEN) {
        console.warn('Невозможно синхронизировать: нет данных или токена');
        return false;
    }
    
    try {
        console.log('Синхронизация с GitHub Gist...');
        
        const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${DB_CONFIG.GIST_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                files: {
                    [DB_CONFIG.GIST_FILE]: {
                        content: JSON.stringify(sitecoreDB, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Ошибка HTTP ${response.status}: ${errorData.message || response.statusText}`);
        }
        
        console.log('Синхронизация с GitHub Gist успешна');
        return true;
        
    } catch (error) {
        console.error('Ошибка синхронизации с GitHub:', error.message);
        return false;
    }
}

// Экспортируемые функции
window.db = {
    // Инициализация
    initialize,
    
    // Работа с пользователями
    addUser: function(user) {
        if (!sitecoreDB || !sitecoreDB.users) return false;
        
        // Проверяем, нет ли уже пользователя с таким email
        if (sitecoreDB.users.clients.some(u => u.email === user.email)) {
            return false;
        }
        
        user.id = 'client_' + Date.now();
        user.avatar = user.name.charAt(0).toUpperCase();
        user.createdAt = new Date().toISOString();
        
        sitecoreDB.users.clients.push(user);
        saveToLocalStorage();
        syncWithGitHub(); // Синхронизируем в фоне
        
        return true;
    },
    
    checkClientLogin: function(email, password) {
        if (!sitecoreDB || !sitecoreDB.users) return null;
        
        return sitecoreDB.users.clients.find(client => 
            client.email === email && client.password === password
        );
    },
    
    checkDeveloperLogin: function(name, password) {
        if (!sitecoreDB || !sitecoreDB.users) return null;
        
        return sitecoreDB.users.developers.find(dev => 
            dev.name === name && dev.password === password
        );
    },
    
    getDevelopers: function() {
        if (!sitecoreDB || !sitecoreDB.users) return [];
        return sitecoreDB.users.developers;
    },
    
    getClients: function() {
        if (!sitecoreDB || !sitecoreDB.users) return [];
        return sitecoreDB.users.clients;
    },
    
    // Работа с заказами
    createOrder: function(orderData) {
        if (!sitecoreDB) return null;
        
        const newOrder = {
            id: 'order_' + Date.now(),
            ...orderData,
            status: 'new',
            assignedTo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (!sitecoreDB.orders) sitecoreDB.orders = [];
        sitecoreDB.orders.push(newOrder);
        
        saveToLocalStorage();
        syncWithGitHub(); // Синхронизируем в фоне
        
        return newOrder;
    },
    
    updateOrder: function(orderId, updates) {
        if (!sitecoreDB || !sitecoreDB.orders) return false;
        
        const orderIndex = sitecoreDB.orders.findIndex(order => order.id === orderId);
        if (orderIndex === -1) return false;
        
        sitecoreDB.orders[orderIndex] = {
            ...sitecoreDB.orders[orderIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        saveToLocalStorage();
        syncWithGitHub(); // Синхронизируем в фоне
        
        return true;
    },
    
    getAllOrders: function() {
        if (!sitecoreDB || !sitecoreDB.orders) return [];
        return sitecoreDB.orders;
    },
    
    getClientOrders: function(clientId) {
        if (!sitecoreDB || !sitecoreDB.orders) return [];
        return sitecoreDB.orders.filter(order => order.clientId === clientId);
    },
    
    getDeveloperOrders: function(developerId) {
        if (!sitecoreDB || !sitecoreDB.orders) return [];
        return sitecoreDB.orders.filter(order => 
            order.assignedTo === developerId || (!order.assignedTo && order.status === 'new')
        );
    },
    
    // Работа с сообщениями
    addMessage: function(messageData) {
        if (!sitecoreDB) return null;
        
        const newMessage = {
            id: 'msg_' + Date.now(),
            ...messageData,
            timestamp: new Date().toISOString()
        };
        
        if (!sitecoreDB.messages) sitecoreDB.messages = [];
        sitecoreDB.messages.push(newMessage);
        
        saveToLocalStorage();
        syncWithGitHub(); // Синхронизируем в фоне
        
        return newMessage;
    },
    
    getOrderMessages: function(orderId) {
        if (!sitecoreDB || !sitecoreDB.messages) return [];
        return sitecoreDB.messages
            .filter(msg => msg.orderId === orderId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    
    // Синхронизация
    sync: syncWithGitHub,
    
    // Получение всей базы данных (для отладки)
    getDatabase: function() {
        return sitecoreDB;
    }
};

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Инициализация...');
    await initialize();
    console.log('База данных SiteCore готова к работе');
});
