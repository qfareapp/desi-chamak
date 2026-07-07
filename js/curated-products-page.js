(function () {
    var API_BASE = "http://localhost:5000/api";
    var defaults = {
        title: "Curated sets",
        anchorId: "journal",
        productIds: []
    };

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function formatPrice(value) {
        return "Rs. " + Number(value || 0).toLocaleString("en-IN");
    }

    function badgeMarkup(badge) {
        if (!badge) {
            return "";
        }

        var normalized = String(badge).toLowerCase();
        var className = "label";

        if (normalized === "new") {
            className += " new";
        } else if (normalized === "sold out") {
            className += " stockout";
        } else if (normalized === "set" || normalized === "sale") {
            className += " sale";
        }

        return '<div class="' + className + '">' + escapeHtml(badge) + "</div>";
    }

    function ratingHtml() {
        return '<i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i>';
    }

    function normalizeProduct(product) {
        return {
            _id: product._id,
            slug: product.slug || "",
            name: product.name || "",
            image: product.media && (product.media.heroImage || (product.media.thumbnails && product.media.thumbnails[0])) || "",
            price: product.price && product.price.selling ? Number(product.price.selling) : 0,
            compareAt: product.price && product.price.compareAt ? Number(product.price.compareAt) : null,
            badge: product.badge || ""
        };
    }

    function normalizeSection(payload) {
        var source = payload || {};
        return {
            title: source.title || defaults.title,
            anchorId: source.anchorId || defaults.anchorId,
            productIds: Array.isArray(source.productIds) ? source.productIds.slice() : []
        };
    }

    function renderProducts(section, allProducts) {
        var grid = document.getElementById("curated-products-grid");
        var title = document.getElementById("curated-page-title");
        var breadcrumbTitle = document.getElementById("curated-breadcrumb-title");
        var copy = document.getElementById("curated-page-copy");
        var selectedProducts = section.productIds.map(function (productId) {
            return allProducts.find(function (product) {
                return product._id === productId;
            });
        }).filter(Boolean);

        title.textContent = section.title;
        breadcrumbTitle.textContent = section.title;
        copy.textContent = "Products selected from the curated homepage section.";

        if (!selectedProducts.length) {
            grid.innerHTML = '<div class="col-12 text-center">No curated products selected yet.</div>';
            return;
        }

        grid.innerHTML = selectedProducts.map(function (product) {
            return [
                '<div class="col-lg-4 col-md-6 col-sm-6">',
                '<div class="product__item' + ((product.badge || "").toLowerCase() === "set" ? " sale" : "") + '">',
                '<div class="product__item__pic" style="background-image: url(\'' + escapeHtml(product.image) + '\'); background-size: cover; background-position: center;">',
                badgeMarkup(product.badge),
                '<ul class="product__hover">',
                '<li><a href="' + escapeHtml(product.image) + '" class="image-popup"><span class="arrow_expand"></span></a></li>',
                '<li><a href="#"><span class="icon_heart_alt"></span></a></li>',
                '<li><a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '"><span class="icon_bag_alt"></span></a></li>',
                "</ul>",
                "</div>",
                '<div class="product__item__text">',
                '<h6><a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '">' + escapeHtml(product.name) + "</a></h6>",
                '<div class="rating">' + ratingHtml() + "</div>",
                '<div class="product__price">' + formatPrice(product.price) + (product.compareAt ? " <span>" + formatPrice(product.compareAt) + "</span>" : "") + "</div>",
                "</div>",
                "</div>",
                "</div>"
            ].join("");
        }).join("");

        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.magnificPopup) {
            window.jQuery(".image-popup").magnificPopup({ type: "image" });
        }
    }

    async function loadPage() {
        try {
            var responses = await Promise.all([
                fetch(API_BASE + "/content-sections/curated"),
                fetch(API_BASE + "/products")
            ]);

            if (!responses[0].ok || !responses[1].ok) {
                throw new Error("Unable to load curated products.");
            }

            var section = normalizeSection((await responses[0].json()).payload);
            var products = (await responses[1].json()).map(normalizeProduct);
            renderProducts(section, products);
        } catch (_error) {
            renderProducts(normalizeSection(defaults), []);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadPage);
    } else {
        loadPage();
    }
})();
