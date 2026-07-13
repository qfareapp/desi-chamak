(function () {
    var API_BASE = window.DesiChamakApi ? window.DesiChamakApi.base() : "http://localhost:5000/api";
    var STORAGE_KEY = "desi_chamak_admin_session";
    var form = document.getElementById("adminLoginForm");
    var emailField = document.getElementById("adminEmail");
    var passwordField = document.getElementById("adminPassword");
    var loginButton = document.getElementById("adminLoginBtn");
    var statusNode = document.getElementById("adminLoginStatus");

    function readNextPath() {
        var params = new URLSearchParams(window.location.search);
        return params.get("next") || "index.html";
    }

    function setStatus(message, isError) {
        statusNode.textContent = message;
        statusNode.style.color = isError ? "#f4b6b6" : "";
    }

    function writeSession(session) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } catch (_error) {
        }
    }

    function redirectIfLoggedIn() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            var session = raw ? JSON.parse(raw) : null;

            if (session && session.token) {
                window.location.replace(readNextPath());
            }
        } catch (_error) {
        }
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        loginButton.disabled = true;
        setStatus("Signing in...", false);

        try {
            var response = await fetch(API_BASE + "/admin-auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: emailField.value.trim(),
                    password: passwordField.value
                })
            });
            var payload = await response.json().catch(function () {
                return {};
            });

            if (!response.ok) {
                throw new Error(payload.error || "Unable to login.");
            }

            writeSession({
                token: payload.token,
                email: payload.admin && payload.admin.email ? payload.admin.email : emailField.value.trim()
            });
            window.location.replace(readNextPath());
        } catch (error) {
            setStatus(error.message || "Unable to login.", true);
        } finally {
            loginButton.disabled = false;
        }
    });

    redirectIfLoggedIn();
})();
