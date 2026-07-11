(function () {
    var DRAFT_KEY = "desi_chamak_checkout_draft";
    var LAST_ORDER_KEY = "desi_chamak_last_order";

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

    function safeParse(value, fallback) {
        try {
            return JSON.parse(value);
        } catch (_error) {
            return fallback;
        }
    }

    function readDraft() {
        try {
            return safeParse(window.localStorage.getItem(DRAFT_KEY) || "{}", {});
        } catch (_error) {
            return {};
        }
    }

    function writeDraft(data) {
        try {
            window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        } catch (_error) {
        }
    }

    function clearDraft() {
        try {
            window.localStorage.removeItem(DRAFT_KEY);
        } catch (_error) {
        }
    }

    function saveLastOrder(order) {
        try {
            window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
        } catch (_error) {
        }
    }

    function getFormData(form) {
        return {
            firstName: form.querySelector("#billing-first-name").value.trim(),
            lastName: form.querySelector("#billing-last-name").value.trim(),
            country: form.querySelector("#billing-country").value.trim(),
            addressLine1: form.querySelector("#billing-address-line-1").value.trim(),
            addressLine2: form.querySelector("#billing-address-line-2").value.trim(),
            city: form.querySelector("#billing-city").value.trim(),
            state: form.querySelector("#billing-state").value.trim(),
            postcode: form.querySelector("#billing-postcode").value.trim(),
            phone: form.querySelector("#billing-phone").value.trim(),
            email: form.querySelector("#billing-email").value.trim(),
            notes: form.querySelector("#billing-notes").value.trim()
        };
    }

    function hydrateForm(form, draft) {
        Object.keys(draft).forEach(function (key) {
            var field = form.querySelector("[name='" + key + "']");
            if (field) {
                field.value = draft[key];
            }
        });
    }

    function bindDraftPersistence(form) {
        form.addEventListener("input", function () {
            writeDraft(getFormData(form));
        });
    }

    function renderOrderSummary(cart) {
        var list = document.getElementById("checkout-order-items");
        var subtotalNode = document.getElementById("checkout-subtotal");
        var totalNode = document.getElementById("checkout-total");
        var helperNode = document.getElementById("checkout-helper");
        var submitButton = document.getElementById("place-order-btn");
        var subtotal = cart.reduce(function (sum, item) {
            return sum + Number(item.price || 0) * Number(item.quantity || 0);
        }, 0);

        if (!cart.length) {
            list.innerHTML = [
                "<li>",
                '<span class="top__text">Product</span>',
                '<span class="top__text__right">Total</span>',
                "</li>",
                '<li class="checkout__empty">Your bag is empty. <span>Rs. 0</span></li>'
            ].join("");
            helperNode.textContent = "Add products to your bag before placing an order.";
            submitButton.disabled = true;
        } else {
            list.innerHTML = [
                "<li>",
                '<span class="top__text">Product</span>',
                '<span class="top__text__right">Total</span>',
                "</li>"
            ].concat(cart.map(function (item, index) {
                var total = Number(item.price || 0) * Number(item.quantity || 0);
                return '<li>' + String(index + 1).padStart(2, "0") + ". " + escapeHtml(item.name) + " x " + escapeHtml(item.quantity) + "<span>" + formatPrice(total) + "</span></li>";
            })).join("");
            helperNode.textContent = "Your bag details and billing information will be saved when you place the order.";
            submitButton.disabled = false;
        }

        subtotalNode.textContent = formatPrice(subtotal);
        totalNode.textContent = formatPrice(subtotal);
    }

    function setStatus(message, type) {
        var node = document.getElementById("checkout-status");
        if (!node) {
            return;
        }

        node.hidden = false;
        node.className = "checkout__status checkout__status--" + type;
        node.textContent = message;
    }

    function clearStatus() {
        var node = document.getElementById("checkout-status");
        if (!node) {
            return;
        }

        node.hidden = true;
        node.className = "checkout__status";
        node.textContent = "";
    }

    function buildOrder(cart, billing) {
        var total = cart.reduce(function (sum, item) {
            return sum + Number(item.price || 0) * Number(item.quantity || 0);
        }, 0);

        return {
            id: "DC-" + Date.now(),
            createdAt: new Date().toISOString(),
            customerName: (billing.firstName + " " + billing.lastName).trim(),
            billing: billing,
            items: cart,
            subtotal: total,
            total: total,
            paymentFlow: "confirm-before-payment",
            orderStatus: "new",
            paymentStatus: "pending",
            fulfillmentStatus: "unfulfilled"
        };
    }

    function bindCheckoutSubmit(form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            clearStatus();

            var cart = window.DesiChamakCart ? window.DesiChamakCart.read() : [];
            if (!cart.length) {
                setStatus("Your bag is empty. Add products before placing an order.", "error");
                return;
            }

            if (!form.reportValidity()) {
                setStatus("Please complete all required billing fields.", "error");
                return;
            }

            var billing = getFormData(form);
            var order = buildOrder(cart, billing);
            var savedOrder = window.DesiChamakOrders && window.DesiChamakOrders.createOrder
                ? await window.DesiChamakOrders.createOrder(order)
                : order;

            if (!savedOrder) {
                setStatus("Unable to save the order right now. Please try again.", "error");
                return;
            }

            saveLastOrder(savedOrder);
            clearDraft();
            if (window.DesiChamakCart && window.DesiChamakCart.write) {
                window.DesiChamakCart.write([]);
            }
            form.reset();
            setStatus("Order placed. Reference: " + (savedOrder.reference || savedOrder.id), "success");
            renderOrderSummary([]);
        });
    }

    function initCheckout() {
        var form = document.getElementById("checkout-form");
        if (!form) {
            return;
        }

        hydrateForm(form, readDraft());
        bindDraftPersistence(form);
        bindCheckoutSubmit(form);
        renderOrderSummary(window.DesiChamakCart ? window.DesiChamakCart.read() : []);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCheckout);
    } else {
        initCheckout();
    }

    document.addEventListener("cart:updated", function () {
        renderOrderSummary(window.DesiChamakCart ? window.DesiChamakCart.read() : []);
    });
})();
