const APP_VERSION = '3.0.0-beta.1';
const K = 'payday-planner-v3-beta';
const LEGACY_KEYS = ['bills-beta-pay-budget-lite-v2-beta'];

function loadInitialData(){
  const existing = localStorage.getItem(K);
  if (existing) return JSON.parse(existing);
  for (const key of LEGACY_KEYS){
    const legacy = localStorage.getItem(key);
    if (legacy) return JSON.parse(legacy);
  }
  return { pays: [], templates: [] };
}

let data = loadInitialData();

if (!data.templates) data.templates = [];
if (!data.pays) data.pays = [];
if (!data.bills) data.bills = [];
if (!data.billTemplates) data.billTemplates = [];

if (!data.annualizerItems) data.annualizerItems = [];
if (!data.mortgages) data.mortgages = [];
if (!data.annualizerSettings) data.annualizerSettings = { year: new Date().getFullYear() + 1 };
if (!data.mortgageUi) data.mortgageUi = { selectedMortgageId: '', collapsedYears: {}, collapsedMonths: {} };

data.annualizerItems.forEach(item => {
  if (typeof item.fundedAmount === 'undefined') item.fundedAmount = 0;
  if (typeof item.monthlyRelease === 'undefined') item.monthlyRelease = 0;
  if (typeof item.year === 'undefined') item.year = new Date().getFullYear();
});

data.mortgages.forEach(m => normalizeMortgage(m));

data.pays.forEach(p => {
  if (typeof p.archived === 'undefined') p.archived = false;
  if (!p.expenses) p.expenses = [];
  p.expenses.forEach(e => {
    if (typeof e.paid === 'undefined') e.paid = false;
  });
});

data.pays.forEach(p => {
  if (typeof p.collapsed === 'undefined') p.collapsed = false;
});

data.bills.forEach(b => {
  if (typeof b.recurring === 'undefined') b.recurring = false;
  if (typeof b.type === 'undefined') b.type = 'Monthly';
  if (typeof b.dueDate === 'undefined') b.dueDate = '';
  if (typeof b.paid === 'undefined') b.paid = false;
  if (typeof b.paidDate === 'undefined') b.paidDate = '';
  if (typeof b.planned === 'undefined') b.planned = false;
  if (typeof b.plannedDate === 'undefined') b.plannedDate = '';
  if (typeof b.showActionMenu === 'undefined') b.showActionMenu = false;
  if (typeof b.plannedPayId === 'undefined') b.plannedPayId = '';
  if (typeof b.plannedExpenseId === 'undefined') b.plannedExpenseId = '';
  if (typeof b.showPlanForm === 'undefined') b.showPlanForm = false;
});

if (!data.billDraft) {
  data.billDraft = {
    id: '',
    name: '',
    amount: '',
    type: 'Monthly',
    dueDate: '',
    recurring: true
  };
}

if (!data.billPeriodCollapsed) data.billPeriodCollapsed = {};

let currentTab = 'cards';

function save() {
  localStorage.setItem(K, JSON.stringify(data));
}

function money(n) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(n || 0);
}

function dateFmt(d) {
  if (!d) return 'No date';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function totals(pay) {
  const exp = (pay.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  return { exp, rem: Number(pay.pay || 0) - exp };
}

function stat(rem) {
  if (rem < 0) return ['r', 'Red'];
  if (rem < 200) return ['y', 'Tight'];
  return ['g', 'OK'];
}

function addPay() {
  const d = document.getElementById('payDate').value;
  const p = Number(document.getElementById('payAmt').value || 0);
  const n = document.getElementById('payNote').value.trim();

  if (!d || !p) {
    alert('Add a date and pay amount');
    return;
  }

  data.pays.unshift({
    id: Date.now().toString(),
    date: d,
    pay: p,
    note: n,
    expenses: [],
    archived: false
  });

  save();

  document.getElementById('payDate').value = '';
  document.getElementById('payAmt').value = '';
  document.getElementById('payNote').value = '';

  render();
}

function editPay(id) {
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  const newDate = prompt('Pay date?', pay.date || '');
  if (!newDate) return;

  const newAmount = Number(prompt('Expected pay?', pay.pay || 0) || 0);
  if (!newAmount) return;

  const newNote = prompt('Notes?', pay.note || '');
  if (newNote === null) return;

  pay.date = newDate;
  pay.pay = newAmount;
  pay.note = newNote;

  save();
  render();
}

function delPay(id) {
  if (!confirm('Delete this pay period?')) return;
  data.pays = data.pays.filter(x => x.id !== id);
  save();
  render();
}

function closePay(id) {
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay.archived = true;
  save();
  render();
}

function reopenPay(id) {
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay.archived = false;
  save();
  render();
}

function addExp(id) {
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  pay.showExpenseForm = true;
  if (typeof pay.newExpenseName === 'undefined') pay.newExpenseName = '';
  if (typeof pay.newExpenseAmount === 'undefined') pay.newExpenseAmount = '';
  if (typeof pay.newExpenseCat === 'undefined') pay.newExpenseCat = 'Fixed';

  save();
  render();
}

function cancelAddExp(id){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay.showExpenseForm = false;
  pay.newExpenseName = '';
  pay.newExpenseAmount = '';
  pay.newExpenseCat = 'Fixed';
  pay.selectedTemplateId = '';
  save();
  render();
}

function updateExpenseDraft(id, field, value){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay[field] = value;
  save();
}


function applyExpenseTemplate(id, templateId){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  pay.selectedTemplateId = templateId;

  const tpl = data.templates.find(t => t.id === templateId);
  if (tpl){
    pay.newExpenseName = tpl.name || '';
    pay.newExpenseAmount = tpl.amount || '';
    pay.newExpenseCat = tpl.cat || 'Fixed';
  }

  save();
  render();
}

function saveExpenseTemplate(id){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  const name = String(pay.newExpenseName || '').trim();
  const amount = Number(pay.newExpenseAmount || 0);
  const cat = String(pay.newExpenseCat || 'Fixed');

  if (!name){
    alert('Add an expense name first');
    return;
  }
  if (!amount){
    alert('Add an amount first');
    return;
  }

  let tpl = null;
  if (pay.selectedTemplateId){
    tpl = data.templates.find(t => t.id === pay.selectedTemplateId);
  }

  if (tpl){
    tpl.name = name;
    tpl.amount = amount;
    tpl.cat = cat;
  } else {
    tpl = {
      id: 't' + Date.now().toString(),
      name,
      amount,
      cat
    };
    data.templates.push(tpl);
    pay.selectedTemplateId = tpl.id;
  }

  save();
  render();
  alert('Saved to templates');
}

function saveInlineExp(id){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;

  const name = String(pay.newExpenseName || '').trim();
  const amount = Number(pay.newExpenseAmount || 0);
  const cat = String(pay.newExpenseCat || 'Fixed');

  if (!name) {
    alert('Add an expense name');
    return;
  }
  if (!amount) {
    alert('Add an amount');
    return;
  }

  pay.expenses.push({
    id: Date.now().toString(),
    name,
    amount,
    cat,
    paid: false
  });

  pay.showExpenseForm = false;
  pay.newExpenseName = '';
  pay.newExpenseAmount = '';
  pay.newExpenseCat = 'Fixed';
  pay.selectedTemplateId = '';

  save();
  render();
}

function delExp(payId, expId) {
  const pay = data.pays.find(x => x.id === payId);
  if (!pay) return;
  pay.expenses = pay.expenses.filter(x => x.id !== expId);
  save();
  render();
}

function togglePaid(payId, expId) {
  const pay = data.pays.find(x => x.id === payId);
  if (!pay) return;

  const exp = pay.expenses.find(x => x.id === expId);
  if (!exp) return;

  exp.paid = !exp.paid;
  save();
  render();
}


function showTab(tab) {
  currentTab = tab;
  document.getElementById('cardsTab').style.display = tab === 'cards' ? 'block' : 'none';
  document.getElementById('dashboardTab').style.display = tab === 'dashboard' ? 'block' : 'none';
  const billsTab = document.getElementById('billsTab');
  if (billsTab) billsTab.style.display = tab === 'bills' ? 'block' : 'none';
  const annualizerTab = document.getElementById('annualizerTab');
  if (annualizerTab) annualizerTab.style.display = tab === 'annualizer' ? 'block' : 'none';
  const mortgagesTab = document.getElementById('mortgagesTab');
  if (mortgagesTab) mortgagesTab.style.display = tab === 'mortgages' ? 'block' : 'none';

  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  if (tab === 'dashboard') drawMonthlyChart();
}


let openExpenseMenuId = null;

function contextualAdd(){
  if (currentTab === 'annualizer'){
    const el = document.getElementById('annualizerName');
    if (el) { el.scrollIntoView({behavior:'smooth', block:'center'}); setTimeout(() => el.focus(), 250); }
    return;
  }
  if (currentTab === 'mortgages'){
    const el = document.getElementById('mortgageTransactionDescription');
    if (el) { el.scrollIntoView({behavior:'smooth', block:'center'}); setTimeout(() => el.focus(), 250); }
    return;
  }
  if (currentTab === 'bills'){
    showTab('bills');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const input = document.querySelector('#bills input[type="text"]');
      if (input) input.focus();
    }, 350);
    return;
  }

  showTab('cards');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => {
    const input = document.getElementById('payDate');
    if (input) input.focus();
  }, 350);
}

