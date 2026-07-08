(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";

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

    function getRequestKey() {
        var params = new URLSearchParams(window.location.search);
        return {
            slug: params.get("slug"),
            id: params.get("id")
        };
    }

    function getGalleryImages(product) {
        var images = [];
        var gallery = product.media && Array.isArray(product.media.gallery) ? product.media.gallery : [];
        var thumbs = product.media && Array.isArray(product.media.thumbnails) ? product.media.thumbnails : [];
        var heroImage = product.media && product.media.heroImage ? product.media.heroImage : "";

        if (heroImage) {
            images.push(heroImage);
        }

        gallery.concat(thumbs).forEach(function (image) {
            if (image && images.indexOf(image) < 0) {
                images.push(image);
            }
        });

        if (!images.length) {
            images.push("img/product/product-1.jpg");
        }

        return images;
    }

    function initGallery(images, productName) {
        var thumbsContainer = document.getElementById("product-thumbnails");
        var sliderContainer = document.getElementById("product-gallery-slider");
        var sliderMarkup = [
            '<div class="product__details__pic__slider owl-carousel">'
        ];

        thumbsContainer.innerHTML = images.map(function (image, index) {
            return [
                '<a class="pt' + (index === 0 ? " active" : "") + '" href="#product-' + (index + 1) + '" data-index="' + index + '" data-imgbigurl="' + escapeHtml(image) + '">',
                '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(productName) + ' thumbnail ' + (index + 1) + '">',
                "</a>"
            ].join("");
        }).join("");

        images.forEach(function (image, index) {
            sliderMarkup.push('<img data-hash="product-' + (index + 1) + '" class="product__big__img" src="' + escapeHtml(image) + '" alt="' + escapeHtml(productName) + '">');
        });
        sliderMarkup.push("</div>");
        sliderContainer.innerHTML = sliderMarkup.join("");

        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.owlCarousel) {
            window.jQuery(".product__details__pic__slider").owlCarousel({
                loop: false,
                margin: 0,
                items: 1,
                dots: false,
                nav: true,
                navText: ["<i class='arrow_carrot-left'></i>", "<i class='arrow_carrot-right'></i>"],
                smartSpeed: 1200,
                autoHeight: false,
                autoplay: false,
                mouseDrag: false,
                URLhashListener: true,
                startPosition: "URLHash"
            }).on("changed.owl.carousel", function (event) {
                var indexNum = event.item.index;
                Array.prototype.forEach.call(document.querySelectorAll(".product__thumb a"), function (thumb, thumbIndex) {
                    thumb.classList.toggle("active", thumbIndex === indexNum);
                });
            });
        }

        Array.prototype.forEach.call(thumbsContainer.querySelectorAll(".pt"), function (thumb) {
            thumb.addEventListener("click", function () {
                Array.prototype.forEach.call(thumbsContainer.querySelectorAll(".pt"), function (item) {
                    item.classList.remove("active");
                });
                thumb.classList.add("active");
            });
        });
    }

    function renderWidgets(product) {
        var widget = product.widget || {};
        var widgetList = document.getElementById("product-widgets");
        var items = [
            { label: "Availability:", value: widget.availability || (product.stockQty > 0 ? "In stock - dispatches in " + (product.dispatchSla || "48h") : "Out of stock") },
            { label: "Finish:", value: widget.finish || "-" },
            { label: "Dimensions:", value: widget.dimensions || "-" },
            { label: "In the box:", value: widget.inBox || "-" },
            { label: "Promotions:", value: widget.promotionLine || "-" }
        ];

        widgetList.innerHTML = items.map(function (item) {
            return "<li><span>" + escapeHtml(item.label) + "</span><p>" + escapeHtml(item.value) + "</p></li>";
        }).join("");
    }

    function renderTabs(product) {
        var tabs = product.tabs || {};
        var reviewCount = Number(product.reviewCount || 0);
        document.getElementById("product-description").textContent = tabs.description || product.summary || "No description available.";
        document.getElementById("product-specification").textContent = tabs.specification || "No specification available.";
        document.getElementById("product-reviews-copy").textContent = tabs.reviewSnippet || "No review snippet available.";
        document.getElementById("product-reviews-tab-label").textContent = "Reviews ( " + reviewCount + " )";
        document.getElementById("product-reviews-heading").textContent = "Reviews ( " + reviewCount + " )";
    }

    function renderRelatedProducts(product, allProducts) {
        var grid = document.getElementById("related-products-grid");
        var mappedRelated = (Array.isArray(product.relatedProducts) ? product.relatedProducts : []).map(function (related) {
            var linkedProduct = related.productId ? allProducts.find(function (item) {
                return item._id === related.productId;
            }) : null;

            if (linkedProduct) {
                return {
                    name: linkedProduct.name,
                    image: linkedProduct.media && (linkedProduct.media.heroImage || (linkedProduct.media.thumbnails && linkedProduct.media.thumbnails[0])) || "",
                    price: linkedProduct.price && linkedProduct.price.selling ? linkedProduct.price.selling : 0,
                    badge: linkedProduct.badge || "",
                    link: "product-details.html?slug=" + encodeURIComponent(linkedProduct.slug)
                };
            }

            return {
                name: related.title || "Related Product",
                image: related.image || "",
                price: Number(related.price || 0),
                badge: related.badge || "",
                link: "#"
            };
        }).filter(function (item) {
            return item.name;
        });

        if (!mappedRelated.length) {
            mappedRelated = allProducts.filter(function (item) {
                return item._id !== product._id;
            }).slice(0, 4).map(function (item) {
                return {
                    name: item.name,
                    image: item.media && (item.media.heroImage || (item.media.thumbnails && item.media.thumbnails[0])) || "",
                    price: item.price && item.price.selling ? item.price.selling : 0,
                    badge: item.badge || "",
                    link: "product-details.html?slug=" + encodeURIComponent(item.slug)
                };
            });
        }

        if (!mappedRelated.length) {
            grid.innerHTML = '<div class="col-12 text-center muted">No related products found.</div>';
            return;
        }

        grid.innerHTML = mappedRelated.slice(0, 4).map(function (item) {
            return [
                '<div class="col-lg-3 col-md-4 col-sm-6">',
                '<div class="product__item' + ((item.badge || "").toLowerCase() === "set" ? " sale" : "") + '">',
                '<div class="product__item__pic" style="background-image: url(\'' + escapeHtml(item.image) + '\'); background-size: cover; background-position: center;">',
                badgeMarkup(item.badge),
                '<ul class="product__hover">',
                '<li><a href="' + escapeHtml(item.image) + '" class="image-popup"><span class="arrow_expand"></span></a></li>',
                '<li><a href="#"><span class="icon_heart_alt"></span></a></li>',
                '<li><a href="' + escapeHtml(item.link) + '"><span class="icon_bag_alt"></span></a></li>',
                "</ul>",
                "</div>",
                '<div class="product__item__text">',
                '<h6><a href="' + escapeHtml(item.link) + '">' + escapeHtml(item.name) + "</a></h6>",
                '<div class="rating">' + ratingHtml() + "</div>",
                '<div class="product__price">' + formatPrice(item.price) + "</div>",
                "</div>",
                "</div>",
                "</div>"
            ].join("");
        }).join("");

        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.magnificPopup) {
            window.jQuery(".image-popup").magnificPopup({ type: "image" });
        }
    }

    function renderProduct(product, allProducts) {
        var reviewCount = Number(product.reviewCount || 0);
        var compareAt = product.price && product.price.compareAt ? Number(product.price.compareAt) : null;
        var title = product.name || "Product";

        document.title = "Desi Chamak | " + title;
        document.getElementById("product-breadcrumb-name").textContent = title;
        document.getElementById("product-title").innerHTML = escapeHtml(title) + ' <span id="product-subtitle">' + escapeHtml(product.subtitle || "") + "</span>";
        document.getElementById("product-review-count").textContent = "( " + reviewCount + " reviews )";
        document.getElementById("product-price").innerHTML = formatPrice(product.price && product.price.selling ? product.price.selling : 0) + (compareAt ? " <span>" + formatPrice(compareAt) + "</span>" : "");
        document.getElementById("product-summary").textContent = product.summary || "No product summary available.";

        initGallery(getGalleryImages(product), title);
        renderWidgets(product);
        renderTabs(product);
        renderRelatedProducts(product, allProducts);
    }

    function renderNotFound(message) {
        document.getElementById("product-breadcrumb-name").textContent = "Product unavailable";
        document.getElementById("product-title").textContent = "Product unavailable";
        document.getElementById("product-summary").textContent = message;
        document.getElementById("product-description").textContent = message;
        document.getElementById("product-specification").textContent = "No specification available.";
        document.getElementById("product-reviews-copy").textContent = "No reviews available.";
        document.getElementById("related-products-grid").innerHTML = '<div class="col-12 text-center muted">No related products found.</div>';
    }

    async function loadProductPage() {
        var requestKey = getRequestKey();

        if (!requestKey.slug && !requestKey.id) {
            renderNotFound("No product was specified in the URL.");
            return;
        }

        try {
            var productUrl = requestKey.slug
                ? API_BASE + "/products/slug/" + encodeURIComponent(requestKey.slug)
                : API_BASE + "/products/" + encodeURIComponent(requestKey.id);

            var responses = await Promise.all([
                fetch(productUrl),
                fetch(API_BASE + "/products")
            ]);

            if (!responses[0].ok) {
                throw new Error("Product not found.");
            }

            if (!responses[1].ok) {
                throw new Error("Product catalog unavailable.");
            }

            var product = await responses[0].json();
            var allProducts = await responses[1].json();
            renderProduct(product, allProducts);
        } catch (error) {
            renderNotFound(error.message || "Unable to load this product.");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadProductPage);
    } else {
        loadProductPage();
    }
})();
