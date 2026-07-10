(function () {
    var STORAGE_KEY = "desi_chamak_wishlist";

    function safeParse(json) {
        try {
            return JSON.parse(json);
        } catch (_error) {
            return [];
        }
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
            link: item.link || (item.slug ? "product-details.html?slug=" + encodeURIComponent(item.slug) : "product-details.html")
        };
    }

    function readWishlist() {
        var raw = "[]";

        try {
            raw = window.localStorage.getItem(STORAGE_KEY) || "[]";
        } catch (_error) {
            raw = "[]";
        }

        return safeParse(raw).map(normalizeItem).filter(Boolean);
    }

    function emitWishlistUpdated(wishlist) {
        var event;

        if (typeof window.CustomEvent === "function") {
            event = new CustomEvent("wishlist:updated", {
                detail: {
                    wishlist: wishlist.slice()
                }
            });
        } else {
            event = document.createEvent("Event");
            event.initEvent("wishlist:updated", true, true);
            event.detail = {
                wishlist: wishlist.slice()
            };
        }

        document.dispatchEvent(event);
    }

    function writeWishlist(wishlist) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
            emitWishlistUpdated(wishlist);
            return true;
        } catch (_error) {
            return false;
        }
    }

    function hasItem(id, wishlist) {
        return (wishlist || readWishlist()).some(function (item) {
            return item.id === id;
        });
    }

    function removeItem(id) {
        var wishlist = readWishlist().filter(function (item) {
            return item.id !== id;
        });

        return writeWishlist(wishlist) ? wishlist : null;
    }

    function addItem(item) {
        var wishlist = readWishlist();

        if (hasItem(item.id, wishlist)) {
            return wishlist;
        }

        wishlist.push(normalizeItem(item));
        return writeWishlist(wishlist) ? wishlist : null;
    }

    function toggleItem(item) {
        if (!item || !item.id) {
            return null;
        }

        if (hasItem(item.id)) {
            return removeItem(item.id);
        }

        return addItem(item);
    }

    function getItemCount(wishlist) {
        return (wishlist || readWishlist()).length;
    }

    function syncButtons() {
        var wishlist = readWishlist();
        var buttons = document.querySelectorAll(".wishlist-toggle, .product__details__wishlist");

        Array.prototype.forEach.call(buttons, function (button) {
            var id = button.getAttribute("data-wishlist-id");
            var active = id ? hasItem(id, wishlist) : false;

            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
            button.setAttribute("aria-label", active ? "Remove from wishlist" : "Add to wishlist");
            button.setAttribute("title", active ? "Remove from wishlist" : "Add to wishlist");
        });
    }

    function syncBadges() {
        var wishlist = readWishlist();
        var count = getItemCount(wishlist);
        var heartAnchors = Array.prototype.filter.call(document.querySelectorAll(".header__right__widget a, .offcanvas__widget a"), function (anchor) {
            return anchor.querySelector(".icon_heart_alt");
        });

        heartAnchors.forEach(function (anchor) {
            anchor.setAttribute("href", "#");

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

    function getItemFromElement(element) {
        return {
            id: element.getAttribute("data-wishlist-id") || "",
            slug: element.getAttribute("data-wishlist-slug") || "",
            name: element.getAttribute("data-wishlist-name") || "Product",
            image: element.getAttribute("data-wishlist-image") || "",
            price: Number(element.getAttribute("data-wishlist-price") || 0),
            link: element.getAttribute("data-wishlist-link") || ""
        };
    }

    function handleToggleClick(event) {
        var button = event.target.closest(".wishlist-toggle, .product__details__wishlist");

        if (!button) {
            return;
        }

        event.preventDefault();

        if (!button.getAttribute("data-wishlist-id")) {
            return;
        }

        toggleItem(getItemFromElement(button));
    }

    window.DesiChamakWishlist = {
        read: readWishlist,
        write: writeWishlist,
        hasItem: hasItem,
        addItem: addItem,
        removeItem: removeItem,
        toggleItem: toggleItem,
        getItemCount: getItemCount,
        syncBadges: syncBadges,
        syncButtons: syncButtons
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            syncBadges();
            syncButtons();
        });
    } else {
        syncBadges();
        syncButtons();
    }

    document.addEventListener("click", handleToggleClick);
    document.addEventListener("wishlist:updated", function () {
        syncBadges();
        syncButtons();
    });
})();