function daysUntilLabel(dateString){
  if (!dateString) return 'No pay date';
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(dateString + 'T00:00:00');
  const days = Math.round((target - today) / 86400000);

  if (days === 0) return 'Payday today';
  if (days === 1) return '1 day until payday';
  if (days > 1) return `${days} days until payday`;
  if (days === -1) return '1 day ago';
  return `${Math.abs(days)} days ago`;
}

function toggleExpenseMenu(payId, expenseId){
  const key = `${payId}:${expenseId}`;
  openExpenseMenuId = openExpenseMenuId === key ? null : key;
  render();
}

function expenseInitial(name){
  return escapeHtml(String(name || '?').trim().charAt(0).toUpperCase() || '?');
}

function expenseCategoryClass(category){
  const c = String(category || '').toLowerCase();
  if (c === 'fixed') return 'fixed';
  if (c === 'variable') return 'variable';
  if (c === 'optional') return 'optional';
  if (c === 'buffer') return 'buffer';
  return 'other';
}

function renderSummary(){
  // Whole-app totals were removed from the main layout in v2.3.2.
}

function renderDashboard() {
  const box = document.getElementById('dashboard');
  const activePays = data.pays
    .filter(p => !p.archived)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!activePays.length) {
    box.innerHTML = '<h3>Dashboard</h3><div class="small">No pay periods yet.</div>';
    return;
  }

  const monthly = {};
  activePays.forEach(p => {
    const key = (p.date || '').slice(0, 7);
    if (!key) return;
    if (!monthly[key]) monthly[key] = { income: 0, expenses: 0 };
    monthly[key].income += Number(p.pay || 0);
    monthly[key].expenses += totals(p).exp;
  });

  const monthCards = Object.keys(monthly).sort().map(key => {
    const income = monthly[key].income;
    const expenses = monthly[key].expenses;
    const remaining = income - expenses;
    const remClass = remaining < 0 ? 'rem-red' : remaining < 200 ? 'rem-tight' : 'rem-ok';

    const monthTitle = new Date(key + '-01T00:00:00').toLocaleDateString('en-AU', {
      month: 'short',
      year: 'numeric'
    });

    return `
      <div class="dashboard-month-card">
        <div class="dashboard-month-field">
          <div class="dashboard-month-label">Month</div>
          <div class="dashboard-month-value">${monthTitle}</div>
        </div>
        <div class="dashboard-month-field">
          <div class="dashboard-month-label">Income</div>
          <div class="dashboard-month-value">${money(income)}</div>
        </div>
        <div class="dashboard-month-field">
          <div class="dashboard-month-label">Expenses</div>
          <div class="dashboard-month-value">${money(expenses)}</div>
        </div>
        <div class="dashboard-month-field">
          <div class="dashboard-month-label">Remaining</div>
          <div class="dashboard-month-value ${remClass}">${money(remaining)}</div>
        </div>
      </div>
    `;
  }).join('');

  box.innerHTML = `
    <h3>Dashboard</h3>
    <div class="small" style="margin-bottom:12px;">Monthly view of your planned pays</div>
    <div class="dashboard-month-grid">${monthCards}</div>
    <div style="margin-top:16px;">
      <h4 style="margin:0 0 10px;">Monthly Outlook</h4>
      <canvas id="monthlyChart" height="260" style="width:100%;background:#181818;border:1px solid #333;border-radius:12px;"></canvas>
    </div>
  `;

  drawMonthlyChart();
}

function drawMonthlyChart() {
  const canvas = document.getElementById('monthlyChart');
  if (!canvas) return;

  const activePays = data.pays.filter(p => !p.archived);
  if (!activePays.length) return;

  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = 260;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const w = cssWidth - pad.left - pad.right;
  const h = cssHeight - pad.top - pad.bottom;

  const monthly = {};

  activePays.forEach(p => {
    const key = (p.date || '').slice(0, 7);
    if (!key) return;
    if (!monthly[key]) monthly[key] = { income: 0, expenses: 0 };
    monthly[key].income += Number(p.pay || 0);
    monthly[key].expenses += totals(p).exp;
  });

  const months = Object.keys(monthly).sort();
  if (!months.length) return;

  const points = months.map(m => {
    const income = monthly[m].income;
    const expenses = monthly[m].expenses;
    return { month: m, income, expenses, remaining: income - expenses };
  });

  const maxY = 10000;
  const steps = 10;
  const stepValue = maxY / steps;

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.font = '11px Arial';
  ctx.fillStyle = '#aaa';

  for (let i = 0; i <= steps; i++) {
    const y = pad.top + h - (i / steps) * h;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + w, y);
    ctx.stroke();
    ctx.fillText('$' + (i * stepValue / 1000).toFixed(0) + 'k', 8, y + 4);
  }

  ctx.strokeStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + h);
  ctx.lineTo(pad.left + w, pad.top + h);
  ctx.stroke();

  const groupWidth = w / months.length;
  const barWidth = Math.min(22, groupWidth * 0.22);

  function yPos(val) {
    const capped = Math.max(0, Math.min(maxY, val));
    return pad.top + h - (capped / maxY) * h;
  }

  points.forEach((p, i) => {
    const cx = pad.left + groupWidth * i + groupWidth / 2;
    const incomeX = cx - barWidth - 4;
    const expenseX = cx + 4;
    const incomeY = yPos(p.income);
    const expenseY = yPos(p.expenses);

    ctx.fillStyle = '#2d6cdf';
    ctx.fillRect(incomeX, incomeY, barWidth, pad.top + h - incomeY);

    ctx.fillStyle = '#b33a3a';
    ctx.fillRect(expenseX, expenseY, barWidth, pad.top + h - expenseY);

    const label = formatMonthLabel(p.month);
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, pad.top + h + 18);
  });

  ctx.beginPath();
  points.forEach((p, i) => {
    const cx = pad.left + groupWidth * i + groupWidth / 2;
    const y = yPos(p.remaining);
    if (i === 0) ctx.moveTo(cx, y);
    else ctx.lineTo(cx, y);
  });
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 2;
  ctx.stroke();

  points.forEach((p, i) => {
    const cx = pad.left + groupWidth * i + groupWidth / 2;
    const y = yPos(p.remaining);
    ctx.beginPath();
    ctx.arc(cx, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c40f';
    ctx.fill();
  });

  ctx.textAlign = 'left';
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-AU', { month: 'short' });
}

window.addEventListener('resize', () => {
  if (currentTab === 'dashboard') drawMonthlyChart();
});


let openMenuPayId = null;

function togglePayMenu(id){
  openMenuPayId = openMenuPayId === id ? null : id;
  render();
}

function closePayMenu(){
  openMenuPayId = null;
  render();
}
function toggleCollapse(id){
  const pay = data.pays.find(x => x.id === id);
  if (!pay) return;
  pay.collapsed = !pay.collapsed;
  save();
  render();
}


function updateBillDraft(field, value){
  if (!data.billDraft) data.billDraft = { id:'', name:'', amount:'', type:'Monthly', dueDate:'', recurring:true };
  data.billDraft[field] = value;
  save();
}

