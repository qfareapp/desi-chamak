(function () {
    var customers = [];
    var selectedCustomerId = "";

    var statusNode = document.getElementById("customers-status");
    var tableBody = document.getElementById("customers-table-body");
    var statTotal = document.getElementById("customers-stat-total");
    var statBuyers = document.getElementById("customers-stat-buyers");
    var statOrders = document.getElementById("customers-stat-orders");
    var statRevenue = document.getElementById("customers-stat-revenue");
    var emptyPanel = document.getElementById("customer-detail-empty");
    var detailPanel = document.getElementById("customer-detail-panel");
    var viewOrdersLink = document.getElementById("customer-view-orders-link");

    var detailFields = {
        name: document.getElementById("customer-detail-name"),
        email: document.getElementById("customer-detail-email"),
        phone: document.getElementById("customer-detail-phone"),
        created: document.getElementById("customer-detail-created"),
        lastOrder: document.getElementById("customer-detail-last-order"),
        orders: document.getElementById("customer-detail-orders"),
        spent: document.getElementById("customer-detail-spent")
    };

    function getApiBase() {
        return window.DesiChamakApi ? window.DesiChamakApi.base() : "/api";
    }

    function formatPrice(value) {
        return "Rs. " + Number(value || 0).toLocaleString("en-IN");
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function formatDate(value) {
        var date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function fullName(customer) {
        return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Customer";
    }

    function setStatus(message, isError) {
        statusNode.textContent = message;
        statusNode.style.color = isError ? "#f4b6b6" : "";
    }

    function getSelectedCustomer() {
        return customers.find(function (customer) {
            return customer.id === selectedCustomerId;
        }) || null;
    }

    async function readCustomers() {
        var response = await fetch(getApiBase() + "/customers");
        var payload = await response.json().catch(function () {
            return [];
        });

        if (!response.ok) {
            throw new Error(payload.error || "Unable to load customers.");
        }

        return Array.isArray(payload) ? payload : [];
    }

    function renderStats() {
        var buyers = customers.filter(function (customer) {
            return Number(customer.totalOrders || 0) > 0;
        }).length;
        var totalOrders = customers.reduce(function (sum, customer) {
            return sum + Number(customer.totalOrders || 0);
        }, 0);
        var revenue = customers.reduce(function (sum, customer) {
            return sum + Number(customer.totalSpent || 0);
        }, 0);

        statTotal.textContent = String(customers.length);
        statBuyers.textContent = String(buyers);
        statOrders.textContent = String(totalOrders);
        statRevenue.textContent = formatPrice(revenue);
    }

    function renderTable() {
        if (!customers.length) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center muted">No customer accounts created yet.</td></tr>';
            return;
        }

        tableBody.innerHTML = customers.map(function (customer) {
            var activeClass = customer.id === selectedCustomerId ? ' class="active-row"' : "";

            return [
                "<tr" + activeClass + ' data-customer-id="' + escapeHtml(customer.id) + '">',
                "<td>" + escapeHtml(fullName(customer)) + "</td>",
                "<td>" + escapeHtml(customer.email || "-") + "</td>",
                "<td>" + escapeHtml(customer.phone || "-") + "</td>",
                "<td>" + escapeHtml(customer.totalOrders || 0) + "</td>",
                "<td>" + formatPrice(customer.totalSpent || 0) + "</td>",
                "<td>" + escapeHtml(formatDate(customer.createdAt)) + "</td>",
                "</tr>"
            ].join("");
        }).join("");
    }

    function renderDetail() {
        var customer = getSelectedCustomer();

        if (!customer) {
            emptyPanel.hidden = false;
            detailPanel.hidden = true;
            return;
        }

        emptyPanel.hidden = true;
        detailPanel.hidden = false;
        detailFields.name.textContent = fullName(customer);
        detailFields.email.textContent = customer.email || "-";
        detailFields.phone.textContent = customer.phone || "-";
        detailFields.created.textContent = formatDate(customer.createdAt);
        detailFields.lastOrder.textContent = formatDate(customer.latestOrderAt);
        detailFields.orders.textContent = String(customer.totalOrders || 0);
        detailFields.spent.textContent = formatPrice(customer.totalSpent || 0);
        viewOrdersLink.setAttribute("href", "orders.html");
    }

    async function renderAll(message, isError) {
        try {
            customers = await readCustomers();
        } catch (error) {
            customers = [];
            renderStats();
            renderTable();
            renderDetail();
            setStatus(error.message || "Unable to load customers.", true);
            return;
        }

        if (!selectedCustomerId && customers.length) {
            selectedCustomerId = customers[0].id;
        }

        if (selectedCustomerId && !getSelectedCustomer()) {
            selectedCustomerId = customers[0] ? customers[0].id : "";
        }

        renderStats();
        renderTable();
        renderDetail();
        setStatus(message || "Customer accounts synced from backend.", Boolean(isError));
    }

    tableBody.addEventListener("click", function (event) {
        var row = event.target.closest("tr[data-customer-id]");

        if (!row) {
            return;
        }

        selectedCustomerId = row.getAttribute("data-customer-id");
        renderTable();
        renderDetail();
    });

    renderAll("Loading live customer accounts.");
    window.setInterval(function () {
        renderAll();
    }, 5000);
})();
