// database.js
// Конфигурация базы данных через ваш Gist
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GITHUB_TOKEN: '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',
    API_URL: 'https://api.github.com/gists',
    RAW_URL: 'https://gist.githubusercontent.com/uskovmaxim12-stack/30dbe17ad2208d9eb8809574ee8ef012/raw'
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
    messages: [],
    lastSync: null
};

// Глобальная переменная для хранения базы данных
let sitecoreDB = null;

// Функция для показа ошибок
function showDbError(message) {
    console.error('Database Error:', message);
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = 'notification error show';
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
}

// Загрузка базы данных из Gist с использованием токена
async function loadDatabaseFromGist() {
    try {
        console.log('Загрузка данных из GitHub Gist...');
        
        const response = await fetch(`${DB_CONFIG.API_URL}/${DB_CONFIG.GIST_ID}`, {
            headers: {
                'Authorization': `Bearer ${DB_CONFIG.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const gist = await response.json();
        const content = gist.files['sitecore_db.json']?.content || 
                       gist.files['gistfile1.txt']?.content ||
                       JSON.stringify(DEFAULT_DB);
        
        const data = JSON.parse(content);
        console.log('Данные успешно загружены из Gist');
        return data;
    } catch (error) {
        console.error('Ошибка загрузки из Gist:', error.message);
        throw error;
    }
}

// Сохранение базы данных в Gist
async function saveDatabaseToGist(data) {
    try {
        console.log('Сохранение данных в GitHub Gist...');
        
        const response = await fetch(`${DB_CONFIG.API_URL}/${DB_CONFIG.GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${DB_CONFIG.GITHUB_TOKEN}`,
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

// Загрузка базы данных (сначала из Gist, потом из localStorage, потом дефолтная)
async function loadDatabase() {
    try {
        // Пытаемся загрузить из Gist
        const gistData = await loadDatabaseFromGist();
        sitecoreDB = gistData;
        
        // Сохраняем локальную копию
        localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
        localStorage.setItem('sitecore_db_sync', new Date().toISOString());
        
        console.log('Данные загружены из Gist');
        return sitecoreDB;
    } catch (error) {
        console.warn('Не удалось загрузить из Gist, пробуем localStorage...');
        
        // Пробуем загрузить из localStorage
        const localData = localStorage.getItem('sitecore_db');
        const lastSync = localStorage.getItem('sitecore_db_sync');
        
        if (localData) {
            sitecoreDB = JSON.parse(localData);
            
            // Проверяем, не устарели ли данные (больше 5 минут)
            if (lastSync) {
                const syncTime = new Date(lastSync);
                const now = new Date();
                const diffMinutes = (now - syncTime) / (1000 * 60);
                
                if (diffMinutes < 5) {
                    console.log('Данные загружены из localStorage (синхронизированы)');
                } else {
                    console.log('Данные загружены из localStorage (требуется синхронизация)');
                    showDbError('Данные могут быть устаревшими. Проверьте интернет-соединение.');
                }
            } else {
                console.log('Данные загружены из localStorage');
            }
        } else {
            // Используем базу по умолчанию
            sitecoreDB = DEFAULT_DB;
            localStorage.setItem('sitecore_db', JSON.stringify(DEFAULT_DB));
            console.log('Используется база данных по умолчанию');
        }
        
        return sitecoreDB;
    }
}

// Сохранение базы данных (пробуем в Gist, потом в localStorage)
async function saveDatabase(data) {
    // Обновляем глобальную переменную
    sitecoreDB = data;
    
    // Всегда сохраняем в localStorage
    localStorage.setItem('sitecore_db', JSON.stringify(data));
    localStorage.setItem('sitecore_db_sync', new Date().toISOString());
    
    // Пытаемся сохранить в Gist (в фоновом режиме)
    try {
        await saveDatabaseToGist(data);
        console.log('Данные синхронизированы с Gist');
    } catch (error) {
        console.warn('Не удалось сохранить в Gist, данные сохранены только локально');
        // Не показываем ошибку пользователю, чтобы не мешать работе
    }
    
    return true;
}

// Инициализация базы данных при загрузке
let isInitialized = false;
async function initDatabase() {
    if (!isInitialized) {
        await loadDatabase();
        isInitialized = true;
    }
    return sitecoreDB;
}

// Функции для работы с данными
function addUser(user) {
    if (!sitecoreDB) return false;
    
    // Проверяем, нет ли уже пользователя с таким email
    const existingUser = sitecoreDB.users.clients.find(u => u.email === user.email);
    if (existingUser) {
        return false;
    }
    
    // Добавляем ID
    user.id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    user.createdAt = new Date().toISOString();
    user.avatar = user.name.charAt(0).toUpperCase();
    
    // Добавляем в базу
    sitecoreDB.users.clients.push(user);
    saveDatabase(sitecoreDB);
    return true;
}

function checkClientLogin(email, password) {
    if (!sitecoreDB) return null;
    
    return sitecoreDB.users.clients.find(client => 
        client.email === email && client.password === password
    );
}

function checkDeveloperLogin(name, password) {
    if (!sitecoreDB) return null;
    
    return sitecoreDB.users.developers.find(dev => 
        dev.name === name && dev.password === password
    );
}

function getAllOrders() {
    return sitecoreDB ? sitecoreDB.orders : [];
}

function getClientOrders(clientId) {
    if (!sitecoreDB) return [];
    
    return sitecoreDB.orders.filter(order => order.clientId === clientId);
}

function getDeveloperOrders(developerId) {
    if (!sitecoreDB) return [];
    
    return sitecoreDB.orders.filter(order => 
        order.assignedTo === developerId || !order.assignedTo
    );
}

async function createOrder(orderData) {
    if (!sitecoreDB) return null;
    
    const newOrder = {
        id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ...orderData,
        status: 'new',
        assignedTo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    sitecoreDB.orders.push(newOrder);
    await saveDatabase(sitecoreDB);
    return newOrder;
}

async function updateOrder(orderId, updates) {
    if (!sitecoreDB) return false;
    
    const orderIndex = sitecoreDB.orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) return false;
    
    sitecoreDB.orders[orderIndex] = {
        ...sitecoreDB.orders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    await saveDatabase(sitecoreDB);
    return true;
}

async function addMessage(messageData) {
    if (!sitecoreDB) return null;
    
    const newMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ...messageData,
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) {
        sitecoreDB.messages = [];
    }
    
    sitecoreDB.messages.push(newMessage);
    await saveDatabase(sitecoreDB);
    return newMessage;
}

function getOrderMessages(orderId) {
    if (!sitecoreDB || !sitecoreDB.messages) return [];
    
    return sitecoreDB.messages
        .filter(msg => msg.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function getDevelopers() {
    return sitecoreDB ? sitecoreDB.users.developers : [];
}

// Экспортируем функции для использования в других файлах
window.db = {
    initDatabase,
    loadDatabase,
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
    saveDatabase
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Инициализация базы данных SiteCore...');
    await window.db.initDatabase();
    console.log('База данных SiteCore готова к работе');
});
