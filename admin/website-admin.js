(function () {
    var API_BASE = "http://localhost:5000/api";

    async function loadToggle(card) {
        var key = card.getAttribute("data-section-key");
        var title = card.getAttribute("data-section-title") || key;
        var description = card.getAttribute("data-section-description") || "";
        var toggle = card.querySelector(".homepage-section-toggle");
        var status = card.querySelector(".section-toggle-status");

        try {
            var response = await fetch(API_BASE + "/content-sections/" + key);
            if (!response.ok) {
                throw new Error("No section");
            }

            var section = await response.json();
            var payload = section.payload || {};
            toggle.checked = payload.enabled !== false;
            status.textContent = toggle.checked ? "Visible on homepage" : "Hidden on homepage";
        } catch (_error) {
            toggle.checked = true;
            status.textContent = "Visible on homepage";
        }

        toggle.addEventListener("change", async function () {
            toggle.disabled = true;
            status.textContent = "Saving...";

            try {
                var existingResponse = await fetch(API_BASE + "/content-sections/" + key);
                var body = {
                    title: title,
                    description: description,
                    status: "published",
                    payload: {
                        enabled: toggle.checked
                    }
                };

                if (existingResponse.ok) {
                    var existing = await existingResponse.json();
                    body.title = existing.title || title;
                    body.description = existing.description || description;
                    body.status = existing.status || "published";
                    body.payload = Object.assign({}, existing.payload || {}, { enabled: toggle.checked });
                }

                var saveResponse = await fetch(API_BASE + "/content-sections/" + key, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });

                if (!saveResponse.ok) {
                    throw new Error("Unable to save visibility");
                }

                status.textContent = toggle.checked ? "Visible on homepage" : "Hidden on homepage";
            } catch (error) {
                toggle.checked = !toggle.checked;
                status.textContent = error.message || "Unable to save visibility";
                status.style.color = "#f4b6b6";
                setTimeout(function () {
                    status.style.color = "";
                    status.textContent = toggle.checked ? "Visible on homepage" : "Hidden on homepage";
                }, 2500);
            } finally {
                toggle.disabled = false;
            }
        });
    }

    Array.prototype.forEach.call(document.querySelectorAll(".section-toggle-card"), function (card) {
        loadToggle(card);
    });
})();
