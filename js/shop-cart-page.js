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

    function renderCart() {
        if (!window.DesiChamakCart) {
            return;
        }

        var cart = window.DesiChamakCart.read();
        var tbody = document.getElementById("shop-cart-body");
        var subtotal = cart.reduce(function (sum, item) {
            return sum + (Number(item.price || 0) * Number(item.quantity || 0));
        }, 0);

        if (!tbody) {
            return;
        }

        if (!cart.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Your bag is empty.</td></tr>';
        } else {
            tbody.innerHTML = cart.map(function (item) {
                var total = Number(item.price || 0) * Number(item.quantity || 0);

                return [
                    '<tr data-cart-id="' + escapeHtml(item.id) + '">',
                    '<td class="cart__product__item">',
                    '<img src="' + escapeHtml(item.image || "img/product/product-1.jpg") + '" alt="' + escapeHtml(item.name) + '">',
                    '<div class="cart__product__item__title">',
                    '<h6><a href="' + escapeHtml(item.link) + '">' + escapeHtml(item.name) + '</a></h6>',
                    "</div>",
                    "</td>",
                    '<td class="cart__price">' + formatPrice(item.price) + "</td>",
                    '<td class="cart__quantity">',
                    '<div class="pro-qty" data-cart-qty="' + escapeHtml(item.id) + '">',
                    '<span class="dec qtybtn' + (Number(item.quantity) <= 1 ? " disabled" : "") + '">-</span>',
                    '<input type="text" value="' + escapeHtml(item.quantity) + '" inputmode="numeric">',
                    '<span class="inc qtybtn">+</span>',
                    "</div>",
                    "</td>",
                    '<td class="cart__total">' + formatPrice(total) + "</td>",
                    '<td class="cart__close"><button type="button" class="cart-remove-btn" data-cart-remove="' + escapeHtml(item.id) + '" aria-label="Remove item"><span class="icon_close"></span></button></td>',
                    "</tr>"
                ].join("");
            }).join("");
        }

        document.getElementById("cart-subtotal").textContent = formatPrice(subtotal);
        document.getElementById("cart-total").textContent = formatPrice(subtotal);
    }

    function bindCartEvents() {
        var table = document.getElementById("shop-cart-table");
        if (!table) {
            return;
        }

        table.addEventListener("click", function (event) {
            if (!window.DesiChamakCart) {
                return;
            }

            var removeButton = event.target.closest("[data-cart-remove]");
            if (removeButton) {
                window.DesiChamakCart.removeItem(removeButton.getAttribute("data-cart-remove"));
                return;
            }

            var qtyWrap = event.target.closest("[data-cart-qty]");
            var qtyButton = event.target.closest(".qtybtn");
            if (!qtyWrap || !qtyButton || qtyButton.classList.contains("disabled")) {
                return;
            }

            var input = qtyWrap.querySelector("input");
            var current = parseInt(input.value, 10) || 1;
            var next = qtyButton.classList.contains("inc") ? current + 1 : Math.max(1, current - 1);
            window.DesiChamakCart.updateItemQuantity(qtyWrap.getAttribute("data-cart-qty"), next);
        });

        table.addEventListener("change", function (event) {
            var qtyWrap = event.target.closest("[data-cart-qty]");
            if (!window.DesiChamakCart || !qtyWrap || event.target.tagName !== "INPUT") {
                return;
            }

            window.DesiChamakCart.updateItemQuantity(qtyWrap.getAttribute("data-cart-qty"), event.target.value);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            renderCart();
            bindCartEvents();
        });
    } else {
        renderCart();
        bindCartEvents();
    }

    document.addEventListener("cart:updated", renderCart);
})();
