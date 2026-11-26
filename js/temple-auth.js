// ── Temple Auth (Registration & Login) ─────────────────────
const $ = (id) => document.getElementById(id);

// ── Registration ──────────────────────────────────────────
const registerForm = $("templeRegisterForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = $("registerMessage");

    const userData = {
      name: $("templeName").value.trim(),
      contactPerson: $("contactPerson").value.trim(),
      email: $("templeEmail").value.trim().toLowerCase(),
      phone: $("templePhone").value.trim(),
      address: $("templeAddress").value.trim(),
      password: $("templePassword").value,
      role: "temple",
      templeName: $("templeName").value.trim(),
    };

    try {
      const result = await api.register(userData);
      api.saveAuth(result.token, result.user);
      msgEl.textContent = "Registration successful. Opening your temple dashboard...";
      msgEl.style.color = "#236b45";
      setTimeout(() => (location.href = "temple-dashboard.html"), 600);
    } catch (err) {
      msgEl.textContent = err.message || "Registration failed. Please try again.";
      msgEl.style.color = "#c0392b";
    }
  });
}

// ── Login ─────────────────────────────────────────────────
const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = $("loginMessage");
    const role = $("role").value;
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;

    try {
      const result = await api.login(email, password, role);
      api.saveAuth(result.token, result.user);

      msgEl.textContent = "Login successful. Redirecting...";
      msgEl.style.color = "#236b45";

      // Redirect based on role
      setTimeout(() => {
        switch (result.user.role) {
          case "temple":
            location.href = "temple-dashboard.html";
            break;
          case "collection":
            location.href = "collection-team.html";
            break;
          case "processing":
            location.href = "waste-records.html";
            break;
          default:
            location.href = "dashboard.html";
        }
      }, 500);
    } catch (err) {
      msgEl.textContent = err.message || "Login failed. Please check your credentials.";
      msgEl.style.color = "#c0392b";
    }
  });
}
