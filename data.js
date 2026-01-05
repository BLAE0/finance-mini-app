// Финансовый помощник - Data Management
// ВЕРСИЯ: 3.0 - Полная переработка

// ===== КОНСТАНТЫ И НАСТРОЙКИ =====
const DEFAULT_CATEGORIES = [
    { id: 1, name: 'Продукты', icon: 'fas fa-shopping-basket', color: '#10b981', percent: 30 },
    { id: 2, name: 'Транспорт', icon: 'fas fa-car', color: '#3b82f6', percent: 15 },
    { id: 3, name: 'Коммуналка', icon: 'fas fa-home', color: '#8b5cf6', percent: 25 },
    { id: 4, name: 'Развлечения', icon: 'fas fa-film', color: '#ec4899', percent: 10 },
    { id: 5, name: 'Прочее', icon: 'fas fa-ellipsis-h', color: '#64748b', percent: 20 }
];

const DEFAULT_TEMPLATES = [
    {
        id: 1,
        name: 'Стандартный',
        categories: [
            { categoryId: 1, percent: 30 },
            { categoryId: 2, percent: 15 },
            { categoryId: 3, percent: 25 },
            { categoryId: 4, percent: 10 },
            { categoryId: 5, percent: 20 }
        ]
    }
];

// ===== ИНИЦИАЛИЗАЦИЯ ДАННЫХ =====
function initAppData() {
    if (!localStorage.getItem('financeApp')) {
        const appData = {
            version: '3.0',
            totalBalance: 0,
            currency: '₽',
            
            // Категории с балансами
            categories: DEFAULT_CATEGORIES.map(cat => ({
                ...cat,
                balance: 0,
                spent: 0
            })),
            
            // Транзакции
            transactions: [],
            
            // Пользователи (партнёры)
            users: [],
            
            // Шаблоны распределения
            templates: DEFAULT_TEMPLATES,
            
            // Настройки
            settings: {
                notifications: true,
                darkMode: false,
                monthlyReset: false
            },
            
            // Общий доступ
            sharing: {
                enabled: false,
                shareCode: null,
                sharedWith: []
            },
            
            // Текущий период
            currentPeriod: 'current'
        };
        
        localStorage.setItem('financeApp', JSON.stringify(appData));
    }
    
    // Инициализация Telegram пользователя
    initTelegramUser();
    
    return getAppData();
}

// ===== ОСНОВНЫЕ ФУНКЦИИ ДАННЫХ =====
function getAppData() {
    const data = JSON.parse(localStorage.getItem('financeApp'));
    if (!data) return initAppData();
    return data;
}

function saveAppData(data) {
    localStorage.setItem('financeApp', JSON.stringify(data));
    updateUI(); // Обновляем интерфейс
}

function updateAppData(updater) {
    const data = getAppData();
    updater(data);
    saveAppData(data);
}

// ===== ПОЛЬЗОВАТЕЛИ =====
function initTelegramUser() {
    if (typeof Telegram !== 'undefined') {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        if (user && !getCurrentUser()) {
            updateAppData(data => {
                data.users.push({
                    id: user.id,
                    username: user.username || `user_${user.id}`,
                    firstName: user.first_name || 'Пользователь',
                    lastName: user.last_name || '',
                    photoUrl: user.photo_url,
                    isAdmin: true,
                    isCurrent: true,
                    joinedAt: new Date().toISOString()
                });
            });
        }
    }
}

function getCurrentUser() {
    const data = getAppData();
    return data.users.find(u => u.isCurrent) || data.users[0];
}

function addPartner(username) {
    if (!username.startsWith('@')) {
        username = '@' + username;
    }
    
    // В реальном приложении здесь бы была проверка через Telegram API
    updateAppData(data => {
        // Проверяем, нет ли уже такого пользователя
        if (data.users.some(u => u.username === username)) {
            throw new Error('Пользователь уже добавлен');
        }
        
        data.users.push({
            id: Date.now(),
            username: username,
            firstName: username,
            isAdmin: false,
            isCurrent: false,
            joinedAt: new Date().toISOString()
        });
        
        // Включаем общий доступ
        data.sharing.enabled = true;
        data.sharing.sharedWith.push(username);
    });
    
    return username;
}

