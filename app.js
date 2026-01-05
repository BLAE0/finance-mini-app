// Telegram Web App
let tg = null;
if (typeof Telegram !== 'undefined') {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
}

// График (Chart.js)
let statsChart = null;

// Обновление интерфейса
function updateUI() {
    const data = getData();
    
    document.querySelector('.total-amount').textContent = `${data.totalBalance} ${data.settings.currency}`;
    
    document.getElementById('partner1-balance').textContent = `${Math.round(data.partners.Таня || 0)} ${data.settings.currency}`;
    document.getElementById('partner2-balance').textContent = `${Math.round(data.partners.Саша || 0)} ${data.settings.currency}`;
    
    renderTemplate();
}

// Рендер шаблона
function renderTemplate() {
    const data = getData();
    const container = document.getElementById('template-list');
    container.innerHTML = '';
    
    data.template.forEach(item => {
        const div = document.createElement('div');
        div.className = 'template-item';
        div.style.cssText = 'padding: 10px; margin: 5px 0; background: #f8fafc; border-radius: 10px;';
        div.innerHTML = `
            <strong>${item.category}</strong> 
            <span style="float: right; color: #4f46e5;">${item.percent}% → ${item.person}</span>
        `;
        container.appendChild(div);
    });
}

// Модальные окна
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Доход
function openIncomeModal() {
    document.getElementById('income-amount').value = '';
    document.getElementById('income-description').value = '';
    openModal('income-modal');
}

function submitIncome() {
    const amount = document.getElementById('income-amount').value;
    const description = document.getElementById('income-description').value;
    
    if (!amount || isNaN(amount) || amount <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    addIncome(Number(amount), description);
    closeModal('income-modal');
    
    if (tg && tg.showAlert) {
        tg.showAlert(`Доход ${amount} ₽ добавлен и распределен по шаблону!`);
    } else {
        alert(`Доход ${amount} ₽ добавлен и распределен по шаблону!`);
    }
}

// Расход
function openExpenseModal() {
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-category').value = '';
    openModal('expense-modal');
}

function submitExpense() {
    const amount = document.getElementById('expense-amount').value;
    const category = document.getElementById('expense-category').value;
    const person = document.getElementById('expense-person').value;
    
    if (!amount || isNaN(amount) || amount <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    if (!category) {
        alert('Введите категорию');
        return;
    }
    
    if (addExpense(Number(amount), category, person)) {
        closeModal('expense-modal');
        
        if (tg && tg.showAlert) {
            tg.showAlert(`Расход ${amount} ₽ добавлен!`);
        } else {
            alert(`Расход ${amount} ₽ добавлен!`);
        }
    } else {
        alert('Недостаточно средств!');
    }
}

// Редактирование шаблона
function openTemplateModal() {
    const data = getData();
    const container = document.getElementById('template-edit-list');
    container.innerHTML = '';
    
    data.template.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'template-edit-row';
        row.innerHTML = `
            <input type="text" value="${item.category}" placeholder="Категория" class="template-category">
            <input type="number" value="${item.percent}" placeholder="%" min="1" max="100" class="template-percent">
            <select class="template-person">
                <option value="Таня" ${item.person === 'Таня' ? 'selected' : ''}>Таня</option>
                <option value="Саша" ${item.person === 'Саша' ? 'selected' : ''}>Саша</option>
            </select>
            <button onclick="removeTemplateRow(${index})">×</button>
        `;
        container.appendChild(row);
    });
    
    openModal('template-modal');
}

