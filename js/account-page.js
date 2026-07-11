(function () {
    function setStatus(message, type) {
        var node = document.getElementById("account-status");

        if (!node) {
            return;
        }

        node.hidden = !message;
        node.className = "account-status" + (type ? " account-status--" + type : "");
        node.textContent = message || "";
    }

    function customerName(session) {
        if (!session) {
            return "";
        }

        return [session.firstName, session.lastName].filter(Boolean).join(" ").trim();
    }

    function renderSession() {
        var session = window.DesiChamakAuth ? window.DesiChamakAuth.current() : null;
        var guestView = document.getElementById("account-guest-view");
        var memberView = document.getElementById("account-member-view");
        var nameNode = document.getElementById("account-member-name");
        var emailNode = document.getElementById("account-member-email");
        var phoneNode = document.getElementById("account-member-phone");

        if (!guestView || !memberView) {
            return;
        }

        if (session) {
            guestView.hidden = true;
            memberView.hidden = false;
            nameNode.textContent = customerName(session) || "Desi Chamak Customer";
            emailNode.textContent = session.email || "-";
            phoneNode.textContent = session.phone || "-";
        } else {
            guestView.hidden = false;
            memberView.hidden = true;
        }
    }

    function getFormValues(form) {
        return {
            firstName: form.querySelector("[name='firstName']") ? form.querySelector("[name='firstName']").value.trim() : "",
            lastName: form.querySelector("[name='lastName']") ? form.querySelector("[name='lastName']").value.trim() : "",
            email: form.querySelector("[name='email']").value.trim(),
            phone: form.querySelector("[name='phone']") ? form.querySelector("[name='phone']").value.trim() : "",
            password: form.querySelector("[name='password']").value
        };
    }

    function bindRegisterForm() {
        var form = document.getElementById("account-register-form");

        if (!form || !window.DesiChamakAuth) {
            return;
        }

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            setStatus("", "");

            try {
                await window.DesiChamakAuth.register(getFormValues(form));
                form.reset();
                renderSession();
                setStatus("Account created successfully. You are now signed in.", "success");
            } catch (error) {
                setStatus(error.message || "Unable to create account.", "error");
            }
        });
    }

    function bindLoginForm() {
        var form = document.getElementById("account-login-form");

        if (!form || !window.DesiChamakAuth) {
            return;
        }

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            setStatus("", "");

            try {
                await window.DesiChamakAuth.login(getFormValues(form));
                form.reset();
                renderSession();
                setStatus("Signed in successfully.", "success");
            } catch (error) {
                setStatus(error.message || "Unable to sign in.", "error");
            }
        });
    }

    function bindLogoutButton() {
        var button = document.getElementById("account-logout-btn");

        if (!button || !window.DesiChamakAuth) {
            return;
        }

        button.addEventListener("click", async function () {
            await window.DesiChamakAuth.logout();
            renderSession();
            setStatus("Signed out successfully.", "success");
        });
    }

    function initAccountPage() {
        if (!window.DesiChamakAuth) {
            return;
        }

        renderSession();
        bindRegisterForm();
        bindLoginForm();
        bindLogoutButton();
        window.DesiChamakAuth.me().then(renderSession);
    }

    document.addEventListener("auth:updated", renderSession);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAccountPage);
    } else {
        initAccountPage();
    }
})();
