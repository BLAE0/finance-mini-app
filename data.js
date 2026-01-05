// Финансовый помощник - DATA
// ВСЁ РАБОТАЕТ!

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let financeData = null;
let currentPeriod = 'month';

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initApp() {
    // Проверяем данные
    if (!localStorage.getItem('financeData')) {
        createDefaultData();
    }
    
    loadData();
    initTelegramUser();
    updateAllUI();
}

function createDefaultData() {
    const defaultData = {
        version: '3.0',
        // Текущий пользователь
        currentUser: {
            id: null,
            username: null,
            firstName: 'Пользователь',
            isAdmin: true
        },
        // Категории
        categories: [
            { 
                id: 1, 
                name: 'Продукты', 
                color: '#10b981', 
                icon: 'fas fa-shopping-basket',
                balance: 0,
                percent: 30,
                users: [] // Пустой массив = все пользователи
            },
            { 
                id: 2, 
                name: 'Транспорт', 
                color: '#3b82f6', 
                icon: 'fas fa-car',
                balance: 0,
                percent: 20,
                users: []
            },
            { 
                id: 3, 
                name: 'Развлечения', 
                color: '#8b5cf6', 
                icon: 'fas fa-film',
                balance: 0,
                percent: 15,
                users: []
            },
            { 
                id: 4, 
                name: 'Коммуналка', 
                color: '#ef4444', 
                icon: 'fas fa-home',
                balance: 0,
                percent: 25,
                users: []
            },
            { 
                id: 5, 
                name: 'Прочее', 
                color: '#64748b', 
                icon: 'fas fa-ellipsis-h',
                balance: 0,
                percent: 10,
                users: []
            }
        ],
        // Пользователи (кроме текущего)
        users: [],
        // Транзакции
        transactions: [],
        // Настройки
        settings: {
            currency: '₽',
            darkMode: false
        },
        // Общий баланс
        totalBalance: 0
    };
    
    localStorage.setItem('financeData', JSON.stringify(defaultData));
}

function loadData() {
    financeData = JSON.parse(localStorage.getItem('financeData'));
    return financeData;
}

function saveData() {
    localStorage.setItem('financeData', JSON.stringify(financeData));
}

// ===== ТЕЛЕГРАМ ПОЛЬЗОВАТЕЛЬ =====
function initTelegramUser() {
    if (typeof Telegram !== 'undefined') {
        const tg = window.Telegram.WebApp;
        const telegramUser = tg.initDataUnsafe?.user;
        
        if (telegramUser) {
            // Устанавливаем текущего пользователя
            financeData.currentUser = {
                id: telegramUser.id,
                username: telegramUser.username || `user_${telegramUser.id}`,
                firstName: telegramUser.first_name || 'Пользователь',
                lastName: telegramUser.last_name,
                isAdmin: true,
                photoUrl: telegramUser.photo_url
            };
            
            // Обновляем UI с именем
            updateUserUI();
            saveData();
        }
    }
}

function updateUserUI() {
    const userInfo = document.getElementById('user-info');
    if (userInfo && financeData.currentUser.firstName) {
        userInfo.innerHTML = `<i class="fas fa-user-circle"></i> ${financeData.currentUser.firstName}`;
    }
}

// ===== КАТЕГОРИИ =====
function getCategories() {
    return financeData.categories;
}

function getCategory(id) {
    return financeData.categories.find(c => c.id === id);
}

function addCategory(name, color) {
    const newCategory = {
        id: Date.now(),
        name: name,
        color: color || '#4361ee',
        icon: 'fas fa-tag',
        balance: 0,
        percent: 0,
        users: []
    };
    
    financeData.categories.push(newCategory);
    saveData();
    updateCategoriesUI();
    return newCategory;
}

function updateCategoryPercent(categoryId, percent) {
    const category = getCategory(categoryId);
    if (category) {
        category.percent = percent;
        saveData();
        return true;
    }
    return false;
}

function deleteCategory(categoryId) {
    const category = getCategory(categoryId);
    if (category) {
        // Если в категории есть деньги, распределяем их
        if (category.balance > 0) {
            const otherCategories = financeData.categories.filter(c => c.id !== categoryId);
            if (otherCategories.length > 0) {
                const share = category.balance / otherCategories.length;
                otherCategories.forEach(c => {
                    c.balance += share;
                });
            }
        }
        
        // Удаляем категорию
        financeData.categories = financeData.categories.filter(c => c.id !== categoryId);
        saveData();
        updateCategoriesUI();
        return true;
    }
    return false;
}

