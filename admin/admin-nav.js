(function () {
    var body = document.body;
    var toggleButtons = Array.prototype.slice.call(document.querySelectorAll("[data-admin-nav-toggle]"));
    var closeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-admin-nav-close]"));
    var navLinks = Array.prototype.slice.call(document.querySelectorAll(".sidebar a"));
    var mobileQuery = window.matchMedia("(max-width: 992px)");

    function openNav() {
        body.classList.add("admin-nav-open");
    }

    function closeNav() {
        body.classList.remove("admin-nav-open");
    }

    toggleButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            if (body.classList.contains("admin-nav-open")) {
                closeNav();
                return;
            }

            openNav();
        });
    });

    closeButtons.forEach(function (button) {
        button.addEventListener("click", closeNav);
    });

    navLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            if (mobileQuery.matches) {
                closeNav();
            }
        });
    });

    mobileQuery.addEventListener("change", function (event) {
        if (!event.matches) {
            closeNav();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeNav();
        }
    });
})();
