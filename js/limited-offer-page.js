(function () {
    var API_BASE = "http://localhost:5000/api";
    var defaults = {
        discountLabel: "Limited Offer",
        discountPercent: 20,
        headline: "Festive Oxidised",
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

    function badgeMarkup(label) {
        return '<div class="label sale">' + escapeHtml(label) + "</div>";
    }

    function ratingHtml() {
        return '<i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i>';
    }

    function normalizeSection(payload) {
        var source = payload || {};
        return {
            discountLabel: source.discountLabel || defaults.discountLabel,
            discountPercent: Number(source.discountPercent || defaults.discountPercent),
            headline: source.headline || defaults.headline,
            productIds: Array.isArray(source.productIds) ? source.productIds.slice() : []
        };
    }

    function normalizeProduct(product) {
        return {
            _id: product._id,
            slug: product.slug || "",
            name: product.name || "",
            image: product.media && (product.media.heroImage || (product.media.thumbnails && product.media.thumbnails[0])) || "",
            cost: product.price && product.price.cost ? Number(product.price.cost) : null,
            compareAt: product.price && product.price.compareAt ? Number(product.price.compareAt) : null,
            selling: product.price && product.price.selling ? Number(product.price.selling) : 0
        };
    }

    function getBasePrice(product) {
        return product.cost || product.compareAt || product.selling || 0;
    }

    function getDiscountedPrice(product, discountPercent) {
        return Math.max(0, Math.round(getBasePrice(product) * (100 - discountPercent)) / 100);
    }

    function renderPage(section, allProducts) {
        var title = document.getElementById("offer-page-title");
        var copy = document.getElementById("offer-page-copy");
        var breadcrumbTitle = document.getElementById("offer-breadcrumb-title");
        var grid = document.getElementById("limited-offer-grid");
        var selectedProducts = section.productIds.map(function (productId) {
            return allProducts.find(function (product) {
                return product._id === productId;
            });
        }).filter(Boolean);

        title.textContent = section.headline;
        breadcrumbTitle.textContent = section.headline;
        copy.textContent = section.discountPercent + "% off selected products from the festive limited-offer drop.";

        if (!selectedProducts.length) {
            grid.innerHTML = '<div class="col-12 text-center">No limited-offer products selected yet.</div>';
            return;
        }

        grid.innerHTML = selectedProducts.map(function (product) {
            return [
                '<div class="col-lg-4 col-md-6 col-sm-6">',
                '<div class="product__item sale">',
                '<div class="product__item__pic" style="background-image: url(\'' + escapeHtml(product.image) + '\'); background-size: cover; background-position: center;">',
                badgeMarkup(section.discountPercent + "% OFF"),
                '<ul class="product__hover">',
                '<li><a href="' + escapeHtml(product.image) + '" class="image-popup"><span class="arrow_expand"></span></a></li>',
                '<li><a href="#"><span class="icon_heart_alt"></span></a></li>',
                '<li><a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '"><span class="icon_bag_alt"></span></a></li>',
                "</ul>",
                "</div>",
                '<div class="product__item__text">',
                '<h6><a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '">' + escapeHtml(product.name) + "</a></h6>",
                '<div class="rating">' + ratingHtml() + "</div>",
                '<div class="product__price">' + formatPrice(getDiscountedPrice(product, section.discountPercent)) + " <span>" + formatPrice(getBasePrice(product)) + "</span></div>",
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
                fetch(API_BASE + "/content-sections/promotions"),
                fetch(API_BASE + "/products")
            ]);

            if (!responses[0].ok || !responses[1].ok) {
                throw new Error("Unable to load limited-offer products.");
            }

            var section = normalizeSection((await responses[0].json()).payload);
            var products = (await responses[1].json()).map(normalizeProduct);
            renderPage(section, products);
        } catch (_error) {
            renderPage(normalizeSection(defaults), []);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadPage);
    } else {
        loadPage();
    }
})();
