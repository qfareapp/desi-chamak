(function () {
    var STORAGE_KEY = "desi_chamak_auth";

    function safeParse(json, fallback) {
        try {
            return JSON.parse(json);
        } catch (_error) {
            return fallback;
        }
    }

    function getApiBase() {
        return window.DesiChamakApi ? window.DesiChamakApi.base() : "/api";
    }

    function readSession() {
        try {
            return safeParse(window.localStorage.getItem(STORAGE_KEY) || "null", null);
        } catch (_error) {
            return null;
        }
    }

    function normalizeCustomer(payload) {
        var customer = payload && payload.customer ? payload.customer : payload;
        var token = payload && payload.token ? payload.token : "";

        if (!customer || !(customer.id || customer.email)) {
            return null;
        }

        return {
            id: String(customer.id || ""),
            firstName: String(customer.firstName || "").trim(),
            lastName: String(customer.lastName || "").trim(),
            email: String(customer.email || "").trim().toLowerCase(),
            phone: String(customer.phone || "").trim(),
            token: String(token || (readSession() && readSession().token) || "")
        };
    }

    function emitAuthUpdated(session) {
        var event;

        if (typeof window.CustomEvent === "function") {
            event = new CustomEvent("auth:updated", {
                detail: {
                    session: session
                }
            });
        } else {
            event = document.createEvent("Event");
            event.initEvent("auth:updated", true, true);
            event.detail = {
                session: session
            };
        }

        document.dispatchEvent(event);
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

        emitAuthUpdated(session || null);
        return session || null;
    }

    function getAuthHeaders(extraHeaders) {
        var headers = {};
        var session = readSession();
        var key;

        if (session && session.token) {
            headers.Authorization = "Bearer " + session.token;
        }

        if (extraHeaders) {
            for (key in extraHeaders) {
                if (Object.prototype.hasOwnProperty.call(extraHeaders, key)) {
                    headers[key] = extraHeaders[key];
                }
            }
        }

        return headers;
    }

    async function request(path, options) {
        var requestOptions = options || {};
        var response = await fetch(getApiBase() + path, {
            method: requestOptions.method || "GET",
            headers: getAuthHeaders(requestOptions.headers),
            body: requestOptions.body
        });
        var payload = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            throw new Error(payload.error || "Unable to process account request.");
        }

        return payload;
    }

    function accountLabel(session) {
        if (!session) {
            return "Sign in";
        }

        return session.firstName ? "Hi, " + session.firstName : "Account";
    }

    function accountLinksMarkup(session) {
        var links = [
            '<a href="./account.html">' + accountLabel(session) + "</a>",
            '<a href="./wishlist.html">Wishlist</a>',
            '<a href="./orders.html">Orders</a>'
        ];

        if (session) {
            links.push('<a href="#" data-auth-logout="true">Sign out</a>');
        }

        return links.join("");
    }

    function ensureAuthLinks(selector) {
        Array.prototype.forEach.call(document.querySelectorAll(selector), function (container) {
            container.innerHTML = accountLinksMarkup(readSession());
        });
    }

    function upgradeSignInLinks() {
        Array.prototype.forEach.call(document.querySelectorAll("a"), function (anchor) {
            var label = String(anchor.textContent || "").trim().toLowerCase();

            if (label === "sign in" || label === "signin" || label === "account") {
                anchor.setAttribute("href", "./account.html");
            }
        });
    }

    function syncAuthUi() {
        upgradeSignInLinks();
        ensureAuthLinks(".header__right__auth");
        ensureAuthLinks(".offcanvas__auth");
    }

    async function register(data) {
        var payload = await request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data || {})
        });
        var session = normalizeCustomer(payload);

        return writeSession(session);
    }

    async function login(data) {
        var payload = await request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data || {})
        });
        var session = normalizeCustomer(payload);

        return writeSession(session);
    }

    async function me() {
        var session = readSession();

        if (!session || !session.token) {
            return null;
        }

        try {
            return writeSession(normalizeCustomer({
                token: session.token,
                customer: await request("/auth/me")
            }));
        } catch (_error) {
            writeSession(null);
            return null;
        }
    }

    async function logout() {
        try {
            await request("/auth/logout", {
                method: "POST"
            });
        } catch (_error) {
        }

        writeSession(null);
        return null;
    }

    function current() {
        return readSession();
    }

    document.addEventListener("click", function (event) {
        var logoutLink = event.target.closest("[data-auth-logout='true']");

        if (!logoutLink) {
            return;
        }

        event.preventDefault();
        logout();
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncAuthUi);
    } else {
        syncAuthUi();
    }

    document.addEventListener("auth:updated", syncAuthUi);

    window.DesiChamakAuth = {
        current: current,
        register: register,
        login: login,
        me: me,
        logout: logout,
        authHeaders: getAuthHeaders
    };
})();
