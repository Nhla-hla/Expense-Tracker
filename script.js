const STORAGE_KEY = "nh_expense_tracker_v1";

const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");

const monthLabel = document.getElementById("month-label");
const monthIncomeEl = document.getElementById("month-income");
const monthExpenseEl = document.getElementById("month-expense");

const form = document.getElementById("transaction-form");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const descriptionInput = document.getElementById("description");
const transactionList = document.getElementById("transaction-list");
const noTransEl = document.getElementById("no-trans");

const clearAllBtn = document.getElementById("clear-all");

let transactions = [];

let pieChart = null;

function formatCurrency(value){
  return "R" + Number(value).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  transactions = raw ? JSON.parse(raw) : [];
}

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function renderDashboard(){
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  incomeEl.textContent = formatCurrency(income);
  expenseEl.textContent = formatCurrency(expense);
  balanceEl.textContent = formatCurrency(balance);
}

function renderList(){
  transactionList.innerHTML = "";
  if(transactions.length === 0){
    noTransEl.style.display = "block";
    return;
  } else {
    noTransEl.style.display = "none";
  }

  const sorted = [...transactions].sort((a,b) => b.date - a.date);

  sorted.forEach(tx => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    const left = document.createElement("div");
    left.className = "tx-left";

    const cat = document.createElement("div");
    cat.className = "tx-category";
    cat.textContent = tx.category;

    const desc = document.createElement("div");
    desc.className = "tx-desc";
    desc.innerHTML = `<div>${tx.description || ""}</div><small class="muted">${new Date(tx.date).toLocaleString()}</small>`;

    left.appendChild(cat);
    left.appendChild(desc);

    const right = document.createElement("div");
    right.className = "tx-right";

    const amount = document.createElement("div");
    amount.className = "tx-amount " + (tx.type === "expense" ? "negative" : "positive");
    amount.textContent = (tx.type === "expense" ? "-" : "+") + formatCurrency(tx.amount).slice(1);

    const actions = document.createElement("div");
    actions.className = "tx-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.title = "Edit";
    editBtn.innerHTML = "✎";
    editBtn.onclick = () => editTransaction(tx.id);

    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.title = "Delete";
    delBtn.innerHTML = "🗑";
    delBtn.onclick = () => deleteTransaction(tx.id);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    right.appendChild(amount);
    right.appendChild(actions);

    li.appendChild(left);
    li.appendChild(right);

    transactionList.appendChild(li);
  });
}

function renderMonthSummary(){
  const now = new Date();
  const month = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  monthLabel.textContent = month;

  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime();

  const monthTx = transactions.filter(t => t.date >= start && t.date <= end);

  const mIncome = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
  const mExpense = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);

  monthIncomeEl.textContent = formatCurrency(mIncome);
  monthExpenseEl.textContent = formatCurrency(mExpense);

  const expenseTx = monthTx.filter(t => t.type === 'expense');
  const byCat = {};
  expenseTx.forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
  });

  const labels = Object.keys(byCat);
  const data = Object.values(byCat);

  updatePieChart(labels, data);
}

function initPieChart(){
  const ctx = document.getElementById('pieChart').getContext('2d');
  pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        label: 'Expenses by category',
        data: [],
        backgroundColor: [
          '#d4a373','#b9816d','#8fbf9f','#c28fb9','#f0b67f','#9fb4c9'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function updatePieChart(labels, data){
  if(!pieChart) return;
  pieChart.data.labels = labels;
  pieChart.data.datasets[0].data = data;
  pieChart.update();
}

function addTransaction(tx){
  transactions.push(tx);
  save();
  refresh();
}

function deleteTransaction(id){
  transactions = transactions.filter(t => t.id !== id);
  save();
  refresh();
}

function editTransaction(id){
  const tx = transactions.find(t => t.id === id);
  if(!tx) return;

  amountInput.value = tx.amount;
  descriptionInput.value = tx.description || "";
  categoryInput.value = tx.category;
  document.querySelector(`input[name="type"][value="${tx.type}"]`).checked = true;

  deleteTransaction(id);
}

function refresh(){
  renderDashboard();
  renderList();
  renderMonthSummary();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat(amountInput.value);
  if(isNaN(amount) || amount <= 0){
    alert("Please enter a valid amount greater than 0");
    return;
  }

  const type = document.querySelector('input[name="type"]:checked').value;
  const category = categoryInput.value || "Other";
  const description = descriptionInput.value.trim();

  const tx = {
    id: uid(),
    type,
    amount: Math.abs(amount),
    category,
    description,
    date: Date.now()
  };

  addTransaction(tx);

  amountInput.value = "";
  descriptionInput.value = "";
});

clearAllBtn.addEventListener("click", () => {
  if(confirm("Clear all transactions? This cannot be undone.")){
    transactions = [];
    save();
    refresh();
  }
});

// Initialize app
function init(){
  load();
  initPieChart();
  refresh();
}

init();
