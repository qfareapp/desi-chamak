(function () {
    var STORAGE_KEY = "desi_chamak_cart";

    function safeParse(json) {
        try {
            return JSON.parse(json);
        } catch (_error) {
            return [];
        }
    }

    function normalizeQuantity(value) {
        var quantity = parseInt(value, 10);
        return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    }

    function readCart() {
        return safeParse(window.localStorage.getItem(STORAGE_KEY)).filter(function (item) {
            return item && item.id;
        }).map(function (item) {
            return {
                id: item.id,
                slug: item.slug || "",
                name: item.name || "Product",
                image: item.image || "",
                price: Number(item.price || 0),
                quantity: normalizeQuantity(item.quantity),
                link: item.link || (item.slug ? "product-details.html?slug=" + encodeURIComponent(item.slug) : "product-details.html")
            };
        });
    }

    function writeCart(cart) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        document.dispatchEvent(new CustomEvent("cart:updated", {
            detail: {
                cart: cart.slice()
            }
        }));
    }

    function getItemCount(cart) {
        return (cart || readCart()).reduce(function (sum, item) {
            return sum + normalizeQuantity(item.quantity);
        }, 0);
    }

    function setBagLinksAndCounts() {
        var cart = readCart();
        var count = getItemCount(cart);
        var bagAnchors = Array.prototype.filter.call(document.querySelectorAll(".header__right__widget a, .offcanvas__widget a"), function (anchor) {
            return anchor.querySelector(".icon_bag_alt");
        });

        bagAnchors.forEach(function (anchor) {
            anchor.setAttribute("href", "./shop-cart.html");

            var tip = anchor.querySelector(".tip");
            if (!tip) {
                tip = document.createElement("div");
                tip.className = "tip";
                anchor.appendChild(tip);
            }

            tip.textContent = String(count);
            tip.style.display = count > 0 ? "block" : "none";
        });
    }

    function addItem(item) {
        var cart = readCart();
        var existing = cart.find(function (entry) {
            return entry.id === item.id;
        });
        var quantity = normalizeQuantity(item.quantity);

        if (existing) {
            existing.quantity += quantity;
            existing.price = Number(item.price || existing.price || 0);
            existing.name = item.name || existing.name;
            existing.image = item.image || existing.image;
            existing.slug = item.slug || existing.slug;
            existing.link = item.link || existing.link;
        } else {
            cart.push({
                id: item.id,
                slug: item.slug || "",
                name: item.name || "Product",
                image: item.image || "",
                price: Number(item.price || 0),
                quantity: quantity,
                link: item.link || (item.slug ? "product-details.html?slug=" + encodeURIComponent(item.slug) : "product-details.html")
            });
        }

        writeCart(cart);
        return cart;
    }

    function updateItemQuantity(id, quantity) {
        var cart = readCart();
        var nextQty = normalizeQuantity(quantity);

        cart = cart.map(function (item) {
            if (item.id === id) {
                item.quantity = nextQty;
            }
            return item;
        });

        writeCart(cart);
        return cart;
    }

    function removeItem(id) {
        var cart = readCart().filter(function (item) {
            return item.id !== id;
        });

        writeCart(cart);
        return cart;
    }

    window.DesiChamakCart = {
        read: readCart,
        write: writeCart,
        addItem: addItem,
        updateItemQuantity: updateItemQuantity,
        removeItem: removeItem,
        getItemCount: getItemCount,
        syncBadges: setBagLinksAndCounts
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setBagLinksAndCounts);
    } else {
        setBagLinksAndCounts();
    }

    document.addEventListener("cart:updated", setBagLinksAndCounts);
})();
