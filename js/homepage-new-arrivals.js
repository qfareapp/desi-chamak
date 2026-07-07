(function () {
    var API_BASE = "http://localhost:5000/api";
    var defaults = {
        title: "New Arrivals",
        introCopy: "Oxidised essentials curated for women.",
        defaultCtaAnchor: "#products",
        filters: [
            { label: "All", filterClass: "*", anchorId: "", active: true },
            { label: "Necklaces", filterClass: "necklaces", anchorId: "necklaces", active: false },
            { label: "Earrings", filterClass: "earrings", anchorId: "earrings", active: false },
            { label: "Bangles", filterClass: "bangles", anchorId: "bangles", active: false },
            { label: "Anklets", filterClass: "anklets", anchorId: "anklets", active: false },
            { label: "Gift Sets", filterClass: "gift-sets", anchorId: "gift-sets", active: false }
        ],
        productIds: []
    };

    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function normalizeSection(payload) {
        var source = payload || {};
        return {
            enabled: source.enabled !== false,
            title: source.title || defaults.title,
            introCopy: source.introCopy || defaults.introCopy,
            defaultCtaAnchor: source.defaultCtaAnchor || defaults.defaultCtaAnchor,
            filters: (source.filters && source.filters.length ? source.filters : defaults.filters).map(function (filter, index) {
                return {
                    label: filter.label || ("Filter " + (index + 1)),
                    filterClass: filter.filterClass || "*",
                    anchorId: filter.anchorId || "",
                    active: index === 0
                };
            }),
            productIds: Array.isArray(source.productIds) ? source.productIds.slice() : []
        };
    }

    function normalizeProduct(product) {
        var categorySlug = slugify(product.category || "");
        var classes = [];

        if (categorySlug) {
            classes.push(categorySlug);
        }

        if ((product.badge || "").toLowerCase() === "set" && classes.indexOf("gift-sets") < 0) {
            classes.push("gift-sets");
        }

        return {
            _id: product._id,
            slug: product.slug || "",
            name: product.name || "",
            category: product.category || "",
            filterClasses: classes,
            image: product.media && (product.media.heroImage || (product.media.thumbnails && product.media.thumbnails[0])) || "",
            price: product.price && product.price.selling ? Number(product.price.selling) : 0,
            compareAt: product.price && product.price.compareAt ? Number(product.price.compareAt) : null,
            badge: product.badge || "",
            rating: 5,
            link: "product-details.html?slug=" + encodeURIComponent(product.slug || "")
        };
    }

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

    function badgeMarkup(badge) {
        if (!badge) {
            return "";
        }

        var normalized = badge.toLowerCase();
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

    function getSelectedProducts(section, products) {
        return section.productIds.map(function (productId) {
            return products.find(function (product) {
                return product._id === productId;
            });
        }).filter(Boolean);
    }

    function renderFilters(filters) {
        var filterList = document.getElementById("new-arrivals-filters");
        if (!filterList) {
            return;
        }

        filterList.innerHTML = filters.map(function (filter, index) {
            var activeClass = index === 0 ? ' class="active"' : "";
            var idMarkup = filter.anchorId ? ' id="' + escapeHtml(filter.anchorId) + '"' : "";
            var dataFilter = filter.filterClass === "*" ? "*" : "." + filter.filterClass;
            return '<li' + activeClass + ' data-filter="' + escapeHtml(dataFilter) + '"' + idMarkup + ">" + escapeHtml(filter.label) + "</li>";
        }).join("");

        Array.prototype.forEach.call(filterList.querySelectorAll("li"), function (item) {
            item.addEventListener("click", function () {
                var filterValue = item.getAttribute("data-filter");
                Array.prototype.forEach.call(filterList.querySelectorAll("li"), function (tab) {
                    tab.classList.remove("active");
                });
                item.classList.add("active");
                applyFilter(filterValue);
            });
        });
    }

    function renderProducts(products) {
        var gallery = document.getElementById("new-arrivals-gallery");
        var loading = document.getElementById("new-arrivals-loading");

        if (!gallery) {
            return;
        }

        if (!products.length) {
            gallery.innerHTML = '<div class="col-12 text-center">No products selected for this section.</div>';
            return;
        }

        gallery.innerHTML = products.map(function (product) {
            var classes = product.filterClasses.join(" ");
            return [
                '<div class="col-lg-3 col-md-4 col-sm-6 mix ' + escapeHtml(classes) + '" data-filter-classes="' + escapeHtml(classes) + '">',
                '<div class="product__item' + ((product.badge || "").toLowerCase() === "set" ? " sale" : "") + '">',
                '<div class="product__item__pic" style="background-image: url(\'' + escapeHtml(product.image) + '\'); background-size: cover; background-position: center;">',
                badgeMarkup(product.badge),
                '<ul class="product__hover">',
                '<li><a href="' + escapeHtml(product.image) + '" class="image-popup"><span class="arrow_expand"></span></a></li>',
                '<li><a href="#"><span class="icon_heart_alt"></span></a></li>',
                '<li><a href="#"><span class="icon_bag_alt"></span></a></li>',
                "</ul>",
                "</div>",
                '<div class="product__item__text">',
                '<h6><a href="' + escapeHtml(product.link) + '">' + escapeHtml(product.name) + "</a></h6>",
                '<div class="rating">' + ratingHtml() + "</div>",
                '<div class="product__price">' + formatPrice(product.price) + (product.compareAt ? " <span>" + formatPrice(product.compareAt) + "</span>" : "") + "</div>",
                "</div>",
                "</div>",
                "</div>"
            ].join("");
        }).join("");

        if (loading) {
            loading.remove();
        }

        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.magnificPopup) {
            window.jQuery(".image-popup").magnificPopup({ type: "image" });
        }
    }

    function applyFilter(filterValue) {
        var items = document.querySelectorAll("#new-arrivals-gallery > div");
        Array.prototype.forEach.call(items, function (item) {
            if (filterValue === "*") {
                item.style.display = "";
                return;
            }

            var classes = (item.getAttribute("data-filter-classes") || "").split(/\s+/);
            item.style.display = classes.indexOf(filterValue.replace(".", "")) >= 0 ? "" : "none";
        });
    }

    function applySection(section, products) {
        var sectionTitle = document.getElementById("new-arrivals-title");
        var sectionCopy = document.getElementById("new-arrivals-copy");
        var sectionNode = document.getElementById("products");
        var selectedProducts = getSelectedProducts(section, products);

        if (sectionNode) {
            sectionNode.style.display = section.enabled === false ? "none" : "";
        }

        if (section.enabled === false) {
            return;
        }

        if (sectionTitle) {
            sectionTitle.textContent = section.title;
        }

        if (sectionCopy) {
            sectionCopy.textContent = section.introCopy;
        }

        renderFilters(section.filters);
        renderProducts(selectedProducts);
        applyFilter("*");
    }

    async function loadSection() {
        try {
            var responses = await Promise.all([
                fetch(API_BASE + "/content-sections/new-arrivals"),
                fetch(API_BASE + "/products")
            ]);

            if (!responses[0].ok || !responses[1].ok) {
                throw new Error("Unable to load new arrivals");
            }

            var section = normalizeSection((await responses[0].json()).payload);
            var products = (await responses[1].json()).map(normalizeProduct);
            applySection(section, products);
        } catch (_error) {
            applySection(normalizeSection(defaults), []);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadSection);
    } else {
        loadSection();
    }
})();
