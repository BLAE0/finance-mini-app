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
    
    // Общий баланс
    document.querySelector('.total-amount').textContent = `${data.totalBalance} ₽`;
    
    // Балансы партнеров
    document.getElementById('partner1-balance').textContent = `${Math.round(data.partners.Таня || 0)} ₽`;
    document.getElementById('partner2-balance').textContent = `${Math.round(data.partners.Саша || 0)} ₽`;
    
    // Шаблон
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
    openTemplateModal(); // Перезагружаем модалку
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
    // Активная кнопка
    document.querySelectorAll('.btn-period').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderStatsChart(period);
}

function renderStatsChart(period) {
    const ctx = document.getElementById('stats-chart').getContext('2d');
    const data = getData();
    
    // Уничтожаем старый график
    if (statsChart) {
        statsChart.destroy();
    }
    
    // Фильтруем транзакции по периоду
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
    // month уже по умолчанию все
    
    // Группируем по категориям расходов
    const categories = {};
    filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        }
    });
    
    // Если нет данных
    if (Object.keys(categories).length === 0) {
        document.getElementById('stats-chart').style.display = 'none';
        const noData = document.createElement('p');
        noData.textContent = 'Нет данных за выбранный период';
        noData.style.textAlign = 'center';
        document.querySelector('#stats-modal .modal-content').appendChild(noData);
        return;
    }
    
    document.getElementById('stats-chart').style.display = 'block';
    
    // Создаем график
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
        // Сортируем по дате (новые сверху)
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
                    <div class="transaction-amount income">+${transaction.amount} ₽</div>
                    <div class="transaction-info">
                        <div class="transaction-category">${transaction.description || 'Доход'}</div>
                        <div class="transaction-date">${formattedDate}</div>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="transaction-amount expense">-${transaction.amount} ₽</div>
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

// Запуск
document.addEventListener('DOMContentLoaded', function() {
    updateUI();
    
    // Добавляем кнопку истории
    const statsSection = document.querySelector('#stats-section');
    const historyBtn = document.createElement('button');
    historyBtn.className = 'btn btn-small';
    historyBtn.textContent = '📋 История операций';
    historyBtn.onclick = openTransactionsModal;
    statsSection.querySelector('.stats-buttons').appendChild(historyBtn);
    
    // Меняем обработчик статистики
    document.querySelector('#stats-section .stats-buttons').innerHTML = `
        <button class="btn btn-small" onclick="openStatsModal()">📊 Графики</button>
        <button class="btn btn-small" onclick="openTransactionsModal()">📋 История</button>
    `;
});
