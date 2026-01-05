// Финансовый помощник - Основная логика
// ВЕРСИЯ: 3.0 - Полная переработка

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let tg = null;
let currentModal = null;
let expenseChart = null;
let incomeChart = null;

// Инициализация Telegram
if (typeof Telegram !== 'undefined') {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
    
    // Настройка темы
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Слушатель изменения темы
    tg.onEvent('themeChanged', function() {
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    });
    
    // Кнопка "Назад"
    tg.BackButton.onClick(function() {
        if (currentModal) {
            closeModal(currentModal);
        } else {
            tg.close();
        }
    });
}

// ===== ОСНОВНОЙ ИНТЕРФЕЙС =====
function updateUI() {
    updateBalance();
    updateCategories();
    updateRecentTransactions();
    updateUserInfo();
}

function updateBalance() {
    const data = getAppData();
    const total = data.totalBalance || 0;
    document.getElementById('total-balance').textContent = formatCurrency(total);
}

function updateCategories() {
    const data = getAppData();
    const container = document.getElementById('categories-list');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    const categories = data.categories.filter(cat => cat.percent > 0);
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-folder-open"></i>
                <p>Категории не настроены</p>
            </div>
        `;
        return;
    }
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-item';
        
        item.innerHTML = `
            <div class="category-icon" style="background: ${category.color}">
                <i class="${category.icon}"></i>
            </div>
            <div class="category-info">
                <div class="category-name">${category.name}</div>
                <div class="category-details">
                    <span>${category.percent}%</span>
                    <span>•</span>
                    <span>Осталось: ${formatCurrency(category.balance)}</span>
                </div>
            </div>
            <div class="category-amount">
                ${formatCurrency(category.balance)}
            </div>
        `;
        
        container.appendChild(item);
    });
}

function updateRecentTransactions() {
    const data = getAppData();
    const period = data.currentPeriod || 'current';
    const container = document.getElementById('recent-transactions');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    const transactions = getTransactions(period).slice(0, 5);
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-receipt"></i>
                <p>Нет операций</p>
            </div>
        `;
        return;
    }
    
    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        const category = transaction.categoryId ? 
            getCategory(transaction.categoryId) : null;
        
        const icon = category ? category.icon : 
            (transaction.type === 'income' ? 'fas fa-arrow-down' : 'fas fa-arrow-up');
        
        const color = category ? category.color : 
            (transaction.type === 'income' ? '#10b981' : '#ef4444');
        
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        
        item.innerHTML = `
            <div class="transaction-icon" style="background: ${color}">
                <i class="${icon}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">${transaction.description || 'Операция'}</div>
                <div class="transaction-meta">
                    <span>${category ? category.name : (transaction.type === 'income' ? 'Доход' : 'Расход')}</span>
                    <span>•</span>
                    <span>${formatDate(transaction.date)}</span>
                </div>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${amountSign}${formatCurrency(transaction.amount)}
            </div>
        `;
        
        container.appendChild(item);
    });
}

function updateUserInfo() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('user-name').textContent = user.firstName;
        
        const data = getAppData();
        const partnersCount = data.users.filter(u => !u.isCurrent).length;
        
        if (partnersCount > 0) {
            document.getElementById('user-status').textContent = 
                `${partnersCount} партнёр${partnersCount > 1 ? 'а' : ''}`;
        }
    }
}

