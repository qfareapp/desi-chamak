(function () {
    var orders = [];
    var selectedOrderId = "";

    var statusNode = document.getElementById("orders-status");
    var tableBody = document.getElementById("orders-table-body");
    var statToday = document.getElementById("orders-stat-today");
    var statOpen = document.getElementById("orders-stat-open");
    var statFulfillment = document.getElementById("orders-stat-fulfillment");
    var statRevenue = document.getElementById("orders-stat-revenue");
    var emptyPanel = document.getElementById("order-detail-empty");
    var detailPanel = document.getElementById("order-detail-panel");
    var saveButton = document.getElementById("save-order-status-btn");

    var detailFields = {
        id: document.getElementById("order-detail-id"),
        created: document.getElementById("order-detail-created"),
        customer: document.getElementById("order-detail-customer"),
        contact: document.getElementById("order-detail-contact"),
        address: document.getElementById("order-detail-address"),
        items: document.getElementById("order-detail-items"),
        total: document.getElementById("order-detail-total"),
        orderStatus: document.getElementById("order-status-field"),
        paymentStatus: document.getElementById("payment-status-field"),
        fulfillmentStatus: document.getElementById("fulfillment-status-field")
    };

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

    function badgeClass(value) {
        if (value === "paid" || value === "delivered" || value === "fulfilled") {
            return "badge-success";
        }

        if (value === "pending" || value === "confirmed" || value === "packed") {
            return "badge-warning";
        }

        if (value === "dispatched" || value === "shipped") {
            return "badge-info";
        }

        return "badge-secondary";
    }

    function titleCase(value) {
        var normalized = String(value || "").replace(/-/g, " ");
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function setStatus(message, isError) {
        statusNode.textContent = message;
        statusNode.style.color = isError ? "#f4b6b6" : "";
    }

    function getSelectedOrder() {
        return orders.find(function (order) {
            return order.id === selectedOrderId;
        }) || null;
    }

    function renderStats() {
        var metrics = window.DesiChamakOrders ? window.DesiChamakOrders.metrics(orders) : {
            todayOrders: 0,
            openOrders: 0,
            pendingFulfillment: 0,
            totalRevenue: 0
        };

        statToday.textContent = String(metrics.todayOrders || 0);
        statOpen.textContent = String(metrics.openOrders || 0);
        statFulfillment.textContent = String(metrics.pendingFulfillment || 0);
        statRevenue.textContent = formatPrice(metrics.totalRevenue || 0);
    }

    function renderTable() {
        if (!orders.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center muted">No orders placed yet. New checkout orders will appear here automatically.</td></tr>';
            return;
        }

        tableBody.innerHTML = orders.map(function (order) {
            var activeClass = order.id === selectedOrderId ? ' class="active-row"' : "";

            return [
                "<tr" + activeClass + ' data-order-id="' + escapeHtml(order.id) + '">',
                "<td>" + escapeHtml(order.id) + "</td>",
                "<td>" + escapeHtml(order.customerName) + "</td>",
                "<td>" + escapeHtml(order.itemCount) + "</td>",
                "<td>" + formatPrice(order.total) + "</td>",
                '<td><select class="form-control form-control-sm admin-order-status-select" data-order-id="' + escapeHtml(order.id) + '">' +
                    '<option value="confirmed"' + (order.orderStatus === "confirmed" ? " selected" : "") + '>Confirmed</option>' +
                    '<option value="packed"' + (order.orderStatus === "packed" ? " selected" : "") + '>Packed</option>' +
                    '<option value="dispatched"' + (order.orderStatus === "dispatched" ? " selected" : "") + '>Dispatched</option>' +
                    '<option value="delivered"' + (order.orderStatus === "delivered" ? " selected" : "") + '>Delivered</option>' +
                "</select></td>",
                '<td><span class="badge ' + badgeClass(order.paymentStatus) + '">' + escapeHtml(titleCase(order.paymentStatus)) + "</span></td>",
                "<td>" + escapeHtml(formatDate(order.createdAt)) + "</td>",
                "</tr>"
            ].join("");
        }).join("");
    }

    function renderDetail() {
        var order = getSelectedOrder();

        if (!order) {
            emptyPanel.hidden = false;
            detailPanel.hidden = true;
            return;
        }

        emptyPanel.hidden = true;
        detailPanel.hidden = false;
        detailFields.id.textContent = order.id;
        detailFields.created.textContent = formatDate(order.createdAt);
        detailFields.customer.textContent = order.customerName;
        detailFields.contact.textContent = [order.billing.phone, order.billing.email].filter(Boolean).join(" | ") || "-";
        detailFields.address.textContent = [
            order.billing.addressLine1,
            order.billing.addressLine2,
            order.billing.city,
            order.billing.state,
            order.billing.postcode,
            order.billing.country
        ].filter(Boolean).join(", ") || "-";
        detailFields.items.innerHTML = order.items.map(function (item) {
            return "<li>" + escapeHtml(item.name) + " x " + escapeHtml(item.quantity) + ' <span class="muted">' + formatPrice(Number(item.price || 0) * Number(item.quantity || 0)) + "</span></li>";
        }).join("");
        detailFields.total.textContent = formatPrice(order.total);
        detailFields.orderStatus.value = order.orderStatus;
        detailFields.paymentStatus.value = order.paymentStatus;
        detailFields.fulfillmentStatus.value = order.fulfillmentStatus;
    }

    async function renderAll(message, isError) {
        try {
            orders = window.DesiChamakOrders ? await window.DesiChamakOrders.read() : [];
        } catch (error) {
            orders = [];
            renderStats();
            renderTable();
            renderDetail();
            setStatus(error.message || "Unable to load orders.", true);
            return;
        }

        if (!selectedOrderId && orders.length) {
            selectedOrderId = orders[0].id;
        }

        if (selectedOrderId && !getSelectedOrder()) {
            selectedOrderId = orders[0] ? orders[0].id : "";
        }

        renderStats();
        renderTable();
        renderDetail();

        if (message) {
            setStatus(message, Boolean(isError));
        }
    }

    async function saveStatuses() {
        var order = getSelectedOrder();

        if (!order || !window.DesiChamakOrders) {
            return;
        }

        saveButton.disabled = true;
        setStatus("Saving order status...", false);

        var updated = null;

        try {
            updated = await window.DesiChamakOrders.updateOrder(order.id, {
                customerName: order.customerName,
                billing: order.billing,
                items: order.items,
                subtotal: order.subtotal,
                total: order.total,
                paymentFlow: order.paymentFlow,
                orderStatus: detailFields.orderStatus.value,
                paymentStatus: detailFields.paymentStatus.value,
                fulfillmentStatus: detailFields.fulfillmentStatus.value
            });
        } catch (error) {
            saveButton.disabled = false;
            setStatus(error.message || "Unable to save order status.", true);
            return;
        }

        saveButton.disabled = false;

        if (!updated) {
            setStatus("Unable to save order status.", true);
            return;
        }

        await renderAll("Order status updated.");
    }

    tableBody.addEventListener("click", function (event) {
        if (event.target.closest(".admin-order-status-select")) {
            return;
        }

        var row = event.target.closest("tr[data-order-id]");

        if (!row) {
            return;
        }

        selectedOrderId = row.getAttribute("data-order-id");
        renderTable();
        renderDetail();
    });

    tableBody.addEventListener("change", async function (event) {
        var select = event.target.closest(".admin-order-status-select");
        var order;

        if (!select || !window.DesiChamakOrders) {
            return;
        }

        order = orders.find(function (item) {
            return item.id === select.getAttribute("data-order-id");
        });

        if (!order) {
            return;
        }

        setStatus("Updating order status...", false);

        try {
            await window.DesiChamakOrders.updateOrder(order.id, {
                customerName: order.customerName,
                billing: order.billing,
                items: order.items,
                subtotal: order.subtotal,
                total: order.total,
                paymentFlow: order.paymentFlow,
                orderStatus: select.value,
                paymentStatus: order.paymentStatus,
                fulfillmentStatus: order.fulfillmentStatus
            });
            await renderAll("Order status updated.");
        } catch (error) {
            setStatus(error.message || "Unable to update order status.", true);
        }
    });

    saveButton.addEventListener("click", saveStatuses);

    document.addEventListener("orders:updated", function () {
        renderAll("Orders synced from backend.");
    });

    renderAll("Listening for live checkout orders.");
    window.setInterval(function () {
        renderAll();
    }, 5000);
})();
