// Инициализация данных в localStorage
function initData() {
    if (!localStorage.getItem('financeData')) {
        const defaultData = {
            totalBalance: 0,
            partners: {
                Таня: 0,
                Саша: 0
            },
            template: [
                { category: "Коммуналка", percent: 40, person: "Таня" },
                { category: "Озон", percent: 15, person: "Таня" },
                { category: "Продукты", percent: 25, person: "Таня" },
                { category: "Машина", percent: 20, person: "Саша" }
            ],
            transactions: [],
            sharedAccess: {
                enabled: false,
                partnerId: null,
                lastSync: null
            },
            settings: {
                notifications: true,
                currency: '₽',
                monthlyReset: false
            },
            userInfo: {
                telegramId: null,
                name: 'Пользователь'
            }
        };
        localStorage.setItem('financeData', JSON.stringify(defaultData));
    }
    
    // Получаем данные Telegram пользователя
    initTelegramUser();
}

// Инициализация пользователя Telegram
function initTelegramUser() {
    let data = getData();
    
    if (typeof Telegram !== 'undefined') {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        if (user) {
            data.userInfo.telegramId = user.id;
            data.userInfo.name = user.first_name || 'Пользователь';
            
            // Если у нас есть доступ к партнеру, проверяем синхронизацию
            if (data.sharedAccess.enabled && data.sharedAccess.partnerId) {
                checkPartnerSync();
            }
            
            saveData(data);
        }
    }
}

// Получить все данные
function getData() {
    return JSON.parse(localStorage.getItem('financeData')) || {};
}

// Сохранить данные
function saveData(data) {
    localStorage.setItem('financeData', JSON.stringify(data));
}

// Добавить доход

function addIncome(amount, description = 'Доход') {
    let data = getData();
    data.totalBalance += amount;
    
    // Распределить по шаблону
    data.template.forEach(item => {
        const share = (amount * item.percent) / 100;
        data.partners[item.person] = (data.partners[item.person] || 0) + share;
    });

    // Добавить транзакцию
    data.transactions.push({
        type: 'income',
        amount: amount,
        date: new Date().toISOString(),
        description: description
    });

    saveData(data);
    updateUI();
}

// Добавить расход
function addExpense(amount, category, person) {
    let data = getData();
    if (data.totalBalance >= amount) {
        data.totalBalance -= amount;
        data.partners[person] = (data.partners[person] || 0) - amount;
        
        data.transactions.push({
            type: 'expense',
            amount: amount,
            category: category,
            person: person,
            date: new Date().toISOString()
        });

        saveData(data);
        updateUI();
        return true;
    }
    return false;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initData();
    updateUI();
});
