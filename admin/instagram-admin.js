(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var defaults = {
        enabled: true,
        heading: "Follow Us On Instagram",
        username: "aaraa_silver",
        profileUrl: "https://www.instagram.com/aaraa_silver/",
        igUserId: "",
        accessToken: "",
        limit: 6,
        items: []
    };

    var form = document.getElementById("instagramForm");
    var saveButton = document.getElementById("saveInstagramBtn");
    var previewButton = document.getElementById("previewInstagramBtn");
    var statusNode = document.getElementById("instagramStatus");
    var previewGrid = document.getElementById("instagramPreviewGrid");
    var fields = {
        heading: document.getElementById("instagramHeading"),
        username: document.getElementById("instagramUsername"),
        profileUrl: document.getElementById("instagramProfileUrl"),
        igUserId: document.getElementById("instagramUserId"),
        accessToken: document.getElementById("instagramAccessToken"),
        limit: document.getElementById("instagramLimit")
    };

    function normalizePayload(payload) {
        var source = payload || {};

        return {
            enabled: source.enabled !== false,
            heading: String(source.heading || defaults.heading).trim(),
            username: String(source.username || defaults.username).replace(/^@+/, "").trim(),
            profileUrl: String(source.profileUrl || defaults.profileUrl).trim(),
            igUserId: String(source.igUserId || "").trim(),
            accessToken: String(source.accessToken || "").trim(),
            limit: Math.max(1, Math.min(12, Number(source.limit || defaults.limit) || defaults.limit)),
            items: Array.isArray(source.items) ? source.items : []
        };
    }

    function setStatus(message, isError) {
        statusNode.textContent = message;
        statusNode.style.color = isError ? "#f4b6b6" : "";
    }

    function fillForm(payload) {
        fields.heading.value = payload.heading;
        fields.username.value = payload.username;
        fields.profileUrl.value = payload.profileUrl;
        fields.igUserId.value = payload.igUserId;
        fields.accessToken.value = payload.accessToken;
        fields.limit.value = payload.limit;
    }

    function readForm() {
        return normalizePayload({
            heading: fields.heading.value.trim(),
            username: fields.username.value.trim(),
            profileUrl: fields.profileUrl.value.trim(),
            igUserId: fields.igUserId.value.trim(),
            accessToken: fields.accessToken.value.trim(),
            limit: fields.limit.value
        });
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function renderPreview(payload) {
        var items = payload && Array.isArray(payload.items) ? payload.items : [];

        if (!items.length) {
            previewGrid.innerHTML = '<div class="muted">No posts returned yet. Save the credentials, then fetch latest posts.</div>';
            return;
        }

        previewGrid.innerHTML = items.map(function (item) {
            return [
                '<a class="instagram-admin-card" href="' + escapeHtml(item.permalink || payload.profileUrl || "#") + '" target="_blank" rel="noreferrer noopener">',
                '<div class="instagram-admin-card__image" style="background-image:url(\'' + escapeHtml(item.image) + '\')"></div>',
                '<div class="instagram-admin-card__meta">',
                '<span><i class="fa fa-instagram"></i> @' + escapeHtml(item.username || payload.username || "") + '</span>',
                item.caption ? '<p>' + escapeHtml(item.caption).slice(0, 90) + '</p>' : '<p>Open post</p>',
                '</div>',
                '</a>'
            ].join("");
        }).join("");
    }

    async function loadSettings() {
        try {
            var response = await fetch(API_BASE + "/instagram-feed/admin");
            if (!response.ok) {
                throw new Error("Instagram feed settings not saved yet.");
            }

            var payload = normalizePayload(await response.json());
            fillForm(payload);
            renderPreview(payload);
            setStatus("Instagram feed settings loaded.", false);
        } catch (_error) {
            fillForm(normalizePayload(defaults));
            renderPreview(defaults);
            setStatus("Using default Instagram placeholders. Save credentials to connect the real account.", false);
        }
    }

    async function saveSettings(event) {
        event.preventDefault();
        var payload = readForm();

        saveButton.disabled = true;
        setStatus("Saving Instagram feed settings...", false);

        try {
            var response = await fetch(API_BASE + "/content-sections/instagram-feed", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: "Instagram Feed",
                    description: "Homepage Instagram feed settings managed from admin",
                    status: "published",
                    payload: payload
                })
            });

            if (!response.ok) {
                var errorBody = await response.json().catch(function () {
                    return {};
                });
                throw new Error(errorBody.error || "Unable to save Instagram feed settings.");
            }

            setStatus("Instagram feed settings saved.", false);
        } catch (error) {
            setStatus(error.message || "Unable to save Instagram feed settings.", true);
        } finally {
            saveButton.disabled = false;
        }
    }

    async function fetchPreview() {
        previewButton.disabled = true;
        setStatus("Fetching latest Instagram posts from the backend proxy...", false);

        try {
            var response = await fetch(API_BASE + "/instagram-feed/preview");
            var payload = await response.json().catch(function () {
                return {};
            });

            if (!response.ok) {
                throw new Error(payload.error || "Unable to load Instagram preview.");
            }

            renderPreview(normalizePayload(payload));
            setStatus("Latest Instagram posts loaded.", false);
        } catch (error) {
            setStatus(error.message || "Unable to load Instagram preview.", true);
        } finally {
            previewButton.disabled = false;
        }
    }

    form.addEventListener("submit", saveSettings);
    previewButton.addEventListener("click", fetchPreview);

    loadSettings();
})();
