// database.js
// Конфигурация базы данных через ваш Gist
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    RAW_URL: 'https://gist.githubusercontent.com/uskovmaxim12-stack/30dbe17ad2208d9eb8809574ee8ef012/raw/37a0fab472c6512b31fc1ee901e1e0dac2964250/gistfile1.txt'
};

// База данных по умолчанию (будет использоваться если не удалось загрузить из Gist)
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

// Глобальная переменная для хранения базы данных
let sitecoreDB = null;

// Загрузка базы данных
async function loadDatabase() {
    try {
        console.log('Загрузка базы данных из Gist...');
        
        // Пытаемся загрузить из Gist с кэшированием
        const response = await fetch(DB_CONFIG.RAW_URL + '?t=' + Date.now(), {
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Данные успешно загружены из Gist');
            
            // Проверяем структуру данных
            if (data && data.users && data.developers) {
                sitecoreDB = data;
            } else {
                // Если структура некорректна, используем базу по умолчанию
                sitecoreDB = DEFAULT_DB;
                console.warn('Структура данных в Gist некорректна, используется база по умолчанию');
            }
        } else {
            throw new Error('Не удалось загрузить данные из Gist');
        }
    } catch (error) {
        console.warn('Ошибка загрузки из Gist:', error.message);
        
        // Пробуем загрузить из localStorage
        const localData = localStorage.getItem('sitecore_db');
        if (localData) {
            sitecoreDB = JSON.parse(localData);
            console.log('Данные загружены из localStorage');
        } else {
            // Используем базу по умолчанию
            sitecoreDB = DEFAULT_DB;
            console.log('Используется база данных по умолчанию');
        }
    }
    
    // Сохраняем локальную копию
    saveToLocalStorage();
    return sitecoreDB;
}

// Сохранение в localStorage
function saveToLocalStorage() {
    if (sitecoreDB) {
        localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
    }
}

// Добавление нового пользователя (клиента)
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
    
    // Добавляем в базу
    sitecoreDB.users.clients.push(user);
    saveToLocalStorage();
    return true;
}

// Проверка входа клиента
function checkClientLogin(email, password) {
    if (!sitecoreDB) return null;
    
    return sitecoreDB.users.clients.find(client => 
        client.email === email && client.password === password
    );
}

// Проверка входа разработчика
function checkDeveloperLogin(name, password) {
    if (!sitecoreDB) return null;
    
    return sitecoreDB.users.developers.find(dev => 
        dev.name === name && dev.password === password
    );
}

// Получение всех заказов
function getAllOrders() {
    return sitecoreDB ? sitecoreDB.orders : [];
}

// Получение заказов клиента
function getClientOrders(clientId) {
    if (!sitecoreDB) return [];
    
    return sitecoreDB.orders.filter(order => order.clientId === clientId);
}

// Получение заказов разработчика
function getDeveloperOrders(developerId) {
    if (!sitecoreDB) return [];
    
    return sitecoreDB.orders.filter(order => 
        order.assignedTo === developerId || !order.assignedTo
    );
}

// Создание нового заказа
function createOrder(orderData) {
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
    saveToLocalStorage();
    return newOrder;
}

// Обновление заказа
function updateOrder(orderId, updates) {
    if (!sitecoreDB) return false;
    
    const orderIndex = sitecoreDB.orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) return false;
    
    sitecoreDB.orders[orderIndex] = {
        ...sitecoreDB.orders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    saveToLocalStorage();
    return true;
}

// Добавление сообщения
function addMessage(messageData) {
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
    saveToLocalStorage();
    return newMessage;
}

// Получение сообщений заказа
function getOrderMessages(orderId) {
    if (!sitecoreDB || !sitecoreDB.messages) return [];
    
    return sitecoreDB.messages
        .filter(msg => msg.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Инициализация базы данных при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await loadDatabase();
    console.log('База данных SiteCore готова к работе');
});

// Экспортируем функции для использования в других файлах
window.db = {
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
    getDevelopers: () => sitecoreDB ? sitecoreDB.users.developers : []
};
