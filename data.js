// Финансовый помощник - Data Management
// Версия 1.0

// ===== КОНСТАНТЫ =====
const CATEGORY_ICONS = {
    'Продукты': 'fas fa-shopping-basket',
    'Транспорт': 'fas fa-car',
    'Жилье': 'fas fa-home',
    'Развлечения': 'fas fa-film',
    'Здоровье': 'fas fa-heartbeat',
    'Одежда': 'fas fa-tshirt',
    'Кафе': 'fas fa-utensils',
    'Связь': 'fas fa-mobile-alt',
    'Образование': 'fas fa-graduation-cap',
    'Прочее': 'fas fa-ellipsis-h'
};

const CATEGORY_COLORS = {
    'Продукты': '#10b981',
    'Транспорт': '#3b82f6',
    'Жилье': '#8b5cf6',
    'Развлечения': '#ec4899',
    'Здоровье': '#ef4444',
    'Одежда': '#f59e0b',
    'Кафе': '#84cc16',
    'Связь': '#06b6d4',
    'Образование': '#6366f1',
    'Прочее': '#64748b'
};

// ===== ИНИЦИАЛИЗАЦИЯ ДАННЫХ =====
function initData() {
    if (!localStorage.getItem('financeData')) {
        const defaultData = {
            version: '2.0',
            // Категории
            categories: [
                { id: 1, name: 'Продукты', icon: 'fas fa-shopping-basket', color: '#10b981', balance: 0, percent: 30, userIds: [] },
                { id: 2, name: 'Транспорт', icon: 'fas fa-car', color: '#3b82f6', balance: 0, percent: 15, userIds: [] },
                { id: 3, name: 'Жилье', icon: 'fas fa-home', color: '#8b5cf6', balance: 0, percent: 25, userIds: [] },
                { id: 4, name: 'Развлечения', icon: 'fas fa-film', color: '#ec4899', balance: 0, percent: 10, userIds: [] },
                { id: 5, name: 'Прочее', icon: 'fas fa-ellipsis-h', color: '#64748b', balance: 0, percent: 20, userIds: [] }
            ],
            // Пользователи
            users: [],
            // Шаблоны распределения
            templates: [
                { 
                    name: 'Стандартный', 
                    distribution: [
                        { categoryId: 1, percent: 30 },
                        { categoryId: 2, percent: 15 },
                        { categoryId: 3, percent: 25 },
                        { categoryId: 4, percent: 10 },
                        { categoryId: 5, percent: 20 }
                    ]
                }
            ],
            // Транзакции
            transactions: [],
            // Настройки
            settings: {
                currency: '₽',
                notifications: true,
                darkMode: false,
                monthlyReset: false
            },
            // Общий баланс
            totalBalance: 0,
            // Период отображения
            currentPeriod: 'month',
            // Общий доступ
            sharedAccess: {
                enabled: false,
                sharedWith: [],
                accessCode: null
            },
            // Текущий пользователь
            currentUser: null
        };
        
        localStorage.setItem('financeData', JSON.stringify(defaultData));
    }
    
    // Инициализация Telegram пользователя
    initTelegramUser();
}

// ===== РАБОТА С ДАННЫМИ =====
function getData() {
    return JSON.parse(localStorage.getItem('financeData')) || {};
}

function saveData(data) {
    localStorage.setItem('financeData', JSON.stringify(data));
}

function updateData(callback) {
    const data = getData();
    callback(data);
    saveData(data);
}

// ===== ПОЛЬЗОВАТЕЛИ =====
function initTelegramUser() {
    if (typeof Telegram !== 'undefined') {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        if (user) {
            updateData(data => {
                const existingUser = data.users.find(u => u.id === user.id);
                
                if (!existingUser) {
                    data.users.push({
                        id: user.id,
                        username: user.username || `user_${user.id}`,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        photoUrl: user.photo_url,
                        isAdmin: true,
                        joinedAt: new Date().toISOString()
                    });
                }
                
                data.currentUser = user.id;
            });
        }
    }
}

