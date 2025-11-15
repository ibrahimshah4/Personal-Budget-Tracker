    const balanceAmount = document.querySelector(".balance_amount");
    const incomeAmount = document.querySelector(".incomeAmount");
    const expenseAmount = document.querySelector(".expenseAmount");
    const addBtn = document.querySelector("#addBtn");
    const amountInput = document.querySelector("#amount");
    const descriptionInput = document.querySelector("#description");
    const typeSelect = document.querySelector("#type");
    const transactionTable = document.getElementById("transactionTable");
    const resetBtn = document.querySelector("#resetBtn");
    const exportBtn = document.querySelector("#exportBtn");
    const importBtn = document.querySelector("#importBtn");
    const importFile = document.querySelector("#importFile");
    const undoArea = document.getElementById("undoArea");

    let transactions = [];
    let editingId = null;
    let lastDeleted = null; 
    let undoInterval;

    // Chart.js setup
    const ctx = document.getElementById("budgetChart").getContext("2d");
    let budgetChart = new Chart(ctx, {
    type: "bar",
    data: {
        labels: ["Income", "Expense"],
        datasets: [{
        label: "Amount",
        data: [0, 0],
        backgroundColor: ["#4CAF50", "#F44336"],
        borderRadius: 8,
        barThickness: 50
        }]
    },
    options: {
        responsive: true,
        plugins: {
        legend: {display: false},
        title: {
            display: true,
            text: "Income vs Expense",
            color: "#222",
            font: {size: 18, weight: "bold"}
        }
        },
        scales: {
        x: {
            ticks: {color: "#444", font: {size: 14, weight: "600"}},
            grid: {display: false}
        },
        y: {
            beginAtZero: true,
            ticks: {color: "#444", font: {size: 12}},
            grid: {color: "#eee"}
        }
        },
        animation: {
        duration: 1200,
        easing: "easeOutBounce"
        }
    }
    });

    document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("transactions");
    if (saved) {
        transactions = JSON.parse(saved);
        renderTransactions();
        updateBalance();
    }
    });

    addBtn.addEventListener("click", () => {
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    const type = typeSelect.value;

    if (isNaN(amount) || amount <= 0 || description === "") {
        alert("Please enter a valid amount and description");
        return;
    }

    if (editingId) {
        const tx = transactions.find(t => t.id === editingId);
        if (tx) {
        tx.amount = amount;
        tx.description = description;
        tx.type = type;
        tx.date = new Date().toLocaleString();
        }
        editingId = null;
    } else {
        const transaction = {
        id: Date.now().toString(),
        amount,
        description,
        type,
        date: new Date().toLocaleString()
        };
        transactions.push(transaction);
    }

    saveTransactions();
    renderTransactions();
    updateBalance();

    amountInput.value = "";
    descriptionInput.value = "";
    });

    // Export CSV
    exportBtn.addEventListener("click", () => {
    let csv = "Amount,Description,Type,Date\n";
    transactions.forEach(tx => {
        csv += `${tx.amount},${tx.description},${tx.type},${tx.date}\n`;
    });
    const blob = new Blob([csv], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget_transactions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    });

    // Import CSV
    importBtn.addEventListener("click", () => {
    importFile.click();
    });

    importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const lines = event.target.result.split("\n").filter(l => l.trim());
        const imported = [];
        for (let i = 1; i < lines.length; i++) {
        const [amount, description, type, date] = lines[i].split(",");
        if (amount && description && type && date) {
            imported.push({
            id: Date.now().toString() + i,
            amount: parseFloat(amount),
            description,
            type,
            date
            });
        }
        }
        if (imported.length) {
        transactions = imported;
        saveTransactions();
        renderTransactions();
        updateBalance();
        alert("Transactions imported!");
        } else {
        alert("No valid transactions found in CSV.");
        }
    }
    reader.readAsText(file);
    });

    // Render Transactions as Table
    function renderTransactions() {
    transactionTable.innerHTML = `
        <tr>
        <th>Description</th>
        <th>Amount</th>
        <th>Type</th>
        <th>Date</th>
        <th>Actions</th>
        </tr>
    `;
    transactions.forEach(tx => {
        const tr = document.createElement("tr");
        tr.className = tx.type;
        tr.innerHTML = `
        <td>${tx.description}</td>
        <td>${tx.type === 'income' ? '+' : '-'}${tx.amount}</td>
        <td>${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td>
        <td>${tx.date}</td>
        <td>
            <button class="deleteBtn">Delete</button>
            <button class="editBtn">Edit</button>
        </td>
        `;
        tr.querySelector(".deleteBtn").addEventListener("click", () => {
        lastDeleted = {...tx};
        transactions = transactions.filter(t => t.id !== tx.id);
        saveTransactions();
        renderTransactions();
        updateBalance();
        showUndo();
        });
        tr.querySelector(".editBtn").addEventListener("click", () => {
        amountInput.value = tx.amount;
        descriptionInput.value = tx.description;
        typeSelect.value = tx.type;
        editingId = tx.id;
        });
        transactionTable.appendChild(tr);
    });
    }

    // Undo logic with timer
    function showUndo() {
    clearInterval(undoInterval);
    let secondsLeft = 5;
    undoArea.innerHTML = `<button id="undoBtn">Undo Delete</button> 
                            <span id="undoTimer" style="margin-left:10px; font-weight:bold; color:#333;">(${secondsLeft}s)</span>`;
    const undoBtn = document.getElementById("undoBtn");
    const undoTimer = document.getElementById("undoTimer");

    undoInterval = setInterval(() => {
        secondsLeft -= 1;
        undoTimer.textContent = `(${secondsLeft}s)`;
        if (secondsLeft <= 0) {
        clearInterval(undoInterval);
        undoArea.innerHTML = "";
        lastDeleted = null;
        }
    }, 1000);

    undoBtn.onclick = () => {
        clearInterval(undoInterval);
        if(lastDeleted) {
        transactions.push(lastDeleted);
        saveTransactions();
        renderTransactions();
        updateBalance();
        lastDeleted = null;
        }
        undoArea.innerHTML = "";
    };
    }

    function updateBalance() {
    let income = 0, expense = 0;
    transactions.forEach(tx => {
        if (tx.type === "income") income += tx.amount;
        else expense += tx.amount;
    });

    incomeAmount.textContent = `${income}`;
    expenseAmount.textContent = `${expense}`;
    balanceAmount.textContent = `${income - expense}`;

    budgetChart.data.datasets[0].data = [income, expense];
    budgetChart.update();
    }

    function saveTransactions() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
    }

    resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all data?")) {
        transactions = [];
        saveTransactions();
        renderTransactions();
        updateBalance();
        editingId = null;
        amountInput.value = "";
        descriptionInput.value = "";
    }
    });
    // Export CSV