(function () {
    var API_BASE = "http://localhost:5000/api";
    var page = document.body;
    var sectionKey = page.getAttribute("data-section-key");
    var noteKey = page.getAttribute("data-note-key") || "note";
    var titleDefault = page.getAttribute("data-title-default") || "";
    var noteDefault = page.getAttribute("data-note-default") || "";

    var allProducts = [];
    var state = {
        enabled: true,
        title: titleDefault,
        note: noteDefault,
        productIds: []
    };

    var form = document.getElementById("section-products-form");
    var saveSectionButton = document.getElementById("saveSectionProductsBtn");
    var saveSelectedButton = document.getElementById("saveSelectedProductsBtn");
    var selectedBody = document.getElementById("sectionSelectedProductsBody");
    var poolBody = document.getElementById("sectionProductPoolBody");
    var statusBox = document.getElementById("sectionProductsStatus");
    var draggedProductId = null;

    var titleInput = form.querySelector("input, textarea");
    var noteInput = form.querySelectorAll("input, textarea")[1];

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
        return {
            _id: product._id,
            name: product.name || "",
            sku: product.sku || "",
            category: product.category || "",
            price: product.price && product.price.selling ? Number(product.price.selling) : 0,
            image: product.media && (product.media.heroImage || (product.media.thumbnails && product.media.thumbnails[0])) || ""
        };
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function formatPrice(value) {
        return "Rs. " + Number(value || 0).toLocaleString("en-IN");
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
            selectedBody.innerHTML = '<tr><td colspan="4" class="text-center muted">No products selected yet.</td></tr>';
            return;
        }

        selectedBody.innerHTML = selectedProducts.map(function (product, index) {
            return [
                '<tr class="selected-product-row" draggable="true" data-product-id="' + product._id + '">',
                '<td>' + escapeHtml(product.name) + '<br><small class="muted">Position ' + (index + 1) + '</small></td>',
                '<td><span class="thumb-badge">' + escapeHtml(product.image || "-") + '</span></td>',
                '<td>' + formatPrice(product.price) + '</td>',
                '<td><span class="inline-actions"><button type="button" class="btn btn-ghost section-move-up" data-product-id="' + product._id + '">Up</button><button type="button" class="btn btn-ghost section-move-down" data-product-id="' + product._id + '">Down</button><button type="button" class="btn btn-ghost section-remove-product" data-product-id="' + product._id + '">Remove</button></span></td>',
                "</tr>"
            ].join("");
        }).join("");
    }

    function renderPool() {
        if (!allProducts.length) {
            poolBody.innerHTML = '<tr><td colspan="5" class="text-center muted">No products found. Add them from Product Management first.</td></tr>';
            return;
        }

        poolBody.innerHTML = allProducts.map(function (product) {
            var selected = state.productIds.indexOf(product._id) >= 0;
            return [
                "<tr>",
                "<td>" + escapeHtml(product.name) + "</td>",
                "<td>" + escapeHtml(product.sku) + "</td>",
                "<td>" + escapeHtml(product.category) + "</td>",
                "<td>" + formatPrice(product.price) + "</td>",
                '<td><button type="button" class="btn btn-ghost section-add-product" data-product-id="' + product._id + '"' + (selected ? " disabled" : "") + ">" + (selected ? "Selected" : "Add") + "</button></td>",
                "</tr>"
            ].join("");
        }).join("");
    }

    function syncFormFromState() {
        titleInput.value = state.title;
        noteInput.value = state.note;
    }

    function readForm() {
        state.title = titleInput.value.trim();
        state.note = noteInput.value.trim();
    }

    async function persistSection(message) {
        var payload = {
            enabled: state.enabled !== false,
            title: state.title,
            productIds: state.productIds.slice()
        };
        payload[noteKey] = state.note;

        var response = await fetch(API_BASE + "/content-sections/" + sectionKey, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: titleDefault,
                description: "Homepage " + sectionKey + " section managed from the admin panel",
                status: "published",
                payload: payload
            })
        });

        if (!response.ok) {
            var errorBody = await response.json().catch(function () { return {}; });
            throw new Error(errorBody.error || "Failed to save section");
        }

        renderSelectedProducts();
        renderPool();
        setStatus(message, false);
    }

    async function loadData() {
        var productsResponse = await fetch(API_BASE + "/products");
        if (!productsResponse.ok) {
            throw new Error("Unable to load products from Product Management.");
        }

        allProducts = (await productsResponse.json()).map(normalizeProduct);

        try {
            var sectionResponse = await fetch(API_BASE + "/content-sections/" + sectionKey);
            if (!sectionResponse.ok) {
                throw new Error("No saved section");
            }
            var section = await sectionResponse.json();
            state.title = section.payload && section.payload.title || titleDefault;
            state.note = section.payload && section.payload[noteKey] || noteDefault;
            state.enabled = !(section.payload && section.payload.enabled === false);
            state.productIds = Array.isArray(section.payload && section.payload.productIds) ? section.payload.productIds.slice() : [];
        } catch (_error) {
            state.enabled = true;
            state.title = titleDefault;
            state.note = noteDefault;
            state.productIds = [];
        }

        syncFormFromState();
        renderSelectedProducts();
        renderPool();
        setStatus("Section loaded. Products now come only from Product Management.", false);
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        readForm();
        saveSectionButton.disabled = true;
        persistSection("Section settings saved.").catch(function (error) {
            setStatus(error.message || "Unable to save section settings.", true);
        }).finally(function () {
            saveSectionButton.disabled = false;
        });
    });

    saveSelectedButton.addEventListener("click", function () {
        persistSection("Selected products saved.").catch(function (error) {
            setStatus(error.message || "Unable to save selected products.", true);
        });
    });

    poolBody.addEventListener("click", function (event) {
        var addButton = event.target.closest(".section-add-product");
        if (!addButton) {
            return;
        }
        var productId = addButton.getAttribute("data-product-id");
        if (state.productIds.indexOf(productId) >= 0) {
            return;
        }
        state.productIds.push(productId);
        persistSection("Selected products updated.").catch(function (error) {
            setStatus(error.message || "Unable to add product to section.", true);
        });
    });

    selectedBody.addEventListener("click", function (event) {
        var removeButton = event.target.closest(".section-remove-product");
        var moveUpButton = event.target.closest(".section-move-up");
        var moveDownButton = event.target.closest(".section-move-down");
        var productId;
        var index;

        if (removeButton) {
            productId = removeButton.getAttribute("data-product-id");
            state.productIds = state.productIds.filter(function (id) {
                return id !== productId;
            });
        } else if (moveUpButton) {
            productId = moveUpButton.getAttribute("data-product-id");
            index = state.productIds.indexOf(productId);
            if (index > 0) {
                state.productIds.splice(index, 1);
                state.productIds.splice(index - 1, 0, productId);
            }
        } else if (moveDownButton) {
            productId = moveDownButton.getAttribute("data-product-id");
            index = state.productIds.indexOf(productId);
            if (index >= 0 && index < state.productIds.length - 1) {
                state.productIds.splice(index, 1);
                state.productIds.splice(index + 1, 0, productId);
            }
        } else {
            return;
        }

        persistSection("Selected products reordered.").catch(function (error) {
            setStatus(error.message || "Unable to update selected products.", true);
        });
    });

    selectedBody.addEventListener("dragstart", function (event) {
        var row = event.target.closest(".selected-product-row");
        if (!row) {
            return;
        }
        draggedProductId = row.getAttribute("data-product-id");
        event.dataTransfer.effectAllowed = "move";
        row.classList.add("dragging");
    });

    selectedBody.addEventListener("dragend", function () {
        draggedProductId = null;
        Array.prototype.forEach.call(selectedBody.querySelectorAll(".selected-product-row"), function (row) {
            row.classList.remove("dragging");
            row.classList.remove("drop-target");
        });
    });

    selectedBody.addEventListener("dragover", function (event) {
        var row = event.target.closest(".selected-product-row");
        if (!row) {
            return;
        }
        event.preventDefault();
        Array.prototype.forEach.call(selectedBody.querySelectorAll(".selected-product-row"), function (item) {
            item.classList.remove("drop-target");
        });
        row.classList.add("drop-target");
    });

    selectedBody.addEventListener("drop", function (event) {
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
        persistSection("Selected product order updated.").catch(function (error) {
            setStatus(error.message || "Unable to reorder selected products.", true);
        });
    });

    loadData().catch(function (error) {
        setStatus(error.message || "Unable to load section.", true);
    });
})();