function selectBillTemplate(templateId){
  if (!data.billDraft) data.billDraft = { id:'', name:'', amount:'', type:'Monthly', dueDate:'', recurring:true };
  const tpl = data.billTemplates.find(t => t.id === templateId);
  data.billDraft.id = templateId || '';
  if (tpl){
    data.billDraft.name = tpl.name || '';
    data.billDraft.amount = tpl.amount || '';
    data.billDraft.type = tpl.type || 'Monthly';
    data.billDraft.dueDate = tpl.dueDate || '';
    data.billDraft.recurring = !!tpl.recurring;
  }
  save();
  render();
}

function clearBillDraft(){
  data.billDraft = { id:'', name:'', amount:'', type:'Monthly', dueDate:'', recurring:true };
  save();
  render();
}

function addBill(){
  const d = data.billDraft || {};
  const name = String(d.name || '').trim();
  const amount = Number(d.amount || 0);
  if (!name) return alert('Add a bill name');
  if (!amount) return alert('Add an amount');

  data.bills.push({
    id:'b' + Date.now().toString(),
    name,
    amount,
    type:d.type || 'Monthly',
    dueDate:d.dueDate || '',
    recurring:!!d.recurring,
    planned:false,
    plannedDate:'',
    paid:false,
    paidDate:'',
    plannedPayId:'',
    plannedExpenseId:'',
    showPlanForm:false,
    createdAt:new Date().toISOString()
  });

  clearBillDraft();
}

function saveBillTemplate(){
  const d = data.billDraft || {};
  const name = String(d.name || '').trim();
  const amount = Number(d.amount || 0);
  if (!name) return alert('Add a bill name first');
  if (!amount) return alert('Add an amount first');

  let tpl = d.id ? data.billTemplates.find(t => t.id === d.id) : null;
  if (tpl){
    tpl.name = name;
    tpl.amount = amount;
    tpl.type = d.type || 'Monthly';
    tpl.dueDate = d.dueDate || '';
    tpl.recurring = !!d.recurring;
  } else {
    tpl = {
      id:'bt' + Date.now().toString(),
      name,
      amount,
      type:d.type || 'Monthly',
      dueDate:d.dueDate || '',
      recurring:!!d.recurring
    };
    data.billTemplates.push(tpl);
    data.billDraft.id = tpl.id;
  }
  save();
  render();
  alert('Bill saved');
}

function deleteBill(id){
  if (!confirm('Delete this bill?')) return;
  data.bills = data.bills.filter(b => b.id !== id);
  save();
  render();
}

function editBill(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill) return;
  data.billDraft = {
    id:'',
    name: bill.name || '',
    amount: bill.amount || '',
    type: bill.type || 'Monthly',
    dueDate: bill.dueDate || '',
    recurring: !!bill.recurring
  };
  data.bills = data.bills.filter(b => b.id !== id);
  save();
  render();
  showTab('bills');
}

function billShortDateLabel(d){
  if (!d) return 'No due date';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short'
  });
}

function billDateLabel(d){
  if (!d) return 'No due date';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
}




function toggleBillMenu(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill) return;

  data.bills.forEach(b => {
    if (b.id !== id) b.showActionMenu = false;
  });

  bill.showActionMenu = !bill.showActionMenu;
  save();
  render();
}

function closeBillMenu(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill) return;
  bill.showActionMenu = false;
  save();
  render();
}

function toggleBillPlanned(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill || bill.type === 'Fortnightly') return;

  bill.planned = !bill.planned;
  bill.plannedDate = bill.planned ? new Date().toISOString() : '';

  save();
  render();
}

function toggleBillPaid(id){
  const bill = data.bills.find(b => b.id === id);
  if (!bill || bill.type === 'Fortnightly') return;

  bill.paid = !bill.paid;
  bill.paidDate = bill.paid ? new Date().toISOString() : '';

  save();
  render();
}

function addMonthsSafe(dateString, months){
  const d = new Date(dateString + 'T00:00:00');
  const originalDay = d.getDate();

  d.setDate(1);
  d.setMonth(d.getMonth() + months);

  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, lastDay));

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function nextBillDueDate(bill){
  if (!bill.dueDate) return '';

  if (bill.type === 'Monthly') return addMonthsSafe(bill.dueDate, 1);
  if (bill.type === 'Quarterly') return addMonthsSafe(bill.dueDate, 3);
  if (bill.type === 'Annual') return addMonthsSafe(bill.dueDate, 12);

  return bill.dueDate;
}

