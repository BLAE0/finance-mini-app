// Основная логика приложения

// ===== ОБНОВЛЕНИЕ UI =====
function updateUI() {
    updateBalance();
    updateCategories();
    updateTransactions();
}

function updateBalance() {
    document.getElementById('total-balance').textContent = 
        `${Math.round(financeData.totalBalance)} ₽`;
}

function updateCategories() {
    const container = document.getElementById('categories-list');
    container.innerHTML = '';
    
    financeData.categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.style.borderLeftColor = cat.color;
        item.onclick = () => openCategoryExpense(cat.id);
        
        item.innerHTML = `
            <div class="category-icon" style="background: ${cat.color}">
                <i class="${cat.icon}"></i>
            </div>
            <div class="category-info">
                <div class="category-name">${cat.name}</div>
                <div class="category-percent">${cat.percent}% от дохода</div>
            </div>
            <div class="category-balance">${Math.round(cat.balance)} ₽</div>
        `;
        container.appendChild(item);
    });
}

function updateTransactions() {
    const container = document.getElementById('transactions');
    container.innerHTML = '';
    
    const recent = financeData.transactions.slice(-5).reverse();
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Нет операций</p>
            </div>
        `;
        return;
    }
    
    recent.forEach(trans => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        const isIncome = trans.type === 'income';
        const category = financeData.categories.find(c => c.id === trans.categoryId);
        const color = isIncome ? '#10b981' : (category?.color || '#ef4444');
        const icon = isIncome ? 'fas fa-plus-circle' : 'fas fa-minus-circle';
        
        const date = new Date(trans.date);
        const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        item.innerHTML = `
            <div class="transaction-icon" style="background: ${color}">
                <i class="${icon}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">${trans.description}</div>
                <div class="transaction-info">
                    <span>${category ? category.name : (isIncome ? 'Доход' : 'Расход')}</span>
                    <span>•</span>
                    <span>${time}</span>
                </div>
            </div>
            <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                ${isIncome ? '+' : '-'}${Math.round(trans.amount)} ₽
            </div>
        `;
        container.appendChild(item);
    });
}

// ===== ПЕРИОДЫ =====
function setPeriod(period) {
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase().includes(period)) {
            tab.classList.add('active');
        }
    });
    financeData.period = period;
    updateTransactions();
}

// ===== МОДАЛЬНЫЕ ОКНА =====
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    if (id === 'income-modal' || id === 'expense-modal') {
        updateCategorySelects();
    }
    if (id === 'categories-modal') {
        updateCategoriesManage();
        updatePercentManager();
    }
    if (id === 'users-modal') {
        updateUsersList();
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    document.body.style.overflow = 'auto';
    
    if (id === 'income-modal') {
        document.getElementById('income-amount').value = '';
        document.getElementById('income-description').value = '';
        document.getElementById('category-select-container').style.display = 'none';
    }
    if (id === 'expense-modal') {
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-description').value = '';
        document.getElementById('expense-alert').style.display = 'none';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Закрытие по клику и ESC
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeAllModals();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// ===== ДОХОДЫ =====
function updateCategorySelects() {
    const incomeSelect = document.getElementById('income-category');
    const expenseSelect = document.getElementById('expense-category');
    
    incomeSelect.innerHTML = '<option value="">Выберите категорию</option>';
    expenseSelect.innerHTML = '<option value="">Выберите категорию</option>';
    
    financeData.categories.forEach(cat => {
        incomeSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        expenseSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

function toggleCategorySelect() {
    const select = document.getElementById('income-distribution').value;
    const container = document.getElementById('category-select-container');
    container.style.display = select === 'specific' ? 'block' : 'none';
}

function addIncome() {
    const amount = parseFloat(document.getElementById('income-amount').value);
    const description = document.getElementById('income-description').value.trim() || 'Доход';
    const distribution = document.getElementById('income-distribution').value;
    const categoryId = distribution === 'specific' ? 
        parseInt(document.getElementById('income-category').value) : null;
    
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    // Обновляем общий баланс
    financeData.totalBalance += amount;
    
    // Распределяем по категориям
    if (distribution === 'specific' && categoryId) {
        const category = financeData.categories.find(c => c.id === categoryId);
        if (category) {
            category.balance += amount;
        }
    } else if (distribution === 'percent') {
        // По процентам
        financeData.categories.forEach(cat => {
            cat.balance += (amount * cat.percent) / 100;
        });
    } else {
        // Поровну
        const share = amount / financeData.categories.length;
        financeData.categories.forEach(cat => {
            cat.balance += share;
        });
    }
    
    // Добавляем транзакцию
    financeData.transactions.push({
        id: Date.now(),
        type: 'income',
        amount: amount,
        description: description,
        date: new Date().toISOString(),
        categoryId: categoryId,
        distribution: distribution
    });
    
    saveData();
    updateUI();
    closeModal('income-modal');
    showNotification(`Доход ${amount}₽ добавлен!`, 'success');
}

// ===== РАСХОДЫ =====
function addExpense() {
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const description = document.getElementById('expense-description').value.trim() || 'Расход';
    const categoryId = parseInt(document.getElementById('expense-category').value);
    const sourceType = document.getElementById('expense-source').value;
    
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    if (!categoryId) {
        showNotification('Выберите категорию', 'error');
        return;
    }
    
    const category = financeData.categories.find(c => c.id === categoryId);
    if (!category) {
        showNotification('Категория не найдена', 'error');
        return;
    }
    
    if (sourceType === 'specific') {
        // Из конкретной категории
        if (category.balance < amount) {
            showNotification(`Недостаточно средств в категории "${category.name}"! Доступно: ${Math.round(category.balance)}₽`, 'error');
            return;
        }
        category.balance -= amount;
    } else {
        // Со всех категорий поровну
        const totalAvailable = financeData.categories.reduce((sum, cat) => sum + cat.balance, 0);
        if (totalAvailable < amount) {
            showNotification(`Недостаточно средств во всех категориях! Доступно: ${Math.round(totalAvailable)}₽`, 'error');
            return;
        }
        
        const share = amount / financeData.categories.length;
        financeData.categories.forEach(cat => {
            cat.balance = Math.max(0, cat.balance - share);
        });
    }
    
    // Обновляем общий баланс
    financeData.totalBalance -= amount;
    
    // Добавляем транзакцию
    financeData.transactions.push({
        id: Date.now(),
        type: 'expense',
        amount: amount,
        description: description,
        date: new Date().toISOString(),
        categoryId: categoryId,
        sourceType: sourceType
    });
    
    saveData();
    updateUI();
    closeModal('expense-modal');
    showNotification(`Расход ${amount}₽ добавлен!`, 'success');
}

function openCategoryExpense(categoryId) {
    openModal('expense-modal');
    setTimeout(() => {
        document.getElementById('expense-category').value = categoryId;
        document.getElementById('expense-source').value = 'specific';
    }, 100);
}

// ===== КАТЕГОРИИ =====
function updateCategoriesManage() {
    const container = document.getElementById('categories-manage');
    container.innerHTML = '';
    
    financeData.categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-manage-item';
        
        item.innerHTML = `
            <div class="category-manage-color" style="background: ${cat.color}"></div>
            <div class="category-manage-name">${cat.name}</div>
            <div class="category-manage-balance">${Math.round(cat.balance)} ₽</div>
            <button class="category-manage-delete" onclick="deleteCategory(${cat.id})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(item);
    });
}

