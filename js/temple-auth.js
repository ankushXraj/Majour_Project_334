// ── Temple & Portal Auth (Registration & Login) ────────────
const $ = (id) => document.getElementById(id);

async function syncGuestCartIfAny() {
  try {
    const raw = JSON.parse(localStorage.getItem("fcShopCart") || "[]");
    if (Array.isArray(raw) && raw.length > 0 && typeof api.mergeCart === "function") {
      await api.mergeCart(raw);
      localStorage.removeItem("fcShopCart");
    }
  } catch {}
}

function showAuthMessage(el, text, isSuccess) {
  if (!el) return;
  el.textContent = text;
  el.className = "auth-msg-box show " + (isSuccess ? "auth-success" : "auth-error");
  el.style.display = "block";
  el.style.background = isSuccess ? "#e8f5ec" : "#fdecec";
  el.style.color = isSuccess ? "#166e3c" : "#b8281d";
  el.style.border = "1px solid " + (isSuccess ? "rgba(32, 122, 68, 0.3)" : "rgba(184, 40, 29, 0.3)");
}

// ── Role Selector Tabs & Synchronization ───────────────────
const roleTabs = $("roleTabs");
const roleSelect = $("role");
if (roleTabs && roleSelect) {
  roleTabs.addEventListener("click", (e) => {
    const chip = e.target.closest(".role-chip");
    if (!chip) return;
    roleTabs.querySelectorAll(".role-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    roleSelect.value = chip.dataset.role;
  });

  roleSelect.addEventListener("change", () => {
    const val = roleSelect.value;
    roleTabs.querySelectorAll(".role-chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.role === val);
    });
  });
}

// ── Quick Demo Account Credentials Auto-Fill ───────────────
document.querySelectorAll(".demo-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const email = btn.dataset.email;
    const pw = btn.dataset.pw;
    const role = btn.dataset.role;

    if ($("email")) $("email").value = email;
    if ($("password")) $("password").value = pw;

    if (roleSelect) {
      roleSelect.value = role;
      if (roleTabs) {
        roleTabs.querySelectorAll(".role-chip").forEach((c) => {
          c.classList.toggle("active", c.dataset.role === role);
        });
      }
    }

    const msgEl = $("loginMessage");
    if (msgEl) {
      showAuthMessage(msgEl, `Demo credentials loaded for ${btn.textContent.trim()}. Click 'Sign In' to proceed.`, true);
    }
  });
});

// ── Password Visibility Toggles ────────────────────────────
function setupPasswordToggle(btnId, inputId) {
  const btn = $(btnId);
  const input = $(inputId);
  if (btn && input) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const isPw = input.type === "password";
      input.type = isPw ? "text" : "password";
      btn.textContent = isPw ? "🙈" : "👁️";
      btn.title = isPw ? "Hide password" : "Show password";
    });
  }
}
setupPasswordToggle("togglePasswordBtn", "password");
setupPasswordToggle("toggleRegisterPasswordBtn", "templePassword");

// ── Registration Flow ──────────────────────────────────────
const registerForm = $("templeRegisterForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = $("registerMessage");

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Registering temple...</span>`;
    }

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
      await syncGuestCartIfAny();
      showAuthMessage(msgEl, "✓ Registration successful! Redirecting to your temple dashboard...", true);
      setTimeout(() => (location.href = "temple-dashboard.html"), 650);
    } catch (err) {
      showAuthMessage(msgEl, err.message || "Registration failed. Please check your inputs.", false);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
    }
  });
}

// ── Login Flow ─────────────────────────────────────────────
const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = $("loginMessage");
    const role = $("role") ? $("role").value : "temple";
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Signing in...</span>`;
    }

    try {
      const result = await api.login(email, password, role);
      api.saveAuth(result.token, result.user);
      await syncGuestCartIfAny();

      showAuthMessage(msgEl, "✓ Sign in successful! Opening your workspace...", true);

      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect");

      setTimeout(() => {
        if (redirect && /^[a-z0-9\-_.]+\.html$/i.test(redirect)) {
          location.href = redirect;
          return;
        }
        switch (result.user.role) {
          case "temple":
            location.href = "temple-dashboard.html";
            break;
          case "customer":
            location.href = "shop.html";
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
      }, 550);
    } catch (err) {
      showAuthMessage(msgEl, err.message || "Sign in failed. Please verify your email and password.", false);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
    }
  });
}
