(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var defaults = {
        discountLabel: "Limited Offer",
        discountPercent: 20,
        headline: "Festive Oxidised",
        image: "img/discount.jpg",
        ctaLink: "limited-offer.html",
        countdownEnd: "",
        productIds: []
    };

    var allProducts = [];
    var state = normalizePayload(defaults);
    var form = document.getElementById("promotionsForm");
    var saveButton = document.getElementById("savePromotionsBtn");
    var saveProductsButton = document.getElementById("saveOfferProductsBtn");
    var uploadImageButton = document.getElementById("uploadDiscountImageBtn");
    var statusBox = document.getElementById("promotionsStatus");
    var uploadStatusBox = document.getElementById("discountImageUploadStatus");
    var cropModal = document.getElementById("imageCropModal");
    var cropperImage = document.getElementById("cropperImage");
    var cropPreviewBox = document.getElementById("cropPreviewBox");
    var applyCropButton = document.getElementById("applyCropBtn");
    var cancelCropButton = document.getElementById("cancelCropBtn");
    var selectedBody = document.getElementById("offerSelectedProductsBody");
    var poolBody = document.getElementById("offerProductPoolBody");
    var uploadGroup = document.querySelector("[data-upload-segment='discount-banner']");
    var fields = {
        discountLabel: document.getElementById("discountLabel"),
        discountPercent: document.getElementById("discountPercent"),
        headline: document.getElementById("discountTitle"),
        image: document.getElementById("discountImage"),
        imageFile: document.getElementById("discountImageFile"),
        ctaLink: document.getElementById("discountCta"),
        countdownDate: document.getElementById("countdownDate"),
        countdownTime: document.getElementById("countdownTime")
    };
    var cropper = null;
    var pendingUploadFile = null;
    var pendingObjectUrl = "";

    function setStatus(message, isError) {
        statusBox.textContent = message;
        statusBox.style.color = isError ? "#f4b6b6" : "";
    }

    function setUploadStatus(message, isError) {
        uploadStatusBox.textContent = message;
        uploadStatusBox.style.color = isError ? "#f4b6b6" : "";
    }

    function getUploadConfig() {
        return {
            aspectRatio: Number(uploadGroup.getAttribute("data-aspect-ratio") || 1.5),
            cropWidth: Number(uploadGroup.getAttribute("data-crop-width") || 1200),
            cropHeight: Number(uploadGroup.getAttribute("data-crop-height") || 800)
        };
    }

    function revokePendingObjectUrl() {
        if (pendingObjectUrl) {
            URL.revokeObjectURL(pendingObjectUrl);
            pendingObjectUrl = "";
        }
    }

    function closeCropModal() {
        cropModal.hidden = true;
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        cropperImage.removeAttribute("src");
        cropPreviewBox.innerHTML = "";
        revokePendingObjectUrl();
    }

    function openCropModal(file) {
        if (!window.Cropper) {
            setUploadStatus("Image cropper failed to load. The admin page now expects local vendor files in admin/vendor/cropperjs.", true);
            return;
        }

        var config = getUploadConfig();
        revokePendingObjectUrl();
        pendingObjectUrl = URL.createObjectURL(file);
        cropperImage.src = pendingObjectUrl;
        cropModal.hidden = false;

        cropperImage.onload = function () {
            if (cropper) {
                cropper.destroy();
            }

            cropPreviewBox.innerHTML = "";
            cropper = new window.Cropper(cropperImage, {
                aspectRatio: config.aspectRatio,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                background: false,
                preview: cropPreviewBox
            });
        };
    }

    function buildCroppedFile() {
        return new Promise(function (resolve, reject) {
            if (!cropper) {
                reject(new Error("Cropper is not ready."));
                return;
            }

            var config = getUploadConfig();
            var canvas = cropper.getCroppedCanvas({
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

                var originalName = fields.imageFile.files && fields.imageFile.files[0]
                    ? fields.imageFile.files[0].name.replace(/\.[^.]+$/, "")
                    : "banner-image";

                resolve(new File([blob], originalName + "-cropped.jpg", {
                    type: "image/jpeg"
                }));
            }, "image/jpeg", 0.92);
        });
    }

    function normalizePayload(payload) {
        var source = payload || {};
        var ctaLink = source.ctaLink;

        if (!ctaLink || ctaLink === "#products") {
            ctaLink = defaults.ctaLink;
        }

        return {
            enabled: source.enabled !== false,
            discountLabel: source.discountLabel || defaults.discountLabel,
            discountPercent: Number(source.discountPercent || defaults.discountPercent),
            headline: source.headline || defaults.headline,
            image: source.image || defaults.image,
            ctaLink: ctaLink,
            countdownEnd: source.countdownEnd || defaults.countdownEnd,
            productIds: Array.isArray(source.productIds) ? source.productIds.slice() : []
        };
    }

    function normalizeProduct(product) {
        return {
            _id: product._id,
            name: product.name || "",
            sku: product.sku || "",
            slug: product.slug || "",
            price: {
                cost: product.price && product.price.cost ? Number(product.price.cost) : null,
                selling: product.price && product.price.selling ? Number(product.price.selling) : 0,
                compareAt: product.price && product.price.compareAt ? Number(product.price.compareAt) : null
            }
        };
    }

    function splitCountdown(value) {
        if (!value) {
            return { date: "", time: "" };
        }
        var parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return { date: "", time: "" };
        }
        return {
            date: parsed.getFullYear() + "-" + String(parsed.getMonth() + 1).padStart(2, "0") + "-" + String(parsed.getDate()).padStart(2, "0"),
            time: String(parsed.getHours()).padStart(2, "0") + ":" + String(parsed.getMinutes()).padStart(2, "0")
        };
    }

    function readCountdownValue() {
        if (!fields.countdownDate.value) {
            return "";
        }
        return fields.countdownDate.value + "T" + (fields.countdownTime.value || "00:00") + ":00";
    }

    function formatPrice(value) {
        return "Rs. " + Number(value || 0).toLocaleString("en-IN");
    }

    function getBasePrice(product) {
        return product.price.cost || product.price.compareAt || product.price.selling || 0;
    }

    function getOfferPrice(product) {
        var basePrice = getBasePrice(product);
        var discountPercent = Number(state.discountPercent || 0);
        return Math.max(0, Math.round(basePrice * (100 - discountPercent)) / 100);
    }

    function fillForm() {
        var countdown = splitCountdown(state.countdownEnd);
        fields.discountLabel.value = state.discountLabel;
        fields.discountPercent.value = state.discountPercent;
        fields.headline.value = state.headline;
        fields.image.value = state.image;
        fields.imageFile.value = "";
        fields.ctaLink.value = state.ctaLink;
        fields.countdownDate.value = countdown.date;
        fields.countdownTime.value = countdown.time;
        pendingUploadFile = null;
        setUploadStatus(state.image ? "Current Cloudinary/image URL ready." : "No image prepared yet.", false);
    }

    function readForm() {
        state.discountLabel = fields.discountLabel.value.trim();
        state.discountPercent = Number(fields.discountPercent.value) || defaults.discountPercent;
        state.headline = fields.headline.value.trim();
        state.image = fields.image.value.trim();
        state.ctaLink = fields.ctaLink.value.trim() || "limited-offer.html";
        state.countdownEnd = readCountdownValue();
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
                "<tr>",
                "<td>" + product.name + '<br><small class="muted">Position ' + (index + 1) + "</small></td>",
                "<td>" + formatPrice(getBasePrice(product)) + "</td>",
                "<td>" + formatPrice(getOfferPrice(product)) + "</td>",
                '<td><span class="inline-actions"><button type="button" class="btn btn-ghost offer-move-up" data-product-id="' + product._id + '">Up</button><button type="button" class="btn btn-ghost offer-move-down" data-product-id="' + product._id + '">Down</button><button type="button" class="btn btn-ghost offer-remove-product" data-product-id="' + product._id + '">Remove</button></span></td>',
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
                "<td>" + product.name + "</td>",
                "<td>" + product.sku + "</td>",
                "<td>" + formatPrice(getBasePrice(product)) + "</td>",
                "<td>" + formatPrice(getOfferPrice(product)) + "</td>",
                '<td><button type="button" class="btn btn-ghost offer-add-product" data-product-id="' + product._id + '"' + (selected ? " disabled" : "") + ">" + (selected ? "Selected" : "Add") + "</button></td>",
                "</tr>"
            ].join("");
        }).join("");
    }

    async function persist(message) {
        var response = await fetch(API_BASE + "/content-sections/promotions", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: "Promotions",
                description: "Homepage promotions and limited-offer products managed from admin",
                status: "published",
                payload: Object.assign({}, state, { enabled: state.enabled !== false })
            })
        });

        if (!response.ok) {
            var errorBody = await response.json().catch(function () { return {}; });
            throw new Error(errorBody.error || "Unable to save promotions");
        }

        renderSelectedProducts();
        renderPool();
        setStatus(message, false);
    }

    async function uploadDiscountImage() {
        if (!pendingUploadFile) {
            setUploadStatus("Choose an image and crop it first.", true);
            return;
        }

        var formData = new FormData();
        formData.append("image", pendingUploadFile);

        uploadImageButton.disabled = true;
        setUploadStatus("Uploading image to Cloudinary...", false);

        try {
            var response = await fetch(API_BASE + "/uploads/image", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                var errorBody = await response.json().catch(function () { return {}; });
                throw new Error(errorBody.error || "Unable to upload image");
            }

            var payload = await response.json();
            fields.image.value = payload.url || "";
            setUploadStatus("Upload complete. The image URL has been filled in automatically.", false);
            setStatus("Image uploaded to Cloudinary. Save the banner to persist it.", false);
            pendingUploadFile = null;
            fields.imageFile.value = "";
        } catch (error) {
            setUploadStatus(error.message || "Unable to upload image.", true);
        } finally {
            uploadImageButton.disabled = false;
        }
    }

    async function loadPromotions() {
        var productsResponse = await fetch(API_BASE + "/products");
        if (!productsResponse.ok) {
            throw new Error("Unable to load products from Product Management.");
        }
        allProducts = (await productsResponse.json()).map(normalizeProduct);

        try {
            var response = await fetch(API_BASE + "/content-sections/promotions");
            if (!response.ok) {
                throw new Error("No saved promotions yet");
            }
            var section = await response.json();
            state = normalizePayload(section.payload);
        } catch (_error) {
            state = normalizePayload(defaults);
        }

        if (!state.ctaLink) {
            state.ctaLink = "limited-offer.html";
        }

        fillForm();
        renderSelectedProducts();
        renderPool();
        setStatus("Promotions loaded from backend.", false);
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        readForm();
        saveButton.disabled = true;
        persist("Promotions saved.").catch(function (error) {
            setStatus(error.message || "Unable to save promotions.", true);
        }).finally(function () {
            saveButton.disabled = false;
        });
    });

    saveProductsButton.addEventListener("click", function () {
        readForm();
        persist("Limited-offer products saved.").catch(function (error) {
            setStatus(error.message || "Unable to save offer products.", true);
        });
    });

    uploadImageButton.addEventListener("click", function () {
        uploadDiscountImage();
    });

    applyCropButton.addEventListener("click", function () {
        buildCroppedFile().then(function (file) {
            pendingUploadFile = file;
            setUploadStatus("Prepared cropped image: " + file.name + ". Click upload to send it to Cloudinary.", false);
            closeCropModal();
        }).catch(function (error) {
            setUploadStatus(error.message || "Unable to crop image.", true);
        });
    });

    cancelCropButton.addEventListener("click", function () {
        closeCropModal();
        pendingUploadFile = null;
        setUploadStatus("Image selection cancelled.", false);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-close-crop-modal]"), function (element) {
        element.addEventListener("click", function () {
            closeCropModal();
        });
    });

    poolBody.addEventListener("click", function (event) {
        var addButton = event.target.closest(".offer-add-product");
        if (!addButton) {
            return;
        }
        var productId = addButton.getAttribute("data-product-id");
        if (state.productIds.indexOf(productId) >= 0) {
            return;
        }
        state.productIds.push(productId);
        persist("Offer products updated.").catch(function (error) {
            setStatus(error.message || "Unable to add offer product.", true);
        });
    });

    selectedBody.addEventListener("click", function (event) {
        var removeButton = event.target.closest(".offer-remove-product");
        var moveUpButton = event.target.closest(".offer-move-up");
        var moveDownButton = event.target.closest(".offer-move-down");
        var productId;
        var index;

        if (removeButton) {
            productId = removeButton.getAttribute("data-product-id");
            state.productIds = state.productIds.filter(function (id) { return id !== productId; });
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

        persist("Offer product order updated.").catch(function (error) {
            setStatus(error.message || "Unable to update offer products.", true);
        });
    });

    fields.discountPercent.addEventListener("input", function () {
        readForm();
        renderSelectedProducts();
        renderPool();
    });

    fields.imageFile.addEventListener("change", function () {
        if (fields.imageFile.files && fields.imageFile.files.length) {
            pendingUploadFile = null;
            setUploadStatus("Selected: " + fields.imageFile.files[0].name + ". Crop it before upload.", false);
            openCropModal(fields.imageFile.files[0]);
        } else {
            pendingUploadFile = null;
            setUploadStatus("No image prepared yet.", false);
        }
    });

    loadPromotions().catch(function (error) {
        setStatus(error.message || "Unable to load promotions.", true);
    });
})();