function updatePercentManager() {
    const container = document.getElementById('percent-manager');
    container.innerHTML = '<h4>Проценты распределения (всего должно быть 100%)</h4>';
    
    let totalPercent = 0;
    
    financeData.categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'percent-item';
        
        item.innerHTML = `
            <div class="percent-name">${cat.name}</div>
            <input type="number" 
                   class="percent-input" 
                   value="${cat.percent}" 
                   min="0" 
                   max="100"
                   oninput="updateCategoryPercent(${cat.id}, this.value); updatePercentTotal()">
            <span>%</span>
        `;
        container.appendChild(item);
        totalPercent += cat.percent;
    });
    
    const totalEl = document.createElement('div');
    totalEl.className = 'percent-total';
    totalEl.id = 'percent-total';
    totalEl.innerHTML = `Всего: <span>${totalPercent}</span>%`;
    container.appendChild(totalEl);
    updatePercentTotal();
}

function updateCategoryPercent(categoryId, percent) {
    const category = financeData.categories.find(c => c.id === categoryId);
    if (category) {
        category.percent = parseInt(percent) || 0;
        saveData();
    }
}

function updatePercentTotal() {
    const inputs = document.querySelectorAll('.percent-input');
    let total = 0;
    
    inputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });
    
    const totalEl = document.getElementById('percent-total');
    if (totalEl) {
        const span = totalEl.querySelector('span');
        span.textContent = total;
        
        if (total === 100) {
            totalEl.style.color = '#10b981';
            totalEl.style.borderColor = '#10b981';
        } else if (total > 100) {
            totalEl.style.color = '#ef4444';
            totalEl.style.borderColor = '#ef4444';
        } else {
            totalEl.style.color = '#f59e0b';
            totalEl.style.borderColor = '#f59e0b';
        }
    }
}

