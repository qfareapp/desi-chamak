(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var sectionConfigs = [
        {
            key: "curated",
            titleId: "trend-curated-title",
            itemsId: "trend-curated-items",
            defaultTitle: "Curated sets",
            noteKey: "anchorId"
        },
        {
            key: "best-sellers",
            titleId: "trend-best-sellers-title",
            itemsId: "trend-best-sellers-items",
            defaultTitle: "Bestsellers",
            noteKey: "note"
        },
        {
            key: "gift-ready",
            titleId: "trend-gift-ready-title",
            itemsId: "trend-gift-ready-items",
            defaultTitle: "Gift ready",
            noteKey: "note"
        }
    ];

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

    function normalizeProduct(product) {
        return {
            _id: product._id,
            slug: product.slug || "",
            name: product.name || "",
            image: product.media && (product.media.heroImage || (product.media.thumbnails && product.media.thumbnails[0])) || "",
            price: product.price && product.price.selling ? Number(product.price.selling) : 0
        };
    }

    function ratingHtml() {
        return '<i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i>';
    }

    function wishlistMarkup(product) {
        var link = "product-details.html?slug=" + encodeURIComponent(product.slug || "");

        return [
            '<li><a href="#" class="wishlist-toggle"',
            ' data-wishlist-id="' + escapeHtml(product._id || product.slug || product.name) + '"',
            ' data-wishlist-slug="' + escapeHtml(product.slug || "") + '"',
            ' data-wishlist-name="' + escapeHtml(product.name || "") + '"',
            ' data-wishlist-image="' + escapeHtml(product.image || "") + '"',
            ' data-wishlist-price="' + escapeHtml(String(product.price || 0)) + '"',
            ' data-wishlist-link="' + escapeHtml(link) + '"',
            ' aria-label="Add to wishlist"><span class="icon_heart_alt"></span></a></li>'
        ].join("");
    }

    function renderSection(config, payload, products) {
        var titleNode = document.getElementById(config.titleId);
        var itemsNode = document.getElementById(config.itemsId);
        var sectionElement;
        var columnElement = itemsNode ? itemsNode.closest(".col-12") : null;
        var selectedProducts;

        if (!titleNode || !itemsNode) {
            return;
        }

        if (columnElement) {
            columnElement.style.display = payload.enabled === false ? "none" : "";
        }

        if (payload.enabled === false) {
            return;
        }

        if (titleNode) {
            if (config.key === "curated") {
                titleNode.innerHTML = '<a href="curated-products.html">' + escapeHtml(payload.title || config.defaultTitle) + "</a>";
            } else {
                titleNode.textContent = payload.title || config.defaultTitle;
            }
        }

        if (config.key === "curated" && payload.anchorId) {
            sectionElement = document.querySelector(".trend");
            if (sectionElement) {
                sectionElement.id = payload.anchorId;
            }
        }

        selectedProducts = (Array.isArray(payload.productIds) ? payload.productIds : []).map(function (productId) {
            return products.find(function (product) {
                return product._id === productId;
            });
        }).filter(Boolean);

        if (!selectedProducts.length) {
            itemsNode.innerHTML = '<div class="trend__item__text">No products selected.</div>';
            return;
        }

        itemsNode.innerHTML = '<div class="row">' + selectedProducts.map(function (product) {
            return [
                '<div class="col-6 col-sm-6">',
                '<div class="product__item">',
                '<div class="product__item__pic" style="background-image: url(\'' + escapeHtml(product.image) + '\'); background-size: cover; background-position: center;">',
                '<ul class="product__hover">',
                '<li><a href="' + escapeHtml(product.image) + '" class="image-popup"><span class="arrow_expand"></span></a></li>',
                wishlistMarkup(product),
                '<li><a href="#"><span class="icon_bag_alt"></span></a></li>',
                "</ul>",
                "</div>",
                '<div class="product__item__text">',
                '<h6><a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '">' + escapeHtml(product.name) + "</a></h6>",
                '<div class="rating">' + ratingHtml() + "</div>",
                '<div class="product__price">' + formatPrice(product.price) + "</div>",
                "</div>",
                "</div>",
                "</div>"
            ].join("");
        }).join("") + "</div>";

        if (window.DesiChamakWishlist) {
            window.DesiChamakWishlist.syncButtons();
        }
    }

    async function loadSections() {
        try {
            var response = await fetch(API_BASE + "/products");
            if (!response.ok) {
                throw new Error("Unable to load products");
            }

            var products = (await response.json()).map(normalizeProduct);
            await Promise.all(sectionConfigs.map(async function (config) {
                try {
                    var sectionResponse = await fetch(API_BASE + "/content-sections/" + config.key);
                    if (!sectionResponse.ok) {
                        throw new Error("Section missing");
                    }
                    var section = await sectionResponse.json();
                    renderSection(config, section.payload || {}, products);
                } catch (_error) {
                    renderSection(config, { title: config.defaultTitle, productIds: [] }, products);
                }
            }));
            updateTrendVisibility();
        } catch (_error) {
            sectionConfigs.forEach(function (config) {
                renderSection(config, { title: config.defaultTitle, productIds: [], enabled: true }, []);
            });
            updateTrendVisibility();
        }
    }

    function updateTrendVisibility() {
        var trendSection = document.querySelector(".trend");

        if (!trendSection) {
            return;
        }

        var anyVisible = Array.prototype.some.call(trendSection.querySelectorAll(".col-12"), function (column) {
            return column.style.display !== "none";
        });

        trendSection.style.display = anyVisible ? "" : "none";
        initTrendTabs();
    }

    function initTrendTabs() {
        var tabBar = document.querySelector(".trend-tab-bar");
        var tabs = document.querySelectorAll(".trend-tab");

        if (!tabBar || !tabs.length) {
            return;
        }

        var columns = document.querySelectorAll(".trend .col-12");

        function activateTab(clickedTab) {
            Array.prototype.forEach.call(tabs, function (t) {
                t.classList.remove("active");
            });
            Array.prototype.forEach.call(columns, function (col) {
                col.classList.remove("trend-tab-active");
            });

            clickedTab.classList.add("active");
            var targetId = clickedTab.getAttribute("data-target");
            var target = document.getElementById(targetId);
            var col = target ? target.closest(".col-12") : null;
            if (col) {
                col.classList.add("trend-tab-active");
            }
        }

        var visibleTabs = Array.prototype.filter.call(tabs, function (tab) {
            var targetId = tab.getAttribute("data-target");
            var target = document.getElementById(targetId);
            var col = target ? target.closest(".col-12") : null;
            return col && col.style.display !== "none";
        });

        Array.prototype.forEach.call(tabs, function (tab) {
            var targetId = tab.getAttribute("data-target");
            var target = document.getElementById(targetId);
            var col = target ? target.closest(".col-12") : null;
            tab.style.display = (!col || col.style.display === "none") ? "none" : "";
        });

        if (!visibleTabs.length) {
            tabBar.style.display = "none";
            return;
        }

        if (!tabBar.dataset.tabsInit) {
            tabBar.dataset.tabsInit = "1";
            Array.prototype.forEach.call(tabs, function (tab) {
                tab.addEventListener("click", function () {
                    activateTab(tab);
                });
            });
        }

        activateTab(visibleTabs[0]);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadSections);
    } else {
        loadSections();
    }
})();