function addUser(username, isAdmin = false) {
    return updateData(data => {
        // Проверяем, нет ли уже такого пользователя
        if (data.users.some(u => u.username === username)) {
            throw new Error('Пользователь уже существует');
        }
        
        // В реальном приложении здесь бы было обращение к API Telegram
        const newUser = {
            id: Date.now(), // Временный ID, в реальном приложении - Telegram ID
            username: username,
            firstName: username,
            isAdmin: isAdmin,
            joinedAt: new Date().toISOString()
        };
        
        data.users.push(newUser);
        
        // Добавляем пользователя ко всем категориям
        data.categories.forEach(category => {
            if (!category.userIds.includes(newUser.id)) {
                category.userIds.push(newUser.id);
            }
        });
    });
}

function removeUser(userId) {
    updateData(data => {
        data.users = data.users.filter(u => u.id !== userId);
        
        // Удаляем пользователя из категорий
        data.categories.forEach(category => {
            category.userIds = category.userIds.filter(id => id !== userId);
        });
    });
}

// ===== КАТЕГОРИИ =====
function getCategoryById(id) {
    const data = getData();
    return data.categories.find(c => c.id === id);
}

function addCategory(name, color, icon) {
    return updateData(data => {
        const newCategory = {
            id: Date.now(),
            name: name,
            icon: icon || CATEGORY_ICONS[name] || 'fas fa-ellipsis-h',
            color: color || CATEGORY_COLORS[name] || '#64748b',
            balance: 0,
            percent: 0,
            userIds: data.users.map(u => u.id) // Все пользователи по умолчанию
        };
        
        data.categories.push(newCategory);
        return newCategory.id;
    });
}

function updateCategory(categoryId, updates) {
    updateData(data => {
        const category = data.categories.find(c => c.id === categoryId);
        if (category) {
            Object.assign(category, updates);
        }
    });
}

function deleteCategory(categoryId) {
    updateData(data => {
        // Перераспределяем баланс удаляемой категории
        const category = data.categories.find(c => c.id === categoryId);
        if (category) {
            // Распределяем баланс равномерно по остальным категориям
            const otherCategories = data.categories.filter(c => c.id !== categoryId);
            if (otherCategories.length > 0) {
                const share = category.balance / otherCategories.length;
                otherCategories.forEach(c => {
                    c.balance += share;
                });
                data.totalBalance -= category.balance; // Уже распределено
            }
            
            // Удаляем категорию
            data.categories = data.categories.filter(c => c.id !== categoryId);
            
            // Обновляем транзакции
            data.transactions = data.transactions.filter(t => 
                !t.categoryId || t.categoryId !== categoryId
            );
        }
    });
}