function duplicateBillPeriod(type, key){
  if (type === 'Fortnightly') return;

  const sourceBills = (data.bills || []).filter(b =>
    b.type === type &&
    billPeriodKey(b) === key &&
    b.recurring
  );

  if (!sourceBills.length){
    alert('There are no recurring bills to copy.');
    return;
  }

  let copied = 0;
  let skipped = 0;

  sourceBills.forEach(bill => {
    const dueDate = nextBillDueDate(bill);
    const targetKey = dueDate ? billPeriodKey({ type, dueDate }) : 'No date';

    const duplicateExists = data.bills.some(existing =>
      existing.type === type &&
      billPeriodKey(existing) === targetKey &&
      String(existing.name || '').trim().toLowerCase() === String(bill.name || '').trim().toLowerCase()
    );

    if (duplicateExists){
      skipped++;
      return;
    }

    data.bills.push({
      id: 'b' + Date.now().toString() + Math.random().toString(36).slice(2, 7),
      name: bill.name,
      amount: Number(bill.amount || 0),
      type: bill.type,
      dueDate,
      recurring: true,
      planned: false,
      plannedDate: '',
      paid: false,
      paidDate: '',
      plannedPayId: '',
      plannedExpenseId: '',
      showPlanForm: false,
      createdAt: new Date().toISOString()
    });

    copied++;
  });

  save();
  render();

  const targetLabel = sourceBills[0] && sourceBills[0].dueDate
    ? billPeriodTitle(billPeriodKey({ type, dueDate: nextBillDueDate(sourceBills[0]) }), type)
    : 'next period';

  alert(`${targetLabel} created.\n${copied} recurring bill${copied === 1 ? '' : 's'} copied${skipped ? `.\n${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}.`);
}

function billPeriodKey(bill){
  if (!bill.dueDate) return 'No date';
  const d = new Date(bill.dueDate + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  if (bill.type === 'Annual') return String(year);

  if (bill.type === 'Quarterly'){
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  }

  return bill.dueDate.slice(0, 7);
}

function billPeriodTitle(key, type){
  if (key === 'No date') return 'No due date';

  if (type === 'Annual') return `${key} Annual Bills`;

  if (type === 'Quarterly'){
    const [year, quarter] = key.split('-');
    return `${quarter} ${year}`;
  }

  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric'
  });
}

function billPeriodCollapseKey(type, key){
  return `${type}:${key}`;
}

function toggleBillPeriod(type, key){
  if (!data.billPeriodCollapsed) data.billPeriodCollapsed = {};
  const collapseKey = billPeriodCollapseKey(type, key);
  data.billPeriodCollapsed[collapseKey] = !data.billPeriodCollapsed[collapseKey];
  save();
  render();
}

function isBillPeriodCollapsed(type, key){
  if (!data.billPeriodCollapsed) data.billPeriodCollapsed = {};
  return !!data.billPeriodCollapsed[billPeriodCollapseKey(type, key)];
}

function renderBillSection(title, type){
  const allBills = (data.bills || [])
    .filter(b => b.type === type)
    .slice()
    .sort((a,b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return String(a.name).localeCompare(String(b.name));
    });

  const groups = {};
  allBills.forEach(b => {
    const key = billPeriodKey(b);
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });

  const periodKeys = Object.keys(groups)
    .filter(key => {
      if (type === 'Fortnightly') return true;
      return groups[key].some(b => !b.paid);
    })
    .sort((a,b) => {
      if (a === 'No date') return 1;
      if (b === 'No date') return -1;
      return a.localeCompare(b);
    });

  const activeBills = allBills.filter(b => type === 'Fortnightly' || !b.paid);
  const activeTotal = activeBills.reduce((s,b) => s + Number(b.amount || 0), 0);

  return `
    <div class="bill-card">
      <div class="bill-card-header">
        <div>
          <h3 class="bill-card-title">${title}</h3>
          <div class="bill-card-summary">${activeBills.length} active bills • ${money(activeTotal)} outstanding</div>
        </div>
      </div>

      ${periodKeys.length ? `
        <div class="bill-period-grid">
          ${periodKeys.map(key => {
            const periodBills = groups[key];
            const tracked = type !== 'Fortnightly';
            const plannedCount = tracked ? periodBills.filter(b => b.planned).length : 0;
            const paidCount = tracked ? periodBills.filter(b => b.paid).length : 0;
            const unpaidBills = tracked ? periodBills.filter(b => !b.paid) : periodBills;
            const unplannedBills = tracked ? periodBills.filter(b => !b.planned) : [];
            const outstanding = unpaidBills.reduce((s,b) => s + Number(b.amount || 0), 0);
            const planningProgress = tracked && periodBills.length ? Math.round((plannedCount / periodBills.length) * 100) : 0;
            const paymentProgress = tracked && periodBills.length ? Math.round((paidCount / periodBills.length) * 100) : 0;
            const collapsed = isBillPeriodCollapsed(type, key);

            return `
              <div class="bill-period-card ${collapsed ? 'collapsed' : ''}">
                <div class="bill-period-header">
                  <div>
                    <h4 class="bill-period-title">${billPeriodTitle(key, type)}</h4>
                    <div class="bill-period-summary">
                      ${tracked
                        ? `${unplannedBills.length} unplanned • ${unpaidBills.length} outstanding • ${money(outstanding)}`
                        : `${periodBills.length} bills • ${money(outstanding)}`}
                    </div>
                  </div>

                  <div class="bill-period-head-right">
                    ${tracked ? `
                      <button class="icon-btn" onclick="duplicateBillPeriod('${type}','${key}')" title="Duplicate to next period">⧉</button>
                    ` : ''}
                    <button class="icon-btn" onclick="toggleBillPeriod('${type}','${key}')" title="${collapsed ? 'Expand' : 'Collapse'}">
                      ${collapsed ? '+' : '−'}
                    </button>
                  </div>
                </div>

                ${tracked ? `
                  <div class="bill-progress-split">
                    <div>
                      <div class="bill-progress-label"><span>Planning</span><span>${plannedCount}/${periodBills.length}</span></div>
                      <div class="bill-progress-track">
                        <div class="bill-progress-fill planned" style="width:${planningProgress}%"></div>
                      </div>
                    </div>
                    <div>
                      <div class="bill-progress-label"><span>Payment</span><span>${paidCount}/${periodBills.length}</span></div>
                      <div class="bill-progress-track">
                        <div class="bill-progress-fill paid" style="width:${paymentProgress}%"></div>
                      </div>
                    </div>
                  </div>

                  <div class="bill-summary-grid">
                    <div class="bill-summary-tile">
                      <div class="bill-summary-icon green">▤</div>
                      <div class="bill-summary-label">Total Bills</div>
                      <div class="bill-summary-value">${periodBills.length}</div>
                    </div>
                    <div class="bill-summary-tile">
                      <div class="bill-summary-icon blue">✓</div>
                      <div class="bill-summary-label">Planned</div>
                      <div class="bill-summary-value">${plannedCount}</div>
                    </div>
                    <div class="bill-summary-tile">
                      <div class="bill-summary-icon red">!</div>
                      <div class="bill-summary-label">Outstanding</div>
                      <div class="bill-summary-value">${unpaidBills.length}</div>
                    </div>
                    <div class="bill-summary-tile">
                      <div class="bill-summary-icon gold">$</div>
                      <div class="bill-summary-label">Outstanding</div>
                      <div class="bill-summary-value money">${money(outstanding)}</div>
                    </div>
                  </div>
                ` : ''}

                <div class="bill-list">
                  ${periodBills.map((b, index) => `
                    <div class="bill-row modern ${b.paid ? 'paid' : ''}">
                      <div class="bill-avatar avatar-${index % 4}">
                        ${escapeHtml((b.name || '?').trim().charAt(0).toUpperCase())}
                      </div>

                      <div class="bill-main">
                        <div class="bill-name">${escapeHtml(b.name)}</div>
                        <div class="bill-meta">
                          Due: ${billShortDateLabel(b.dueDate)}<br>
                          ${b.recurring ? 'Recurring' : 'One-off'}
                        </div>
                      </div>

                      <div class="bill-status-column">
                        ${tracked ? `
                          <div class="status-mini-labels"><span>P</span><span>PD</span></div>
                          <div class="status-mini-bars">
                            <span class="${b.planned ? 'on planned' : 'off'}"></span>
                            <span class="${b.paid ? 'on paid' : 'off'}"></span>
                          </div>
                        ` : ''}
                      </div>

                      <div class="bill-right modern">
                        <div class="bill-amount">${money(b.amount)}</div>
                        <button class="icon-btn bill-menu-trigger" onclick="toggleBillMenu('${b.id}')" title="Bill actions">⋮</button>

                        ${b.showActionMenu ? `
                          <div class="bill-action-menu">
                            ${tracked ? `
                              <button onclick="toggleBillPlanned('${b.id}')">
                                <span>${b.planned ? '✓' : '○'}</span>
                                ${b.planned ? 'Mark unplanned' : 'Mark planned'}
                              </button>
                              <button onclick="toggleBillPaid('${b.id}')">
                                <span>${b.paid ? '✓' : '○'}</span>
                                ${b.paid ? 'Mark unpaid' : 'Mark paid'}
                              </button>
                            ` : ''}
                            <button onclick="editBill('${b.id}')"><span>✎</span>Edit</button>
                            ${tracked ? `
                              <button onclick="duplicateBillPeriod('${type}','${key}')">
                                <span>⧉</span>Duplicate to Next Period
                              </button>
                            ` : ''}
                            <button class="danger" onclick="deleteBill('${b.id}')"><span>⌫</span>Delete</button>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>

                ${tracked ? `
                  <button class="period-add-bill" onclick="window.scrollTo({top:0,behavior:'smooth'})">
                    <span>⊕</span> Add Bill
                  </button>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div class="empty-state">No active bills</div>'}
    </div>
  `;
}

function renderBills(){
  const box = document.getElementById('bills');
  if (!box) return;
  if (!data.billDraft) data.billDraft = { id:'', name:'', amount:'', type:'Monthly', dueDate:'', recurring:true };
  const d = data.billDraft;

  box.innerHTML = `
    <div class="bills-layout">
      <div class="bill-form-panel">
        <div class="panel-header">
          <h2>Add Bill</h2>
          <p>Create an annual or monthly bill card.</p>
        </div>

        ${data.billTemplates.length ? `
          <div class="bill-template-row">
            <select onchange="selectBillTemplate(this.value)">
              <option value="">Choose saved bill</option>
              ${data.billTemplates.map(t => `
                <option value="${t.id}" ${d.id === t.id ? 'selected' : ''}>${escapeHtml(t.name)} (${money(t.amount)})</option>
              `).join('')}
            </select>
          </div>
        ` : ''}

        <div class="bill-form-grid">
          <input type="text" placeholder="Bill name" value="${escapeHtml(d.name || '')}" oninput="updateBillDraft('name', this.value)">
          <input type="number" step="0.01" placeholder="Amount" value="${escapeHtml(d.amount || '')}" oninput="updateBillDraft('amount', this.value)">
          <select onchange="updateBillDraft('type', this.value)">
            <option value="Fortnightly" ${d.type === 'Fortnightly' ? 'selected' : ''}>Fortnightly</option>
            <option value="Monthly" ${d.type === 'Monthly' ? 'selected' : ''}>Monthly</option>
            <option value="Quarterly" ${d.type === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
            <option value="Annual" ${d.type === 'Annual' ? 'selected' : ''}>Annual</option>
          </select>
          <input type="date" value="${escapeHtml(d.dueDate || '')}" oninput="updateBillDraft('dueDate', this.value)">
        </div>

        <label class="bill-check-row">
          <input type="checkbox" ${d.recurring ? 'checked' : ''} onchange="updateBillDraft('recurring', this.checked)">
          Recurring
        </label>

        <div class="inline-expense-actions" style="margin-top:12px;">
          <button class="btn btn-primary" onclick="addBill()">Add Bill</button>
          <button class="btn btn-secondary save-template-btn" onclick="saveBillTemplate()" title="Save bill">💾</button>
          <button class="btn btn-secondary" onclick="clearBillDraft()">Cancel</button>
        </div>
      </div>

      <div class="bill-section-grid">
        ${renderBillSection('Fortnightly Bills', 'Fortnightly')}
        ${renderBillSection('Monthly Bills', 'Monthly')}
        ${renderBillSection('Quarterly Bills', 'Quarterly')}
        ${renderBillSection('Annual Bills', 'Annual')}
      </div>
    </div>
  `;
}

function render() {
  renderDashboard();
  renderBills();
  renderAnnualizer();
  renderMortgages();

  const box = document.getElementById('list');
  const activePays = data.pays
    .filter(p => !p.archived)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!activePays.length) {
    box.innerHTML = '<div class="card">No pay periods yet.</div>';
    return;
  }

  box.innerHTML = activePays.map(p => {
    const t = totals(p);
    const expenses = p.expenses || [];
    const paidCount = expenses.filter(e => e.paid).length;
    const paymentProgress = expenses.length
      ? Math.round((paidCount / expenses.length) * 100)
      : 0;

    return `
      <article class="pp-pay-card ${p.collapsed ? 'is-collapsed' : ''}">
        <header class="pp-pay-header">
          <div class="pp-pay-heading">
            <h2>${dateFmt(p.date)}</h2>
            <p>${escapeHtml(p.note || daysUntilLabel(p.date))}</p>
          </div>

          <button
            class="pp-icon-button"
            onclick="toggleCollapse('${p.id}')"
            title="${p.collapsed ? 'Expand' : 'Collapse'}"
          >
            ${p.collapsed ? '+' : '−'}
          </button>
        </header>

        <div class="pp-pay-body">
          <div class="pp-pay-progress" aria-label="${paymentProgress}% paid">
            <span style="width:${paymentProgress}%"></span>
          </div>

          <section class="pp-pay-metrics">
            <div class="pp-metric">
              <span class="pp-metric-icon is-income">$</span>
              <span class="pp-metric-label">Income</span>
              <strong>${money(p.pay)}</strong>
            </div>

            <div class="pp-metric">
              <span class="pp-metric-icon is-spent">↓</span>
              <span class="pp-metric-label">Spent</span>
              <strong>${money(t.exp)}</strong>
            </div>

            <div class="pp-metric">
              <span class="pp-metric-icon is-bills">▤</span>
              <span class="pp-metric-label">Bills</span>
              <strong>${expenses.length}</strong>
            </div>

            <div class="pp-metric">
              <span class="pp-metric-icon is-remaining">▣</span>
              <span class="pp-metric-label">Remaining</span>
              <strong>${money(t.rem)}</strong>
            </div>
          </section>

          <div class="pp-pay-actions">
            <button class="btn btn-primary" onclick="addExp('${p.id}')">＋ Add Expense</button>
            <button class="btn btn-secondary" onclick="closePay('${p.id}')">▤ Close Pay Card</button>

            <div class="menu-wrap">
              <button class="pp-icon-button" onclick="togglePayMenu('${p.id}')" title="More">⋯</button>
              ${openMenuPayId === p.id ? `
                <div class="menu-panel pp-pay-menu">
                  <button class="btn btn-secondary" onclick="editPay('${p.id}')">✎ Edit Pay</button>
                  <button class="btn btn-danger" onclick="delPay('${p.id}')">⌫ Delete Pay</button>
                </div>
              ` : ''}
            </div>
          </div>

          ${p.showExpenseForm ? `
            <div class="inline-expense-form pp-expense-form">
              ${data.templates.length ? `
                <div class="inline-expense-template-row">
                  <select onchange="applyExpenseTemplate('${p.id}', this.value)">
                    <option value="">Choose saved expense</option>
                    ${data.templates.map(tpl => `
                      <option value="${tpl.id}" ${p.selectedTemplateId === tpl.id ? 'selected' : ''}>
                        ${escapeHtml(tpl.name)} (${money(tpl.amount)})
                      </option>
                    `).join('')}
                  </select>
                </div>
              ` : ''}

              <div class="inline-expense-grid">
                <input
                  type="text"
                  placeholder="Expense name"
                  value="${escapeHtml(p.newExpenseName || '')}"
                  oninput="updateExpenseDraft('${p.id}','newExpenseName', this.value)"
                >

                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value="${escapeHtml(p.newExpenseAmount || '')}"
                  oninput="updateExpenseDraft('${p.id}','newExpenseAmount', this.value)"
                >

                <select onchange="updateExpenseDraft('${p.id}','newExpenseCat', this.value)">
                  <option value="Fixed" ${(p.newExpenseCat || 'Fixed') === 'Fixed' ? 'selected' : ''}>Fixed</option>
                  <option value="Variable" ${(p.newExpenseCat || '') === 'Variable' ? 'selected' : ''}>Variable</option>
                  <option value="Optional" ${(p.newExpenseCat || '') === 'Optional' ? 'selected' : ''}>Optional</option>
                  <option value="Buffer" ${(p.newExpenseCat || '') === 'Buffer' ? 'selected' : ''}>Buffer</option>
                </select>
              </div>

              <div class="inline-expense-actions">
                <button class="btn btn-primary" onclick="saveInlineExp('${p.id}')">Add Expense</button>
                <button class="btn btn-secondary save-template-btn" onclick="saveExpenseTemplate('${p.id}')" title="Save template">💾</button>
                <button class="btn btn-secondary" onclick="cancelAddExp('${p.id}')">Cancel</button>
              </div>
            </div>
          ` : ''}

          <section class="pp-expense-list">
            ${expenses.length ? expenses.map(e => {
              const menuKey = `${p.id}:${e.id}`;

              return `
                <div class="pp-expense-row ${e.paid ? 'is-paid' : ''}">
                  <div class="pp-expense-avatar ${expenseCategoryClass(e.cat)}">
                    ${expenseInitial(e.name)}
                  </div>

                  <div class="pp-expense-info">
                    <div class="pp-expense-name">${escapeHtml(e.name)}</div>
                    <div class="pp-expense-category">${escapeHtml(e.cat || '')}</div>
                  </div>

                  <div class="pp-expense-payment">
                    <span>Payment</span>
                    <i class="${e.paid ? 'is-paid' : ''}"></i>
                  </div>

                  <div class="pp-expense-end">
                    <strong>${money(e.amount)}</strong>
                    <button
                      class="pp-icon-button pp-expense-menu-button"
                      onclick="toggleExpenseMenu('${p.id}','${e.id}')"
                      title="Expense actions"
                    >
                      ⋮
                    </button>

                    ${openExpenseMenuId === menuKey ? `
                      <div class="expense-action-menu pp-expense-menu">
                        <button onclick="togglePaid('${p.id}','${e.id}')">
                          <span>${e.paid ? '✓' : '○'}</span>
                          ${e.paid ? 'Mark unpaid' : 'Mark paid'}
                        </button>
                        <button class="danger" onclick="delExp('${p.id}','${e.id}')">
                          <span>⌫</span>Delete
                        </button>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('') : '<div class="empty-state">No expenses yet</div>'}
          </section>

          ${expenses.length ? `
            <button class="period-add-bill pp-add-expense-link" onclick="addExp('${p.id}')">
              <span>⊕</span> Add Expense
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}



// ---------- Version 3: Annualizer ----------
function annualizerYear(){
  return Number(data.annualizerSettings && data.annualizerSettings.year) || new Date().getFullYear();
}

function setAnnualizerYear(value){
  if (!data.annualizerSettings) data.annualizerSettings = {};
  data.annualizerSettings.year = Number(value) || new Date().getFullYear();
  save(); renderAnnualizer();
}

function addAnnualizerItem(){
  const name = (document.getElementById('annualizerName')?.value || '').trim();
  const targetAmount = Number(document.getElementById('annualizerTarget')?.value || 0);
  const fundedAmount = Number(document.getElementById('annualizerFunded')?.value || 0);
  const monthlyRelease = Number(document.getElementById('annualizerRelease')?.value || 0);
  const dueDate = document.getElementById('annualizerDue')?.value || '';
  const year = Number(document.getElementById('annualizerYearInput')?.value || annualizerYear());
  if (!name || targetAmount <= 0) { alert('Add a name and annual target amount.'); return; }
  data.annualizerItems.push({ id: cryptoId(), name, targetAmount, fundedAmount: Math.max(0,fundedAmount), monthlyRelease: Math.max(0,monthlyRelease), dueDate, year, complete:false });
  save(); renderAnnualizer();
}

function editAnnualizerFunding(id){
  const item = data.annualizerItems.find(x=>x.id===id); if(!item) return;
  const remaining = Math.max(0, Number(item.targetAmount)-Number(item.fundedAmount||0));
  const entered = prompt(`Add funding to ${item.name}\nRemaining: ${money(remaining)}`, remaining ? String(Math.min(remaining,500)) : '0');
  if (entered === null) return;
  const amount = Number(entered);
  if (!Number.isFinite(amount) || amount <= 0) return;
  item.fundedAmount = Math.min(Number(item.targetAmount), Number(item.fundedAmount||0)+amount);
  item.complete = item.fundedAmount >= Number(item.targetAmount);
  save(); renderAnnualizer();
}

function setAnnualizerComplete(id){
  const item=data.annualizerItems.find(x=>x.id===id); if(!item)return;
  const isComplete=Number(item.fundedAmount||0)>=Number(item.targetAmount||0);
  item.fundedAmount=isComplete?0:Number(item.targetAmount||0);
  item.complete=!isComplete;
  save(); renderAnnualizer();
}

function deleteAnnualizerItem(id){
  const item=data.annualizerItems.find(x=>x.id===id); if(!item)return;
  if(!confirm(`Delete ${item.name} from Annualizer?`)) return;
  data.annualizerItems=data.annualizerItems.filter(x=>x.id!==id); save(); renderAnnualizer();
}

function annualizerNextTask(items){
  return items.filter(i=>Number(i.fundedAmount||0)<Number(i.targetAmount||0)).sort((a,b)=>{
    const ad=a.dueDate||`${a.year}-12-31`; const bd=b.dueDate||`${b.year}-12-31`;
    return ad.localeCompare(bd) || (Number(a.targetAmount)-Number(a.fundedAmount||0))-(Number(b.targetAmount)-Number(b.fundedAmount||0));
  })[0];
}

function renderAnnualizer(){
  const box=document.getElementById('annualizer'); if(!box)return;
  const year=annualizerYear();
  const items=(data.annualizerItems||[]).filter(i=>Number(i.year)===year);
  const total=items.reduce((s,i)=>s+Number(i.targetAmount||0),0);
  const funded=items.reduce((s,i)=>s+Math.min(Number(i.targetAmount||0),Number(i.fundedAmount||0)),0);
  const remaining=Math.max(0,total-funded);
  const released=items.filter(i=>Number(i.fundedAmount||0)>=Number(i.targetAmount||0)).reduce((s,i)=>s+Number(i.monthlyRelease||0),0);
  const percent=total?Math.round(funded/total*100):0;
  const next=annualizerNextTask(items);
  const years=[...new Set([year-1,year,year+1,new Date().getFullYear(),new Date().getFullYear()+1])].sort();
  box.innerHTML=`
    <div class="v3-headline-card">
      <div class="v3-kicker">BUY THE YEAR</div>
      <div class="v3-headline-row"><h2>${year} is ${percent}% annualised</h2><select class="v3-year-select" onchange="setAnnualizerYear(this.value)">${years.map(y=>`<option ${y===year?'selected':''}>${y}</option>`).join('')}</select></div>
      <div class="annualizer-progress"><span style="width:${Math.min(100,percent)}%"></span></div>
      <div class="v3-stats"><div><small>Funded</small><strong>${money(funded)}</strong></div><div><small>Remaining</small><strong>${money(remaining)}</strong></div><div><small>Monthly cash flow released</small><strong>${money(released)}</strong></div></div>
      ${next?`<div class="next-task"><span>Next annualisation task</span><strong>${escapeHtml(next.name)}</strong><em>${money(Number(next.targetAmount)-Number(next.fundedAmount||0))} remaining${next.dueDate?` • due ${dateFmt(next.dueDate)}`:''}</em></div>`:`<div class="next-task complete"><strong>${items.length?'Year bought ✓':'Add your first annual expense below'}</strong></div>`}
    </div>
    <div class="v3-two-col">
      <section class="panel v3-form-panel"><div class="panel-header"><h2>Add annualisation target</h2><p>Track the bills you want out of your normal monthly cash flow.</p></div>
        <div class="form-grid"><label class="field"><span>Name</span><input id="annualizerName" placeholder="e.g. Mercedes insurance"></label><label class="field"><span>Annual target</span><input id="annualizerTarget" type="number" step="0.01" placeholder="2800"></label></div>
        <div class="form-grid"><label class="field"><span>Already funded</span><input id="annualizerFunded" type="number" step="0.01" value="0"></label><label class="field"><span>Monthly cash flow released</span><input id="annualizerRelease" type="number" step="0.01" value="0"></label></div>
        <div class="form-grid"><label class="field"><span>Due date</span><input id="annualizerDue" type="date"></label><label class="field"><span>Year</span><input id="annualizerYearInput" type="number" value="${year}"></label></div>
        <button class="btn btn-primary" onclick="addAnnualizerItem()">Add target</button>
      </section>
      <section class="panel"><div class="panel-header"><h2>${year} targets</h2><p>Complete items stay visible as wins instead of disappearing.</p></div>
        <div class="annualizer-list">${items.length?items.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).map(i=>{
          const t=Number(i.targetAmount||0), f=Math.min(t,Number(i.fundedAmount||0)), pc=t?Math.round(f/t*100):0, done=f>=t;
          return `<article class="annualizer-item ${done?'is-complete':''}"><div class="annualizer-item-main"><div><strong>${escapeHtml(i.name)}</strong><span>${i.dueDate?`Due ${dateFmt(i.dueDate)} • `:''}${money(f)} of ${money(t)}</span></div><b>${pc}%</b></div><div class="annualizer-progress small"><span style="width:${pc}%"></span></div><div class="annualizer-actions"><button class="btn btn-secondary" onclick="editAnnualizerFunding('${i.id}')">+ Fund</button><button class="btn btn-secondary" onclick="setAnnualizerComplete('${i.id}')">${done?'Reopen':'Mark complete'}</button><button class="icon-btn" onclick="deleteAnnualizerItem('${i.id}')">⌫</button></div></article>`;
        }).join(''):'<div class="empty-state">No annualisation targets for this year yet.</div>'}</div>
      </section>
    </div>`;
}

// ---------- Version 3: Home Loans ----------
function cryptoId(){
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function normalizeMortgage(m){
  if(!m.id)m.id=cryptoId(); if(!m.name)m.name='Home Loan';
  if(!m.startDate)m.startDate=new Date().toISOString().slice(0,10);
  if(typeof m.openingBalance==='undefined')m.openingBalance=0;
  if(!Array.isArray(m.transactions))m.transactions=[];
  if(!Array.isArray(m.rateChanges))m.rateChanges=[];
  if(!Array.isArray(m.recurring))m.recurring=[];
  if(typeof m.maxYears==='undefined')m.maxYears=40;
  if(typeof m.interestChargeDay==='undefined')m.interestChargeDay=0; // 0 = month end
  return m;
}
function selectedMortgage(){
  if(!data.mortgages.length)return null;
  let m=data.mortgages.find(x=>x.id===data.mortgageUi.selectedMortgageId);
  if(!m){m=data.mortgages[0];data.mortgageUi.selectedMortgageId=m.id;}
  return normalizeMortgage(m);
}
function selectMortgage(id){data.mortgageUi.selectedMortgageId=id;save();renderMortgages();}
function addMortgage(){
  const name=(document.getElementById('mortgageName')?.value||'').trim();
  const openingBalance=Number(document.getElementById('mortgageBalance')?.value||0);
  const startDate=document.getElementById('mortgageStartDate')?.value||'';
  const rate=Number(document.getElementById('mortgageRate')?.value||0);
  if(!name||openingBalance<=0||!startDate||rate<0){alert('Add a loan name, current balance, date and interest rate.');return;}
  const m=normalizeMortgage({id:cryptoId(),name,startDate,openingBalance,transactions:[],rateChanges:[{id:cryptoId(),date:startDate,rate}],recurring:[],maxYears:40,interestChargeDay:0});
  data.mortgages.push(m); data.mortgageUi.selectedMortgageId=m.id; save(); renderMortgages();
}
function deleteMortgage(id){const m=data.mortgages.find(x=>x.id===id);if(!m||!confirm(`Delete ${m.name} and its schedule?`))return;data.mortgages=data.mortgages.filter(x=>x.id!==id);data.mortgageUi.selectedMortgageId=data.mortgages[0]?.id||'';save();renderMortgages();}
function addMortgageTransaction(){
  const m=selectedMortgage();if(!m)return;
  const type=document.getElementById('mortgageTransactionType')?.value||'credit';
  const date=document.getElementById('mortgageTransactionDate')?.value||'';
  const amount=Number(document.getElementById('mortgageTransactionAmount')?.value||0);
  const description=(document.getElementById('mortgageTransactionDescription')?.value||'').trim();
  const repeat=document.getElementById('mortgageTransactionRepeat')?.value||'once';
  const until=document.getElementById('mortgageTransactionUntil')?.value||'';
  if(!date||amount<=0||!description){alert('Add a date, amount and description.');return;}
  if(repeat==='once')m.transactions.push({id:cryptoId(),type,date,amount,description});
  else m.recurring.push({id:cryptoId(),type,startDate:date,amount,description,frequency:repeat,until});
  save();renderMortgages();
}
function deleteMortgageEntry(kind,id){const m=selectedMortgage();if(!m)return;if(kind==='transaction')m.transactions=m.transactions.filter(x=>x.id!==id);if(kind==='recurring')m.recurring=m.recurring.filter(x=>x.id!==id);if(kind==='rate')m.rateChanges=m.rateChanges.filter(x=>x.id!==id);save();renderMortgages();}
function addMortgageRate(){const m=selectedMortgage();if(!m)return;const date=document.getElementById('mortgageRateDate')?.value||'';const rate=Number(document.getElementById('mortgageNewRate')?.value);if(!date||!Number.isFinite(rate)||rate<0){alert('Add an effective date and rate.');return;}m.rateChanges.push({id:cryptoId(),date,rate});m.rateChanges.sort((a,b)=>a.date.localeCompare(b.date));save();renderMortgages();}
function addDaysIso(iso,days){const [y,m,d]=iso.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));dt.setUTCDate(dt.getUTCDate()+days);return dt.toISOString().slice(0,10);}
function monthKey(iso){return iso.slice(0,7)}
function yearKey(iso){return iso.slice(0,4)}
function isMonthEnd(iso){return addDaysIso(iso,1).slice(5,7)!==iso.slice(5,7)}
function recurrenceOccurs(r,date){
  if(date<r.startDate||(r.until&&date>r.until))return false;
  if(r.frequency==='monthly'){
    const startDay=Number(r.startDate.slice(8,10));
    const [y,mo]=date.split('-').map(Number);
    const lastDay=new Date(Date.UTC(y,mo,0)).getUTCDate();
    return Number(date.slice(8,10))===Math.min(startDay,lastDay);
  }
  const a=new Date(r.startDate+'T00:00:00Z'),b=new Date(date+'T00:00:00Z');const days=Math.round((b-a)/86400000);
  if(r.frequency==='fortnightly')return days>=0&&days%14===0;
  if(r.frequency==='weekly')return days>=0&&days%7===0;
  return false;
}
function rateForDate(m,date){const rates=(m.rateChanges||[]).filter(r=>r.date<=date).sort((a,b)=>a.date.localeCompare(b.date));return rates.length?Number(rates[rates.length-1].rate||0):0;}
function calculateMortgage(m){
  m=normalizeMortgage(m);
  let date=m.startDate, balance=Number(m.openingBalance||0), accrued=0, totalInterest=0;
  const rows=[];
  const maxDays=Math.max(365,Math.min(365*60,Number(m.maxYears||40)*366));
  const txByDate={};
  (m.transactions||[]).forEach(t=>{(txByDate[t.date]||(txByDate[t.date]=[])).push(t)});
  let paidOffDate='';
  for(let i=0;i<maxDays&&balance>0.005;i++){
    const openingBalance=balance;
    const rate=rateForDate(m,date);
    const dailyInterest=openingBalance*(rate/100)/365;
    accrued+=dailyInterest;
    totalInterest+=dailyInterest;
    let credits=0,debits=0,descriptions=[];
    for(const t of (txByDate[date]||[])){
      if(t.type==='credit')credits+=Number(t.amount||0); else debits+=Number(t.amount||0);
      descriptions.push(t.description);
    }
    for(const r of (m.recurring||[])){
      if(recurrenceOccurs(r,date)){
        if(r.type==='credit')credits+=Number(r.amount||0); else debits+=Number(r.amount||0);
        descriptions.push(r.description+' (recurring)');
      }
    }
    let interestCharged=0;
    if(isMonthEnd(date)){
      interestCharged=accrued;
      accrued=0;
      if(interestCharged>0) descriptions.push('Interest charged');
    }
    let closingBalance=openingBalance-credits+debits+interestCharged;
    if(closingBalance<=0.005){
      closingBalance=0;
      paidOffDate=date;
    }
    rows.push({date,balance:openingBalance,closingBalance,credits,debits,rate,dailyInterest,interestCharged,description:descriptions.join(' • ')});
    balance=closingBalance;
    date=addDaysIso(date,1);
  }
  return {rows,paidOffDate,totalInterest,endingBalance:balance,unpaid:!paidOffDate};
}
function toggleMortgageYear(year){const k=selectedMortgage()?.id+':'+year;data.mortgageUi.collapsedYears[k]=!data.mortgageUi.collapsedYears[k];save();renderMortgages();}
function toggleMortgageMonth(ym){const k=selectedMortgage()?.id+':'+ym;data.mortgageUi.collapsedMonths[k]=!data.mortgageUi.collapsedMonths[k];save();renderMortgages();}
function mortgageScheduleHtml(m,calc){
  const years={};calc.rows.forEach(r=>{const y=yearKey(r.date),mo=monthKey(r.date);years[y]??={};years[y][mo]??=[];years[y][mo].push(r);});
  return Object.keys(years).map(y=>{const yRows=Object.values(years[y]).flat();const yStart=yRows[0]?.balance||0,yEnd=yRows[yRows.length-1]?.balance||0;const yc=yRows.reduce((s,r)=>s+r.credits,0),yd=yRows.reduce((s,r)=>s+r.debits+r.interestCharged,0);const yk=m.id+':'+y;const ycCollapsed=!!data.mortgageUi.collapsedYears[yk];return `<section class="schedule-year"><button class="schedule-toggle" onclick="toggleMortgageYear('${y}')"><span>${ycCollapsed?'▶':'▼'} ${y}</span><em>${money(yStart)} → ${money(yEnd)} • credits ${money(yc)} • debits/interest ${money(yd)}</em></button>${ycCollapsed?'':Object.keys(years[y]).map(mo=>{const rows=years[y][mo],mk=m.id+':'+mo,mc=!!data.mortgageUi.collapsedMonths[mk];const start=rows[0]?.balance||0,end=rows[rows.length-1]?.balance||0,interest=rows.reduce((s,r)=>s+r.dailyInterest,0);return `<div class="schedule-month"><button class="schedule-toggle month" onclick="toggleMortgageMonth('${mo}')"><span>${mc?'▶':'▼'} ${new Date(mo+'-01T00:00:00').toLocaleDateString('en-AU',{month:'long'})}</span><em>${money(start)} → ${money(end)} • interest ${money(interest)}</em></button>${mc?'':`<div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th>Date</th><th>Balance</th><th>Credit</th><th>Debit</th><th>Rate</th><th>Daily interest</th><th>Description</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.description?'has-event':''}"><td>${dateFmt(r.date)}</td><td>${money(r.balance)}</td><td>${r.credits?money(r.credits):''}</td><td>${(r.debits+r.interestCharged)?money(r.debits+r.interestCharged):''}</td><td>${r.rate.toFixed(3)}%</td><td>${money(r.dailyInterest)}</td><td>${escapeHtml(r.description)}</td></tr>`).join('')}</tbody></table></div>`}</div>`}).join('')}</section>`}).join('');
}
function mortgageEntriesHtml(m){
 const entries=[...(m.transactions||[]).map(x=>({...x,kind:'transaction',sortDate:x.date})),...(m.recurring||[]).map(x=>({...x,kind:'recurring',sortDate:x.startDate}))].sort((a,b)=>a.sortDate.localeCompare(b.sortDate));
 return entries.length?entries.map(x=>`<div class="mortgage-entry"><div><strong>${x.type==='credit'?'＋':'−'} ${money(x.amount)} ${escapeHtml(x.description)}</strong><span>${dateFmt(x.sortDate)}${x.kind==='recurring'?` • ${x.frequency}${x.until?` until ${dateFmt(x.until)}`:''}`:''}</span></div><button class="icon-btn" onclick="deleteMortgageEntry('${x.kind}','${x.id}')">⌫</button></div>`).join(''):'<div class="empty-state">No credits or debits recorded yet.</div>';
}
function renderMortgages(){
 const box=document.getElementById('mortgages');if(!box)return;
 if(!data.mortgages.length){box.innerHTML=`<div class="v3-empty-hero"><div class="v3-kicker">HOME LOANS</div><h2>Add your first mortgage</h2><p>The calculator will build the daily forward schedule and make the payoff date the scoreboard.</p>${mortgageCreateForm()}</div>`;return;}
 const m=selectedMortgage(),calc=calculateMortgage(m);const payoff=calc.paidOffDate?dateFmt(calc.paidOffDate):`Beyond ${m.maxYears} year forecast`;
 box.innerHTML=`<div class="mortgage-selector"><div class="mortgage-tabs">${data.mortgages.map(x=>`<button class="${x.id===m.id?'active':''}" onclick="selectMortgage('${x.id}')">${escapeHtml(x.name)}</button>`).join('')}<button onclick="document.getElementById('newMortgagePanel').classList.toggle('hidden')">＋ Add loan</button></div></div>
 <div id="newMortgagePanel" class="panel hidden">${mortgageCreateForm()}</div>
 <div class="mortgage-hero"><div class="v3-kicker">YOUR MORTGAGE WILL BE PAID OFF ON</div><div class="mortgage-payoff-date">${payoff}</div><div class="mortgage-hero-stats"><span>Starting/current balance <strong>${money(m.openingBalance)}</strong></span><span>Forecast interest <strong>${money(calc.totalInterest)}</strong></span><span>Schedule rows <strong>${calc.rows.length.toLocaleString('en-AU')}</strong></span></div></div>
 <div class="v3-two-col mortgage-controls"><section class="panel"><div class="panel-header"><h2>Record credit or debit</h2><p>Put money in, pull money out, or create a repeating future transaction.</p></div><div class="form-grid"><label class="field"><span>Type</span><select id="mortgageTransactionType"><option value="credit">Credit — money into mortgage</option><option value="debit">Debit — money out</option></select></label><label class="field"><span>Date</span><input id="mortgageTransactionDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label></div><div class="form-grid"><label class="field"><span>Amount</span><input id="mortgageTransactionAmount" type="number" step="0.01"></label><label class="field"><span>Description</span><input id="mortgageTransactionDescription" placeholder="Pay, car payment, strata…"></label></div><div class="form-grid"><label class="field"><span>Repeat</span><select id="mortgageTransactionRepeat"><option value="once">Once</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></label><label class="field"><span>Repeat until (optional)</span><input id="mortgageTransactionUntil" type="date"></label></div><button class="btn btn-primary" onclick="addMortgageTransaction()">Record transaction</button><div class="mortgage-entry-list">${mortgageEntriesHtml(m)}</div></section>
 <section class="panel"><div class="panel-header"><h2>Interest rate history</h2><p>Add a new effective rate once. Every future daily row recalculates automatically.</p></div><div class="form-grid"><label class="field"><span>Effective date</span><input id="mortgageRateDate" type="date"></label><label class="field"><span>New rate (%)</span><input id="mortgageNewRate" type="number" step="0.001"></label></div><button class="btn btn-primary" onclick="addMortgageRate()">Add rate change</button><div class="mortgage-entry-list">${(m.rateChanges||[]).sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<div class="mortgage-entry"><div><strong>${Number(r.rate).toFixed(3)}%</strong><span>Effective ${dateFmt(r.date)}</span></div><button class="icon-btn" onclick="deleteMortgageEntry('rate','${r.id}')">⌫</button></div>`).join('')}</div><button class="btn btn-danger v3-delete-loan" onclick="deleteMortgage('${m.id}')">Delete this loan</button></section></div>
 <section class="panel schedule-panel"><div class="panel-header"><h2>Forward daily schedule</h2><p>Years and months are collapsible. Event days are highlighted so you can see exactly what changed the plan.</p></div>${mortgageScheduleHtml(m,calc)}</section>`;
}
function mortgageCreateForm(){return `<div class="panel-header"><h2>New home loan</h2><p>Use the balance and rate that apply on your chosen starting date.</p></div><div class="form-grid"><label class="field"><span>Loan name</span><input id="mortgageName" placeholder="Home — Greenway"></label><label class="field"><span>Starting/current balance</span><input id="mortgageBalance" type="number" step="0.01"></label></div><div class="form-grid"><label class="field"><span>Starting date</span><input id="mortgageStartDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label class="field"><span>Interest rate (%)</span><input id="mortgageRate" type="number" step="0.001"></label></div><button class="btn btn-primary" onclick="addMortgage()">Create home loan</button>`;}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    storageKey: K,
    data
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `payday-planner-v3-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      const imported = parsed && parsed.data ? parsed.data : parsed;

      if (!imported || typeof imported !== 'object') {
        alert('That file does not look like a valid budget backup.');
        return;
      }

      if (!Array.isArray(imported.pays)) imported.pays = [];
      if (!Array.isArray(imported.templates)) imported.templates = [];
      if (!Array.isArray(imported.bills)) imported.bills = [];
      if (!Array.isArray(imported.billTemplates)) imported.billTemplates = [];
      if (!Array.isArray(imported.annualizerItems)) imported.annualizerItems = [];
      if (!Array.isArray(imported.mortgages)) imported.mortgages = [];
      if (!imported.annualizerSettings) imported.annualizerSettings = { year: new Date().getFullYear() + 1 };
      if (!imported.mortgageUi) imported.mortgageUi = { selectedMortgageId:'', collapsedYears:{}, collapsedMonths:{} };
      imported.mortgages.forEach(m => normalizeMortgage(m));

      imported.pays.forEach(p => {
        if (typeof p.archived === 'undefined') p.archived = false;
        if (!Array.isArray(p.expenses)) p.expenses = [];
        p.expenses.forEach(exp => {
          if (typeof exp.paid === 'undefined') exp.paid = false;
        });
      });

      if (!confirm('Importing will replace the current data in this browser. Continue?')) {
        return;
      }

      data = imported;
      save();
      render();
      alert('Import complete.');
    } catch (err) {
      alert('Could not read that file as valid JSON.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

render();




let globalMenuOpen = false;

function toggleGlobalMenu(){
  const menu = document.getElementById('globalMenu');
  const backdrop = document.getElementById('globalMenuBackdrop');
  if (!menu || !backdrop) return;

  const opening = menu.style.display === 'none' || !menu.style.display;
  menu.style.display = opening ? 'block' : 'none';
  backdrop.style.display = opening ? 'block' : 'none';
}

function closeGlobalMenu(){
  const menu = document.getElementById('globalMenu');
  const backdrop = document.getElementById('globalMenuBackdrop');
  if (menu) menu.style.display = 'none';
  if (backdrop) backdrop.style.display = 'none';
}

document.addEventListener('click', function(event){
  const insideBottomMenu = event.target.closest('.bottom-bar .menu-wrap');
  if (insideBottomMenu) return;
  const el = document.getElementById('globalMenu');
  if (el && globalMenuOpen){
    globalMenuOpen = false;
    el.style.display = 'none';
  }
});
