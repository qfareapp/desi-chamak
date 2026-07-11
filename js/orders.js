(function () {
    var STORAGE_KEY = "desi_chamak_orders";

    function safeParse(json) {
        try {
            return JSON.parse(json);
        } catch (_error) {
            return [];
        }
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
        if (!order || !order.id) {
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
            id: formatId(order.id),
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
            itemCount: items.reduce(function (sum, item) {
                return sum + Number(item.quantity || 0);
            }, 0),
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

    function readOrders() {
        var raw = "[]";

        try {
            raw = window.localStorage.getItem(STORAGE_KEY) || "[]";
        } catch (_error) {
            raw = "[]";
        }

        return sortOrders(safeParse(raw).map(normalizeOrder).filter(Boolean));
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

    function writeOrders(orders) {
        var normalized = sortOrders((orders || []).map(normalizeOrder).filter(Boolean));

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            emitOrdersUpdated(normalized);
            return true;
        } catch (_error) {
            return false;
        }
    }

    function createOrder(order) {
        var orders = readOrders();
        var normalized = normalizeOrder(order);

        if (!normalized) {
            return null;
        }

        orders.unshift(normalized);
        return writeOrders(orders) ? normalized : null;
    }

    function updateOrder(orderId, patch) {
        var orders = readOrders();
        var updatedOrder = null;

        orders = orders.map(function (order) {
            if (order.id !== orderId) {
                return order;
            }

            updatedOrder = normalizeOrder({
                id: order.id,
                createdAt: order.createdAt,
                customerName: patch && patch.customerName !== undefined ? patch.customerName : order.customerName,
                billing: patch && patch.billing ? Object.assign({}, order.billing, patch.billing) : order.billing,
                items: patch && patch.items ? patch.items : order.items,
                subtotal: patch && patch.subtotal !== undefined ? patch.subtotal : order.subtotal,
                total: patch && patch.total !== undefined ? patch.total : order.total,
                paymentFlow: patch && patch.paymentFlow !== undefined ? patch.paymentFlow : order.paymentFlow,
                orderStatus: patch && patch.orderStatus !== undefined ? patch.orderStatus : order.orderStatus,
                paymentStatus: patch && patch.paymentStatus !== undefined ? patch.paymentStatus : order.paymentStatus,
                fulfillmentStatus: patch && patch.fulfillmentStatus !== undefined ? patch.fulfillmentStatus : order.fulfillmentStatus
            });

            return updatedOrder;
        });

        return updatedOrder && writeOrders(orders) ? updatedOrder : null;
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
        write: writeOrders,
        createOrder: createOrder,
        updateOrder: updateOrder,
        metrics: getMetrics
    };

    window.addEventListener("storage", function (event) {
        if (event.key === STORAGE_KEY) {
            emitOrdersUpdated(readOrders());
        }
    });
})();