// ===== МОДАЛЬНЫЕ ОКНА =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        currentModal = modalId;
        document.body.style.overflow = 'hidden';
        
        // Показываем кнопку "Назад" в Telegram
        if (tg) {
            tg.BackButton.show();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        currentModal = null;
        document.body.style.overflow = 'auto';
        
        // Скрываем кнопку "Назад" если нет модалок
        if (tg && !document.querySelector('.modal[style*="display: flex"]')) {
            tg.BackButton.hide();
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    currentModal = null;
    document.body.style.overflow = 'auto';
    
    if (tg) {
        tg.BackButton.hide();
    }
}

// ===== ОПЕРАЦИИ =====
function openAddModal(type) {
    const modal = document.getElementById('add-modal');
    const title = document.getElementById('modal-title');
    const submitBtn = document.getElementById('modal-submit-btn');
    const amountField = document.getElementById('amount');
    const descriptionField = document.getElementById('description');
    const dateField = document.getElementById('date');
    const categorySelect = document.getElementById('category');
    const distributionGroup = document.getElementById('distribution-group');
    const templateGroup = document.getElementById('template-group');
    
    // Сбрасываем поля
    amountField.value = '';
    descriptionField.value = '';
    dateField.valueAsDate = new Date();
    
    // Заполняем категории
    categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    getCategories().forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.name} (${formatCurrency(category.balance)})`;
        categorySelect.appendChild(option);
    });
    
    // Настраиваем в зависимости от типа операции
    if (type === 'income') {
        title.textContent = 'Добавить доход';
        submitBtn.textContent = 'Добавить доход';
        submitBtn.onclick = function() { submitTransaction('income'); };
        
        // Показываем выбор шаблона для доходов
        templateGroup.style.display = 'block';
        distributionGroup.style.display = 'block';
        
        // Заполняем шаблоны
        const templateSelect = document.getElementById('template');
        templateSelect.innerHTML = '<option value="">Без шаблона</option>';
        getTemplates().forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            templateSelect.appendChild(option);
        });
    } else {
        title.textContent = 'Добавить расход';
        submitBtn.textContent = 'Добавить расход';
        submitBtn.onclick = function() { submitTransaction('expense'); };
        
        // Скрываем шаблоны для расходов
        templateGroup.style.display = 'none';
        distributionGroup.style.display = 'block';
    }
    
    openModal('add-modal');
}

function closeAddModal() {
    closeModal('add-modal');
}

function submitTransaction(type) {
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value.trim();
    const categoryId = parseInt(document.getElementById('category').value);
    const date = document.getElementById('date').value;
    const distribution = document.querySelector('input[name="distribution"]:checked')?.value;
    const templateId = type === 'income' ? parseInt(document.getElementById('template').value) : null;
    
    // Валидация
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    if (!description) {
        showNotification('Введите описание', 'error');
        return;
    }
    
    if (type === 'expense' && distribution === 'specific' && !categoryId) {
        showNotification('Выберите категорию для расхода', 'error');
        return;
    }
    
    try {
        const category = categoryId ? getCategory(categoryId) : null;
        
        addTransaction(type, amount, {
            description: description,
            categoryId: categoryId,
            categoryName: category ? category.name : null,
            date: date,
            distribution: distribution,
            templateId: templateId
        });
        
        closeAddModal();
        showNotification(
            `${type === 'income' ? 'Доход' : 'Расход'} добавлен`,
            'success'
        );
        
        updateUI();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===== ПЕРЕВОД =====
function openTransferModal() {
    showNotification('Функция перевода в разработке', 'info');
}

// ===== ПАРТНЁРЫ =====
function openPartnersModal() {
    const container = document.getElementById('partners-list');
    const data = getAppData();
    
    container.innerHTML = '';
    
    // Показываем текущего пользователя
    const currentUser = getCurrentUser();
    if (currentUser) {
        const item = document.createElement('div');
        item.className = 'partner-item';
        item.innerHTML = `
            <div class="partner-avatar">
                <i class="fas fa-crown"></i>
            </div>
            <div class="partner-info">
                <div class="partner-name">${currentUser.firstName} (Вы)</div>
                <div class="partner-status">Владелец</div>
            </div>
        `;
        container.appendChild(item);
    }
    
    // Показываем партнёров
    data.users.filter(u => !u.isCurrent).forEach(user => {
        const item = document.createElement('div');
        item.className = 'partner-item';
        item.innerHTML = `
            <div class="partner-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="partner-info">
                <div class="partner-name">${user.username}</div>
                <div class="partner-status">Партнёр</div>
            </div>
            <button class="btn-small" onclick="removePartner(${user.id})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(item);
    });
    
    // Обновляем ссылку для приглашения
    document.getElementById('share-link').value = getShareLink();
    
    openModal('partners-modal');
}

function addPartner() {
    const usernameInput = document.getElementById('partner-username');
    const username = usernameInput.value.trim();
    
    if (!username) {
        showNotification('Введите username', 'error');
        return;
    }
    
    try {
        addPartner(username);
        usernameInput.value = '';
        showNotification('Партнёр добавлен', 'success');
        openPartnersModal(); // Перезагружаем модалку
        updateUI();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function copyShareLink() {
    const linkInput = document.getElementById('share-link');
    linkInput.select();
    document.execCommand('copy');
    showNotification('Ссылка скопирована', 'success');
}

// ===== СТАТИСТИКА =====
function openStatsModal() {
    updateStats('month');
    openModal('stats-modal');
}

function updateStats(period) {
    const stats = getStats(period);
    
    // Обновляем суммы
    document.getElementById('total-income').textContent = formatCurrency(stats.totalIncome);
    document.getElementById('total-expense').textContent = formatCurrency(stats.totalExpense);
    document.getElementById('total-balance-stat').textContent = formatCurrency(stats.balance);
    
    // Обновляем кнопки периода
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });
    
    // Строим графики
    updateCharts(stats);
}