function removePartner(userId) {
    updateAppData(data => {
        data.users = data.users.filter(u => u.id !== userId);
        
        // Если не осталось партнёров, выключаем общий доступ
        if (data.users.filter(u => !u.isCurrent).length === 0) {
            data.sharing.enabled = false;
        }
    });
}

// ===== КАТЕГОРИИ =====
function getCategories() {
    const data = getAppData();
    return data.categories;
}

function getCategory(id) {
    const data = getAppData();
    return data.categories.find(c => c.id === id);
}

function updateCategory(id, updates) {
    updateAppData(data => {
        const category = data.categories.find(c => c.id === id);
        if (category) {
            Object.assign(category, updates);
        }
    });
}

function addCategory(name, percent = 0, color = null, icon = null) {
    const newId = Date.now();
    
    updateAppData(data => {
        data.categories.push({
            id: newId,
            name: name,
            icon: icon || 'fas fa-ellipsis-h',
            color: color || '#64748b',
            percent: percent,
            balance: 0,
            spent: 0
        });
    });
    
    return newId;
}

function deleteCategory(id) {
    updateAppData(data => {
        const category = data.categories.find(c => c.id === id);
        if (category) {
            // Распределяем баланс категории по остальным
            const otherCategories = data.categories.filter(c => c.id !== id);
            if (otherCategories.length > 0 && category.balance > 0) {
                const share = category.balance / otherCategories.length;
                otherCategories.forEach(c => {
                    c.balance += share;
                });
            }
            
            // Удаляем категорию
            data.categories = data.categories.filter(c => c.id !== id);
        }
    });
}

// ===== ТРАНЗАКЦИИ =====
function addTransaction(type, amount, options = {}) {
    const transactionId = Date.now();
    const date = options.date ? new Date(options.date) : new Date();
    
    updateAppData(data => {
        const transaction = {
            id: transactionId,
            type: type, // 'income', 'expense', 'transfer'
            amount: parseFloat(amount),
            date: date.toISOString(),
            description: options.description || '',
            categoryId: options.categoryId,
            categoryName: options.categoryName,
            distribution: options.distribution || 'specific',
            period: getCurrentPeriod(),
            userId: getCurrentUser()?.id
        };
        
        data.transactions.push(transaction);
        
        // ОБРАБОТКА БАЛАНСОВ
        if (type === 'income') {
            data.totalBalance += transaction.amount;
            
            if (options.templateId) {
                // Распределение по шаблону
                const template = data.templates.find(t => t.id === options.templateId);
                if (template) {
                    template.categories.forEach(tc => {
                        const category = data.categories.find(c => c.id === tc.categoryId);
                        if (category) {
                            const categoryAmount = (amount * tc.percent) / 100;
                            category.balance += categoryAmount;
                        }
                    });
                }
            } else if (options.distribution === 'all') {
                // Равное распределение по всем категориям
                const activeCategories = data.categories.filter(c => c.percent > 0);
                if (activeCategories.length > 0) {
                    const share = amount / activeCategories.length;
                    activeCategories.forEach(category => {
                        category.balance += share;
                    });
                }
            } else if (options.categoryId) {
                // В конкретную категорию
                const category = data.categories.find(c => c.id === options.categoryId);
                if (category) {
                    category.balance += amount;
                }
            }
        } 
        else if (type === 'expense') {
            if (options.distribution === 'all') {
                // Равное списание со всех категорий
                const activeCategories = data.categories.filter(c => c.balance > 0);
                if (activeCategories.length > 0) {
                    const share = amount / activeCategories.length;
                    let distributed = 0;
                    
                    activeCategories.forEach(category => {
                        const deduct = Math.min(category.balance, share);
                        category.balance -= deduct;
                        category.spent += deduct;
                        distributed += deduct;
                    });
                    
                    data.totalBalance -= distributed;
                    transaction.amount = distributed; // Обновляем сумму в транзакции
                }
            } 
            else if (options.distribution === 'percentage') {
                // Списание по процентам категорий
                const totalPercent = data.categories.reduce((sum, cat) => sum + cat.percent, 0);
                if (totalPercent > 0) {
                    let distributed = 0;
                    
                    data.categories.forEach(category => {
                        if (category.percent > 0 && category.balance > 0) {
                            const categoryAmount = (amount * category.percent) / totalPercent;
                            const deduct = Math.min(category.balance, categoryAmount);
                            category.balance -= deduct;
                            category.spent += deduct;
                            distributed += deduct;
                        }
                    });
                    
                    data.totalBalance -= distributed;
                    transaction.amount = distributed;
                }
            }
            else if (options.categoryId) {
                // Списание из конкретной категории
                const category = data.categories.find(c => c.id === options.categoryId);
                if (category && category.balance >= amount) {
                    category.balance -= amount;
                    category.spent += amount;
                    data.totalBalance -= amount;
                } else {
                    throw new Error(`Недостаточно средств в категории "${category.name}"`);
                }
            }
        }
    });
    
    return transactionId;
}

