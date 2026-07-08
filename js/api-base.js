(function (window) {
    function trimTrailingSlash(value) {
        return String(value || "").replace(/\/+$/, "");
    }

    function isLocalHost() {
        var host = window.location.hostname;
        return window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1";
    }

    function getBase() {
        if (window.__DESI_CHAKAM_API_BASE__) {
            return trimTrailingSlash(window.__DESI_CHAKAM_API_BASE__);
        }

        if (isLocalHost()) {
            return "http://localhost:5000/api";
        }

        return "/api";
    }

    window.DesiChamakApi = {
        base: getBase
    };
})(window);