function updateCharts(stats) {
    const expensesCtx = document.getElementById('expenses-chart').getContext('2d');
    const incomeCtx = document.getElementById('income-chart').getContext('2d');
    
    // Уничтожаем старые графики
    if (expenseChart) expenseChart.destroy();
    if (incomeChart) incomeChart.destroy();
    
    // Данные для графика расходов по категориям
    const expenseCategories = stats.categories.filter(cat => cat.spent > 0);
    
    expenseChart = new Chart(expensesCtx, {
        type: 'doughnut',
        data: {
            labels: expenseCategories.map(cat => cat.name),
            datasets: [{
                data: expenseCategories.map(cat => cat.spent),
                backgroundColor: expenseCategories.map(cat => cat.color),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Расходы по категориям'
                }
            }
        }
    });
    
    // Данные для графика доходов/расходов
    incomeChart = new Chart(incomeCtx, {
        type: 'bar',
        data: {
            labels: ['Доходы', 'Расходы'],
            datasets: [{
                label: 'Сумма',
                data: [stats.totalIncome, stats.totalExpense],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Доходы vs Расходы'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// ===== КАТЕГОРИИ =====
function openCategoriesModal() {
    const container = document.getElementById('categories-edit-list');
    const categories = getCategories();
    
    container.innerHTML = '';
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-edit-item';
        item.innerHTML = `
            <input type="text" class="category-edit-input" value="${category.name}" 
                   onchange="updateCategoryName(${category.id}, this.value)">
            <input type="number" class="category-edit-percent" value="${category.percent}" min="0" max="100"
                   onchange="updateCategoryPercent(${category.id}, this.value)">
            <div class="category-icon" style="background: ${category.color}; width: 36px; height: 36px;">
                <i class="${category.icon}"></i>
            </div>
            <button class="remove-category" onclick="deleteCategoryConfirm(${category.id})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(item);
    });
    
    openModal('categories-modal');
}

function updateCategoryName(id, name) {
    if (name.trim()) {
        updateCategory(id, { name: name.trim() });
    }
}

function updateCategoryPercent(id, percent) {
    percent = parseInt(percent) || 0;
    if (percent >= 0 && percent <= 100) {
        updateCategory(id, { percent: percent });
    }
}

function addCategory() {
    const nameInput = document.getElementById('new-category-name');
    const percentInput = document.getElementById('new-category-percent');
    
    const name = nameInput.value.trim();
    const percent = parseInt(percentInput.value) || 0;
    
    if (!name) {
        showNotification('Введите название категории', 'error');
        return;
    }
    
    if (percent < 0 || percent > 100) {
        showNotification('Процент должен быть от 0 до 100', 'error');
        return;
    }
    
    addCategory(name, percent);
    
    nameInput.value = '';
    percentInput.value = '';
    
    showNotification('Категория добавлена', 'success');
    openCategoriesModal(); // Перезагружаем модалку
}

function deleteCategoryConfirm(id) {
    if (confirm('Удалить категорию? Все связанные операции останутся, но баланс будет распределён.')) {
        deleteCategory(id);
        showNotification('Категория удалена', 'success');
        openCategoriesModal(); // Перезагружаем модалку
    }
}

function saveCategories() {
    // Просто закрываем модалку, изменения уже сохранены
    closeModal('categories-modal');
    updateUI();
}

// ===== ШАБЛОНЫ =====
function openTemplatesModal() {
    const container = document.getElementById('templates-list');
    const editContainer = document.getElementById('template-categories-edit');
    const templates = getTemplates();
    
    // Показываем список шаблонов
    container.innerHTML = '';
    templates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <div class="category-icon" style="background: #8b5cf6">
                <i class="fas fa-layer-group"></i>
            </div>
            <div class="category-info">
                <div class="category-name">${template.name}</div>
                <div class="category-details">
                    <span>${template.categories.length} категорий</span>
                </div>
            </div>
            <button class="btn-small" onclick="applyTemplate(${template.id})">
                Применить
            </button>
        `;
        container.appendChild(item);
    });
    
    // Показываем текущие категории для создания шаблона
    editContainer.innerHTML = '';
    getCategories().forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-edit-item';
        item.innerHTML = `
            <span>${category.name}</span>
            <input type="number" class="category-edit-percent" 
                   id="template-percent-${category.id}" 
                   value="${category.percent}" min="0" max="100">
        `;
        editContainer.appendChild(item);
    });
    
    openModal('templates-modal');
}

function createTemplate() {
    const nameInput = document.getElementById('template-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        showNotification('Введите название шаблона', 'error');
        return;
    }
    
    const categories = getCategories().map(category => {
        const percentInput = document.getElementById(`template-percent-${category.id}`);
        return {
            id: category.id,
            percent: parseInt(percentInput.value) || 0
        };
    });
    
    // Проверяем, что сумма процентов = 100
    const totalPercent = categories.reduce((sum, cat) => sum + cat.percent, 0);
    if (totalPercent !== 100) {
        showNotification(`Сумма процентов должна быть 100% (сейчас ${totalPercent}%)`, 'error');
        return;
    }
    
    createTemplate(name, categories);
    nameInput.value = '';
    
    showNotification('Шаблон создан', 'success');
    openTemplatesModal(); // Перезагружаем модалку
}

function applyTemplate(templateId) {
    const amount = prompt('Введите сумму для распределения по шаблону:');
    if (!amount || isNaN(amount) || amount <= 0) {
        return;
    }
    
    try {
        applyTemplate(templateId, parseFloat(amount));
        closeModal('templates-modal');
        showNotification('Доход распределён по шаблону', 'success');
        updateUI();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===== НАСТРОЙКИ =====
function openSettings() {
    const data = getAppData();
    
    // Устанавливаем текущие настройки
    document.getElementById('currency-select').value = data.currency || '₽';
    document.getElementById('notifications-toggle').checked = data.settings.notifications;
    
    openModal('settings-modal');
}

function saveSettings() {
    const currency = document.getElementById('currency-select').value;
    const notifications = document.getElementById('notifications-toggle').checked;
    
    updateAppData(data => {
        data.currency = currency;
        data.settings.notifications = notifications;
    });
    
    closeModal('settings-modal');
    showNotification('Настройки сохранены', 'success');
    updateUI();
}

// ===== ИСТОРИЯ ОПЕРАЦИЙ =====
function showAllTransactions() {
    const container = document.getElementById('all-transactions');
    const period = getCurrentPeriod();
    const transactions = getTransactions(period);
    
    container.innerHTML = '';
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-receipt"></i>
                <p>Нет операций за выбранный период</p>
            </div>
        `;
    } else {
        transactions.forEach(transaction => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            
            const category = transaction.categoryId ? 
                getCategory(transaction.categoryId) : null;
            
            const icon = category ? category.icon : 
                (transaction.type === 'income' ? 'fas fa-arrow-down' : 'fas fa-arrow-up');
            
            const color = category ? category.color : 
                (transaction.type === 'income' ? '#10b981' : '#ef4444');
            
            const amountClass = transaction.type === 'income' ? 'income' : 'expense';
            const amountSign = transaction.type === 'income' ? '+' : '-';
            
            item.innerHTML = `
                <div class="transaction-icon" style="background: ${color}">
                    <i class="${icon}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.description || 'Операция'}</div>
                    <div class="transaction-meta">
                        <span>${category ? category.name : (transaction.type === 'income' ? 'Доход' : 'Расход')}</span>
                        <span>•</span>
                        <span>${formatDate(transaction.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}${formatCurrency(transaction.amount)}
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    openModal('transactions-modal');
}

function filterTransactions() {
    // Будет реализовано в будущих обновлениях
    showNotification('Фильтрация в разработке', 'info');
}

// ===== ЭКСПОРТ/ИМПОРТ =====
function openBackupModal() {
    const exportData = exportData();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Данные экспортированы', 'success');
}

function exportData() {
    const data = getAppData();
    return JSON.stringify(data, null, 2);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const result = importData(e.target.result);
            if (result.success) {
                showNotification(result.message, 'success');
                updateUI();
            } else {
                showNotification(result.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function resetData() {
    if (confirm('ВНИМАНИЕ! Это удалит ВСЕ данные: транзакции, категории, партнёров. Продолжить?')) {
        localStorage.removeItem('financeApp');
        initAppData();
        updateUI();
        showNotification('Все данные сброшены', 'success');
    }
}

// ===== УТИЛИТЫ =====
function changePeriod(period) {
    setCurrentPeriod(period);
    updateUI();
}

function showNotification(message, type = 'info') {
    // Если в Telegram, используем их алерт
    if (tg && tg.showAlert) {
        tg.showAlert(message);
        return;
    }
    
    // Иначе показываем своё уведомление
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification';
    
    // Цвет в зависимости от типа
    if (type === 'error') {
        notification.style.borderLeftColor = '#ef4444';
    } else if (type === 'success') {
        notification.style.borderLeftColor = '#10b981';
    } else {
        notification.style.borderLeftColor = '#3b82f6';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function formatCurrency(amount) {
    return formatCurrency(amount);
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем данные
    if (typeof initAppData === 'function') {
        initAppData();
    }
    
    // Обновляем UI
    updateUI();
    
    // Устанавливаем сегодняшнюю дату по умолчанию
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById('date');
    if (dateField) {
        dateField.value = today;
        dateField.max = today;
    }
    
    // Назначаем обработчики для кнопок периода в статистике
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            updateStats(this.dataset.period);
        });
    });
    
    // Назначаем обработчики для модалок
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
    
    // Показываем приветствие
    setTimeout(() => {
        showNotification('Добро пожаловать в Финансы в паре! 💰', 'info');
    }, 1000);
});
