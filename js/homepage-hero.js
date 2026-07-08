(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var heroDefaults = {
        title: "Oxidised for Women",
        subheadline: "Handcrafted silver-tone pieces inspired by old-world artistry - necklaces, jhumkas, bangles, anklets, and giftable sets.",
        ctaText: "Shop the festive edit",
        ctaLink: "shop.html",
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

    function setHeroBackground(elementId, gradient, image) {
        var element = document.getElementById(elementId);
        if (element) {
            element.style.backgroundImage = gradient + ", url('" + image + "')";
        }
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    function setLink(element, href, label) {
        if (element) {
            element.href = href;
            element.textContent = label;
        }
    }

    function resolveHeroCtaLink() {
        return "./shop.html";
    }

    function applyHero(hero) {
        var heroMain = document.getElementById("hero-main");
        var heroSection = document.getElementById("collections");

        if (heroSection) {
            heroSection.style.display = hero.enabled === false ? "none" : "";
        }

        if (hero.enabled === false) {
            return;
        }

        setHeroBackground("hero-main", "linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0.04) 100%)", hero.backgroundImage);
        setText(document.getElementById("hero-title"), hero.title);
        setText(heroMain ? heroMain.querySelector("p") : null, hero.subheadline);
        setLink(document.getElementById("hero-cta"), resolveHeroCtaLink(), hero.ctaText);

        var gradients = [
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 52%, rgba(0,0,0,0.0) 100%)",
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 52%, rgba(0,0,0,0.0) 100%)",
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 52%, rgba(0,0,0,0.0) 100%)",
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 52%, rgba(0,0,0,0.0) 100%)"
        ];

        hero.tiles.forEach(function (tile, index) {
            var tileNumber = index + 1;
            var tileElement = document.getElementById("hero-tile-" + tileNumber);
            setHeroBackground("hero-tile-" + tileNumber, gradients[index], tile.image);
            setText(tileElement ? tileElement.querySelector("h4") : null, tile.title);
            setText(tileElement ? tileElement.querySelector("p") : null, tile.copy);
            setLink(tileElement ? tileElement.querySelector("a") : null, tile.link, "Shop now");
        });
    }

    async function loadHero() {
        try {
            var response = await fetch(API_BASE + "/content-sections/hero");
            if (!response.ok) {
                throw new Error("Hero content unavailable");
            }

            var section = await response.json();
            applyHero(normalizeHeroPayload(section.payload));
        } catch (_error) {
            applyHero(heroDefaults);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadHero);
    } else {
        loadHero();
    }
})();
