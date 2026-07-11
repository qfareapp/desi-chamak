(function () {
    var CUSTOMER_KEY = "desi_chamak_customer_orders";

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

    function titleCase(value) {
        var normalized = String(value || "").replace(/-/g, " ");
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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

    function statusClass(value) {
        if (value === "delivered") {
            return "badge-success";
        }

        if (value === "dispatched") {
            return "badge-info";
        }

        return "badge-warning";
    }

    function readCustomerContext() {
        try {
            return JSON.parse(window.localStorage.getItem(CUSTOMER_KEY) || "{}");
        } catch (_error) {
            return {};
        }
    }

    function setStatus(message, isError) {
        var node = document.getElementById("orders-page-status");
        if (!node) {
            return;
        }

        node.textContent = message;
        node.style.color = isError ? "#c0392b" : "";
    }

    function renderOrders(orders) {
        var container = document.getElementById("customer-orders-list");

        if (!container) {
            return;
        }

        if (!orders.length) {
            container.innerHTML = '<div class="col-12"><div class="text-center p-5 border">No orders found for the details provided.</div></div>';
            return;
        }

        container.innerHTML = orders.map(function (order) {
            var itemsMarkup = order.items.map(function (item) {
                return [
                    '<li class="customer-order__item">',
                    '<span>' + escapeHtml(item.name) + " x " + escapeHtml(item.quantity) + "</span>",
                    '<span>' + formatPrice(Number(item.price || 0) * Number(item.quantity || 0)) + "</span>",
                    "</li>"
                ].join("");
            }).join("");

            return [
                '<div class="col-12">',
                '<div class="customer-order card">',
                '<div class="customer-order__head">',
                '<div><h5>' + escapeHtml(order.reference || order.id) + '</h5><p class="mb-0 muted">' + escapeHtml(formatDate(order.createdAt)) + "</p></div>",
                '<span class="badge ' + statusClass(order.orderStatus) + '">' + escapeHtml(titleCase(order.orderStatus)) + "</span>",
                "</div>",
                '<div class="customer-order__meta">',
                '<span><strong>Name:</strong> ' + escapeHtml(order.customerName) + "</span>",
                '<span><strong>Total:</strong> ' + formatPrice(order.total) + "</span>",
                "</div>",
                '<ul class="detail-list customer-order__items">' + itemsMarkup + "</ul>",
                "</div>",
                "</div>"
            ].join("");
        }).join("");
    }

    async function loadOrders(filters, initialLoad) {
        if (!window.DesiChamakOrders) {
            return;
        }

        var normalizedFilters = {
            reference: filters && filters.reference ? filters.reference.trim() : "",
            email: filters && filters.email ? filters.email.trim() : "",
            phone: filters && filters.phone ? filters.phone.trim() : ""
        };

        if (!normalizedFilters.reference && !normalizedFilters.email && !normalizedFilters.phone) {
            renderOrders([]);
            setStatus(initialLoad ? "Place an order, or search using your order details." : "Enter order reference, email, or phone to view your orders.", false);
            return;
        }

        setStatus("Loading orders...", false);

        try {
            var orders = await window.DesiChamakOrders.read(normalizedFilters);
            renderOrders(orders);
            setStatus(orders.length ? "Orders loaded." : (initialLoad ? "Place an order, or search using your order details." : "No matching orders found."), false);
        } catch (error) {
            renderOrders([]);
            setStatus(error.message || "Unable to load orders.", true);
        }
    }

    async function loadMyOrders(initialLoad) {
        if (!window.DesiChamakOrders || !window.DesiChamakOrders.readMine) {
            return;
        }

        setStatus("Loading your account orders...", false);

        try {
            var orders = await window.DesiChamakOrders.readMine();
            renderOrders(orders);
            setStatus(orders.length ? "Your account orders are loaded." : "No orders found for this account yet.", false);
        } catch (error) {
            renderOrders([]);
            setStatus(
                initialLoad
                    ? "Sign in to your account or search using order reference, email, or phone."
                    : (error.message || "Unable to load account orders."),
                Boolean(!initialLoad)
            );
        }
    }

    function bindForm() {
        var form = document.getElementById("customer-orders-form");

        if (!form) {
            return;
        }

        var referenceField = document.getElementById("customer-order-reference");
        var emailField = document.getElementById("customer-order-email");
        var phoneField = document.getElementById("customer-order-phone");
        var context = readCustomerContext();
        var session = window.DesiChamakAuth && window.DesiChamakAuth.current
            ? window.DesiChamakAuth.current()
            : null;

        referenceField.value = context.reference || "";
        emailField.value = (context.email || (session && session.email) || "");
        phoneField.value = (context.phone || (session && session.phone) || "");

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!referenceField.value.trim() && !emailField.value.trim() && !phoneField.value.trim() && session) {
                loadMyOrders(false);
                return;
            }

            loadOrders({
                reference: referenceField.value.trim(),
                email: emailField.value.trim(),
                phone: phoneField.value.trim()
            }, false);
        });

        if (session) {
            loadMyOrders(true);
            return;
        }

        loadOrders({
            reference: context.reference || "",
            email: context.email || "",
            phone: context.phone || ""
        }, true);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindForm);
    } else {
        bindForm();
    }
})();
