// database.js - Обновленная версия с GitHub API и токеном
const SITECORE_DB = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GITHUB_TOKEN: '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',
    DB_FILE: 'sitecore_db.json'
};

// Глобальное состояние
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

// Инициализация базы данных
async function initDatabase() {
    console.log('🚀 Инициализация базы данных...');
    
    try {
        // Пытаемся загрузить из Gist
        await loadFromGist();
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить из Gist:', error.message);
        
        // Пробуем загрузить из localStorage
        const localData = localStorage.getItem('sitecore_db');
        if (localData) {
            sitecoreDB = JSON.parse(localData);
            console.log('📁 База данных загружена из localStorage');
        } else {
            console.log('📦 Используется база данных по умолчанию');
            // Сохраняем базу по умолчанию
            await saveDatabase();
        }
    }
}

// Загрузка из GitHub Gist
async function loadFromGist() {
    console.log('🔄 Загрузка из GitHub Gist...');
    
    const url = `https://api.github.com/gists/${SITECORE_DB.GIST_ID}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${SITECORE_DB.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const gist = await response.json();
        
        // Получаем содержимое файла
        const fileContent = gist.files[SITECORE_DB.DB_FILE]?.content;
        
        if (fileContent) {
            const parsedData = JSON.parse(fileContent);
            sitecoreDB = parsedData;
            console.log('✅ Данные успешно загружены из Gist');
            
            // Сохраняем локальную копию
            localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
            return true;
        } else {
            throw new Error('Файл не найден в Gist');
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки из Gist:', error);
        throw error;
    }
}

// Сохранение в GitHub Gist
async function saveDatabase() {
    console.log('💾 Сохранение базы данных...');
    
    // Сохраняем в localStorage
    localStorage.setItem('sitecore_db', JSON.stringify(sitecoreDB));
    console.log('📁 Данные сохранены локально');
    
    // Пытаемся сохранить в Gist
    try {
        const url = `https://api.github.com/gists/${SITECORE_DB.GIST_ID}`;
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${SITECORE_DB.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [SITECORE_DB.DB_FILE]: {
                        content: JSON.stringify(sitecoreDB, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ Данные успешно сохранены в GitHub Gist');
        return true;
        
    } catch (error) {
        console.warn('⚠️ Не удалось сохранить в Gist, но данные сохранены локально:', error.message);
        return false;
    }
}

// API для работы с данными
window.db = {
    // Инициализация
    init: initDatabase,
    
    // Пользователи
    addUser: function(user) {
        // Проверяем, нет ли уже такого email
        const existingUser = sitecoreDB.users.clients.find(u => u.email === user.email);
        if (existingUser) {
            return { success: false, message: 'Пользователь с таким email уже существует' };
        }
        
        // Создаем ID
        user.id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        user.createdAt = new Date().toISOString();
        user.avatar = user.name.charAt(0).toUpperCase();
        
        // Добавляем
        sitecoreDB.users.clients.push(user);
        
        // Сохраняем
        saveDatabase();
        
        return { success: true, user: user };
    },
    
    checkClientLogin: function(email, password) {
        return sitecoreDB.users.clients.find(client => 
            client.email === email && client.password === password
        );
    },
    
    checkDeveloperLogin: function(name, password) {
        return sitecoreDB.users.developers.find(dev => 
            dev.name === name && dev.password === password
        );
    },
    
    // Заказы
    createOrder: function(orderData) {
        const order = {
            id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            ...orderData,
            status: 'new',
            assignedTo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        sitecoreDB.orders.push(order);
        saveDatabase();
        
        return order;
    },
    
    updateOrder: function(orderId, updates) {
        const orderIndex = sitecoreDB.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return false;
        
        sitecoreDB.orders[orderIndex] = {
            ...sitecoreDB.orders[orderIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        saveDatabase();
        return true;
    },
    
    getClientOrders: function(clientId) {
        return sitecoreDB.orders.filter(order => order.clientId === clientId);
    },
    
    getDeveloperOrders: function(developerId) {
        return sitecoreDB.orders.filter(order => 
            order.assignedTo === developerId || !order.assignedTo
        );
    },
    
    getAllOrders: function() {
        return sitecoreDB.orders;
    },
    
    // Сообщения
    addMessage: function(messageData) {
        const message = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            ...messageData,
            timestamp: new Date().toISOString()
        };
        
        if (!sitecoreDB.messages) {
            sitecoreDB.messages = [];
        }
        
        sitecoreDB.messages.push(message);
        saveDatabase();
        
        return message;
    },
    
    getOrderMessages: function(orderId) {
        if (!sitecoreDB.messages) return [];
        
        return sitecoreDB.messages
            .filter(msg => msg.orderId === orderId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    
    // Дополнительные функции
    getDevelopers: function() {
        return sitecoreDB.users.developers;
    },
    
    getDB: function() {
        return sitecoreDB;
    },
    
    // Форматирование данных
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    getStatusText: function(status) {
        const statuses = {
            'new': 'Новый',
            'progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершен',
            'cancelled': 'Отменен'
        };
        return statuses[status] || status;
    }
};

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Инициализация системы SiteCore...');
    await initDatabase();
    console.log('✅ Система готова к работе');
});
