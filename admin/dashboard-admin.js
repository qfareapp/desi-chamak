(function () {
    function formatPrice(value) {
        return "Rs. " + Number(value || 0).toLocaleString("en-IN");
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

    function renderDashboard() {
        if (!window.DesiChamakOrders) {
            return;
        }

        var orders = window.DesiChamakOrders.read();
        var metrics = window.DesiChamakOrders.metrics(orders);
        var tbody = document.getElementById("dashboard-orders-body");

        document.getElementById("dashboard-stat-today").textContent = String(metrics.todayOrders || 0);
        document.getElementById("dashboard-stat-revenue").textContent = formatPrice(metrics.totalRevenue || 0);
        document.getElementById("dashboard-stat-pending").textContent = String(metrics.pendingFulfillment || 0);
        document.getElementById("dashboard-stat-open").textContent = String(metrics.openOrders || 0);

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

    document.addEventListener("orders:updated", renderDashboard);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderDashboard);
    } else {
        renderDashboard();
    }
})();
