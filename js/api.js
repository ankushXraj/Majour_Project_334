// ── FlowerCycle API Utility ─────────────────────────────────
// Central module for all backend API communication

const API_BASE = "/api";

const api = {
  // Get stored auth token
  getToken() {
    return localStorage.getItem("fcToken");
  },

  // Get stored user data
  getUser() {
    const data = localStorage.getItem("fcUser");
    return data ? JSON.parse(data) : null;
  },

  // Save auth data after login/register
  saveAuth(token, user) {
    localStorage.setItem("fcToken", token);
    localStorage.setItem("fcUser", JSON.stringify(user));
  },

  // Clear auth data on logout
  clearAuth() {
    localStorage.removeItem("fcToken");
    localStorage.removeItem("fcUser");
  },

  // Check if user is logged in
  isLoggedIn() {
    return !!this.getToken();
  },

  // Generic fetch wrapper with auth headers
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // If token expired or invalid, redirect to login
      if (response.status === 401) {
        this.clearAuth();
        if (!window.location.pathname.includes("login") &&
            !window.location.pathname.includes("register") &&
            !window.location.pathname.includes("index")) {
          window.location.href = "login.html";
        }
      }
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  },

  // ── Auth ────────────────────────────────────────────────
  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async login(email, password, role) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
  },

  async getMe() {
    return this.request("/auth/me");
  },

  // ── Collection Requests ─────────────────────────────────
  async getRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/collection-requests${query ? "?" + query : ""}`);
  },

  async getRequest(id) {
    return this.request(`/collection-requests/${id}`);
  },

  async createRequest(data) {
    return this.request("/collection-requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateRequest(id, data) {
    return this.request(`/collection-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async updateRequestStatus(id, status) {
    return this.request(`/collection-requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async deleteRequest(id) {
    return this.request(`/collection-requests/${id}`, {
      method: "DELETE",
    });
  },

  // ── Waste Records ───────────────────────────────────────
  async getWasteRecords(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/waste-records${query ? "?" + query : ""}`);
  },

  async getWasteRecord(id) {
    return this.request(`/waste-records/${id}`);
  },

  async getWasteRecordByRequest(requestId) {
    return this.request(`/waste-records/by-request/${requestId}`);
  },

  async createWasteRecord(data) {
    return this.request("/waste-records", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateWasteRecord(id, data) {
    return this.request(`/waste-records/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async updateWasteStage(id, stage) {
    return this.request(`/waste-records/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
  },

  async deleteWasteRecord(id) {
    return this.request(`/waste-records/${id}`, {
      method: "DELETE",
    });
  },

  // ── Eco Products ────────────────────────────────────────
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/eco-products${query ? "?" + query : ""}`);
  },

  async getProduct(id) {
    return this.request(`/eco-products/${id}`);
  },

  async createProduct(data) {
    return this.request("/eco-products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateProduct(id, data) {
    return this.request(`/eco-products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id) {
    return this.request(`/eco-products/${id}`, {
      method: "DELETE",
    });
  },

  // ── Dashboard ───────────────────────────────────────────
  async getDashboard() {
    return this.request("/dashboard");
  },

  async getPublicStats() {
    const res = await fetch(`${API_BASE}/public-stats`);
    if (!res.ok) throw new Error("Unable to fetch public stats");
    return res.json();
  },

  // ── Reports ─────────────────────────────────────────────
  async getReports() {
    return this.request("/reports");
  },

  // ── Temples ─────────────────────────────────────────────
  async getTemples() {
    return this.request("/temples");
  },
};
