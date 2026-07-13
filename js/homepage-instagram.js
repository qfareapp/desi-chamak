(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var defaults = {
        enabled: true,
        heading: "Follow Us On Instagram",
        username: "aaraa_silver",
        profileUrl: "https://www.instagram.com/aaraa_silver/",
        items: [
            { image: "img/instagram/insta-1.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
            { image: "img/instagram/insta-2.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
            { image: "img/instagram/insta-3.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
            { image: "img/instagram/insta-4.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
            { image: "img/instagram/insta-5.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
            { image: "img/instagram/insta-6.jpg", permalink: "https://www.instagram.com/aaraa_silver/" }
        ]
    };

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function normalizePayload(payload) {
        var source = payload || {};

        return {
            enabled: source.enabled !== false,
            heading: String(source.heading || defaults.heading).trim(),
            username: String(source.username || defaults.username).replace(/^@+/, "").trim(),
            profileUrl: String(source.profileUrl || defaults.profileUrl).trim(),
            items: Array.isArray(source.items) && source.items.length ? source.items : defaults.items
        };
    }

    function renderInstagram(payload) {
        var section = document.getElementById("homepage-instagram-section");
        var row = document.getElementById("homepage-instagram-grid");
        var heading = document.getElementById("homepage-instagram-heading");
        var usernameLinks = document.querySelectorAll("[data-instagram-username-link]");

        if (!section || !row) {
            return;
        }

        if (payload.enabled === false) {
            section.style.display = "none";
            return;
        }

        section.style.display = "";

        if (heading) {
            heading.textContent = payload.heading;
        }

        row.innerHTML = payload.items.slice(0, 6).map(function (item) {
            return [
                '<div class="col-lg-2 col-md-4 col-sm-4 p-0">',
                '<div class="instagram__item" style="background-image:url(\'' + escapeHtml(item.image) + '\')">',
                '<div class="instagram__text">',
                '<i class="fa fa-instagram"></i>',
                '<a href="' + escapeHtml(item.permalink || payload.profileUrl) + '" target="_blank" rel="noreferrer noopener">@ ' + escapeHtml(payload.username) + '</a>',
                '</div>',
                '</div>',
                '</div>'
            ].join("");
        }).join("");

        Array.prototype.forEach.call(usernameLinks, function (link) {
            link.textContent = "@ " + payload.username;
            link.setAttribute("href", payload.profileUrl);
        });
    }

    async function loadInstagram() {
        try {
            var response = await fetch(API_BASE + "/instagram-feed");

            if (!response.ok) {
                throw new Error("Instagram feed unavailable");
            }

            renderInstagram(normalizePayload(await response.json()));
        } catch (_error) {
            renderInstagram(normalizePayload(defaults));
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadInstagram);
    } else {
        loadInstagram();
    }
})();