function addNewCategory() {
    const nameInput = document.getElementById('new-category-name');
    const colorInput = document.getElementById('new-category-color');
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) {
        showNotification('Введите название категории', 'error');
        return;
    }
    
    const newCategory = {
        id: Date.now(),
        name: name,
        color: color,
        icon: 'fas fa-tag',
        balance: 0,
        percent: 0
    };
    
    financeData.categories.push(newCategory);
    saveData();
    
    nameInput.value = '';
    colorInput.value = '#4361ee';
    
    updateCategories();
    updateCategoriesManage();
    updatePercentManager();
    updateCategorySelects();
    
    showNotification(`Категория "${name}" добавлена`, 'success');
}

function deleteCategory(categoryId) {
    const category = financeData.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    if (category.balance > 0) {
        if (!confirm(`В категории "${category.name}" есть ${Math.round(category.balance)}₽. Удалить всё равно?`)) {
            return;
        }
        financeData.totalBalance -= category.balance;
    }
    
    financeData.categories = financeData.categories.filter(c => c.id !== categoryId);
    saveData();
    
    updateCategories();
    updateCategoriesManage();
    updatePercentManager();
    updateCategorySelects();
    
    showNotification(`Категория "${category.name}" удалена`, 'success');
}

function savePercentages() {
    const total = parseInt(document.querySelector('#percent-total span').textContent);
    if (total !== 100) {
        showNotification(`Сумма процентов должна быть 100% (сейчас ${total}%)`, 'error');
        return;
    }
    
    saveData();
    showNotification('Проценты сохранены', 'success');
}

// ===== ПОЛЬЗОВАТЕЛИ =====
function updateUsersList() {
    const container = document.getElementById('users-list');
    container.innerHTML = '';
    
    if (financeData.users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Нет добавленных пользователей</p>
            </div>
        `;
        return;
    }
    
    financeData.users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-item';
        
        const firstLetter = user.username ? user.username.charAt(1).toUpperCase() : '?';
        
        item.innerHTML = `
            <div class="user-avatar">${firstLetter}</div>
            <div class="user-info-text">
                <div class="user-name">${user.username}</div>
                <div class="user-username">Добавлен: ${new Date(user.addedAt).toLocaleDateString()}</div>
            </div>
            <button class="user-delete" onclick="removeUser(${user.id})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(item);
    });
}

function addNewUser() {
    const input = document.getElementById('new-username');
    const username = input.value.trim();
    
    if (!username) {
        showNotification('Введите @username', 'error');
        return;
    }
    
    if (!username.startsWith('@')) {
        showNotification('Username должен начинаться с @', 'error');
        return;
    }
    
    if (financeData.users.some(u => u.username === username)) {
        showNotification('Этот пользователь уже добавлен', 'error');
        return;
    }
    
    const newUser = {
        id: Date.now(),
        username: username,
        addedAt: new Date().toISOString()
    };
    
    financeData.users.push(newUser);
    saveData();
    
    input.value = '';
    updateUsersList();
    
    showNotification(`Пользователь ${username} добавлен`, 'success');
}

function removeUser(userId) {
    financeData.users = financeData.users.filter(u => u.id !== userId);
    saveData();
    updateUsersList();
    showNotification('Пользователь удален', 'success');
}

// ===== ДРУГИЕ ФУНКЦИИ =====
function showStats() {
    alert('Статистика будет в следующем обновлении!');
}

function showAllTransactions() {
    if (financeData.transactions.length === 0) {
        alert('Нет операций для отображения');
        return;
    }
    
    let message = 'ВСЕ ОПЕРАЦИИ:\n\n';
    financeData.transactions.reverse().forEach((trans, i) => {
        const date = new Date(trans.date);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const type = trans.type === 'income' ? 'ДОХОД' : 'РАСХОД';
        const sign = trans.type === 'income' ? '+' : '-';
        message += `${i+1}. ${dateStr} ${timeStr} - ${trans.description}\n   ${type}: ${sign}${Math.round(trans.amount)}₽\n\n`;
    });
    alert(message);
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(message, type = 'info') {
    if (typeof Telegram !== 'undefined' && window.Telegram.WebApp.showAlert) {
        window.Telegram.WebApp.showAlert(message);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideDown 0.3s ease;
        font-weight: 600;
        max-width: 90%;
        text-align: center;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    
    @keyframes slideUp {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    updateUI();
});
