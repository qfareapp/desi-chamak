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

    function renderWishlist() {
        var body = document.getElementById("wishlist-body");
        var subtotal = document.getElementById("wishlist-subtotal");
        var total = document.getElementById("wishlist-total");

        if (!body || !window.DesiChamakWishlist) {
            return;
        }

        var wishlist = window.DesiChamakWishlist.read();
        var totalValue = wishlist.reduce(function (sum, item) {
            return sum + Number(item.price || 0);
        }, 0);

        if (!wishlist.length) {
            body.innerHTML = '<tr><td colspan="4" class="text-center">Your wishlist is empty.</td></tr>';
            subtotal.textContent = "Rs. 0";
            total.textContent = "Rs. 0";
            return;
        }

        body.innerHTML = wishlist.map(function (item) {
            return [
                "<tr>",
                '<td class="cart__product__item">',
                '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '">',
                '<div class="cart__product__item__title">',
                '<h6><a href="' + escapeHtml(item.link) + '">' + escapeHtml(item.name) + "</a></h6>",
                "</div>",
                "</td>",
                '<td class="cart__price">' + formatPrice(item.price) + "</td>",
                '<td class="cart__view"><a href="' + escapeHtml(item.link) + '" class="primary-btn">View product</a></td>',
                '<td class="cart__close"><span class="icon_close" data-remove-wishlist="' + escapeHtml(item.id) + '" role="button" tabindex="0" aria-label="Remove from wishlist"></span></td>',
                "</tr>"
            ].join("");
        }).join("");

        subtotal.textContent = formatPrice(totalValue);
        total.textContent = formatPrice(totalValue);
    }

    function bindEvents() {
        document.addEventListener("click", function (event) {
            var removeButton = event.target.closest("[data-remove-wishlist]");

            if (!removeButton || !window.DesiChamakWishlist) {
                return;
            }

            event.preventDefault();
            window.DesiChamakWishlist.removeItem(removeButton.getAttribute("data-remove-wishlist"));
            renderWishlist();
        });

        document.addEventListener("wishlist:updated", renderWishlist);
    }

    function init() {
        bindEvents();
        renderWishlist();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
