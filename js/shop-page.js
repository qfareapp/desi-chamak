(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var DEFAULT_IMAGE = "img/product/product-1.jpg";
    var defaultFilters = [
        { label: "All", filterClass: "*", anchorId: "", active: true },
        { label: "Necklaces", filterClass: "necklaces", anchorId: "necklaces", active: false },
        { label: "Earrings", filterClass: "earrings", anchorId: "earrings", active: false },
        { label: "Bangles", filterClass: "bangles", anchorId: "bangles", active: false },
        { label: "Anklets", filterClass: "anklets", anchorId: "anklets", active: false },
        { label: "Gift Sets", filterClass: "gift-sets", anchorId: "gift-sets", active: false }
    ];
    var products = [];
    var filters = defaultFilters.slice();
    var activeFilter = "*";

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

    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function getImage(product) {
        if (product.media && product.media.heroImage) {
            return product.media.heroImage;
        }

        if (product.media && Array.isArray(product.media.thumbnails) && product.media.thumbnails[0]) {
            return product.media.thumbnails[0];
        }

        return DEFAULT_IMAGE;
    }

    function getBadgeMarkup(product) {
        var badge = String(product.badge || "").trim();
        if (!badge) {
            return "";
        }

        var normalized = badge.toLowerCase();
        var className = "label";

        if (normalized === "new") {
            className += " new";
        } else if (normalized === "sold out") {
            className += " stockout stockblue";
        } else if (normalized === "sale" || normalized === "set") {
            className += " sale";
        }

        return '<div class="' + className + '">' + escapeHtml(badge) + "</div>";
    }

    function normalizeProduct(product) {
        var categorySlug = slugify(product.category || "");
        var filterClasses = [];

        if (categorySlug) {
            filterClasses.push(categorySlug);
        }

        if ((product.badge || "").toLowerCase() === "set" && filterClasses.indexOf("gift-sets") < 0) {
            filterClasses.push("gift-sets");
        }

        return {
            _id: product._id || "",
            slug: product.slug || "",
            name: product.name || "Untitled Product",
            category: product.category || "Uncategorized",
            status: product.status || "draft",
            filterClasses: filterClasses,
            badge: product.badge || "",
            summary: product.summary || "",
            media: {
                heroImage: product.media && product.media.heroImage || "",
                thumbnails: product.media && Array.isArray(product.media.thumbnails) ? product.media.thumbnails : []
            },
            price: {
                selling: product.price && product.price.selling ? Number(product.price.selling) : 0,
                compareAt: product.price && product.price.compareAt ? Number(product.price.compareAt) : null
            },
            stockQty: Number(product.stockQty || 0)
        };
    }

    function getVisibleProducts() {
        return products.filter(function (product) {
            var storefrontVisible = product.status === "live" || product.status === "sold-out";
            var filterMatch = activeFilter === "*" || product.filterClasses.indexOf(activeFilter) >= 0;
            return storefrontVisible && filterMatch;
        });
    }

    function normalizeFilters(payloadFilters) {
        var source = Array.isArray(payloadFilters) && payloadFilters.length ? payloadFilters : defaultFilters;
        var normalized = source.map(function (filter, index) {
            return {
                label: filter.label || ("Filter " + (index + 1)),
                filterClass: filter.filterClass || "*",
                anchorId: filter.anchorId || "",
                active: index === 0
            };
        }).filter(function (filter) {
            return filter.label;
        });

        if (!normalized.length || normalized[0].filterClass !== "*") {
            normalized.unshift({ label: "All", filterClass: "*", anchorId: "", active: true });
        }

        return normalized;
    }

    function getFilterCount(filterClass) {
        return products.filter(function (product) {
            var storefrontVisible = product.status === "live" || product.status === "sold-out";
            if (!storefrontVisible) {
                return false;
            }

            if (filterClass === "*") {
                return true;
            }

            return product.filterClasses.indexOf(filterClass) >= 0;
        }).length;
    }

    function getFilterLabel(filterClass) {
        if (filterClass === "*") {
            return "All";
        }

        var matchedFilter = filters.find(function (filter) {
            return filter.filterClass === filterClass;
        });

        return matchedFilter ? matchedFilter.label : "All";
    }

    function renderFilters() {
        var controls = document.getElementById("shop-filter-controls");
        if (!controls) {
            return;
        }

        controls.innerHTML = filters.map(function (filter) {
            var isActive = filter.filterClass === activeFilter;
            var filterId = filter.anchorId ? ' id="' + escapeHtml(filter.anchorId) + '"' : "";

            return [
                '<li class="' + (isActive ? "active" : "") + '" data-filter="' + escapeHtml(filter.filterClass) + '"' + filterId + ">",
                escapeHtml(filter.label),
                "</li>"
            ].join("");
        }).join("");
    }

    function renderProducts() {
        var grid = document.getElementById("shop-product-grid");
        var heading = document.getElementById("shop-heading");
        var activeCategoryField = document.getElementById("shop-active-category");
        var totalProductsField = document.getElementById("shop-total-products");
        var visibleProducts = getVisibleProducts();
        var displayCategory = getFilterLabel(activeFilter);

        heading.textContent = displayCategory === "All" ? "All Products" : displayCategory;
        activeCategoryField.value = displayCategory;
        totalProductsField.value = String(visibleProducts.length);

        if (!visibleProducts.length) {
            grid.innerHTML = '<div class="col-12"><div class="text-center p-5 border">No products available in this category yet.</div></div>';
            return;
        }

        grid.innerHTML = visibleProducts.map(function (product) {
            var image = getImage(product);
            var compareAt = product.price.compareAt;
            var soldOut = product.status === "sold-out" || Number(product.stockQty || 0) === 0;

            return [
                '<div class="col-lg-4 col-md-6">',
                '<div class="product__item' + (compareAt ? " sale" : "") + '">',
                '<div class="product__item__pic set-bg" data-setbg="' + escapeHtml(image) + '" style="background-image: url(\'' + escapeHtml(image) + '\');">',
                getBadgeMarkup(product) || (soldOut ? '<div class="label stockout stockblue">Sold Out</div>' : ""),
                '<ul class="product__hover">',
                '<li><a href="' + escapeHtml(image) + '" class="image-popup"><span class="arrow_expand"></span></a></li>',
                '<li><a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '"><span class="icon_bag_alt"></span></a></li>',
                "</ul>",
                "</div>",
                '<div class="product__item__text">',
                '<h6><a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '">' + escapeHtml(product.name) + "</a></h6>",
                '<div class="rating"><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i></div>',
                '<div class="product__price">' + formatPrice(product.price.selling) + (compareAt ? " <span>" + formatPrice(compareAt) + "</span>" : "") + "</div>",
                "</div>",
                "</div>",
                "</div>"
            ].join("");
        }).join("");

        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.magnificPopup) {
            window.jQuery(".image-popup").magnificPopup({ type: "image" });
        }
    }

    function setStatus(message, isError) {
        var status = document.getElementById("shop-status");
        status.textContent = message;
        status.style.color = isError ? "#c0392b" : "";
    }

    function bindEvents() {
        document.getElementById("shop-filter-controls").addEventListener("click", function (event) {
            var item = event.target.closest("li[data-filter]");
            if (!item) {
                return;
            }

            event.preventDefault();
            activeFilter = item.getAttribute("data-filter") || "*";
            renderFilters();
            renderProducts();
        });
    }

    async function loadData() {
        try {
            var responses = await Promise.all([
                fetch(API_BASE + "/products"),
                fetch(API_BASE + "/content-sections/new-arrivals")
            ]);

            if (!responses[0].ok) {
                throw new Error("Unable to load products from backend.");
            }

            var payload = await responses[0].json();
            products = payload.map(normalizeProduct);

            if (responses[1].ok) {
                var section = await responses[1].json();
                filters = normalizeFilters(section.payload && section.payload.filters);
            } else {
                filters = normalizeFilters(defaultFilters);
            }

            activeFilter = filters[0] ? filters[0].filterClass : "*";
            renderFilters();
            renderProducts();
            setStatus("Catalog synced with backend products.", false);
        } catch (error) {
            setStatus(error.message || "Unable to load products.", true);
            document.getElementById("shop-product-grid").innerHTML = '<div class="col-12"><div class="text-center p-5 border">Product catalog could not be loaded.</div></div>';
        }
    }

    function init() {
        bindEvents();
        loadData();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