// ===== ТРАНЗАКЦИИ =====
function addTransaction(type, amount, options = {}) {
    return updateData(data => {
        const transaction = {
            id: Date.now(),
            type: type, // 'income', 'expense', 'transfer'
            amount: amount,
            date: new Date().toISOString(),
            description: options.description || '',
            categoryId: options.categoryId,
            categoryName: options.categoryName,
            userId: data.currentUser,
            period: data.currentPeriod,
            distributed: options.distributed || false,
            distribution: options.distribution || [] // Для распределенных расходов
        };
        
        data.transactions.push(transaction);
        
        // Обновляем балансы
        if (type === 'income') {
            data.totalBalance += amount;
            
            if (options.templateId) {
                // Распределяем по шаблону
                const template = data.templates.find(t => t.id === options.templateId);
                if (template) {
                    template.distribution.forEach(dist => {
                        const category = data.categories.find(c => c.id === dist.categoryId);
                        if (category) {
                            const categoryAmount = (amount * dist.percent) / 100;
                            category.balance += categoryAmount;
                        }
                    });
                }
            } else if (options.categoryId) {
                // Зачисляем в конкретную категорию
                const category = data.categories.find(c => c.id === options.categoryId);
                if (category) {
                    category.balance += amount;
                }
            } else {
                // Равномерное распределение
                const activeCategories = data.categories.filter(c => 
                    c.userIds.includes(data.currentUser)
                );
                
                if (activeCategories.length > 0) {
                    const share = amount / activeCategories.length;
                    activeCategories.forEach(category => {
                        category.balance += share;
                    });
                }
            }
        } 
        else if (type === 'expense') {
            if (options.distributed === true) {
                // Распределенный расход
                const activeCategories = data.categories.filter(c => 
                    c.userIds.includes(data.currentUser) && c.balance > 0
                );
                
                if (activeCategories.length > 0) {
                    const share = amount / activeCategories.length;
                    let distributedAmount = 0;
                    
                    activeCategories.forEach(category => {
                        const deductAmount = Math.min(category.balance, share);
                        category.balance -= deductAmount;
                        distributedAmount += deductAmount;
                        
                        transaction.distribution.push({
                            categoryId: category.id,
                            categoryName: category.name,
                            amount: deductAmount
                        });
                    });
                    
                    data.totalBalance -= distributedAmount;
                    transaction.amount = distributedAmount;
                }
            } 
            else if (options.categoryId) {
                // Расход из конкретной категории
                const category = data.categories.find(c => c.id === options.categoryId);
                if (category && category.balance >= amount) {
                    category.balance -= amount;
                    data.totalBalance -= amount;
                } else {
                    throw new Error('Недостаточно средств в категории');
                }
            }
        }
        
        return transaction.id;
    });
}

function getTransactions(period = 'month') {
    const data = getData();
    let filtered = data.transactions;
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
        case 'day':
            filtered = filtered.filter(t => new Date(t.date) >= dayStart);
            break;
        case 'month':
            filtered = filtered.filter(t => new Date(t.date) >= monthStart);
            break;
        // 'all' - все транзакции
    }
    
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ===== РАСПРЕДЕЛЕНИЕ =====
function distributeIncome(amount, templateId = null) {
    const data = getData();
    
    if (templateId) {
        // Используем шаблон
        const template = data.templates.find(t => t.id === templateId);
        if (template) {
            return addTransaction('income', amount, { 
                templateId: templateId,
                description: 'Доход по шаблону'
            });
        }
    }
    
    // Равномерное распределение
    return addTransaction('income', amount, {
        description: 'Доход',
        distributed: true
    });
}

function distributeExpense(amount, options = {}) {
    const { fromAllCategories = false, categoryId = null } = options;
    
    if (fromAllCategories) {
        // Распределить расход по всем категориям
        return addTransaction('expense', amount, {
            distributed: true,
            description: options.description || 'Распределенный расход'
        });
    } else if (categoryId) {
        // Расход из конкретной категории
        return addTransaction('expense', amount, {
            categoryId: categoryId,
            categoryName: options.categoryName,
            description: options.description || 'Расход'
        });
    }
}

// ===== ОБЩИЙ ДОСТУП =====
function generateAccessCode() {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    updateData(data => {
        data.sharedAccess.accessCode = code;
    });
    return code;
}

function shareWithUser(username, accessLevel = 'view') {
    // В реальном приложении здесь бы была интеграция с Telegram API
    updateData(data => {
        data.sharedAccess.sharedWith.push({
            username: username,
            accessLevel: accessLevel,
            joinedAt: new Date().toISOString()
        });
        data.sharedAccess.enabled = true;
    });
}

// ===== СБРОС ДАННЫХ =====
function resetPeriod(period) {
    updateData(data => {
        if (period === 'month') {
            // Сохраняем только категории и настройки
            const categories = data.categories.map(c => ({
                ...c,
                balance: 0
            }));
            
            const newData = {
                ...data,
                categories: categories,
                transactions: [],
                totalBalance: 0
            };
            
            saveData(newData);
        }
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
document.addEventListener('DOMContentLoaded', function() {
    initData();
    // UI обновится через app.js
});