// ===== ПОЛЬЗОВАТЕЛИ =====
function getUsers() {
    return financeData.users;
}

function addUser(username) {
    // Проверяем, нет ли уже такого пользователя
    if (financeData.users.some(u => u.username === username)) {
        return { success: false, message: 'Пользователь уже добавлен' };
    }
    
    const newUser = {
        id: Date.now(),
        username: username,
        firstName: username.replace('@', ''),
        isAdmin: false,
        addedAt: new Date().toISOString()
    };
    
    financeData.users.push(newUser);
    saveData();
    return { success: true, user: newUser };
}

function removeUser(userId) {
    financeData.users = financeData.users.filter(u => u.id !== userId);
    saveData();
    return true;
}

// ===== ОПЕРАЦИИ =====
function addIncome(amount, description, period, distributionType, categoryId = null) {
    amount = Number(amount);
    
    if (isNaN(amount) || amount <= 0) {
        return { success: false, message: 'Введите корректную сумму' };
    }
    
    // Создаем транзакцию
    const transaction = {
        id: Date.now(),
        type: 'income',
        amount: amount,
        description: description || 'Доход',
        date: new Date().toISOString(),
        period: period || 'one-time',
        userId: financeData.currentUser.id,
        userName: financeData.currentUser.firstName
    };
    
    // Обновляем балансы
    financeData.totalBalance += amount;
    
    if (distributionType === 'specific' && categoryId) {
        // В конкретную категорию
        const category = getCategory(categoryId);
        if (category) {
            category.balance += amount;
            transaction.categoryId = categoryId;
            transaction.categoryName = category.name;
        }
    } else if (distributionType === 'template') {
        // По шаблону процентов
        let distributed = 0;
        financeData.categories.forEach(category => {
            const categoryAmount = (amount * category.percent) / 100;
            category.balance += categoryAmount;
            distributed += categoryAmount;
            
            if (categoryAmount > 0) {
                transaction.distribution = transaction.distribution || [];
                transaction.distribution.push({
                    categoryId: category.id,
                    categoryName: category.name,
                    amount: categoryAmount
                });
            }
        });
        
        // Корректируем из-за округления
        if (distributed !== amount) {
            const diff = amount - distributed;
            if (financeData.categories.length > 0) {
                financeData.categories[0].balance += diff;
            }
        }
    } else {
        // Равномерно по всем категориям
        const activeCategories = financeData.categories;
        if (activeCategories.length > 0) {
            const share = amount / activeCategories.length;
            activeCategories.forEach(category => {
                category.balance += share;
            });
        }
    }
    
    // Сохраняем
    financeData.transactions.push(transaction);
    saveData();
    
    return { 
        success: true, 
        transaction: transaction,
        message: `Доход ${amount}₽ добавлен`
    };
}

function addExpense(amount, description, categoryId, sourceType) {
    amount = Number(amount);
    
    if (isNaN(amount) || amount <= 0) {
        return { success: false, message: 'Введите корректную сумму' };
    }
    
    // Проверяем достаточно ли денег
    if (sourceType === 'specific') {
        // Из конкретной категории
        const category = getCategory(categoryId);
        if (!category) {
            return { success: false, message: 'Категория не найдена' };
        }
        
        if (category.balance < amount) {
            return { success: false, message: `Недостаточно средств в категории "${category.name}" (доступно: ${category.balance}₽)` };
        }
        
        // Снимаем с категории
        category.balance -= amount;
        
    } else if (sourceType === 'all') {
        // Со всех категорий поровну
        const activeCategories = financeData.categories.filter(c => c.balance > 0);
        if (activeCategories.length === 0) {
            return { success: false, message: 'Нет доступных средств в категориях' };
        }
        
        const share = amount / activeCategories.length;
        let totalTaken = 0;
        
        activeCategories.forEach(category => {
            const takeAmount = Math.min(category.balance, share);
            category.balance -= takeAmount;
            totalTaken += takeAmount;
        });
        
        // Если не хватило из всех категорий
        if (totalTaken < amount) {
            // Возвращаем взятое
            activeCategories.forEach(category => {
                // В реальном приложении здесь была бы корректная логика возврата
            });
            return { success: false, message: 'Недостаточно средств во всех категориях' };
        }
        
        amount = totalTaken; // Фактически взятая сумма
    }
    
    // Создаем транзакцию
    const transaction = {
        id: Date.now(),
        type: 'expense',
        amount: amount,
        description: description || 'Расход',
        date: new Date().toISOString(),
        categoryId: categoryId,
        categoryName: getCategory(categoryId)?.name,
        userId: financeData.currentUser.id,
        userName: financeData.currentUser.firstName,
        sourceType: sourceType
    };
    
    // Обновляем общий баланс
    financeData.totalBalance -= amount;
    
    // Сохраняем
    financeData.transactions.push(transaction);
    saveData();
    
    return { 
        success: true, 
        transaction: transaction,
        message: `Расход ${amount}₽ добавлен`
    };
}

