(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var heroDefaults = {
        title: "Oxidised for Women",
        subheadline: "Handcrafted silver-tone pieces inspired by old-world artistry - necklaces, jhumkas, bangles, anklets, and giftable sets.",
        ctaText: "Shop the festive edit",
        ctaLink: "#products",
        backgroundImage: "img/banner/banner-1.jpg",
        tiles: [
            {
                title: "Statement Necklaces",
                copy: "Artisanal chokers",
                image: "img/trend/ht-2.jpg",
                link: "#necklaces"
            },
            {
                title: "Everyday Jhumkas",
                copy: "Lightweight drops",
                image: "img/trend/ht-1.jpg",
                link: "#earrings"
            },
            {
                title: "Stackable Bangles",
                copy: "Oxidised cuffs",
                image: "img/product/product-3.jpg",
                link: "#bangles"
            },
            {
                title: "Graceful Anklets",
                copy: "Ghungroo accents",
                image: "img/product/product-5.jpg",
                link: "#anklets"
            }
        ]
    };

    var form = document.getElementById("hero-form");
    var saveButton = document.getElementById("saveHeroBtn");
    var statusBox = document.getElementById("hero-status");
    var currentHero = normalizeHeroPayload(heroDefaults);
    var heroUploadCards = Array.prototype.slice.call(document.querySelectorAll("[data-hero-upload]"));
    var heroCropModal = document.getElementById("heroImageCropModal");
    var heroCropperImage = document.getElementById("heroCropperImage");
    var heroCropPreviewBox = document.getElementById("heroCropPreviewBox");
    var applyHeroCropButton = document.getElementById("applyHeroCropBtn");
    var cancelHeroCropButton = document.getElementById("cancelHeroCropBtn");

    var fields = {
        title: document.getElementById("heroTitle"),
        subheadline: document.getElementById("heroSub"),
        ctaText: document.getElementById("heroCtaText"),
        ctaLink: document.getElementById("heroCtaLink"),
        backgroundImage: document.getElementById("heroBg")
    };
    var heroUploadState = {};
    var heroCropper = null;
    var activeHeroCard = null;
    var activeHeroObjectUrl = "";

    function setStatus(message, isError) {
        statusBox.textContent = message;
        statusBox.style.color = isError ? "#f4b6b6" : "";
    }

    function setHeroUploadStatus(card, message, isError) {
        var statusNode = card.querySelector(".hero-upload-status");
        if (!statusNode) {
            return;
        }
        statusNode.textContent = message;
        statusNode.style.color = isError ? "#f4b6b6" : "";
    }

    function getHeroUploadConfig(card) {
        return {
            key: card.getAttribute("data-hero-upload"),
            targetInput: card.getAttribute("data-target-input"),
            aspectRatio: Number(card.getAttribute("data-aspect-ratio") || 1),
            cropWidth: Number(card.getAttribute("data-crop-width") || 1200),
            cropHeight: Number(card.getAttribute("data-crop-height") || 1200)
        };
    }

    function getFieldById(id) {
        if (id === "heroBg") {
            return fields.backgroundImage;
        }

        for (var index = 0; index < 4; index += 1) {
            var tileFields = getTileFields(index);
            if (tileFields.image && tileFields.image.id === id) {
                return tileFields.image;
            }
        }

        return null;
    }

    function revokeActiveHeroObjectUrl() {
        if (activeHeroObjectUrl) {
            URL.revokeObjectURL(activeHeroObjectUrl);
            activeHeroObjectUrl = "";
        }
    }

    function closeHeroCropModal() {
        heroCropModal.hidden = true;
        if (heroCropper) {
            heroCropper.destroy();
            heroCropper = null;
        }
        heroCropperImage.removeAttribute("src");
        heroCropPreviewBox.innerHTML = "";
        revokeActiveHeroObjectUrl();
        activeHeroCard = null;
    }

    function openHeroCropModal(card, file) {
        if (!window.Cropper) {
            setHeroUploadStatus(card, "Image cropper failed to load. The admin page now expects local vendor files in admin/vendor/cropperjs.", true);
            return;
        }

        var config = getHeroUploadConfig(card);
        activeHeroCard = card;
        revokeActiveHeroObjectUrl();
        activeHeroObjectUrl = URL.createObjectURL(file);
        heroCropperImage.src = activeHeroObjectUrl;
        heroCropModal.hidden = false;

        heroCropperImage.onload = function () {
            if (heroCropper) {
                heroCropper.destroy();
            }

            heroCropPreviewBox.innerHTML = "";
            heroCropper = new window.Cropper(heroCropperImage, {
                aspectRatio: config.aspectRatio,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                background: false,
                preview: heroCropPreviewBox
            });
        };
    }

    function buildCroppedHeroFile(card, sourceFile) {
        return new Promise(function (resolve, reject) {
            if (!heroCropper) {
                reject(new Error("Cropper is not ready."));
                return;
            }

            var config = getHeroUploadConfig(card);
            var canvas = heroCropper.getCroppedCanvas({
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

    async function uploadPreparedHeroImage(card) {
        var config = getHeroUploadConfig(card);
        var state = heroUploadState[config.key];

        if (!state || !state.file) {
            setHeroUploadStatus(card, "Choose and crop an image first.", true);
            return;
        }

        var uploadButton = card.querySelector(".hero-upload-btn");
        var formData = new FormData();
        formData.append("image", state.file);

        if (uploadButton) {
            uploadButton.disabled = true;
        }
        setHeroUploadStatus(card, "Uploading image to Cloudinary...", false);

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
            var targetField = getFieldById(config.targetInput);
            if (targetField) {
                targetField.value = payload.url || "";
            }

            heroUploadState[config.key] = null;
            var fileInput = card.querySelector("input[type='file']");
            if (fileInput) {
                fileInput.value = "";
            }
            setHeroUploadStatus(card, "Upload complete. Save Hero to persist this image.", false);
            setStatus("Image uploaded to Cloudinary. Save Hero to keep it.", false);
        } catch (error) {
            setHeroUploadStatus(card, error.message || "Unable to upload image.", true);
        } finally {
            if (uploadButton) {
                uploadButton.disabled = false;
            }
        }
    }

    function getTileFields(index) {
        var tileNumber = index + 1;
        return {
            title: document.getElementById("tile" + tileNumber + "Title"),
            copy: document.getElementById("tile" + tileNumber + "Copy"),
            image: document.getElementById("tile" + tileNumber + "Image"),
            link: document.getElementById("tile" + tileNumber + "Link")
        };
    }

    function normalizeHeroPayload(payload) {
        var source = payload || {};

        return {
            enabled: source.enabled !== false,
            title: source.title || heroDefaults.title,
            subheadline: source.subheadline || heroDefaults.subheadline,
            ctaText: source.ctaText || heroDefaults.ctaText,
            ctaLink: source.ctaLink || heroDefaults.ctaLink,
            backgroundImage: source.backgroundImage || heroDefaults.backgroundImage,
            tiles: heroDefaults.tiles.map(function (tile, index) {
                var current = source.tiles && source.tiles[index] ? source.tiles[index] : {};

                return {
                    title: current.title || tile.title,
                    copy: current.copy || tile.copy,
                    image: current.image || tile.image,
                    link: current.link || tile.link
                };
            })
        };
    }

    function fillForm(hero) {
        fields.title.value = hero.title;
        fields.subheadline.value = hero.subheadline;
        fields.ctaText.value = hero.ctaText;
        fields.ctaLink.value = hero.ctaLink;
        fields.backgroundImage.value = hero.backgroundImage;
        heroUploadCards.forEach(function (card) {
            var config = getHeroUploadConfig(card);
            heroUploadState[config.key] = null;
            var fileInput = card.querySelector("input[type='file']");
            var targetField = getFieldById(config.targetInput);
            if (fileInput) {
                fileInput.value = "";
            }
            setHeroUploadStatus(card, targetField && targetField.value ? "Current image URL ready." : "No image prepared yet.", false);
        });

        hero.tiles.forEach(function (tile, index) {
            var tileFields = getTileFields(index);
            tileFields.title.value = tile.title;
            tileFields.copy.value = tile.copy;
            tileFields.image.value = tile.image;
            tileFields.link.value = tile.link;
        });
    }

    function readForm() {
        return {
            enabled: currentHero.enabled !== false,
            title: fields.title.value.trim(),
            subheadline: fields.subheadline.value.trim(),
            ctaText: fields.ctaText.value.trim(),
            ctaLink: fields.ctaLink.value.trim(),
            backgroundImage: fields.backgroundImage.value.trim(),
            tiles: heroDefaults.tiles.map(function (_tile, index) {
                var tileFields = getTileFields(index);

                return {
                    title: tileFields.title.value.trim(),
                    copy: tileFields.copy.value.trim(),
                    image: tileFields.image.value.trim(),
                    link: tileFields.link.value.trim()
                };
            })
        };
    }

    async function loadHero() {
        try {
            var response = await fetch(API_BASE + "/content-sections/hero");
            if (!response.ok) {
                throw new Error("Hero content not found yet");
            }

            var section = await response.json();
            currentHero = normalizeHeroPayload(section.payload);
            fillForm(currentHero);
            setStatus("Hero content loaded from backend.", false);
        } catch (_error) {
            currentHero = normalizeHeroPayload(heroDefaults);
            fillForm(currentHero);
            setStatus("Using local defaults. Save once to create the hero section in MongoDB.", false);
        }
    }

    async function saveHero(event) {
        event.preventDefault();
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
        setStatus("Saving hero content...", false);

        try {
            var response = await fetch(API_BASE + "/content-sections/hero", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: "Hero Section",
                    description: "Homepage hero content managed from the admin panel",
                    status: "published",
                    payload: readForm()
                })
            });

            if (!response.ok) {
                var errorBody = await response.json().catch(function () {
                    return {};
                });
                throw new Error(errorBody.error || "Failed to save hero content");
            }

            setStatus("Hero section saved. Refresh the storefront homepage to see the update.", false);
        } catch (error) {
            setStatus(error.message || "Unable to save hero content.", true);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Hero";
        }
    }

    form.addEventListener("submit", saveHero);

    heroUploadCards.forEach(function (card) {
        var fileInput = card.querySelector("input[type='file']");
        var uploadButton = card.querySelector(".hero-upload-btn");
        var config = getHeroUploadConfig(card);

        if (fileInput) {
            fileInput.addEventListener("change", function () {
                if (fileInput.files && fileInput.files.length) {
                    heroUploadState[config.key] = null;
                    setHeroUploadStatus(card, "Selected: " + fileInput.files[0].name + ". Crop it before upload.", false);
                    openHeroCropModal(card, fileInput.files[0]);
                } else {
                    heroUploadState[config.key] = null;
                    setHeroUploadStatus(card, "No image prepared yet.", false);
                }
            });
        }

        if (uploadButton) {
            uploadButton.addEventListener("click", function () {
                uploadPreparedHeroImage(card);
            });
        }
    });

    applyHeroCropButton.addEventListener("click", function () {
        if (!activeHeroCard) {
            return;
        }

        var fileInput = activeHeroCard.querySelector("input[type='file']");
        var sourceFile = fileInput && fileInput.files && fileInput.files.length ? fileInput.files[0] : null;
        var config = getHeroUploadConfig(activeHeroCard);

        buildCroppedHeroFile(activeHeroCard, sourceFile).then(function (file) {
            heroUploadState[config.key] = { file: file };
            setHeroUploadStatus(activeHeroCard, "Prepared cropped image: " + file.name + ". Click upload to send it to Cloudinary.", false);
            closeHeroCropModal();
        }).catch(function (error) {
            setHeroUploadStatus(activeHeroCard, error.message || "Unable to crop image.", true);
        });
    });

    cancelHeroCropButton.addEventListener("click", function () {
        if (activeHeroCard) {
            var config = getHeroUploadConfig(activeHeroCard);
            heroUploadState[config.key] = null;
            setHeroUploadStatus(activeHeroCard, "Image selection cancelled.", false);
        }
        closeHeroCropModal();
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-close-hero-crop-modal]"), function (element) {
        element.addEventListener("click", function () {
            closeHeroCropModal();
        });
    });

    loadHero();
})();
