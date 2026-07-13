(function () {
    var STORAGE_KEY = "desi_chamak_admin_session";
    function isLocalHost() {
        var host = window.location.hostname;
        return window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1";
    }

    function getApiBase() {
        if (window.DesiChamakApi && window.DesiChamakApi.base) {
            return window.DesiChamakApi.base();
        }

        return isLocalHost() ? "http://localhost:5000/api" : "/api";
    }

    var API_BASE = getApiBase();
    var LOGIN_PATH = "login.html";
    var originalFetch = window.fetch.bind(window);

    function isLoginPage() {
        return /\/login\.html$/i.test(window.location.pathname) || /\\login\.html$/i.test(window.location.pathname) || /login\.html$/i.test(window.location.href);
    }

    function safeParse(json) {
        try {
            return JSON.parse(json);
        } catch (_error) {
            return null;
        }
    }

    function readSession() {
        try {
            return safeParse(window.localStorage.getItem(STORAGE_KEY) || "null");
        } catch (_error) {
            return null;
        }
    }

    function writeSession(session) {
        try {
            if (session) {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            } else {
                window.localStorage.removeItem(STORAGE_KEY);
            }
        } catch (_error) {
        }
    }

    function loginUrl() {
        var currentPage = window.location.pathname.split("/").pop() || "index.html";
        return LOGIN_PATH + "?next=" + encodeURIComponent(currentPage);
    }

    function redirectToLogin() {
        if (isLoginPage()) {
            return;
        }

        writeSession(null);
        window.location.replace(loginUrl());
    }

    function authHeaders(headers) {
        var nextHeaders = new Headers(headers || {});
        var session = readSession();

        if (session && session.token && !nextHeaders.has("Authorization")) {
            nextHeaders.set("Authorization", "Bearer " + session.token);
        }

        return nextHeaders;
    }

    function isApiRequest(url) {
        var target = String(url || "");
        return target.indexOf("/api/") >= 0 || target.indexOf("localhost:5000/api") >= 0;
    }

    window.fetch = function (input, init) {
        var requestUrl = typeof input === "string" ? input : (input && input.url) || "";
        var nextInit = init || {};

        if (isApiRequest(requestUrl)) {
            nextInit = {
                method: nextInit.method,
                headers: authHeaders(nextInit.headers),
                body: nextInit.body,
                mode: nextInit.mode,
                credentials: nextInit.credentials,
                cache: nextInit.cache,
                redirect: nextInit.redirect,
                referrer: nextInit.referrer,
                signal: nextInit.signal
            };
        }

        return originalFetch(input, nextInit).then(function (response) {
            if (response.status === 401 && !isLoginPage()) {
                redirectToLogin();
            }

            return response;
        });
    };

    function injectUserChip() {
        var chip = document.querySelector(".user-chip");
        var session = readSession();

        if (!chip || !session) {
            return;
        }

        chip.innerHTML = [
            '<span class="fa fa-user-circle"></span>',
            '<span class="user-chip__email">' + session.email + "</span>",
            '<button type="button" class="admin-logout-btn" id="adminLogoutBtn">Logout</button>'
        ].join("");

        var logoutButton = document.getElementById("adminLogoutBtn");
        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                writeSession(null);
                redirectToLogin();
            });
        }
    }

    function verifySession() {
        var session = readSession();

        if (!session || !session.token) {
            redirectToLogin();
            return;
        }

        originalFetch(API_BASE + "/admin-auth/me", {
            headers: authHeaders()
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("Session expired");
            }
            return response.json();
        }).then(function (payload) {
            writeSession({
                token: session.token,
                email: payload.email || session.email || ""
            });
            injectUserChip();
        }).catch(function () {
            redirectToLogin();
        });
    }

    if (!isLoginPage()) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", injectUserChip);
        } else {
            injectUserChip();
        }

        verifySession();
    }

    window.DesiChamakAdminAuth = {
        read: readSession,
        write: writeSession,
        redirectToLogin: redirectToLogin
    };
})();