function addTemplateRow() {
    const container = document.getElementById('template-edit-list');
    const row = document.createElement('div');
    row.className = 'template-edit-row';
    row.innerHTML = `
        <input type="text" placeholder="Категория" class="template-category">
        <input type="number" placeholder="%" min="1" max="100" class="template-percent">
        <select class="template-person">
            <option value="Таня">Таня</option>
            <option value="Саша">Саша</option>
        </select>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(row);
}

function removeTemplateRow(index) {
    const data = getData();
    data.template.splice(index, 1);
    saveData(data);
    openTemplateModal();
}

function saveTemplate() {
    const rows = document.querySelectorAll('.template-edit-row');
    const newTemplate = [];
    let totalPercent = 0;
    
    rows.forEach(row => {
        const category = row.querySelector('.template-category').value;
        const percent = parseInt(row.querySelector('.template-percent').value);
        const person = row.querySelector('.template-person').value;
        
        if (category && percent && person) {
            newTemplate.push({ category, percent, person });
            totalPercent += percent;
        }
    });
    
    if (totalPercent !== 100) {
        alert(`Сумма процентов должна быть 100% (сейчас ${totalPercent}%).`);
        return;
    }
    
    const data = getData();
    data.template = newTemplate;
    saveData(data);
    
    closeModal('template-modal');
    updateUI();
    
    alert('Шаблон обновлен!');
}

// Статистика с графиком
function openStatsModal() {
    openModal('stats-modal');
    renderStatsChart('day');
}

function changeStatsPeriod(period) {
    document.querySelectorAll('.btn-period').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderStatsChart(period);
}

function renderStatsChart(period) {
    const ctx = document.getElementById('stats-chart').getContext('2d');
    const data = getData();
    
    if (statsChart) {
        statsChart.destroy();
    }
    
    const now = new Date();
    let filteredTransactions = data.transactions;
    
    if (period === 'day') {
        filteredTransactions = data.transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.toDateString() === now.toDateString();
        });
    } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredTransactions = data.transactions.filter(t => new Date(t.date) >= weekAgo);
    }
    
    const categories = {};
    filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        }
    });
    
    if (Object.keys(categories).length === 0) {
        document.getElementById('stats-chart').style.display = 'none';
        const noData = document.createElement('p');
        noData.textContent = 'Нет данных за выбранный период';
        noData.style.textAlign = 'center';
        document.querySelector('#stats-modal .modal-content').appendChild(noData);
        return;
    }
    
    document.getElementById('stats-chart').style.display = 'block';
    
    statsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6',
                    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
                ],
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
}

// История транзакций
function openTransactionsModal() {
    const data = getData();
    const container = document.getElementById('transactions-list');
    container.innerHTML = '';
    
    if (data.transactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">Нет операций</p>';
    } else {
        const sorted = [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sorted.forEach(transaction => {
            const div = document.createElement('div');
            div.className = `transaction-item ${transaction.type}`;
            
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            if (transaction.type === 'income') {
                div.innerHTML = `
                    <div class="transaction-amount income">+${transaction.amount} ${data.settings.currency}</div>
                    <div class="transaction-info">
                        <div class="transaction-category">${transaction.description || 'Доход'}</div>
                        <div class="transaction-date">${formattedDate}</div>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="transaction-amount expense">-${transaction.amount} ${data.settings.currency}</div>
                    <div class="transaction-info">
                        <div class="transaction-category">${transaction.category} (${transaction.person})</div>
                        <div class="transaction-date">${formattedDate}</div>
                    </div>
                `;
            }
            
            container.appendChild(div);
        });
    }
    
    openModal('transactions-modal');
}

// Общий доступ
function openPartnerModal() {
    const data = getData();
    const statusDiv = document.getElementById('partner-status');
    const inviteSection = document.getElementById('partner-invite-section');
    const joinSection = document.getElementById('partner-join-section');
    
    if (data.sharedAccess.enabled) {
        statusDiv.innerHTML = `
            <div class="partner-status connected">
                <h4>✅ Общий доступ активен</h4>
                <p>Синхронизировано с партнером</p>
                <p><small>Последняя синхронизация: ${formatDate(data.sharedAccess.lastSync)}</small></p>
                <button class="btn btn-expense btn-small" onclick="disableSharing()">Отключить</button>
            </div>
        `;
        inviteSection.style.display = 'none';
        joinSection.style.display = 'none';
    } else {
        statusDiv.innerHTML = `
            <div class="partner-status disconnected">
                <h4>🔗 Пригласить партнера</h4>
                <p>Дайте доступ к данным вашему партнеру</p>
            </div>
        `;
        
        if (data.userInfo.telegramId) {
            const code = getPartnerCode();
            if (code) {
                document.getElementById('partner-code-input').value = code;
                inviteSection.style.display = 'block';
                joinSection.style.display = 'none';
            }
        } else {
            inviteSection.style.display = 'none';
            joinSection.style.display = 'block';
        }
    }
    
    openModal('partner-modal');
}

function copyPartnerCode() {
    const codeInput = document.getElementById('partner-code-input');
    codeInput.select();
    document.execCommand('copy');
    showNotification('Код скопирован в буфер', 'success');
}

function joinPartner() {
    const code = document.getElementById('partner-join-input').value;
    if (!code) {
        showNotification('Введите код приглашения', 'warning');
        return;
    }
    
    const partnerData = decodePartnerCode(code);
    if (!partnerData) {
        showNotification('Неверный код приглашения', 'error');
        return;
    }
    
    enablePartnerSharing(partnerData.userId);
    showNotification(`Вы присоединились к ${partnerData.userName}`, 'success');
    closeModal('partner-modal');
    updateUI();
}

function disableSharing() {
    if (confirm('Отключить общий доступ?')) {
        disablePartnerSharing();
        showNotification('Общий доступ отключен', 'success');
        closeModal('partner-modal');
        updateUI();
    }
}

// Резервная копия
function openBackupModal() {
    const exportDataText = exportData();
    document.getElementById('export-data').value = exportDataText;
    document.getElementById('import-data').value = '';
    openModal('backup-modal');
}

function copyExportData() {
    const exportTextarea = document.getElementById('export-data');
    exportTextarea.select();
    document.execCommand('copy');
    showNotification('Данные скопированы в буфер', 'success');
}

function downloadBackup() {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Файл скачан', 'success');
}

function importBackup() {
    const jsonData = document.getElementById('import-data').value;
    if (!jsonData) {
        showNotification('Введите данные для импорта', 'warning');
        return;
    }
    
    if (confirm('Это заменит все текущие данные. Продолжить?')) {
        const result = importData(jsonData);
        if (result.success) {
            showNotification(result.message, 'success');
            closeModal('backup-modal');
        } else {
            showNotification(result.message, 'error');
        }
    }
}

function resetMonthData() {
    if (confirm('ВСЕ транзакции и балансы будут обнулены. Продолжить?')) {
        resetMonthlyData();
        showNotification('Данные месяца сброшены', 'success');
        closeModal('backup-modal');
    }
}

// Настройки
function openSettingsModal() {
    const data = getData();
    document.getElementById('setting-notifications').checked = data.settings.notifications;
    document.getElementById('setting-monthly-reset').checked = data.settings.monthlyReset;
    document.getElementById('setting-currency').value = data.settings.currency;
    openModal('settings-modal');
}

function saveSettings() {
    const data = getData();
    data.settings.notifications = document.getElementById('setting-notifications').checked;
    data.settings.monthlyReset = document.getElementById('setting-monthly-reset').checked;
    data.settings.currency = document.getElementById('setting-currency').value;
    saveData(data);
    showNotification('Настройки сохранены', 'success');
    closeModal('settings-modal');
    updateUI();
}

// Уведомления
function showNotification(message, type = 'info') {
    if (tg && tg.showAlert) {
        tg.showAlert(message);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div>${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Вспомогательные функции
function formatDate(dateString) {
    if (!dateString) return 'никогда';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Проверка напоминаний
function checkAndShowReminders() {
    const data = getData();
    if (data.settings.notifications) {
        const reminder = checkReminders();
        if (reminder) {
            showNotification(reminder.message, 'warning');
        }
    }
}

// Запуск
document.addEventListener('DOMContentLoaded', function() {
    updateUI();
    
    setTimeout(checkAndShowReminders, 2000);
    
    setTimeout(() => {
        const data = getData();
        if (data.userInfo.name && data.userInfo.name !== 'Пользователь') {
            document.querySelector('header h1').innerHTML = 
                `💰 Финансовый помощник <small style="font-size: 14px; opacity: 0.8;">(${data.userInfo.name})</small>`;
        }
    }, 1000);
});
