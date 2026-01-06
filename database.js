// database.js - Обновленная версия с синхронизацией
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_FILENAME: 'sitecore_db.json',
    GITHUB_TOKEN: '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',
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
    messages: []
};

let sitecoreDB = DEFAULT_DB;
let dbInitialized = false;

// Функция для загрузки данных из Gist
async function loadFromGist() {
    try {
        console.log('Загрузка данных из Gist...');
        
        const response = await fetch(DB_CONFIG.RAW_URL + '?t=' + Date.now(), {
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Данные из Gist:', data);
        
        // Проверяем структуру данных
        if (data && data.users && data.users.developers) {
            // Если структура правильная, используем данные из Gist
            sitecoreDB = data;
            console.log('Используем данные из Gist');
        } else if (data && data.developers) {
            // Если старая структура (без вложенного users)
            sitecoreDB = {
                users: {
                    clients: data.clients || [],
                    developers: data.developers || []
                },
                orders: data.orders || [],
                messages: data.messages || []
            };
            console.log('Конвертировали старую структуру данных');
        } else {
            console.warn('Некорректная структура данных в Gist, используем базу по умолчанию');
        }
        
        // Сохраняем в localStorage как резервную копию
        localStorage.setItem('sitecore_db_backup', JSON.stringify(sitecoreDB));
        localStorage.setItem('sitecore_db_timestamp', Date.now().toString());
        
        return true;
    } catch (error) {
        console.error('Ошибка загрузки из Gist:', error);
        
        // Пробуем загрузить из резервной копии
        const backup = localStorage.getItem('sitecore_db_backup');
        if (backup) {
            try {
                sitecoreDB = JSON.parse(backup);
                console.log('Используем резервную копию из localStorage');
                return true;
            } catch (e) {
                console.error('Ошибка загрузки резервной копии:', e);
            }
        }
        
        return false;
    }
}

// Функция для сохранения данных в Gist
async function saveToGist() {
    try {
        console.log('Сохранение данных в Gist...');
        
        const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${DB_CONFIG.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                files: {
                    [DB_CONFIG.GIST_FILENAME]: {
                        content: JSON.stringify(sitecoreDB, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка GitHub API:', errorData);
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        console.log('Данные успешно сохранены в Gist');
        
        // Также сохраняем в localStorage
        localStorage.setItem('sitecore_db_backup', JSON.stringify(sitecoreDB));
        localStorage.setItem('sitecore_db_timestamp', Date.now().toString());
        
        return true;
    } catch (error) {
        console.error('Ошибка сохранения в Gist:', error);
        
        // Сохраняем только в localStorage
        localStorage.setItem('sitecore_db_backup', JSON.stringify(sitecoreDB));
        localStorage.setItem('sitecore_db_timestamp', Date.now().toString());
        
        return false;
    }
}

// Инициализация базы данных
async function initDatabase() {
    if (dbInitialized) return true;
    
    try {
        const loaded = await loadFromGist();
        dbInitialized = true;
        return loaded;
    } catch (error) {
        console.error('Ошибка инициализации базы данных:', error);
        return false;
    }
}

// === ОСНОВНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ===

// Проверка логина клиента
async function checkClientLogin(email, password) {
    await initDatabase();
    return sitecoreDB.users.clients.find(client => 
        client.email === email && client.password === password
    );
}

// Проверка логина разработчика
async function checkDeveloperLogin(name, password) {
    await initDatabase();
    return sitecoreDB.users.developers.find(dev => 
        dev.name === name && dev.password === password
    );
}

// Регистрация нового клиента
async function registerClient(clientData) {
    await initDatabase();
    
    // Проверяем, нет ли уже такого email
    const existingClient = sitecoreDB.users.clients.find(c => c.email === clientData.email);
    if (existingClient) {
        return { success: false, error: 'Пользователь с таким email уже существует' };
    }
    
    // Создаем нового клиента
    const newClient = {
        id: 'client_' + Date.now(),
        ...clientData,
        avatar: clientData.name.charAt(0).toUpperCase(),
        createdAt: new Date().toISOString()
    };
    
    // Добавляем в базу
    sitecoreDB.users.clients.push(newClient);
    
    // Сохраняем
    const saved = await saveToGist();
    
    if (saved) {
        return { success: true, client: newClient };
    } else {
        return { success: false, error: 'Не удалось сохранить данные' };
    }
}

// Создание нового заказа
async function createOrder(orderData) {
    await initDatabase();
    
    const newOrder = {
        id: 'order_' + Date.now(),
        ...orderData,
        status: 'new',
        assignedTo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    sitecoreDB.orders.push(newOrder);
    
    // Добавляем системное сообщение
    const newMessage = {
        id: 'msg_' + Date.now(),
        orderId: newOrder.id,
        text: `Заказ "${orderData.projectName}" создан. Ожидайте, пока разработчик возьмет его в работу.`,
        sender: 'system',
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) sitecoreDB.messages = [];
    sitecoreDB.messages.push(newMessage);
    
    // Сохраняем
    await saveToGist();
    
    return newOrder;
}

// Получение заказов клиента
async function getClientOrders(clientId) {
    await initDatabase();
    return sitecoreDB.orders.filter(order => order.clientId === clientId);
}

// Получение заказов разработчика
async function getDeveloperOrders(developerId) {
    await initDatabase();
    return sitecoreDB.orders.filter(order => 
        order.assignedTo === developerId || !order.assignedTo
    );
}

// Обновление заказа
async function updateOrder(orderId, updates) {
    await initDatabase();
    
    const orderIndex = sitecoreDB.orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) return false;
    
    sitecoreDB.orders[orderIndex] = {
        ...sitecoreDB.orders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    await saveToGist();
    return true;
}

// Добавление сообщения
async function addMessage(messageData) {
    await initDatabase();
    
    const newMessage = {
        id: 'msg_' + Date.now(),
        ...messageData,
        timestamp: new Date().toISOString()
    };
    
    if (!sitecoreDB.messages) sitecoreDB.messages = [];
    sitecoreDB.messages.push(newMessage);
    
    await saveToGist();
    return newMessage;
}

// Получение сообщений заказа
async function getOrderMessages(orderId) {
    await initDatabase();
    if (!sitecoreDB.messages) return [];
    
    return sitecoreDB.messages
        .filter(msg => msg.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Получение всех разработчиков
async function getDevelopers() {
    await initDatabase();
    return sitecoreDB.users.developers;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Инициализация базы данных SiteCore...');
    await initDatabase();
    console.log('База данных готова:', sitecoreDB);
});

// Экспортируем функции
window.db = {
    initDatabase,
    checkClientLogin,
    checkDeveloperLogin,
    registerClient,
    createOrder,
    getClientOrders,
    getDeveloperOrders,
    updateOrder,
    addMessage,
    getOrderMessages,
    getDevelopers,
    saveToGist,
    loadFromGist,
    getDatabase: () => sitecoreDB
};
