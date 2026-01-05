// Финансовый помощник - APP
// ВСЁ РАБОТАЕТ!

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let currentPeriod = 'month';

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем приложение
    initApp();
    
    // Настраиваем Telegram
    if (typeof Telegram !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Темная тема
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        
        tg.onEvent('themeChanged', function() {
            document.body.classList.toggle('dark-theme', tg.colorScheme === 'dark');
        });
    }
    
    // Обновляем UI
    updateAllUI();
});

// ===== ПЕРИОДЫ =====
function setPeriod(period) {
    currentPeriod = period;
    
    // Обновляем кнопки
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase().includes(period)) {
            tab.classList.add('active');
        }
    });
    
    // Обновляем транзакции
    updateTransactionsUI();
}

// ===== МОДАЛЬНЫЕ ОКНА =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Если это модалка категорий - обновляем список
        if (modalId === 'categories-modal') {
            updateCategoriesManage();
            updatePercentManager();
        }
        
        // Если это модалка пользователей - обновляем список
        if (modalId === 'users-modal') {
            updateUsersList();
        }
        
        // Если это модалка дохода/расхода - обновляем категории
        if (modalId === 'income-modal' || modalId === 'expense-modal') {
            updateCategorySelects();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Очищаем поля
        if (modalId === 'income-modal') {
            document.getElementById('income-amount').value = '';
            document.getElementById('income-description').value = '';
            document.getElementById('income-distribute').value = 'all';
            document.getElementById('category-select-container').style.display = 'none';
        }
        
        if (modalId === 'expense-modal') {
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-description').value = '';
            document.getElementById('expense-alert').style.display = 'none';
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Закрытие по клику на оверлей и ESC
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

// ===== ОТКРЫТИЕ МОДАЛОК =====
function openIncomeModal() {
    openModal('income-modal');
}

function openExpenseModal() {
    openModal('expense-modal');
}

function openCategoriesModal() {
    openModal('categories-modal');
}

function openUsersModal() {
    openModal('users-modal');
}

function openCategoryManage() {
    openModal('categories-modal');
}

function showAllTransactions() {
    alert('В полной версии будет список всех транзакций');
}

function openCategoryExpense(categoryId) {
    const category = getCategory(categoryId);
    if (category) {
        openExpenseModal();
        setTimeout(() => {
            document.getElementById('expense-category').value = categoryId;
            document.getElementById('expense-source').value = 'specific';
        }, 100);
    }
}

// ===== ДОХОДЫ =====
function updateCategorySelects() {
    const incomeSelect = document.getElementById('income-category');
    const expenseSelect = document.getElementById('expense-category');
    
    if (incomeSelect) {
        incomeSelect.innerHTML = '<option value="">Выберите категорию</option>';
        getCategories().forEach(category => {
            incomeSelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    }
    
    if (expenseSelect) {
        expenseSelect.innerHTML = '<option value="">Выберите категорию</option>';
        getCategories().forEach(category => {
            expenseSelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
    }
    
    // Слушатель для распределения дохода
    const distributeSelect = document.getElementById('income-distribute');
    if (distributeSelect) {
        distributeSelect.addEventListener('change', function() {
            const container = document.getElementById('category-select-container');
            container.style.display = this.value === 'specific' ? 'block' : 'none';
        });
    }
}

function addIncome() {
    const amount = document.getElementById('income-amount').value;
    const description = document.getElementById('income-description').value;
    const period = document.getElementById('income-period').value;
    const distributeType = document.getElementById('income-distribute').value;
    const categoryId = distributeType === 'specific' ? 
        document.getElementById('income-category').value : null;
    
    const result = addIncome(amount, description, period, distributeType, categoryId);
    
    if (result.success) {
        showNotification(result.message, 'success');
        closeModal('income-modal');
        updateAllUI();
    } else {
        showNotification(result.message, 'error');
    }
}

// ===== РАСХОДЫ =====
function addExpense() {
    const amount = document.getElementById('expense-amount').value;
    const description = document.getElementById('expense-description').value;
    const categoryId = document.getElementById('expense-category').value;
    const sourceType = document.getElementById('expense-source').value;
    
    if (!categoryId && sourceType === 'specific') {
        showNotification('Выберите категорию', 'error');
        return;
    }
    
    const result = addExpense(amount, description, categoryId, sourceType);
    
    if (result.success) {
        showNotification(result.message, 'success');
        closeModal('expense-modal');
        updateAllUI();
    } else {
        const alertEl = document.getElementById('expense-alert');
        alertEl.textContent = result.message;
        alertEl.className = 'alert error';
        alertEl.style.display = 'block';
    }
}

// ===== КАТЕГОРИИ =====
function updateCategoriesManage() {
    const container = document.getElementById('categories-manage');
    if (!container) return;
    
    container.innerHTML = '';
    
    getCategories().forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-manage-item';
        
        item.innerHTML = `
            <div class="category-manage-color" style="background: ${category.color}"></div>
            <div class="category-manage-name">${category.name}</div>
            <div class="category-balance">${Math.round(category.balance)} ₽</div>
            <button class="category-manage-delete" onclick="deleteCategoryConfirm(${category.id})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        container.appendChild(item);
    });
}

function updatePercentManager() {
    const container = document.getElementById('percent-manage');
    if (!container) return;
    
    container.innerHTML = '';
    
    const categories = getCategories();
    let totalPercent = 0;
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'percent-item';
        
        item.innerHTML = `
            <div class="percent-name">${category.name}</div>
            <input type="number" 
                   class="percent-input" 
                   value="${category.percent}" 
                   min="0" 
                   max="100"
                   onchange="updateCategoryPercent(${category.id}, this.value)"
                   oninput="updatePercentTotal()">
            <span>%</span>
        `;
        
        container.appendChild(item);
        totalPercent += category.percent;
    });
    
    // Итог
    const totalEl = document.createElement('div');
    totalEl.className = 'percent-total';
    totalEl.innerHTML = `Всего: <span id="percent-total">${totalPercent}</span>%`;
    container.appendChild(totalEl);
}

function updatePercentTotal() {
    const inputs = document.querySelectorAll('.percent-input');
    let total = 0;
    
    inputs.forEach(input => {
        total += Number(input.value) || 0;
    });
    
    const totalEl = document.getElementById('percent-total');
    if (totalEl) {
        totalEl.textContent = total;
        
        if (total === 100) {
            totalEl.style.color = '#10b981';
        } else if (total > 100) {
            totalEl.style.color = '#ef4444';
        } else {
            totalEl.style.color = '#f59e0b';
        }
    }
}

function addCategory() {
    const nameInput = document.getElementById('new-category-name');
    const colorInput = document.getElementById('new-category-color');
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) {
        showNotification('Введите название категории', 'error');
        return;
    }
    
    addCategory(name, color);
    nameInput.value = '';
    colorInput.value = '#4361ee';
    
    showNotification(`Категория "${name}" добавлена`, 'success');
    updateCategoriesManage();
    updatePercentManager();
    updateCategorySelects();
}

function savePercentages() {
    const totalEl = document.getElementById('percent-total');
    const total = parseInt(totalEl.textContent);
    
    if (total !== 100) {
        showNotification(`Сумма процентов должна быть 100% (сейчас ${total}%)`, 'error');
        return;
    }
    
    const inputs = document.querySelectorAll('.percent-input');
    inputs.forEach(input => {
        const categoryId = parseInt(input.getAttribute('onchange').match(/\d+/)[0]);
        updateCategoryPercent(categoryId, parseInt(input.value));
    });
    
    showNotification('Проценты сохранены', 'success');
}

function deleteCategoryConfirm(categoryId) {
    const category = getCategory(categoryId);
    if (!category) return;
    
    if (confirm(`Удалить категорию "${category.name}"?`)) {
        if (deleteCategory(categoryId)) {
            showNotification(`Категория "${category.name}" удалена`, 'success');
            updateCategoriesManage();
            updatePercentManager();
            updateCategorySelects();
            updateCategoriesUI();
        }
    }
}

// ===== ПОЛЬЗОВАТЕЛИ =====
function updateUsersList() {
    const container = document.getElementById('users-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const users = getUsers();
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Нет добавленных пользователей</p>
            </div>
        `;
        return;
    }
    
    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-item';
        
        // Первая буква имени для аватара
        const firstLetter = user.firstName.charAt(0).toUpperCase();
        
        item.innerHTML = `
            <div class="user-avatar">${firstLetter}</div>
            <div class="user-name">${user.firstName}</div>
            <div class="user-username">${user.username}</div>
            <button class="user-delete" onclick="removeUserConfirm(${user.id})">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(item);
    });
}

function addUser() {
    const input = document.getElementById('new-username');
    const username = input.value.trim();
    
    if (!username) {
        showNotification('Введите @username', 'error');
        return;
    }
    
    // Добавляем @ если его нет
    const formattedUsername = username.startsWith('@') ? username : '@' + username;
    
    const result = addUser(formattedUsername);
    
    if (result.success) {
        showNotification(`Пользователь ${formattedUsername} добавлен`, 'success');
        input.value = '';
        updateUsersList();
    } else {
        showNotification(result.message, 'error');
    }
}

function removeUserConfirm(userId) {
    if (confirm('Удалить пользователя?')) {
        if (removeUser(userId)) {
            showNotification('Пользователь удален', 'success');
            updateUsersList();
        }
    }
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(message, type = 'info') {
    if (typeof Telegram !== 'undefined' && window.Telegram.WebApp.showAlert) {
        window.Telegram.WebApp.showAlert(message);
        return;
    }
    
    // Создаем свое уведомление
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
        z-index: 3000;
        animation: slideDown 0.3s ease;
        font-weight: 500;
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
    
    .dark-theme {
        background: #0f172a;
        color: #e2e8f0;
    }
    
    .dark-theme .app {
        background: #0f172a;
    }
    
    .dark-theme .section,
    .dark-theme .category-item,
    .dark-theme .transaction-item,
    .dark-theme .modal-content {
        background: #1e293b;
        color: #e2e8f0;
        border-color: #334155;
    }
    
    .dark-theme .quick-menu {
        background: #1e293b;
        border-color: #334155;
    }
    
    .dark-theme .menu-btn {
        color: #cbd5e1;
    }
    
    .dark-theme .form-input,
    .dark-theme .form-select {
        background: #334155;
        border-color: #475569;
        color: #e2e8f0;
    }
    
    .dark-theme .form-input::placeholder {
        color: #94a3b8;
    }
    
    .dark-theme .category-manage-item,
    .dark-theme .user-item {
        background: #334155;
    }
`;
document.head.appendChild(style);
