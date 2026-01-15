// server.js - Простой сервер данных для SiteCore
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Раздаем статические файлы

// Путь к файлу данных
const DATA_FILE = path.join(__dirname, 'sitecore_db.json');

// Загрузка данных
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
    
    // Возвращаем структуру по умолчанию
    return {
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
}

// Сохранение данных
function saveData(data) {
    try {
        data.lastUpdate = new Date().toISOString();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
        return false;
    }
}

// API маршруты

// Получить все данные
app.get('/api/data', (req, res) => {
    const data = loadData();
    res.json(data);
});

// Сохранить все данные
app.post('/api/data', (req, res) => {
    const newData = req.body;
    if (saveData(newData)) {
        res.json({ success: true, message: 'Данные сохранены' });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Регистрация клиента
app.post('/api/register', (req, res) => {
    const { name, email, phone, telegram, password } = req.body;
    const data = loadData();
    
    // Проверка на существующего пользователя
    const existingUser = data.users.clients.find(client => client.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    // Создание нового клиента
    const newClient = {
        id: 'client_' + Date.now(),
        name,
        email,
        phone,
        telegram,
        password,
        avatar: name.charAt(0).toUpperCase(),
        createdAt: new Date().toISOString()
    };
    
    data.users.clients.push(newClient);
    
    if (saveData(data)) {
        res.json({ 
            success: true, 
            user: newClient,
            message: 'Регистрация успешна' 
        });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения данных' });
    }
});

// Вход пользователя
app.post('/api/login', (req, res) => {
    const { email, password, userType } = req.body;
    const data = loadData();
    
    if (userType === 'client') {
        // Вход клиента
        const client = data.users.clients.find(c => c.email === email && c.password === password);
        if (client) {
            res.json({ 
                success: true, 
                user: { ...client, type: 'client' } 
            });
        } else {
            res.status(401).json({ error: 'Неверный email или пароль' });
        }
    } else if (userType === 'developer') {
        // Вход разработчика
        const developer = data.users.developers.find(d => 
            (d.email === email || d.name === email) && d.password === password
        );
        if (developer) {
            res.json({ 
                success: true, 
                user: { ...developer, type: 'developer' } 
            });
        } else {
            res.status(401).json({ error: 'Неверный логин или пароль' });
        }
    } else {
        res.status(400).json({ error: 'Не указан тип пользователя' });
    }
});

// Создание заказа
app.post('/api/orders', (req, res) => {
    const order = req.body;
    const data = loadData();
    
    if (!order.id) {
        order.id = 'order_' + Date.now();
        order.createdAt = new Date().toISOString();
    }
    
    order.updatedAt = new Date().toISOString();
    
    // Добавляем заказ
    const existingIndex = data.orders.findIndex(o => o.id === order.id);
    if (existingIndex >= 0) {
        data.orders[existingIndex] = order;
    } else {
        data.orders.push(order);
    }
    
    // Добавляем системное сообщение
    const message = {
        id: 'msg_' + Date.now(),
        orderId: order.id,
        text: `Заказ "${order.projectName}" создан. Статус: ${getStatusText(order.status)}`,
        sender: 'system',
        timestamp: new Date().toISOString()
    };
    data.messages.push(message);
    
    if (saveData(data)) {
        res.json({ 
            success: true, 
            order,
            message: 'Заказ сохранен' 
        });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения заказа' });
    }
});

// Получить заказы пользователя
app.get('/api/orders/:userId/:userType', (req, res) => {
    const { userId, userType } = req.params;
    const data = loadData();
    
    let userOrders;
    if (userType === 'client') {
        userOrders = data.orders.filter(order => order.clientId === userId);
    } else if (userType === 'developer') {
        userOrders = data.orders.filter(order => 
            order.assignedTo === userId || !order.assignedTo
        );
    }
    
    res.json({ success: true, orders: userOrders || [] });
});

// Отправить сообщение
app.post('/api/messages', (req, res) => {
    const message = req.body;
    const data = loadData();
    
    if (!message.id) {
        message.id = 'msg_' + Date.now();
        message.timestamp = new Date().toISOString();
    }
    
    data.messages.push(message);
    
    if (saveData(data)) {
        res.json({ success: true, message });
    } else {
        res.status(500).json({ error: 'Ошибка отправки сообщения' });
    }
});

// Получить сообщения для заказа
app.get('/api/messages/:orderId', (req, res) => {
    const { orderId } = req.params;
    const data = loadData();
    
    const orderMessages = data.messages.filter(m => m.orderId === orderId);
    res.json({ success: true, messages: orderMessages });
});

// Обновить статус заказа
app.put('/api/orders/:orderId/status', (req, res) => {
    const { orderId } = req.params;
    const { status, developerName } = req.body;
    const data = loadData();
    
    const orderIndex = data.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
        return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    const oldStatus = data.orders[orderIndex].status;
    data.orders[orderIndex].status = status;
    data.orders[orderIndex].updatedAt = new Date().toISOString();
    
    if (status === 'in-progress' && developerName && !data.orders[orderIndex].assignedTo) {
        data.orders[orderIndex].assignedTo = developerName;
    }
    
    // Добавляем системное сообщение
    const message = {
        id: 'msg_' + Date.now(),
        orderId: orderId,
        text: `Статус изменен с "${getStatusText(oldStatus)}" на "${getStatusText(status)}"`,
        sender: 'system',
        timestamp: new Date().toISOString()
    };
    data.messages.push(message);
    
    if (saveData(data)) {
        res.json({ 
            success: true, 
            order: data.orders[orderIndex],
            message: 'Статус обновлен' 
        });
    } else {
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
});

// Удалить заказ
app.delete('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    const data = loadData();
    
    const orderIndex = data.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
        return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    data.orders.splice(orderIndex, 1);
    
    // Удаляем сообщения заказа
    data.messages = data.messages.filter(m => m.orderId !== orderId);
    
    if (saveData(data)) {
        res.json({ success: true, message: 'Заказ удален' });
    } else {
        res.status(500).json({ error: 'Ошибка удаления заказа' });
    }
});

// Вспомогательная функция
function getStatusText(status) {
    const statuses = {
        'new': 'Новый',
        'in-progress': 'В работе',
        'review': 'На проверке',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    return statuses[status] || status;
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║     🚀 Сервер SiteCore запущен      ║
╠══════════════════════════════════════╣
║  Порт: ${PORT}                          ║
║  API: http://localhost:${PORT}/api      ║
║  Статика: http://localhost:${PORT}     ║
╚══════════════════════════════════════╝
    `);
});
