(function () {
    var API_BASE = "http://localhost:5000/api";
    var defaults = {
        discountLabel: "Limited Offer",
        discountPercent: 20,
        headline: "Festive Oxidised",
        image: "img/discount.jpg",
        ctaLink: "limited-offer.html",
        countdownEnd: ""
    };

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
            countdownEnd: source.countdownEnd || defaults.countdownEnd
        };
    }

    function applyCountdown(targetDate) {
        if (!(window.jQuery && window.jQuery.fn && window.jQuery.fn.countdown)) {
            return;
        }

        if (!targetDate) {
            return;
        }

        var parsed = new Date(targetDate);
        if (Number.isNaN(parsed.getTime())) {
            return;
        }

        var month = String(parsed.getMonth() + 1).padStart(2, "0");
        var day = String(parsed.getDate()).padStart(2, "0");
        var year = parsed.getFullYear();
        var hours = String(parsed.getHours()).padStart(2, "0");
        var minutes = String(parsed.getMinutes()).padStart(2, "0");
        var seconds = String(parsed.getSeconds()).padStart(2, "0");
        var countdownTarget = month + "/" + day + "/" + year + " " + hours + ":" + minutes + ":" + seconds;

        window.jQuery("#countdown-time").attr("data-countdown-target", targetDate);
        window.jQuery("#countdown-time").countdown(countdownTarget, function (event) {
            window.jQuery(this).html(event.strftime(
                "<div class='countdown__item'><span>%D</span> <p>Day</p> </div>" +
                "<div class='countdown__item'><span>%H</span> <p>Hour</p> </div>" +
                "<div class='countdown__item'><span>%M</span> <p>Min</p> </div>" +
                "<div class='countdown__item'><span>%S</span> <p>Sec</p> </div>"
            ));
        });
    }

    function applyPromotions(payload) {
        var image = document.getElementById("discount-image");
        var label = document.getElementById("discount-label");
        var headline = document.getElementById("discount-headline");
        var offerCopy = document.getElementById("discount-offer-copy");
        var ctaLink = document.getElementById("discount-cta-link");
        var sectionNode = document.getElementById("homepage-discount-section");

        if (sectionNode) {
            sectionNode.style.display = payload.enabled === false ? "none" : "";
        }

        if (payload.enabled === false) {
            return;
        }

        if (image) {
            image.src = payload.image;
            image.alt = payload.headline;
        }

        if (label) {
            label.textContent = payload.discountLabel;
        }

        if (headline) {
            headline.textContent = payload.headline;
        }

        if (offerCopy) {
            offerCopy.textContent = payload.discountPercent + "% OFF";
        }

        if (ctaLink) {
            ctaLink.href = payload.ctaLink;
        }

        applyCountdown(payload.countdownEnd);
    }

    async function loadPromotions() {
        try {
            var response = await fetch(API_BASE + "/content-sections/promotions");
            if (!response.ok) {
                throw new Error("Promotions unavailable");
            }

            var section = await response.json();
            applyPromotions(normalizePayload(section.payload));
        } catch (_error) {
            applyPromotions(normalizePayload(defaults));
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadPromotions);
    } else {
        loadPromotions();
    }
})();
