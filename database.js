// database.js - Исправленная версия с работой через GitHub API
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_TOKEN: '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'
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

// Инициализация базы данных
async function initDatabase() {
    if (isInitialized) return sitecoreDB;
    
    try {
        console.log('🔄 Инициализация базы данных SiteCore...');
        
        // Пробуем загрузить из Gist
        try {
            const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
                headers: {
                    'Authorization': `token ${DB_CONFIG.GIST_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const gistData = await response.json();
                const content = gistData.files['gistfile1.txt'].content;
                sitecoreDB = JSON.parse(content);
                console.log('✅ База данных загружена из Gist');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (gistError) {
            console.warn('⚠️ Не удалось загрузить из Gist:', gistError.message);
            
            // Пробуем загрузить из localStorage
            const localData = localStorage.getItem('sitecore_db');
            if (localData) {
                sitecoreDB = JSON.parse(localData);
                console.log('📁 База данных загружена из localStorage');
            } else {
                // Используем базу по умолчанию
                sitecoreDB = JSON.parse(JSON.stringify(DEFAULT_DB));
                console.log('🆕 Используется база данных по умолчанию');
                
                // Сохраняем базу по умолчанию в Gist
                try {
                    await updateGist(sitecoreDB);
                } catch (e) {
                    console.log('ℹ️ Не удалось сохранить в Gist, используется локальное хранилище');
                }
            }
        }
        
        // Проверяем структуру
        if (!sitecoreDB.users || !sitecoreDB.orders || !sitecoreDB.messages) {
            console.warn('⚠️ Структура базы данных некорректна, создаем новую');
            sitecoreDB = JSON.parse(JSON.stringify(DEFAULT_DB));
        }
        
        // Обновляем разработчиков на случай, если они изменились
        if (sitecoreDB.users.developers.length === 0) {
            sitecoreDB.users.developers = DEFAULT_DB.users.developers;
        }
        
        // Сохраняем в localStorage
        saveToLocalStorage();
        
        isInitialized = true;
        console.log('✅ База данных SiteCore готова к работе');
        return sitecoreDB;
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        sitecoreDB = JSON.parse(JSON.stringify(DEFAULT_DB));
        saveToLocalStorage();
        isInitialized = true;
        return sitecoreDB;
    }
}

// Обновление Gist
async function updateGist(data) {
    try {
        const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${DB_CONFIG.GIST_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'gistfile1.txt': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        console.log('✅ Данные обновлены в Gist');
        return true;
    } catch (error) {
        console.warn('⚠️ Не удалось обновить Gist:', error.message);
        return false;
    }
}

// Сохранение базы данных
async function saveDatabase() {
    if (!sitecoreDB) return false;
    
    try {
        // Сохраняем в localStorage
        saveToLocalStorage();
        
        // Пытаемся синхронизировать с Gist
        const saved = await updateGist(sitecoreDB);
        
        if (saved) {
            console.log('✅ Данные синхронизированы с облаком');
        } else {
            console.log('ℹ️ Данные сохранены локально');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        saveToLocalStorage(); // Всегда сохраняем локально
        return false;
    }
}

// Сохранение в localStorage
function saveToLocalStorage() {
    if (sitecoreDB) {
        localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
        localStorage.setItem('sitecore_db_timestamp', Date.now());
    }
}

// Функции работы с данными
async function addUser(user) {
    await initDatabase();
    
    // Проверяем, нет ли уже пользователя с таким email
    const existingUser = sitecoreDB.users.clients.find(u => u.email === user.email);
    if (existingUser) {
        return false;
    }
    
    // Создаем нового пользователя
    const newClient = {
        id: 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: user.name,
        email: user.email,
        phone: user.phone,
        telegram: user.telegram,
        password: user.password,
        avatar: user.name.charAt(0).toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    sitecoreDB.users.clients.push(newClient);
    await saveDatabase();
    return newClient;
}

async function checkClientLogin(email, password) {
    await initDatabase();
    
    return sitecoreDB.users.clients.find(client => 
        client.email === email && client.password === password
    );
}

async function checkDeveloperLogin(name, password) {
    await initDatabase();
    
    return sitecoreDB.users.developers.find(dev => 
        dev.name === name && dev.password === password
    );
}

async function getDevelopers() {
    await initDatabase();
    return sitecoreDB.users.developers;
}

async function getAllOrders() {
    await initDatabase();
    return sitecoreDB.orders;
}

async function getClientOrders(clientId) {
    await initDatabase();
    return sitecoreDB.orders.filter(order => order.clientId === clientId);
}

async function getDeveloperOrders(developerId) {
    await initDatabase();
    const orders = sitecoreDB.orders.filter(order => 
        order.assignedTo === developerId || !order.assignedTo
    );
    
    // Для разработчика показываем только не назначенные или его заказы
    return orders;
}

async function createOrder(orderData) {
    await initDatabase();
    
    const newOrder = {
        id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ...orderData,
        status: 'new',
        assignedTo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    sitecoreDB.orders.push(newOrder);
    await saveDatabase();
    return newOrder;
}

async function updateOrder(orderId, updates) {
    await initDatabase();
    
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

async function addMessage(messageData) {
    await initDatabase();
    
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

async function getOrderMessages(orderId) {
    await initDatabase();
    
    if (!sitecoreDB.messages) return [];
    
    return sitecoreDB.messages
        .filter(msg => msg.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDatabase();
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    }
});

// Экспортируем функции
window.db = {
    initDatabase,
    saveDatabase,
    addUser,
    checkClientLogin,
    checkDeveloperLogin,
    getDevelopers,
    getAllOrders,
    getClientOrders,
    getDeveloperOrders,
    createOrder,
    updateOrder,
    addMessage,
    getOrderMessages
};