function getTransactions(period = 'current') {
    const data = getAppData();
    let transactions = [...data.transactions];
    
    // Фильтрация по периоду
    if (period !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
            case 'current':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }
        
        transactions = transactions.filter(t => new Date(t.date) >= startDate);
    }
    
    // Сортировка по дате (новые сверху)
    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ===== ШАБЛОНЫ РАСПРЕДЕЛЕНИЯ =====
function getTemplates() {
    const data = getAppData();
    return data.templates;
}

function createTemplate(name, categories) {
    const templateId = Date.now();
    
    updateAppData(data => {
        data.templates.push({
            id: templateId,
            name: name,
            categories: categories.map(c => ({
                categoryId: c.id,
                percent: c.percent
            }))
        });
    });
    
    return templateId;
}

function applyTemplate(templateId, amount) {
    const template = getTemplates().find(t => t.id === templateId);
    if (!template) return null;
    
    return addTransaction('income', amount, {
        templateId: templateId,
        distribution: 'template',
        description: `Доход по шаблону "${template.name}"`
    });
}

// ===== ОБЩИЙ ДОСТУП =====
function generateShareCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    updateAppData(data => {
        data.sharing.shareCode = code;
    });
    return code;
}

function getShareLink() {
    const data = getAppData();
    const code = data.sharing.shareCode || generateShareCode();
    return `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(`Присоединяйся к нашему финансовому приложению! Код: ${code}`)}`;
}

// ===== СТАТИСТИКА =====
function getStats(period = 'current') {
    const transactions = getTransactions(period);
    const categories = getCategories();
    
    const income = transactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const categoryStats = categories.map(category => {
        const categoryTransactions = transactions.filter(t => 
            t.categoryId === category.id || 
            (t.distribution === 'percentage' && category.percent > 0)
        );
        
        const spent = categoryTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const received = categoryTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        return {
            ...category,
            spent: spent,
            received: received,
            net: received - spent
        };
    });
    
    return {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        categories: categoryStats,
        transactionsCount: transactions.length
    };
}

// ===== УТИЛИТЫ =====
function formatCurrency(amount) {
    const data = getAppData();
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' ' + data.currency;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
        return 'Сегодня ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
        return 'Вчера ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function getCurrentPeriod() {
    const data = getAppData();
    return data.currentPeriod || 'current';
}

function setCurrentPeriod(period) {
    updateAppData(data => {
        data.currentPeriod = period;
    });
}

// ===== ЭКСПОРТ/ИМПОРТ =====
function exportData() {
    const data = getAppData();
    const exportData = {
        ...data,
        exportDate: new Date().toISOString(),
        version: '3.0'
    };
    
    return JSON.stringify(exportData, null, 2);
}

function importData(jsonString) {
    try {
        const imported = JSON.parse(jsonString);
        
        // Базовая валидация
        if (!imported.categories || !imported.transactions) {
            throw new Error('Некорректный формат данных');
        }
        
        // Сохраняем
        localStorage.setItem('financeApp', JSON.stringify(imported));
        
        // Обновляем UI
        updateUI();
        
        return { success: true, message: 'Данные успешно импортированы' };
    } catch (error) {
        return { success: false, message: 'Ошибка импорта: ' + error.message };
    }
}

function resetData() {
    if (confirm('Вы уверены? Все данные будут удалены безвозвратно.')) {
        localStorage.removeItem('financeApp');
        initAppData();
        updateUI();
        showNotification('Данные сброшены', 'success');
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    initAppData();
});
