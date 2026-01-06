// database.js
const GITHUB_TOKEN = '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';
const GIST_ID = '30dbe17ad2208d9eb8809574ee8ef012';

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

class Database {
    constructor() {
        this.data = null;
        this.loading = false;
    }

    // Загрузка данных из Gist
    async load() {
        console.log('Загрузка данных из GitHub Gist...');
        
        try {
            const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const gist = await response.json();
            const content = gist.files['sitecore_db.json']?.content;
            
            if (content) {
                this.data = JSON.parse(content);
                console.log('Данные успешно загружены из Gist:', this.data);
            } else {
                console.warn('Gist не содержит файл sitecore_db.json, используется база по умолчанию');
                this.data = DEFAULT_DB;
            }
        } catch (error) {
            console.error('Ошибка загрузки из Gist:', error.message);
            
            // Пробуем загрузить из localStorage
            const localData = localStorage.getItem('sitecore_db');
            if (localData) {
                this.data = JSON.parse(localData);
                console.log('Данные загружены из localStorage');
            } else {
                this.data = DEFAULT_DB;
                console.log('Используется база данных по умолчанию');
            }
        }

        // Сохраняем локальную копию
        localStorage.setItem('sitecore_db', JSON.stringify(this.data));
        return this.data;
    }

    // Сохранение данных в Gist
    async save() {
        if (!this.data) {
            console.error('Нет данных для сохранения');
            return false;
        }

        console.log('Сохранение данных в GitHub Gist...');

        try {
            const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'sitecore_db.json': {
                            content: JSON.stringify(this.data, null, 2)
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('Данные успешно сохранены в Gist');
            
            // Сохраняем локальную копию
            localStorage.setItem('sitecore_db', JSON.stringify(this.data));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в Gist:', error.message);
            
            // Сохраняем только локально
            localStorage.setItem('sitecore_db', JSON.stringify(this.data));
            return false;
        }
    }

    // Добавление нового клиента
    async addClient(clientData) {
        if (!this.data) {
            await this.load();
        }

        // Проверяем, нет ли уже такого email
        if (this.data.users.clients.some(client => client.email === clientData.email)) {
            return { success: false, message: 'Пользователь с таким email уже существует' };
        }

        const newClient = {
            id: 'client_' + Date.now(),
            ...clientData,
            createdAt: new Date().toISOString(),
            avatar: clientData.name.charAt(0).toUpperCase()
        };

        this.data.users.clients.push(newClient);
        await this.save();
        
        return { success: true, client: newClient };
    }

    // Проверка входа клиента
    async checkClientLogin(email, password) {
        if (!this.data) {
            await this.load();
        }

        return this.data.users.clients.find(client => 
            client.email === email && client.password === password
        );
    }

    // Проверка входа разработчика
    async checkDeveloperLogin(name, password) {
        if (!this.data) {
            await this.load();
        }

        return this.data.users.developers.find(dev => 
            dev.name === name && dev.password === password
        );
    }

    // Получение разработчиков
    async getDevelopers() {
        if (!this.data) {
            await this.load();
        }
        return this.data.users.developers;
    }

    // Создание заказа
    async createOrder(orderData) {
        if (!this.data) {
            await this.load();
        }

        const newOrder = {
            id: 'order_' + Date.now(),
            ...orderData,
            status: 'new',
            assignedTo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!this.data.orders) {
            this.data.orders = [];
        }

        this.data.orders.push(newOrder);
        await this.save();
        
        return newOrder;
    }

    // Получение заказов клиента
    async getClientOrders(clientId) {
        if (!this.data) {
            await this.load();
        }

        if (!this.data.orders) {
            return [];
        }

        return this.data.orders.filter(order => order.clientId === clientId);
    }

    // Получение заказов для разработчика
    async getDeveloperOrders(developerId) {
        if (!this.data) {
            await this.load();
        }

        if (!this.data.orders) {
            return [];
        }

        return this.data.orders.filter(order => 
            !order.assignedTo || order.assignedTo === developerId
        );
    }

    // Обновление заказа
    async updateOrder(orderId, updates) {
        if (!this.data) {
            await this.load();
        }

        if (!this.data.orders) {
            return false;
        }

        const orderIndex = this.data.orders.findIndex(order => order.id === orderId);
        if (orderIndex === -1) {
            return false;
        }

        this.data.orders[orderIndex] = {
            ...this.data.orders[orderIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.save();
        return true;
    }

    // Добавление сообщения
    async addMessage(messageData) {
        if (!this.data) {
            await this.load();
        }

        if (!this.data.messages) {
            this.data.messages = [];
        }

        const newMessage = {
            id: 'msg_' + Date.now(),
            ...messageData,
            timestamp: new Date().toISOString()
        };

        this.data.messages.push(newMessage);
        await this.save();
        
        return newMessage;
    }

    // Получение сообщений заказа
    async getOrderMessages(orderId) {
        if (!this.data || !this.data.messages) {
            await this.load();
        }

        if (!this.data.messages) {
            return [];
        }

        return this.data.messages
            .filter(msg => msg.orderId === orderId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Инициализация Gist при первом запуске
    async initializeGist() {
        try {
            const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 404) {
                console.log('Gist не найден, создаем новый...');
                // Здесь можно было бы создать новый Gist, но для этого нужен другой эндпоинт
                return false;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Ошибка инициализации Gist:', error);
            return false;
        }
    }
}

// Создаем и экспортируем экземпляр базы данных
const database = new Database();

// Инициализируем при загрузке
window.addEventListener('DOMContentLoaded', async () => {
    await database.load();
    console.log('База данных SiteCore инициализирована');
});

// Экспортируем для использования в других файлах
window.db = {
    // Основные методы
    load: () => database.load(),
    save: () => database.save(),
    
    // Пользователи
    addClient: (clientData) => database.addClient(clientData),
    checkClientLogin: (email, password) => database.checkClientLogin(email, password),
    checkDeveloperLogin: (name, password) => database.checkDeveloperLogin(name, password),
    getDevelopers: () => database.getDevelopers(),
    
    // Заказы
    createOrder: (orderData) => database.createOrder(orderData),
    getClientOrders: (clientId) => database.getClientOrders(clientId),
    getDeveloperOrders: (developerId) => database.getDeveloperOrders(developerId),
    updateOrder: (orderId, updates) => database.updateOrder(orderId, updates),
    
    // Сообщения
    addMessage: (messageData) => database.addMessage(messageData),
    getOrderMessages: (orderId) => database.getOrderMessages(orderId),
    
    // Вспомогательные методы
    initializeGist: () => database.initializeGist()
};
