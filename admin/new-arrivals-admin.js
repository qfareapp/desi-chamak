(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
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

    var allProducts = [];
    var state = normalizePayload(defaults);
    var saveSectionButton = document.getElementById("saveArrivalsBtn");
    var saveSelectionButton = document.getElementById("saveArrivalsSelectionBtn");
    var sectionForm = document.getElementById("new-arrivals-form");
    var addFilterButton = document.getElementById("addArrivalFilterBtn");
    var statusBox = document.getElementById("arrival-status");
    var filterEditor = document.getElementById("arrival-filters-editor");
    var selectedProductsBody = document.getElementById("arrivalSelectedProductsBody");
    var productPoolBody = document.getElementById("arrivalProductPoolBody");
    var draggedProductId = null;
    var draggingFilterCard = null;

    var fields = {
        title: document.getElementById("arrivalTitle"),
        introCopy: document.getElementById("arrivalCopy"),
        defaultCtaAnchor: document.getElementById("arrivalCta")
    };

    function setStatus(message, isError) {
        statusBox.textContent = message;
        statusBox.style.color = isError ? "#f4b6b6" : "";
    }

    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function normalizeProduct(product) {
        var categorySlug = slugify(product.category || "");
        return {
            _id: product._id,
            name: product.name || "",
            sku: product.sku || "",
            category: product.category || "",
            categorySlug: categorySlug || "products",
            price: product.price && product.price.selling ? Number(product.price.selling) : 0,
            badge: product.badge || "",
            image: product.media && (product.media.heroImage || (product.media.thumbnails && product.media.thumbnails[0])) || ""
        };
    }

    function normalizePayload(payload) {
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

    function formatPrice(value) {
        return "Rs. " + Number(value || 0).toLocaleString("en-IN");
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function fillSectionForm() {
        fields.title.value = state.title;
        fields.introCopy.value = state.introCopy;
        fields.defaultCtaAnchor.value = state.defaultCtaAnchor;
    }

    function readSectionForm() {
        state.title = fields.title.value.trim();
        state.introCopy = fields.introCopy.value.trim();
        state.defaultCtaAnchor = fields.defaultCtaAnchor.value.trim();
    }

    function renderFilters() {
        filterEditor.innerHTML = state.filters.map(function (filter, index) {
            return [
                '<div class="filter-card" draggable="true" data-index="' + index + '">',
                '<div class="filter-card-header">',
                '<label class="mb-0">Filter ' + (index + 1) + '</label>',
                '<span class="filter-drag-handle" draggable="true" data-index="' + index + '"><span class="fa fa-bars"></span> Drag</span>',
                '</div>',
                '<input type="text" draggable="false" class="form-control mb-2 arrival-filter-label" data-index="' + index + '" value="' + escapeHtml(filter.label) + '" placeholder="Label">',
                '<input type="text" draggable="false" class="form-control mb-2 arrival-filter-class" data-index="' + index + '" value="' + escapeHtml(filter.filterClass) + '" placeholder="Filter class or *">',
                '<input type="text" draggable="false" class="form-control mb-2 arrival-filter-anchor" data-index="' + index + '" value="' + escapeHtml(filter.anchorId) + '" placeholder="Anchor id">',
                '<button type="button" class="btn btn-ghost arrival-remove-filter" data-index="' + index + '">Remove</button>',
                '</div>'
            ].join("");
        }).join("");
    }

    function readFiltersFromDom() {
        state.filters = Array.prototype.map.call(filterEditor.querySelectorAll(".filter-card"), function (card, position) {
            var index = Number(card.getAttribute("data-index"));
            return {
                label: card.querySelector('.arrival-filter-label[data-index="' + index + '"]').value.trim(),
                filterClass: card.querySelector('.arrival-filter-class[data-index="' + index + '"]').value.trim() || "*",
                anchorId: card.querySelector('.arrival-filter-anchor[data-index="' + index + '"]').value.trim(),
                active: position === 0
            };
        }).filter(function (filter) {
            return filter.label;
        });
    }

    function getSelectedProducts() {
        return state.productIds.map(function (productId) {
            return allProducts.find(function (product) {
                return product._id === productId;
            });
        }).filter(Boolean);
    }

    function renderSelectedProducts() {
        var selectedProducts = getSelectedProducts();

        if (!selectedProducts.length) {
            selectedProductsBody.innerHTML = '<tr><td colspan="5" class="text-center muted">No products selected yet.</td></tr>';
            return;
        }

        selectedProductsBody.innerHTML = selectedProducts.map(function (product, index) {
            return [
                '<tr class="selected-product-row" draggable="true" data-product-id="' + product._id + '">',
                '<td>' + escapeHtml(product.name) + '<br><small class="muted">Position ' + (index + 1) + '</small></td>',
                '<td>' + escapeHtml(product.category) + '</td>',
                '<td><span class="thumb-badge">' + escapeHtml(product.image || "-") + '</span></td>',
                '<td>' + formatPrice(product.price) + '</td>',
                '<td><span class="inline-actions"><button type="button" class="btn btn-ghost arrival-move-up" data-product-id="' + product._id + '">Up</button><button type="button" class="btn btn-ghost arrival-move-down" data-product-id="' + product._id + '">Down</button><button type="button" class="btn btn-ghost arrival-remove-selected" data-product-id="' + product._id + '">Remove</button></span></td>',
                '</tr>'
            ].join("");
        }).join("");
    }

    function renderProductPool() {
        if (!allProducts.length) {
            productPoolBody.innerHTML = '<tr><td colspan="5" class="text-center muted">No products found. Add products from Product Management first.</td></tr>';
            return;
        }

        productPoolBody.innerHTML = allProducts.map(function (product) {
            var alreadySelected = state.productIds.indexOf(product._id) >= 0;
            return [
                "<tr>",
                "<td>" + escapeHtml(product.name) + "</td>",
                "<td>" + escapeHtml(product.sku) + "</td>",
                "<td>" + escapeHtml(product.category) + "</td>",
                "<td>" + formatPrice(product.price) + "</td>",
                '<td><button type="button" class="btn btn-ghost arrival-add-product" data-product-id="' + product._id + '"' + (alreadySelected ? " disabled" : "") + ">" + (alreadySelected ? "Selected" : "Add") + "</button></td>",
                "</tr>"
            ].join("");
        }).join("");
    }

    async function persistSection(message) {
        var response = await fetch(API_BASE + "/content-sections/new-arrivals", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: "New Arrivals",
                description: "Homepage new arrivals section managed from the admin panel",
                status: "published",
                payload: Object.assign({}, state, { enabled: state.enabled !== false })
            })
        });

        if (!response.ok) {
            var errorBody = await response.json().catch(function () { return {}; });
            throw new Error(errorBody.error || "Failed to save new arrivals");
        }

        renderSelectedProducts();
        renderProductPool();
        setStatus(message, false);
    }

    async function loadData() {
        var productResponse = await fetch(API_BASE + "/products");
        if (!productResponse.ok) {
            throw new Error("Unable to load product catalog. Add products from Product Management first.");
        }

        allProducts = (await productResponse.json()).map(normalizeProduct);

        try {
            var sectionResponse = await fetch(API_BASE + "/content-sections/new-arrivals");
            if (!sectionResponse.ok) {
                throw new Error("No saved section yet");
            }

            var section = await sectionResponse.json();
            state = normalizePayload(section.payload);
        } catch (_error) {
            state = normalizePayload(defaults);
        }

        fillSectionForm();
        renderFilters();
        renderSelectedProducts();
        renderProductPool();
        setStatus("New arrivals loaded. Products now come only from Product Management.", false);
    }

    async function saveSection(event) {
        event.preventDefault();
        readSectionForm();
        readFiltersFromDom();
        saveSectionButton.disabled = true;
        try {
            await persistSection("Section settings saved.");
        } catch (error) {
            setStatus(error.message || "Unable to save section settings.", true);
        } finally {
            saveSectionButton.disabled = false;
        }
    }

    filterEditor.addEventListener("click", async function (event) {
        if (!event.target.classList.contains("arrival-remove-filter")) {
            return;
        }

        var index = Number(event.target.getAttribute("data-index"));
        state.filters.splice(index, 1);
        if (!state.filters.length) {
            state.filters.push({ label: "All", filterClass: "*", anchorId: "", active: true });
        }
        renderFilters();
        try {
            readFiltersFromDom();
            await persistSection("Filter removed and saved.");
        } catch (error) {
            setStatus(error.message || "Unable to save filters.", true);
        }
    });

    filterEditor.addEventListener("dragstart", function (event) {
        var card = event.target.closest(".filter-card");
        if (!card) return;
        draggingFilterCard = card;
        event.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
    });

    filterEditor.addEventListener("dragend", function () {
        if (draggingFilterCard) {
            draggingFilterCard.classList.remove("dragging");
        }
        draggingFilterCard = null;
        Array.prototype.forEach.call(filterEditor.querySelectorAll(".filter-card"), function (c) {
            c.classList.remove("drop-target");
        });
    });

    filterEditor.addEventListener("dragover", function (event) {
        if (!draggingFilterCard) return;
        var card = event.target.closest(".filter-card");
        if (!card || card === draggingFilterCard) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        Array.prototype.forEach.call(filterEditor.querySelectorAll(".filter-card"), function (c) {
            c.classList.remove("drop-target");
        });
        card.classList.add("drop-target");
    });

    filterEditor.addEventListener("drop", async function (event) {
        if (!draggingFilterCard) return;
        var targetCard = event.target.closest(".filter-card");
        if (!targetCard || targetCard === draggingFilterCard) return;
        event.preventDefault();

        var rect = targetCard.getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
            filterEditor.insertBefore(draggingFilterCard, targetCard);
        } else {
            var next = targetCard.nextSibling;
            if (next) {
                filterEditor.insertBefore(draggingFilterCard, next);
            } else {
                filterEditor.appendChild(draggingFilterCard);
            }
        }

        readFiltersFromDom();
        renderFilters();

        try {
            await persistSection("Filter order saved.");
        } catch (error) {
            setStatus(error.message || "Unable to save filter order.", true);
        }
    });

    addFilterButton.addEventListener("click", async function () {
        readFiltersFromDom();
        state.filters.push({ label: "New Filter", filterClass: "new-filter", anchorId: "", active: false });
        renderFilters();
        try {
            readFiltersFromDom();
            await persistSection("Filter added and saved.");
        } catch (error) {
            setStatus(error.message || "Unable to add filter.", true);
        }
    });

    productPoolBody.addEventListener("click", async function (event) {
        var addButton = event.target.closest(".arrival-add-product");
        if (!addButton) {
            return;
        }

        var productId = addButton.getAttribute("data-product-id");
        if (state.productIds.indexOf(productId) >= 0) {
            return;
        }

        state.productIds.push(productId);
        try {
            await persistSection("Product selection updated.");
        } catch (error) {
            setStatus(error.message || "Unable to save selected products.", true);
        }
    });

    selectedProductsBody.addEventListener("click", async function (event) {
        var removeButton = event.target.closest(".arrival-remove-selected");
        var moveUpButton = event.target.closest(".arrival-move-up");
        var moveDownButton = event.target.closest(".arrival-move-down");
        var productId = null;

        if (removeButton) {
            productId = removeButton.getAttribute("data-product-id");
            state.productIds = state.productIds.filter(function (item) {
                return item !== productId;
            });
        } else if (moveUpButton) {
            productId = moveUpButton.getAttribute("data-product-id");
            var upIndex = state.productIds.indexOf(productId);
            if (upIndex > 0) {
                var previous = state.productIds[upIndex - 1];
                state.productIds[upIndex - 1] = productId;
                state.productIds[upIndex] = previous;
            }
        } else if (moveDownButton) {
            productId = moveDownButton.getAttribute("data-product-id");
            var downIndex = state.productIds.indexOf(productId);
            if (downIndex >= 0 && downIndex < state.productIds.length - 1) {
                var next = state.productIds[downIndex + 1];
                state.productIds[downIndex + 1] = productId;
                state.productIds[downIndex] = next;
            }
        } else {
            return;
        }

        try {
            await persistSection("Selected products reordered.");
        } catch (error) {
            setStatus(error.message || "Unable to update selected products.", true);
        }
    });

    selectedProductsBody.addEventListener("dragstart", function (event) {
        var row = event.target.closest(".selected-product-row");
        if (!row) {
            return;
        }
        draggedProductId = row.getAttribute("data-product-id");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedProductId);
        row.classList.add("dragging");
    });

    selectedProductsBody.addEventListener("dragend", function () {
        draggedProductId = null;
        Array.prototype.forEach.call(selectedProductsBody.querySelectorAll(".selected-product-row"), function (row) {
            row.classList.remove("dragging");
            row.classList.remove("drop-target");
        });
    });

    selectedProductsBody.addEventListener("dragover", function (event) {
        var row = event.target.closest(".selected-product-row");
        if (!row) {
            return;
        }
        event.preventDefault();
        Array.prototype.forEach.call(selectedProductsBody.querySelectorAll(".selected-product-row"), function (item) {
            item.classList.remove("drop-target");
        });
        row.classList.add("drop-target");
    });

    selectedProductsBody.addEventListener("drop", async function (event) {
        var row = event.target.closest(".selected-product-row");
        if (!row || !draggedProductId) {
            return;
        }
        event.preventDefault();

        var targetProductId = row.getAttribute("data-product-id");
        if (targetProductId === draggedProductId) {
            return;
        }

        var draggedIndex = state.productIds.indexOf(draggedProductId);
        var targetIndex = state.productIds.indexOf(targetProductId);
        if (draggedIndex < 0 || targetIndex < 0) {
            return;
        }

        state.productIds.splice(draggedIndex, 1);
        state.productIds.splice(targetIndex, 0, draggedProductId);

        try {
            await persistSection("Selected product order updated.");
        } catch (error) {
            setStatus(error.message || "Unable to reorder selected products.", true);
        }
    });

    saveSelectionButton.addEventListener("click", function () {
        persistSection("Selected products saved.").catch(function (error) {
            setStatus(error.message || "Unable to save selected products.", true);
        });
    });

    sectionForm.addEventListener("submit", saveSection);
    loadData().catch(function (error) {
        setStatus(error.message || "Unable to load new arrivals.", true);
    });
})();
