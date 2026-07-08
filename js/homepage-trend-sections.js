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

    function renderSection(config, payload, products) {
        var titleNode = document.getElementById(config.titleId);
        var itemsNode = document.getElementById(config.itemsId);
        var sectionElement;
        var columnElement = itemsNode ? itemsNode.closest(".col-lg-4") : null;
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

        itemsNode.innerHTML = selectedProducts.map(function (product) {
            return [
                '<div class="trend__item">',
                '<div class="trend__item__pic">',
                '<a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '"><img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '"></a>',
                "</div>",
                '<div class="trend__item__text">',
                '<h6><a href="product-details.html?slug=' + encodeURIComponent(product.slug) + '">' + escapeHtml(product.name) + "</a></h6>",
                '<div class="rating">' + ratingHtml() + "</div>",
                '<div class="product__price">' + formatPrice(product.price) + "</div>",
                "</div>",
                "</div>"
            ].join("");
        }).join("");
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
        var visibleColumns = document.querySelectorAll('.trend .col-lg-4[style=""], .trend .col-lg-4:not([style]), .trend .col-lg-4[style*="display: "]');

        if (!trendSection) {
            return;
        }

        var anyVisible = Array.prototype.some.call(trendSection.querySelectorAll(".col-lg-4"), function (column) {
            return column.style.display !== "none";
        });

        trendSection.style.display = anyVisible ? "" : "none";
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadSections);
    } else {
        loadSections();
    }
})();
