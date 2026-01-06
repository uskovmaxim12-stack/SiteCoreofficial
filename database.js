// database.js - Исправленная версия
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_FILE: 'sitecore_db.json',
    TOKEN: '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' // Ваш токен
};

// Убираем старые URL, используем GitHub API напрямую
const GIST_API_URL = `https://api.github.com/gists/${DB_CONFIG.GIST_ID}`;

let sitecoreDB = null;

// Проверяем структуру токена
console.log('Токен GitHub:', DB_CONFIG.TOKEN ? 'Есть' : 'Нет');
console.log('Первые 10 символов токена:', DB_CONFIG.TOKEN ? DB_CONFIG.TOKEN.substring(0, 10) + '...' : 'Нет');

// Инициализация базы данных
async function initializeDatabase() {
    console.log('Инициализация базы данных...');
    
    try {
        // Пытаемся загрузить из Gist
        await loadFromGist();
    } catch (error) {
        console.error('Ошибка загрузки из Gist:', error);
        
        // Используем локальную базу
        const localData = localStorage.getItem('sitecore_db');
        if (localData) {
            sitecoreDB = JSON.parse(localData);
            console.log('Используем локальную копию из localStorage');
        } else {
            // Создаем базовую структуру
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
                            experience: "5 лет",
                            bio: "Специалист по созданию современных веб-приложений",
                            skills: ["JavaScript", "React", "Node.js", "Python", "MongoDB"]
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
                            experience: "3 года",
                            bio: "Эксперт по созданию красивых и функциональных интерфейсов",
                            skills: ["HTML/CSS", "JavaScript", "Vue.js", "UI/UX дизайн"]
                        }
                    ]
                },
                orders: [],
                messages: []
            };
            
            console.log('Создана новая база данных');
            saveToLocalStorage();
        }
    }
}

// Загрузка из Gist
async function loadFromGist() {
    console.log('Загрузка данных из GitHub Gist...');
    
    const response = await fetch(GIST_API_URL, {
        headers: {
            'Authorization': `token ${DB_CONFIG.TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Данные получены из Gist:', data);
    
    // Получаем содержимое файла
    const fileContent = data.files[DB_CONFIG.GIST_FILE]?.content;
    
    if (!fileContent) {
        throw new Error('Файл не найден в Gist');
    }
    
    const parsedData = JSON.parse(fileContent);
    
    // Проверяем структуру данных
    if (parsedData && parsedData.users && Array.isArray(parsedData.users.developers)) {
        sitecoreDB = parsedData;
        console.log('Данные успешно загружены из Gist');
        saveToLocalStorage();
    } else {
        throw new Error('Неверная структура данных в Gist');
    }
}

// Сохранение в Gist
async function saveToGist() {
    console.log('Сохранение данных в Gist...');
    
    try {
        const response = await fetch(GIST_API_URL, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${DB_CONFIG.TOKEN}`,
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
            throw new Error(`Ошибка сохранения: HTTP ${response.status}`);
        }
        
        console.log('Данные успешно сохранены в Gist');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения в Gist:', error);
        return false;
    }
}

// Сохранение в localStorage
function saveToLocalStorage() {
    if (sitecoreDB) {
        localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
        console.log('Данные сохранены в localStorage');
    }
}

// Функции для работы с данными
function getDevelopers() {
    return sitecoreDB ? sitecoreDB.users.developers : [];
}

function getClients() {
    return sitecoreDB ? sitecoreDB.users.clients : [];
}

function getOrders() {
    return sitecoreDB ? sitecoreDB.orders : [];
}

function getMessages() {
    return sitecoreDB ? sitecoreDB.messages : [];
}

// Регистрация клиента
async function registerClient(clientData) {
    if (!sitecoreDB) return false;
    
    // Проверяем email
    const existingClient = sitecoreDB.users.clients.find(c => c.email === clientData.email);
    if (existingClient) {
        return false;
    }
    
    // Создаем клиента
    const newClient = {
        id: 'client_' + Date.now(),
        ...clientData,
        avatar: clientData.name.charAt(0).toUpperCase(),
        createdAt: new Date().toISOString()
    };
    
    // Добавляем
    sitecoreDB.users.clients.push(newClient);
    
    // Сохраняем
    saveToLocalStorage();
    await saveToGist();
    
    return newClient;
}

// Вход клиента
function loginClient(email, password) {
    if (!sitecoreDB) return null;
    
    return sitecoreDB.users.clients.find(client => 
        client.email === email && client.password === password
    );
}

// Вход разработчика
function loginDeveloper(name, password) {
    if (!sitecoreDB) return null;
    
    return sitecoreDB.users.developers.find(dev => 
        dev.name === name && dev.password === password
    );
}

// Создание заказа
async function createOrder(orderData) {
    if (!sitecoreDB) return null;
    
    const newOrder = {
        id: 'order_' + Date.now(),
        ...orderData,
        status: 'new',
        assignedTo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    sitecoreDB.orders.push(newOrder);
    
    // Сохраняем
    saveToLocalStorage();
    await saveToGist();
    
    return newOrder;
}

// Обновление заказа
async function updateOrder(orderId, updates) {
    if (!sitecoreDB) return false;
    
    const orderIndex = sitecoreDB.orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) return false;
    
    sitecoreDB.orders[orderIndex] = {
        ...sitecoreDB.orders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    saveToLocalStorage();
    await saveToGist();
    
    return true;
}

// Получение заказов клиента
function getClientOrders(clientId) {
    if (!sitecoreDB) return [];
    
    return sitecoreDB.orders.filter(order => order.clientId === clientId);
}

// Получение заказов разработчика
function getDeveloperOrders(developerId) {
    if (!sitecoreDB) return [];
    
    // Доступные заказы (без назначенного разработчика или назначенные текущему)
    return sitecoreDB.orders.filter(order => 
        !order.assignedTo || order.assignedTo === developerId
    );
}

// Добавление сообщения
async function addMessage(messageData) {
    if (!sitecoreDB) return null;
    
    const newMessage = {
        id: 'msg_' + Date.now(),
        ...messageData,
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) {
        sitecoreDB.messages = [];
    }
    
    sitecoreDB.messages.push(newMessage);
    
    saveToLocalStorage();
    await saveToGist();
    
    return newMessage;
}

// Получение сообщений заказа
function getOrderMessages(orderId) {
    if (!sitecoreDB || !sitecoreDB.messages) return [];
    
    return sitecoreDB.messages
        .filter(msg => msg.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDatabase();
    console.log('База данных SiteCore инициализирована');
});

// Экспортируем функции
window.db = {
    initialize: initializeDatabase,
    getDevelopers,
    getClients,
    getOrders,
    getMessages,
    registerClient,
    loginClient,
    loginDeveloper,
    createOrder,
    updateOrder,
    getClientOrders,
    getDeveloperOrders,
    addMessage,
    getOrderMessages,
    saveToGist,
    saveToLocalStorage
};
