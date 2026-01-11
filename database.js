// database.js
const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_URL: 'https://gist.githubusercontent.com/uskovmaxim12-stack/30dbe17ad2208d9eb8809574ee8ef012/raw/sitecore_db.json',
    TOKEN: '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'
};

class SiteCoreDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    // Инициализация базы данных
    async initDatabase() {
        console.log('🚀 Инициализация базы данных SiteCore...');
        
        try {
            // Сначала пробуем загрузить из сети
            await this.loadFromNetwork();
        } catch (error) {
            console.log('📡 Не удалось загрузить из сети, используем локальные данные');
            await this.loadFromLocalStorage();
        }
        
        // Если все еще нет данных, создаем новую базу
        if (!this.db) {
            console.log('🆕 Создание новой базы данных');
            this.createDefaultDatabase();
            this.saveToLocalStorage();
        }
        
        this.isInitialized = true;
        console.log('✅ База данных готова');
        return this.db;
    }

    // Загрузка из сети (GitHub Gist)
    async loadFromNetwork() {
        console.log('🌐 Загрузка данных из Gist...');
        
        try {
            // Пробуем несколько способов
            const urls = [
                `${DB_CONFIG.GIST_URL}?t=${Date.now()}`,
                `https://gist.githubusercontent.com/uskovmaxim12-stack/${DB_CONFIG.GIST_ID}/raw/`,
                `https://api.github.com/gists/${DB_CONFIG.GIST_ID}`
            ];
            
            let response;
            let lastError;
            
            for (const url of urls) {
                try {
                    console.log(`Попытка загрузки из: ${url}`);
                    const options = {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    };
                    
                    // Добавляем токен для API GitHub
                    if (url.includes('api.github.com') && DB_CONFIG.TOKEN) {
                        options.headers['Authorization'] = `token ${DB_CONFIG.TOKEN}`;
                    }
                    
                    response = await fetch(url, options);
                    
                    if (response.ok) {
                        let data;
                        
                        if (url.includes('api.github.com')) {
                            // API GitHub возвращает объект gist
                            const gistData = await response.json();
                            const files = gistData.files;
                            const fileName = Object.keys(files)[0];
                            data = JSON.parse(files[fileName].content);
                        } else {
                            // Raw URL возвращает напрямую JSON
                            data = await response.json();
                        }
                        
                        if (data && data.users) {
                            this.db = data;
                            console.log('✅ Данные успешно загружены из сети');
                            this.saveToLocalStorage();
                            return;
                        }
                    }
                } catch (err) {
                    lastError = err;
                    console.log(`❌ Ошибка загрузки из ${url}:`, err.message);
                }
            }
            
            throw lastError || new Error('Не удалось загрузить данные из сети');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки из сети:', error.message);
            throw error;
        }
    }

    // Загрузка из localStorage
    async loadFromLocalStorage() {
        console.log('📁 Загрузка данных из localStorage...');
        
        try {
            const localData = localStorage.getItem('sitecore_db');
            if (localData) {
                this.db = JSON.parse(localData);
                console.log('✅ Данные загружены из localStorage');
                return true;
            }
            console.log('📭 localStorage пуст');
            return false;
        } catch (error) {
            console.error('❌ Ошибка загрузки из localStorage:', error);
            return false;
        }
    }

    // Создание базы данных по умолчанию
    createDefaultDatabase() {
        console.log('🆕 Создание базы данных по умолчанию');
        
        this.db = {
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
                        status: "active"
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
                        status: "active"
                    }
                ]
            },
            orders: [],
            messages: [],
            lastUpdated: new Date().toISOString()
        };
    }

    // Сохранение в localStorage
    saveToLocalStorage() {
        if (this.db) {
            this.db.lastUpdated = new Date().toISOString();
            localStorage.setItem('sitecore_db', JSON.stringify(this.db));
            console.log('💾 Данные сохранены в localStorage');
        }
    }

    // Попытка сохранить в сеть (необязательно, можно комментировать если не работает)
    async trySaveToNetwork() {
        if (!DB_CONFIG.TOKEN) {
            console.log('⚠️ Токен не настроен, пропускаем сохранение в сеть');
            return false;
        }
        
        try {
            console.log('🌐 Попытка сохранения в Gist...');
            
            const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${DB_CONFIG.TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'sitecore_db.json': {
                            content: JSON.stringify(this.db, null, 2)
                        }
                    },
                    description: 'SiteCore Database - ' + new Date().toLocaleString()
                })
            });
            
            if (response.ok) {
                console.log('✅ Данные сохранены в Gist');
                return true;
            } else {
                console.log('⚠️ Не удалось сохранить в Gist:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения в Gist:', error.message);
            return false;
        }
    }

    // ========== API МЕТОДЫ ==========

    // Регистрация клиента
    async registerClient(clientData) {
        if (!this.db) await this.initDatabase();
        
        // Проверка на существующего пользователя
        const existingUser = this.db.users.clients.find(u => u.email === clientData.email);
        if (existingUser) {
            throw new Error('Пользователь с таким email уже существует');
        }
        
        // Создание нового клиента
        const newClient = {
            id: 'client_' + Date.now(),
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            telegram: clientData.telegram,
            password: clientData.password,
            avatar: clientData.name.charAt(0).toUpperCase(),
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        
        // Добавление в базу
        this.db.users.clients.push(newClient);
        
        // Сохранение
        this.saveToLocalStorage();
        await this.trySaveToNetwork();
        
        return newClient;
    }

    // Вход клиента
    async loginClient(email, password) {
        if (!this.db) await this.initDatabase();
        
        const client = this.db.users.clients.find(u => 
            u.email === email && u.password === password
        );
        
        if (!client) {
            throw new Error('Неверный email или пароль');
        }
        
        return client;
    }

    // Вход разработчика
    async loginDeveloper(name, password) {
        if (!this.db) await this.initDatabase();
        
        const developer = this.db.users.developers.find(d => 
            d.name === name && d.password === password
        );
        
        if (!developer) {
            throw new Error('Неверное имя разработчика или пароль');
        }
        
        return developer;
    }

    // Получение всех разработчиков
    getDevelopers() {
        return this.db ? this.db.users.developers : [];
    }

    // Создание заказа
    async createOrder(orderData) {
        if (!this.db) await this.initDatabase();
        
        const newOrder = {
            id: 'order_' + Date.now(),
            ...orderData,
            status: 'new',
            assignedTo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.db.orders.push(newOrder);
        this.saveToLocalStorage();
        await this.trySaveToNetwork();
        
        return newOrder;
    }

    // Получение заказов клиента
    getClientOrders(clientId) {
        if (!this.db) return [];
        
        return this.db.orders.filter(order => order.clientId === clientId);
    }

    // Получение всех заказов (для разработчика)
    getAllOrders() {
        return this.db ? this.db.orders : [];
    }

    // Получение доступных заказов (без назначенного разработчика)
    getAvailableOrders() {
        if (!this.db) return [];
        
        return this.db.orders.filter(order => 
            !order.assignedTo && order.status === 'new'
        );
    }

    // Получение заказов разработчика
    getDeveloperOrders(developerId) {
        if (!this.db) return [];
        
        return this.db.orders.filter(order => 
            order.assignedTo === developerId
        );
    }

    // Обновление заказа
    async updateOrder(orderId, updates) {
        if (!this.db) return false;
        
        const orderIndex = this.db.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return false;
        
        this.db.orders[orderIndex] = {
            ...this.db.orders[orderIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.saveToLocalStorage();
        await this.trySaveToNetwork();
        
        return true;
    }

    // Добавление сообщения
    async addMessage(messageData) {
        if (!this.db) {
            if (!this.db.messages) this.db.messages = [];
        }
        
        const newMessage = {
            id: 'msg_' + Date.now(),
            ...messageData,
            timestamp: new Date().toISOString()
        };
        
        this.db.messages.push(newMessage);
        this.saveToLocalStorage();
        await this.trySaveToNetwork();
        
        return newMessage;
    }

    // Получение сообщений заказа
    getOrderMessages(orderId) {
        if (!this.db || !this.db.messages) return [];
        
        return this.db.messages
            .filter(msg => msg.orderId === orderId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Получение статистики
    getStats() {
        if (!this.db) return null;
        
        return {
            totalOrders: this.db.orders.length,
            activeOrders: this.db.orders.filter(o => o.status === 'new' || o.status === 'in_progress').length,
            completedOrders: this.db.orders.filter(o => o.status === 'completed').length,
            totalClients: this.db.users.clients.length,
            totalDevelopers: this.db.users.developers.length
        };
    }

    // Проверка готовности
    isReady() {
        return this.isInitialized;
    }
}

// Создаем глобальный экземпляр
window.db = new SiteCoreDatabase();

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Инициализация системы SiteCore...');
    window.db.initDatabase().then(() => {
        console.log('✅ Система SiteCore готова к работе');
    }).catch(error => {
        console.error('❌ Ошибка инициализации системы:', error);
    });
});
