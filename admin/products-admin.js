(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var products = [];
    var selectedProductId = "";

    var statusBox = document.getElementById("productsStatus");
    var catalogTableBody = document.getElementById("catalogTableBody");
    var relatedProductsTableBody = document.getElementById("relatedProductsTableBody");
    var productForm = document.getElementById("productForm");
    var addProductButton = document.getElementById("addProductBtn");
    var resetProductButton = document.getElementById("resetProductBtn");
    var addRelatedProductButton = document.getElementById("addRelatedProductBtn");
    var saveProductButton = document.getElementById("saveProductBtn");
    var mediaCards = Array.prototype.slice.call(document.querySelectorAll("[data-media-upload]"));
    var productCropModal = document.getElementById("productImageCropModal");
    var productCropperImage = document.getElementById("productCropperImage");
    var productCropPreviewBox = document.getElementById("productCropPreviewBox");
    var applyProductCropButton = document.getElementById("applyProductCropBtn");
    var cancelProductCropButton = document.getElementById("cancelProductCropBtn");

    var statActive = document.getElementById("product-stat-active");
    var statStock = document.getElementById("product-stat-stock");
    var statFeatured = document.getElementById("product-stat-featured");
    var statDraft = document.getElementById("product-stat-draft");

    var fields = {
        id: document.getElementById("productId"),
        name: document.getElementById("productName"),
        sku: document.getElementById("productSku"),
        subtitle: document.getElementById("productSubtitle"),
        category: document.getElementById("productCategory"),
        cost: document.getElementById("productCost"),
        price: document.getElementById("productPrice"),
        compareAt: document.getElementById("productCompare"),
        reviewCount: document.getElementById("productReviews"),
        summary: document.getElementById("productSummary"),
        primaryImage: document.getElementById("productPrimaryImage"),
        thumb1: document.getElementById("thumb1"),
        thumb2: document.getElementById("thumb2"),
        thumb3: document.getElementById("thumb3"),
        thumb4: document.getElementById("thumb4"),
        availability: document.getElementById("availability"),
        finish: document.getElementById("finish"),
        dimensions: document.getElementById("dimensions"),
        inBox: document.getElementById("inBox"),
        promotionLine: document.getElementById("promotionLine"),
        stockQty: document.getElementById("stockQty"),
        status: document.getElementById("status"),
        badge: document.getElementById("badge"),
        dispatchSla: document.getElementById("dispatch"),
        descriptionTab: document.getElementById("descriptionTab"),
        specTab: document.getElementById("specTab"),
        reviewTab: document.getElementById("reviewTab")
    };
    var mediaUploadState = {};
    var productCropper = null;
    var activeMediaCard = null;
    var activeMediaObjectUrl = "";

    function setStatus(message, isError) {
        statusBox.textContent = message;
        statusBox.style.color = isError ? "#f4b6b6" : "";
    }

    function setMediaStatus(card, message, isError) {
        var statusNode = card.querySelector(".media-upload-status");
        if (!statusNode) {
            return;
        }
        statusNode.textContent = message;
        statusNode.style.color = isError ? "#f4b6b6" : "";
    }

    function getMediaConfig(card) {
        return {
            key: card.getAttribute("data-media-upload"),
            targetInput: card.getAttribute("data-target-input"),
            aspectRatio: Number(card.getAttribute("data-aspect-ratio") || 1),
            cropWidth: Number(card.getAttribute("data-crop-width") || 1200),
            cropHeight: Number(card.getAttribute("data-crop-height") || 1200)
        };
    }

    function revokeActiveMediaObjectUrl() {
        if (activeMediaObjectUrl) {
            URL.revokeObjectURL(activeMediaObjectUrl);
            activeMediaObjectUrl = "";
        }
    }

    function closeProductCropModal() {
        productCropModal.hidden = true;
        if (productCropper) {
            productCropper.destroy();
            productCropper = null;
        }
        productCropperImage.removeAttribute("src");
        productCropPreviewBox.innerHTML = "";
        revokeActiveMediaObjectUrl();
        activeMediaCard = null;
    }

    function openProductCropModal(card, file) {
        if (!window.Cropper) {
            setMediaStatus(card, "Image cropper failed to load. The admin page now expects local vendor files in admin/vendor/cropperjs.", true);
            return;
        }

        var config = getMediaConfig(card);
        activeMediaCard = card;
        revokeActiveMediaObjectUrl();
        activeMediaObjectUrl = URL.createObjectURL(file);
        productCropperImage.src = activeMediaObjectUrl;
        productCropModal.hidden = false;

        productCropperImage.onload = function () {
            if (productCropper) {
                productCropper.destroy();
            }

            productCropPreviewBox.innerHTML = "";
            productCropper = new window.Cropper(productCropperImage, {
                aspectRatio: config.aspectRatio,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                background: false,
                preview: productCropPreviewBox
            });
        };
    }

    function buildCroppedMediaFile(card, sourceFile) {
        return new Promise(function (resolve, reject) {
            if (!productCropper) {
                reject(new Error("Cropper is not ready."));
                return;
            }

            var config = getMediaConfig(card);
            var canvas = productCropper.getCroppedCanvas({
                width: config.cropWidth,
                height: config.cropHeight,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: "high"
            });

            if (!canvas) {
                reject(new Error("Unable to crop image."));
                return;
            }

            canvas.toBlob(function (blob) {
                if (!blob) {
                    reject(new Error("Unable to prepare cropped image."));
                    return;
                }

                var originalName = sourceFile && sourceFile.name
                    ? sourceFile.name.replace(/\.[^.]+$/, "")
                    : config.key;

                resolve(new File([blob], originalName + "-cropped.jpg", {
                    type: "image/jpeg"
                }));
            }, "image/jpeg", 0.92);
        });
    }

    async function uploadPreparedMedia(card) {
        var config = getMediaConfig(card);
        var state = mediaUploadState[config.key];

        if (!state || !state.file) {
            setMediaStatus(card, "Choose and crop an image first.", true);
            return;
        }

        var uploadButton = card.querySelector(".media-upload-btn");
        var formData = new FormData();
        formData.append("image", state.file);

        if (uploadButton) {
            uploadButton.disabled = true;
        }
        setMediaStatus(card, "Uploading image to Cloudinary...", false);

        try {
            var response = await fetch(API_BASE + "/uploads/image", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                var errorBody = await response.json().catch(function () {
                    return {};
                });
                throw new Error(errorBody.error || "Unable to upload image");
            }

            var payload = await response.json();
            if (fields[config.targetInput]) {
                fields[config.targetInput].value = payload.url || "";
            }
            mediaUploadState[config.key] = null;
            var fileInput = card.querySelector("input[type='file']");
            if (fileInput) {
                fileInput.value = "";
            }
            setMediaStatus(card, "Upload complete. Save the product to persist this image.", false);
            setStatus("Image uploaded to Cloudinary. Save the product to keep it.", false);
        } catch (error) {
            setMediaStatus(card, error.message || "Unable to upload image.", true);
        } finally {
            if (uploadButton) {
                uploadButton.disabled = false;
            }
        }
    }

    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function formatPrice(value) {
        return "Rs. " + Number(value || 0).toLocaleString("en-IN");
    }

    function titleCaseStatus(status) {
        var normalized = String(status || "").replace(/-/g, " ");
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function clearForm() {
        Object.keys(fields).forEach(function (key) {
            fields[key].value = "";
        });
        fields.status.value = "live";
        saveProductButton.textContent = "Save Product";
        selectedProductId = "";
        renderRelatedProducts(null);
        mediaCards.forEach(function (card) {
            var key = getMediaConfig(card).key;
            mediaUploadState[key] = null;
            var fileInput = card.querySelector("input[type='file']");
            if (fileInput) {
                fileInput.value = "";
            }
            setMediaStatus(card, "No image prepared yet.", false);
        });
    }

    function normalizeProduct(product) {
        return {
            _id: product._id || "",
            name: product.name || "",
            slug: product.slug || slugify(product.name),
            sku: product.sku || "",
            subtitle: product.subtitle || "",
            category: product.category || "",
            summary: product.summary || "",
            price: {
                cost: product.price && product.price.cost ? Number(product.price.cost) : null,
                selling: product.price && product.price.selling ? Number(product.price.selling) : 0,
                compareAt: product.price && product.price.compareAt ? Number(product.price.compareAt) : null
            },
            reviewCount: Number(product.reviewCount || 0),
            stockQty: Number(product.stockQty || 0),
            status: product.status || "live",
            badge: product.badge || "",
            dispatchSla: product.dispatchSla || "",
            media: {
                heroImage: product.media && product.media.heroImage || "",
                thumbnails: product.media && Array.isArray(product.media.thumbnails) ? product.media.thumbnails : []
            },
            widget: {
                availability: product.widget && product.widget.availability || "",
                finish: product.widget && product.widget.finish || "",
                dimensions: product.widget && product.widget.dimensions || "",
                inBox: product.widget && product.widget.inBox || "",
                promotionLine: product.widget && product.widget.promotionLine || ""
            },
            tabs: {
                description: product.tabs && product.tabs.description || "",
                specification: product.tabs && product.tabs.specification || "",
                reviewSnippet: product.tabs && product.tabs.reviewSnippet || ""
            },
            relatedProducts: Array.isArray(product.relatedProducts) ? product.relatedProducts : []
        };
    }

    function fillForm(product) {
        selectedProductId = product._id;
        fields.id.value = product._id;
        fields.name.value = product.name;
        fields.sku.value = product.sku;
        fields.subtitle.value = product.subtitle;
        fields.category.value = product.category;
        fields.cost.value = product.price.cost || "";
        fields.price.value = product.price.selling || "";
        fields.compareAt.value = product.price.compareAt || "";
        fields.reviewCount.value = product.reviewCount || "";
        fields.summary.value = product.summary;
        fields.primaryImage.value = product.media.heroImage || "";
        fields.thumb1.value = product.media.thumbnails[0] || "";
        fields.thumb2.value = product.media.thumbnails[1] || "";
        fields.thumb3.value = product.media.thumbnails[2] || "";
        fields.thumb4.value = product.media.thumbnails[3] || "";
        fields.availability.value = product.widget.availability;
        fields.finish.value = product.widget.finish;
        fields.dimensions.value = product.widget.dimensions;
        fields.inBox.value = product.widget.inBox;
        fields.promotionLine.value = product.widget.promotionLine;
        fields.stockQty.value = product.stockQty;
        fields.status.value = product.status;
        fields.badge.value = product.badge;
        fields.dispatchSla.value = product.dispatchSla;
        fields.descriptionTab.value = product.tabs.description;
        fields.specTab.value = product.tabs.specification;
        fields.reviewTab.value = product.tabs.reviewSnippet;
        saveProductButton.textContent = "Update Product";
        renderRelatedProducts(product);
        mediaCards.forEach(function (card) {
            var config = getMediaConfig(card);
            mediaUploadState[config.key] = null;
            var fileInput = card.querySelector("input[type='file']");
            if (fileInput) {
                fileInput.value = "";
            }
            var currentValue = fields[config.targetInput] ? fields[config.targetInput].value : "";
            setMediaStatus(card, currentValue ? "Current image URL ready." : "No image prepared yet.", false);
        });
    }

    function renderStats() {
        var activeProducts = products.filter(function (product) {
            return product.status === "live";
        });
        var inStockProducts = products.filter(function (product) {
            return product.stockQty > 0;
        });
        var lowStockProducts = products.filter(function (product) {
            return product.stockQty > 0 && product.stockQty <= 10;
        });
        var featuredProducts = products.filter(function (product) {
            return product.badge || (product.relatedProducts && product.relatedProducts.length);
        });
        var draftProducts = products.filter(function (product) {
            return product.status === "draft";
        });

        statActive.textContent = String(activeProducts.length);
        statStock.textContent = inStockProducts.length + " in stock, " + lowStockProducts.length + " low inventory";
        statFeatured.textContent = String(featuredProducts.length);
        statDraft.textContent = String(draftProducts.length);
    }

    function renderCatalog() {
        if (!products.length) {
            catalogTableBody.innerHTML = '<tr><td colspan="7" class="text-center muted">No products found. Use Add Product to create the first one.</td></tr>';
            return;
        }

        catalogTableBody.innerHTML = products.map(function (product) {
            return [
                "<tr>",
                "<td>" + product.name + "</td>",
                "<td>" + product.sku + "</td>",
                "<td>" + product.category + "</td>",
                "<td>" + formatPrice(product.price.selling) + "</td>",
                "<td>" + product.stockQty + "</td>",
                "<td>" + titleCaseStatus(product.status) + "</td>",
                '<td><span class="inline-actions"><button type="button" class="btn btn-ghost product-edit-btn" data-id="' + product._id + '">Edit</button><button type="button" class="btn btn-ghost product-archive-btn" data-id="' + product._id + '">Archive</button></span></td>',
                "</tr>"
            ].join("");
        }).join("");
    }

    function renderRelatedProducts(product) {
        if (!product) {
            relatedProductsTableBody.innerHTML = '<tr><td colspan="5" class="text-center muted">Select a product to manage related products.</td></tr>';
            return;
        }

        if (!product.relatedProducts.length) {
            relatedProductsTableBody.innerHTML = '<tr><td colspan="5" class="text-center muted">No related products added yet.</td></tr>';
            return;
        }

        relatedProductsTableBody.innerHTML = product.relatedProducts.map(function (related, index) {
            return [
                "<tr>",
                "<td>" + (related.title || "-") + "</td>",
                "<td><span class=\"thumb-badge\">" + (related.image || "-") + "</span></td>",
                "<td>" + formatPrice(related.price || 0) + "</td>",
                "<td>" + (related.badge || "-") + "</td>",
                '<td><span class="inline-actions"><button type="button" class="btn btn-ghost related-remove-btn" data-index="' + index + '">Remove</button></span></td>',
                "</tr>"
            ].join("");
        }).join("");
    }

    function readFormPayload() {
        var thumbnails = [fields.thumb1.value, fields.thumb2.value, fields.thumb3.value, fields.thumb4.value]
            .map(function (value) { return value.trim(); })
            .filter(Boolean);

        var currentProduct = products.find(function (product) {
            return product._id === selectedProductId;
        });

        return {
            name: fields.name.value.trim(),
            slug: slugify(fields.name.value),
            sku: fields.sku.value.trim().toUpperCase(),
            subtitle: fields.subtitle.value.trim(),
            category: fields.category.value.trim(),
            summary: fields.summary.value.trim(),
            price: {
                cost: fields.cost.value ? Number(fields.cost.value) : null,
                selling: Number(fields.price.value) || 0,
                compareAt: fields.compareAt.value ? Number(fields.compareAt.value) : null
            },
            reviewCount: Number(fields.reviewCount.value) || 0,
            stockQty: Number(fields.stockQty.value) || 0,
            status: (fields.status.value || "live").trim().toLowerCase().replace(/\s+/g, "-"),
            badge: fields.badge.value.trim(),
            dispatchSla: fields.dispatchSla.value.trim(),
            media: {
                heroImage: fields.primaryImage.value.trim(),
                thumbnails: thumbnails
            },
            widget: {
                availability: fields.availability.value.trim(),
                finish: fields.finish.value.trim(),
                dimensions: fields.dimensions.value.trim(),
                inBox: fields.inBox.value.trim(),
                promotionLine: fields.promotionLine.value.trim()
            },
            tabs: {
                description: fields.descriptionTab.value.trim(),
                specification: fields.specTab.value.trim(),
                reviewSnippet: fields.reviewTab.value.trim()
            },
            relatedProducts: currentProduct ? currentProduct.relatedProducts : []
        };
    }

    async function loadProducts(statusMessage) {
        var response = await fetch(API_BASE + "/products");
        if (!response.ok) {
            throw new Error("Unable to load products");
        }

        var payload = await response.json();
        products = payload.map(normalizeProduct);
        renderStats();
        renderCatalog();

        if (selectedProductId) {
            var activeProduct = products.find(function (product) {
                return product._id === selectedProductId;
            });

            if (activeProduct) {
                fillForm(activeProduct);
            } else {
                clearForm();
            }
        }

        if (statusMessage) {
            setStatus(statusMessage, false);
        }
    }

    async function saveProduct(event) {
        event.preventDefault();
        var payload = readFormPayload();

        if (!payload.name || !payload.sku || !payload.category || !payload.price.selling) {
            setStatus("Name, SKU, category, and selling price are required.", true);
            return;
        }

        saveProductButton.disabled = true;
        setStatus("Saving product...", false);

        try {
            var isUpdate = Boolean(selectedProductId);
            var response = await fetch(API_BASE + "/products" + (isUpdate ? "/" + selectedProductId : ""), {
                method: isUpdate ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                var errorBody = await response.json().catch(function () {
                    return {};
                });
                throw new Error(errorBody.error || "Unable to save product");
            }

            var savedProduct = normalizeProduct(await response.json());
            selectedProductId = savedProduct._id;
            await loadProducts("Product saved successfully.");
            fillForm(savedProduct);
        } catch (error) {
            setStatus(error.message || "Unable to save product.", true);
        } finally {
            saveProductButton.disabled = false;
        }
    }

    async function archiveProduct(productId) {
        try {
            setStatus("Archiving product...", false);
            var response = await fetch(API_BASE + "/products/" + productId, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: "archived" })
            });

            if (!response.ok) {
                var errorBody = await response.json().catch(function () {
                    return {};
                });
                throw new Error(errorBody.error || "Unable to archive product");
            }

            await loadProducts("Product archived.");
        } catch (error) {
            setStatus(error.message || "Unable to archive product.", true);
        }
    }

    async function removeRelatedProduct(index) {
        var currentProduct = products.find(function (product) {
            return product._id === selectedProductId;
        });

        if (!currentProduct) {
            return;
        }

        currentProduct.relatedProducts.splice(index, 1);

        try {
            setStatus("Saving related products...", false);
            var response = await fetch(API_BASE + "/products/" + selectedProductId, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ relatedProducts: currentProduct.relatedProducts })
            });

            if (!response.ok) {
                var errorBody = await response.json().catch(function () {
                    return {};
                });
                throw new Error(errorBody.error || "Unable to update related products");
            }

            await loadProducts("Related products updated.");
        } catch (error) {
            setStatus(error.message || "Unable to update related products.", true);
        }
    }

    async function addRelatedProduct() {
        var currentProduct = products.find(function (product) {
            return product._id === selectedProductId;
        });

        if (!currentProduct) {
            setStatus("Select or save a product before adding related products.", true);
            return;
        }

        currentProduct.relatedProducts.push({
            title: "New Related Product",
            image: "",
            price: 0,
            badge: ""
        });

        try {
            setStatus("Saving related products...", false);
            var response = await fetch(API_BASE + "/products/" + selectedProductId, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ relatedProducts: currentProduct.relatedProducts })
            });

            if (!response.ok) {
                var errorBody = await response.json().catch(function () {
                    return {};
                });
                throw new Error(errorBody.error || "Unable to add related product");
            }

            await loadProducts("Related product placeholder added.");
        } catch (error) {
            setStatus(error.message || "Unable to add related product.", true);
        }
    }

    catalogTableBody.addEventListener("click", function (event) {
        var editButton = event.target.closest(".product-edit-btn");
        var archiveButton = event.target.closest(".product-archive-btn");

        if (editButton) {
            var product = products.find(function (item) {
                return item._id === editButton.getAttribute("data-id");
            });
            if (product) {
                fillForm(product);
                setStatus("Editing product: " + product.name, false);
            }
            return;
        }

        if (archiveButton) {
            archiveProduct(archiveButton.getAttribute("data-id"));
        }
    });

    relatedProductsTableBody.addEventListener("click", function (event) {
        var removeButton = event.target.closest(".related-remove-btn");
        if (removeButton) {
            removeRelatedProduct(Number(removeButton.getAttribute("data-index")));
        }
    });

    addProductButton.addEventListener("click", function () {
        clearForm();
        setStatus("Ready to create a new product.", false);
    });

    resetProductButton.addEventListener("click", function () {
        if (!selectedProductId) {
            clearForm();
            setStatus("Form reset.", false);
            return;
        }

        var currentProduct = products.find(function (product) {
            return product._id === selectedProductId;
        });
        if (currentProduct) {
            fillForm(currentProduct);
            setStatus("Changes reverted to the selected product.", false);
        }
    });

    addRelatedProductButton.addEventListener("click", function () {
        addRelatedProduct();
    });

    mediaCards.forEach(function (card) {
        var fileInput = card.querySelector("input[type='file']");
        var uploadButton = card.querySelector(".media-upload-btn");
        var config = getMediaConfig(card);

        if (fileInput) {
            fileInput.addEventListener("change", function () {
                if (fileInput.files && fileInput.files.length) {
                    mediaUploadState[config.key] = null;
                    setMediaStatus(card, "Selected: " + fileInput.files[0].name + ". Crop it before upload.", false);
                    openProductCropModal(card, fileInput.files[0]);
                } else {
                    mediaUploadState[config.key] = null;
                    setMediaStatus(card, "No image prepared yet.", false);
                }
            });
        }

        if (uploadButton) {
            uploadButton.addEventListener("click", function () {
                uploadPreparedMedia(card);
            });
        }
    });

    applyProductCropButton.addEventListener("click", function () {
        if (!activeMediaCard) {
            return;
        }

        var fileInput = activeMediaCard.querySelector("input[type='file']");
        var sourceFile = fileInput && fileInput.files && fileInput.files.length ? fileInput.files[0] : null;
        var config = getMediaConfig(activeMediaCard);

        buildCroppedMediaFile(activeMediaCard, sourceFile).then(function (file) {
            mediaUploadState[config.key] = { file: file };
            setMediaStatus(activeMediaCard, "Prepared cropped image: " + file.name + ". Click upload to send it to Cloudinary.", false);
            closeProductCropModal();
        }).catch(function (error) {
            setMediaStatus(activeMediaCard, error.message || "Unable to crop image.", true);
        });
    });

    cancelProductCropButton.addEventListener("click", function () {
        if (activeMediaCard) {
            var config = getMediaConfig(activeMediaCard);
            mediaUploadState[config.key] = null;
            setMediaStatus(activeMediaCard, "Image selection cancelled.", false);
        }
        closeProductCropModal();
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-close-product-crop-modal]"), function (element) {
        element.addEventListener("click", function () {
            closeProductCropModal();
        });
    });

    productForm.addEventListener("submit", saveProduct);
    clearForm();
    loadProducts("Product catalog loaded from backend.").catch(function (error) {
        setStatus(error.message || "Unable to load products.", true);
        renderCatalog();
    });
})();