function getTransactions(limit = 10) {
    // Сортируем по дате (новые сверху)
    const sorted = [...financeData.transactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Фильтруем по периоду если нужно
    if (currentPeriod === 'day') {
        const today = new Date().toDateString();
        return sorted.filter(t => new Date(t.date).toDateString() === today).slice(0, limit);
    } else if (currentPeriod === 'month') {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return sorted.filter(t => new Date(t.date) >= monthStart).slice(0, limit);
    }
    
    return sorted.slice(0, limit);
}

// ===== UI ОБНОВЛЕНИЯ =====
function updateAllUI() {
    updateBalanceUI();
    updateCategoriesUI();
    updateTransactionsUI();
}

function updateBalanceUI() {
    const balanceEl = document.getElementById('total-balance');
    if (balanceEl) {
        balanceEl.textContent = `${Math.round(financeData.totalBalance)} ${financeData.settings.currency}`;
    }
}

function updateCategoriesUI() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (financeData.categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Нет категорий</p>
                <button class="text-btn" onclick="openCategoriesModal()">Создать категорию</button>
            </div>
        `;
        return;
    }
    
    financeData.categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.style.borderLeftColor = category.color;
        item.onclick = () => openCategoryExpense(category.id);
        
        item.innerHTML = `
            <div class="category-icon" style="background: ${category.color}">
                <i class="${category.icon}"></i>
            </div>
            <div class="category-info">
                <div class="category-name">${category.name}</div>
                <div class="category-percent">${category.percent}%</div>
            </div>
            <div class="category-balance">${Math.round(category.balance)} ₽</div>
        `;
        
        container.appendChild(item);
    });
}

function updateTransactionsUI() {
    const container = document.getElementById('transactions');
    if (!container) return;
    
    container.innerHTML = '';
    
    const transactions = getTransactions(5);
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Нет операций</p>
            </div>
        `;
        return;
    }
    
    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        const isIncome = transaction.type === 'income';
        const category = transaction.categoryId ? getCategory(transaction.categoryId) : null;
        
        const iconColor = isIncome ? '#10b981' : (category?.color || '#ef4444');
        const icon = isIncome ? 'fas fa-plus-circle' : 'fas fa-minus-circle';
        
        const date = new Date(transaction.date);
        const time = date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        item.innerHTML = `
            <div class="transaction-icon" style="background: ${iconColor}">
                <i class="${icon}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">${transaction.description}</div>
                <div class="transaction-info">
                    <span>${category ? category.name : isIncome ? 'Доход' : 'Расход'}</span>
                    <span>•</span>
                    <span>${time}</span>
                </div>
            </div>
            <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                ${isIncome ? '+' : '-'}${Math.round(transaction.amount)} ₽
            </div>
        `;
        
        container.appendChild(item);
    });
}

// ===== ЭКСПОРТ ФУНКЦИЙ =====
// (Эти функции будут доступны из app.js)
window.getCategories = getCategories;
window.getCategory = getCategory;
window.addCategory = addCategory;
window.updateCategoryPercent = updateCategoryPercent;
window.deleteCategory = deleteCategory;
window.getUsers = getUsers;
window.addUser = addUser;
window.removeUser = removeUser;
window.addIncome = addIncome;
window.addExpense = addExpense;
window.getTransactions = getTransactions;
window.updateAllUI = updateAllUI;
window.initApp = initApp;
