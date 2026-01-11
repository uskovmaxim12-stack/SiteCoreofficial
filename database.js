// database.js - Управление облачной базой данных через GitHub Gist

const DB_CONFIG = {
    GIST_ID: '30dbe17ad2208d9eb8809574ee8ef012',
    GIST_FILENAME: 'sitecore_db.json',
    GITHUB_TOKEN: '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'
};

// Инициализация базы данных
window.db = {
    data: null,
    
    // Инициализация системы
    async initDatabase() {
        console.log('🚀 Инициализация базы данных SiteCore...');
        
        try {
            // Пытаемся загрузить из GitHub Gist
            await this.loadFromGist();
            console.log('✅ База данных загружена из облака');
            
            // Проверяем структуру базы данных
            if (!this.data || !this.data.users) {
                console.log('⚠️ База пустая, создаем структуру...');
                await this.createDefaultDatabase();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка загрузки из облака:', error);
            
            // Пробуем загрузить из localStorage
            try {
                const localData = localStorage.getItem('sitecore_db_backup');
                if (localData) {
                    this.data = JSON.parse(localData);
                    console.log('📁 Загружена локальная резервная копия');
                    return true;
                }
            } catch (localError) {
                console.error('❌ Ошибка загрузки локальной копии:', localError);
            }
            
            // Создаем новую базу данных
            await this.createDefaultDatabase();
            console.log('🆕 Создана новая база данных');
            return true;
        }
    },
    
    // Загрузка данных из GitHub Gist
    async loadFromGist() {
        try {
            console.log('🌐 Загрузка из GitHub Gist...');
            
            const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${DB_CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiteCore-System'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            const gistData = await response.json();
            const fileContent = gistData.files[DB_CONFIG.GIST_FILENAME].content;
            this.data = JSON.parse(fileContent);
            
            // Сохраняем локальную резервную копию
            localStorage.setItem('sitecore_db_backup', fileContent);
            
            return this.data;
        } catch (error) {
            console.error('❌ Ошибка загрузки из Gist:', error);
            throw error;
        }
    },
    
    // Сохранение данных в GitHub Gist
    async saveToGist() {
        try {
            console.log('💾 Сохранение в GitHub Gist...');
            
            const response = await fetch(`https://api.github.com/gists/${DB_CONFIG.GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${DB_CONFIG.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        [DB_CONFIG.GIST_FILENAME]: {
                            content: JSON.stringify(this.data, null, 2)
                        }
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            // Сохраняем локальную резервную копию
            localStorage.setItem('sitecore_db_backup', JSON.stringify(this.data));
            
            console.log('✅ Данные успешно сохранены в облако');
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения в Gist:', error);
            
            // Сохраняем хотя бы локально
            localStorage.setItem('sitecore_db_backup', JSON.stringify(this.data));
            
            // Показываем предупреждение пользователю
            this.showErrorNotification('Данные сохранены локально. Проблемы с облаком.', 'warning');
            
            return false;
        }
    },
    
    // Создание базы данных по умолчанию
    async createDefaultDatabase() {
        this.data = {
            users: {
                clients: [],
                developers: [
                    {
                        id: 'dev_1',
                        name: 'Максим',
                        password: '140612',
                        avatar: 'М',
                        email: 'maxim@sitecore.ru'
                    },
                    {
                        id: 'dev_2', 
                        name: 'Александр',
                        password: '789563',
                        avatar: 'А',
                        email: 'alexander@sitecore.ru'
                    }
                ]
            },
            orders: [],
            messages: [],
            lastUpdate: new Date().toISOString()
        };
        
        await this.saveToGist();
        return this.data;
    },
    
    // Добавление нового клиента
    async addClient(clientData) {
        try {
            // Генерируем уникальный ID
            const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const newClient = {
                id: clientId,
                name: clientData.name,
                email: clientData.email,
                phone: clientData.phone,
                telegram: clientData.telegram,
                password: clientData.password,
                avatar: clientData.name.charAt(0).toUpperCase(),
                createdAt: new Date().toISOString()
            };
            
            // Добавляем клиента в базу
            this.data.users.clients.push(newClient);
            
            // Сохраняем в облако
            await this.saveToGist();
            
            console.log('✅ Клиент добавлен:', newClient);
            return newClient;
        } catch (error) {
            console.error('❌ Ошибка добавления клиента:', error);
            throw error;
        }
    },
    
    // Поиск клиента по email и паролю
    findClient(email, password) {
        return this.data.users.clients.find(client => 
            client.email === email && client.password === password
        );
    },
    
    // Поиск разработчика по имени и паролю
    findDeveloper(name, password) {
        return this.data.users.developers.find(dev => 
            dev.name === name && dev.password === password
        );
    },
    
    // Добавление нового заказа
    async addOrder(orderData) {
        try {
            const orderId = 'order_' + Date.now();
            
            const newOrder = {
                id: orderId,
                clientId: orderData.clientId,
                clientName: orderData.clientName,
                clientEmail: orderData.clientEmail,
                clientPhone: orderData.clientPhone,
                clientTelegram: orderData.clientTelegram,
                projectName: orderData.projectName,
                projectType: orderData.projectType,
                budget: orderData.budget,
                deadline: orderData.deadline,
                prompt: orderData.prompt,
                status: 'new',
                assignedTo: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            this.data.orders.push(newOrder);
            
            // Добавляем системное сообщение
            await this.addMessage({
                orderId: orderId,
                text: `Заказ "${orderData.projectName}" создан. Ожидайте, пока разработчик возьмет его в работу.`,
                sender: 'system',
                timestamp: new Date().toISOString()
            });
            
            await this.saveToGist();
            return newOrder;
        } catch (error) {
            console.error('❌ Ошибка создания заказа:', error);
            throw error;
        }
    },
    
    // Добавление сообщения
    async addMessage(messageData) {
        try {
            const messageId = 'msg_' + Date.now();
            
            const newMessage = {
                id: messageId,
                orderId: messageData.orderId,
                text: messageData.text,
                sender: messageData.sender,
                senderName: messageData.senderName,
                timestamp: messageData.timestamp || new Date().toISOString()
            };
            
            this.data.messages.push(newMessage);
            await this.saveToGist();
            return newMessage;
        } catch (error) {
            console.error('❌ Ошибка добавления сообщения:', error);
            throw error;
        }
    },
    
    // Получение заказов клиента
    getClientOrders(clientId) {
        return this.data.orders.filter(order => order.clientId === clientId);
    },
    
    // Получение всех заказов (для разработчика)
    getAllOrders() {
        return this.data.orders;
    },
    
    // Получение сообщений по заказу
    getOrderMessages(orderId) {
        return this.data.messages
            .filter(msg => msg.orderId === orderId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    
    // Обновление статуса заказа
    async updateOrderStatus(orderId, status, developerName = null) {
        try {
            const order = this.data.orders.find(o => o.id === orderId);
            if (!order) throw new Error('Заказ не найден');
            
            const oldStatus = order.status;
            order.status = status;
            order.updatedAt = new Date().toISOString();
            
            if (developerName && status === 'in-progress') {
                order.assignedTo = developerName;
            }
            
            // Добавляем системное сообщение об изменении статуса
            await this.addMessage({
                orderId: orderId,
                text: `Статус изменён с "${this.getStatusText(oldStatus)}" на "${this.getStatusText(status)}"`,
                sender: 'system',
                timestamp: new Date().toISOString()
            });
            
            await this.saveToGist();
            return order;
        } catch (error) {
            console.error('❌ Ошибка обновления статуса:', error);
            throw error;
        }
    },
    
    // Удаление заказа
    async deleteOrder(orderId) {
        try {
            const index = this.data.orders.findIndex(o => o.id === orderId);
            if (index === -1) throw new Error('Заказ не найден');
            
            // Удаляем заказ
            this.data.orders.splice(index, 1);
            
            // Удаляем все сообщения этого заказа
            this.data.messages = this.data.messages.filter(msg => msg.orderId !== orderId);
            
            await this.saveToGist();
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления заказа:', error);
            throw error;
        }
    },
    
    // Вспомогательные функции
    getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in-progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершен',
            'cancelled': 'Отменен'
        };
        return statuses[status] || status;
    },
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    // Показать уведомление об ошибке
    showErrorNotification(message, type = 'error') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(`${type === 'error' ? '❌ Ошибка' : '⚠️ Внимание'}: ${message}`);
        }
    },
    
    // Проверка промта (300-2500 символов)
    validatePrompt(prompt) {
        if (prompt.length < 300) {
            return { valid: false, message: 'Промт должен содержать минимум 300 символов' };
        }
        if (prompt.length > 2500) {
            return { valid: false, message: 'Промт должен содержать максимум 2500 символов' };
        }
        return { valid: true, message: 'Промт соответствует требованиям' };
    }
};

// Автоматическая инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await window.db.initDatabase();
        console.log('✅ Система SiteCore готова к работе');
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
    }
});
