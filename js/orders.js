(function () {
    function getApiBase() {
        return window.DesiChamakApi ? window.DesiChamakApi.base() : "/api";
    }

    function formatId(value) {
        return String(value || "")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, "") || ("DC-" + Date.now());
    }

    function normalizeItem(item) {
        if (!item || !item.id) {
            return null;
        }

        return {
            id: item.id,
            slug: item.slug || "",
            name: item.name || "Product",
            image: item.image || "",
            price: Number(item.price || 0),
            quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
            link: item.link || (item.slug ? "product-details.html?slug=" + encodeURIComponent(item.slug) : "product-details.html")
        };
    }

    function normalizeOrder(order) {
        if (!order || !(order.id || order.reference)) {
            return null;
        }

        var billing = order.billing || {};
        var items = Array.isArray(order.items) ? order.items.map(normalizeItem).filter(Boolean) : [];
        var subtotal = Number(order.subtotal || items.reduce(function (sum, item) {
            return sum + (Number(item.price || 0) * Number(item.quantity || 0));
        }, 0));
        var total = Number(order.total || subtotal);
        var firstName = String(billing.firstName || "").trim();
        var lastName = String(billing.lastName || "").trim();
        var customerName = String(order.customerName || (firstName + " " + lastName)).trim() || "Customer";

        return {
            id: formatId(order.id || order.reference),
            reference: formatId(order.reference || order.id),
            createdAt: order.createdAt || new Date().toISOString(),
            customerName: customerName,
            billing: {
                firstName: firstName,
                lastName: lastName,
                country: billing.country || "",
                addressLine1: billing.addressLine1 || "",
                addressLine2: billing.addressLine2 || "",
                city: billing.city || "",
                state: billing.state || "",
                postcode: billing.postcode || "",
                phone: billing.phone || "",
                email: billing.email || "",
                notes: billing.notes || ""
            },
            items: items,
            itemCount: Number(order.itemCount || items.reduce(function (sum, item) {
                return sum + Number(item.quantity || 0);
            }, 0)),
            subtotal: subtotal,
            total: total,
            paymentFlow: order.paymentFlow || "confirm-before-payment",
            orderStatus: order.orderStatus || "new",
            paymentStatus: order.paymentStatus || "pending",
            fulfillmentStatus: order.fulfillmentStatus || "unfulfilled"
        };
    }

    function sortOrders(orders) {
        return orders.slice().sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }

    function emitOrdersUpdated(orders) {
        var event;

        if (typeof window.CustomEvent === "function") {
            event = new CustomEvent("orders:updated", {
                detail: {
                    orders: orders.slice()
                }
            });
        } else {
            event = document.createEvent("Event");
            event.initEvent("orders:updated", true, true);
            event.detail = {
                orders: orders.slice()
            };
        }

        document.dispatchEvent(event);
    }

    async function request(path, options) {
        var response = await fetch(getApiBase() + path, options || {});
        var payload = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            throw new Error(payload.error || "Unable to process order request.");
        }

        return payload;
    }

    async function readOrders(filters) {
        var params = new URLSearchParams();

        if (filters && filters.reference) {
            params.set("reference", filters.reference);
        }

        if (filters && filters.email) {
            params.set("email", filters.email);
        }

        if (filters && filters.phone) {
            params.set("phone", filters.phone);
        }

        var payload = await request("/orders" + (params.toString() ? "?" + params.toString() : ""));
        return sortOrders((payload || []).map(normalizeOrder).filter(Boolean));
    }

    async function createOrder(order) {
        var payload = await request("/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(order)
        });
        var normalized = normalizeOrder(payload);

        if (normalized) {
            emitOrdersUpdated(await readOrders());
        }

        return normalized;
    }

    async function updateOrder(orderId, patch) {
        var payload = await request("/orders/" + encodeURIComponent(orderId), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: orderId,
                ...patch
            })
        });
        var normalized = normalizeOrder(payload);

        if (normalized) {
            emitOrdersUpdated(await readOrders());
        }

        return normalized;
    }

    function getMetrics(orders) {
        var list = orders || readOrders();
        var today = new Date();
        var todayKey = today.toISOString().slice(0, 10);

        return list.reduce(function (metrics, order) {
            metrics.totalOrders += 1;
            metrics.totalRevenue += Number(order.total || 0);

            if ((order.createdAt || "").slice(0, 10) === todayKey) {
                metrics.todayOrders += 1;
            }

            if (order.orderStatus === "new" || order.orderStatus === "confirmed") {
                metrics.openOrders += 1;
            }

            if (order.fulfillmentStatus !== "fulfilled") {
                metrics.pendingFulfillment += 1;
            }

            return metrics;
        }, {
            totalOrders: 0,
            todayOrders: 0,
            totalRevenue: 0,
            openOrders: 0,
            pendingFulfillment: 0
        });
    }

    window.DesiChamakOrders = {
        read: readOrders,
        createOrder: createOrder,
        updateOrder: updateOrder,
        metrics: getMetrics
    };
})();
