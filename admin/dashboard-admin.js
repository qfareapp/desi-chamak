(function () {
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
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function badgeClass(order) {
        if (order.paymentStatus === "paid" || order.orderStatus === "completed") {
            return "badge-success";
        }

        if (order.orderStatus === "processing" || order.fulfillmentStatus === "shipped") {
            return "badge-info";
        }

        return "badge-warning";
    }

    function badgeLabel(order) {
        if (order.paymentStatus === "paid") {
            return "Paid";
        }

        var value = order.orderStatus || "pending";
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function buildTopProducts(orders) {
        var totals = {};

        (orders || []).forEach(function (order) {
            (order.items || []).forEach(function (item) {
                if (!item || !item.id) {
                    return;
                }

                if (!totals[item.id]) {
                    totals[item.id] = {
                        id: item.id,
                        name: item.name || "Product",
                        sold: 0
                    };
                }

                totals[item.id].sold += Number(item.quantity || 0);
            });
        });

        return Object.keys(totals).map(function (key) {
            return totals[key];
        }).sort(function (a, b) {
            if (b.sold !== a.sold) {
                return b.sold - a.sold;
            }

            return a.name.localeCompare(b.name);
        }).slice(0, 3);
    }

    function buildTasks(orders) {
        var openOrders = 0;
        var pendingPacking = 0;
        var pendingDispatch = 0;
        var paymentPending = 0;

        (orders || []).forEach(function (order) {
            if (order.orderStatus === "new" || order.orderStatus === "confirmed") {
                openOrders += 1;
            }

            if (order.orderStatus === "packed") {
                pendingDispatch += 1;
            }

            if (order.fulfillmentStatus !== "fulfilled" && order.orderStatus !== "packed" && order.orderStatus !== "dispatched" && order.orderStatus !== "delivered") {
                pendingPacking += 1;
            }

            if (order.paymentStatus === "pending") {
                paymentPending += 1;
            }
        });

        return [
            {
                label: openOrders ? "Review open orders" : "Open orders are under control",
                meta: openOrders ? String(openOrders) + " active" : "Clear"
            },
            {
                label: pendingPacking ? "Pack pending fulfillment queue" : "Packing queue is clear",
                meta: pendingPacking ? String(pendingPacking) + " to pack" : "Clear"
            },
            {
                label: pendingDispatch ? "Dispatch packed orders" : "Packed orders already moved",
                meta: pendingDispatch ? String(pendingDispatch) + " ready" : "Clear"
            },
            {
                label: paymentPending ? "Review payment pending orders" : "Payments are reconciled",
                meta: paymentPending ? String(paymentPending) + " pending" : "Clear"
            }
        ];
    }

    function renderTopProducts(orders) {
        var list = document.getElementById("dashboard-top-products");
        var topProducts = buildTopProducts(orders);

        if (!list) {
            return;
        }

        if (!topProducts.length) {
            list.innerHTML = '<li><span class="muted">No product sales yet. Top products will appear after checkout orders come in.</span></li>';
            return;
        }

        list.innerHTML = topProducts.map(function (product) {
            return "<li><span>" + escapeHtml(product.name) + "</span><span class=\"muted\">" + escapeHtml(product.sold) + " sold</span></li>";
        }).join("");
    }

    function renderTasks(orders) {
        var list = document.getElementById("dashboard-tasks");
        var tasks = buildTasks(orders);

        if (!list) {
            return;
        }

        list.innerHTML = tasks.map(function (task) {
            return "<li><span>" + escapeHtml(task.label) + "</span><span class=\"muted\">" + escapeHtml(task.meta) + "</span></li>";
        }).join("");
    }

    async function renderDashboard() {
        if (!window.DesiChamakOrders) {
            return;
        }

        var orders = [];
        try {
            orders = await window.DesiChamakOrders.read();
        } catch (_error) {
            orders = [];
        }

        var metrics = window.DesiChamakOrders.metrics(orders);
        var tbody = document.getElementById("dashboard-orders-body");

        document.getElementById("dashboard-stat-today").textContent = String(metrics.todayOrders || 0);
        document.getElementById("dashboard-stat-revenue").textContent = formatPrice(metrics.totalRevenue || 0);
        document.getElementById("dashboard-stat-pending").textContent = String(metrics.pendingFulfillment || 0);
        document.getElementById("dashboard-stat-open").textContent = String(metrics.openOrders || 0);
        renderTopProducts(orders);
        renderTasks(orders);

        if (!tbody) {
            return;
        }

        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center muted">No live orders yet. New checkout orders will appear here automatically.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.slice(0, 6).map(function (order) {
            return [
                "<tr>",
                "<td>" + order.id + "</td>",
                "<td>" + order.customerName + "</td>",
                "<td>" + order.itemCount + "</td>",
                "<td>" + formatPrice(order.total) + "</td>",
                '<td><span class="badge ' + badgeClass(order) + '">' + badgeLabel(order) + "</span></td>",
                "<td>" + formatDate(order.createdAt) + "</td>",
                "</tr>"
            ].join("");
        }).join("");
    }

    document.addEventListener("orders:updated", function () {
        renderDashboard();
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderDashboard);
    } else {
        renderDashboard();
    }

    window.setInterval(function () {
        renderDashboard();
    }, 5000);
})();
