// Telegram Web App
let tg = null;
if (typeof Telegram !== 'undefined') {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
}

// Обновление интерфейса
function updateUI() {
    const data = getData();
    
    // Общий баланс
    document.querySelector('.total-amount').textContent = `${data.totalBalance} ₽`;
    
    // Балансы партнеров
    document.getElementById('partner1-balance').textContent = `${data.partners.Таня || 0} ₽`;
    document.getElementById('partner2-balance').textContent = `${data.partners.Саша || 0} ₽`;
    
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
        div.innerHTML = `
            <strong>${item.category}</strong> 
            <span>${item.percent}% → ${item.person}</span>
        `;
        container.appendChild(div);
    });
}

// Функции модальных окон (заглушки)
function openIncomeModal() {
    const amount = prompt('Введите сумму дохода:');
    if (amount && !isNaN(amount)) {
        addIncome(Number(amount));
        alert(`Доход ${amount} ₽ добавлен и распределен по шаблону!`);
    }
}

function openExpenseModal() {
    const amount = prompt('Введите сумму расхода:');
    if (amount && !isNaN(amount)) {
        const category = prompt('Категория расхода:');
        const person = prompt('Кто потратил? (Таня/Саша):');
        if (category && person) {
            if (addExpense(Number(amount), category, person)) {
                alert('Расход добавлен!');
            } else {
                alert('Недостаточно средств!');
            }
        }
    }
}

function openTemplateModal() {
    alert('Редактирование шаблона - в разработке');
}

function openPartnerModal() {
    alert('Доступ партнеру - в разработке');
}

function showStats(period) {
    const statsDiv = document.getElementById('stats-content');
    statsDiv.innerHTML = `<p>Статистика за ${period === 'day' ? 'день' : 'месяц'} - в разработке</p>`;
}

// Запуск
updateUI();
