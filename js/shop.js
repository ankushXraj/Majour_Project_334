// ── FlowerCycle E-Commerce Shop, Cart & Checkout ───────────
const $ = (id) => document.getElementById(id);
const CART_KEY = "fcShopCart";
const FREE_DELIVERY_MIN = 499;
const DELIVERY_FEE = 49;

let catalog = [];
let cart = [];
let activeCategory = "all";
let activeDetailProduct = null;

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function toast(msg) {
  const el = $("shopToast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 2400);
}

// ── Cart Persistence (MongoDB if logged in + localStorage backup) ──
async function initCart() {
  const localRaw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  if (api.isLoggedIn()) {
    try {
      if (localRaw.length > 0) {
        const merged = await api.mergeCart(localRaw);
        cart = merged.data.items || [];
        localStorage.removeItem(CART_KEY);
      } else {
        const res = await api.getCart();
        cart = res.data.items || [];
      }
    } catch {
      cart = localRaw;
    }
  } else {
    cart = localRaw;
  }
  renderCart();
}

async function persistCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  if (api.isLoggedIn()) {
    try {
      const res = await api.saveCart(cart);
      cart = res.data.items || cart;
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }
  renderCart();
}

function getSelectedSize(prod, cardEl) {
  const sel = cardEl?.querySelector(".shop-size-select");
  const chosenLabel = sel ? sel.value : prod.packSize;
  const opt = (prod.sizeOptions || []).find((s) => s.label === chosenLabel);
  return {
    packSize: opt ? opt.label : prod.packSize,
    unitPrice: opt ? Number(opt.price) : Number(prod.price),
  };
}

function addToCart(prod, packSize, unitPrice, qty = 1, btnEl = null) {
  if (prod.stockQuantity <= 0) {
    toast("Sorry, this product is currently out of stock.");
    return;
  }

  const existing = cart.find(
    (c) => String(c.product) === String(prod._id) && c.packSize === packSize
  );
  if (existing) {
    existing.quantity = Math.min(prod.stockQuantity, existing.quantity + qty);
  } else {
    cart.push({
      product: prod._id,
      productId: prod.productId,
      name: prod.name,
      category: prod.category,
      variant: prod.variant,
      packSize,
      unitPrice,
      quantity: Math.min(prod.stockQuantity, qty),
      image: prod.image,
    });
  }

  if (btnEl) {
    btnEl.classList.add("added-pop");
    const oldText = btnEl.textContent;
    btnEl.textContent = "✓ Added";
    setTimeout(() => {
      btnEl.classList.remove("added-pop");
      btnEl.textContent = oldText;
    }, 900);
  }

  persistCart();
  toast(`${prod.name} (${packSize}) added to cart!`);
}

function renderCart() {
  const totalQty = cart.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const badge = $("cartBadgeCount");
  badge.textContent = totalQty;
  badge.classList.remove("badge-pop");
  void badge.offsetWidth; // trigger reflow for css animation
  badge.classList.add("badge-pop");
  setTimeout(() => badge.classList.remove("badge-pop"), 400);

  const sub = cart.reduce((s, i) => s + Number(i.unitPrice) * Number(i.quantity), 0);
  const delivery = sub === 0 || sub >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
  const total = sub + delivery;

  $("cartSubtotal").textContent = money(sub);
  $("cartDelivery").textContent = sub === 0 ? "₹0" : delivery === 0 ? "FREE" : money(delivery);
  $("cartTotal").textContent = money(total);
  $("proceedCheckoutBtn").disabled = cart.length === 0;

  if (cart.length === 0) {
    $("cartItemsList").innerHTML = `<div class="empty-state">Your cart is empty.<br><small>Add eco-friendly products to get started.</small></div>`;
    return;
  }

  $("cartItemsList").innerHTML = cart
    .map(
      (item, idx) => `
      <div class="cart-item">
        <img src="${esc(item.image)}" alt="${esc(item.name)}">
        <div class="cart-item-info">
          <b>${esc(item.name)}</b>
          <small>${esc(item.variant)} · ${esc(item.packSize)}</small>
          <span class="cart-item-price">${money(item.unitPrice)} each</span>
          <div class="cart-qty-row">
            <button type="button" class="qty-btn" data-dec="${idx}">−</button>
            <span>${item.quantity}</span>
            <button type="button" class="qty-btn" data-inc="${idx}">+</button>
            <button type="button" class="cart-remove-btn" data-rem="${idx}">Remove</button>
          </div>
        </div>
      </div>`
    )
    .join("");
}

// ── Load & Render Catalog ───────────────────────────────────
async function loadProducts() {
  const fragrance = $("fragranceFilter").value;
  const colour = $("colourFilter").value;

  let variant = "all";
  if (fragrance !== "all") variant = fragrance;
  else if (colour !== "all") variant = colour;

  try {
    const res = await api.getShopProducts({
      category: activeCategory,
      variant,
      search: $("shopSearch").value.trim(),
      sort: $("shopSort").value,
    });
    catalog = res.data || [];
    renderGrid();
  } catch (err) {
    toast("Failed to load shop products.");
  }
}

function renderGrid() {
  $("shopEmpty").hidden = catalog.length > 0;
  $("catalogGrid").innerHTML = catalog
    .map((p) => {
      const sizes = p.sizeOptions && p.sizeOptions.length > 0
        ? p.sizeOptions
        : [{ label: p.packSize, price: p.price }];
      const outOfStock = p.stockQuantity <= 0;
      const variantLabel = p.variantType === "fragrance" ? "Fragrance" : p.variantType === "colour" ? "Colour" : "Type";

      return `<article class="shop-card product-card" data-id="${p._id}">
        <div class="shop-card-img">
          <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
          <span class="eco-tag">${esc(p.category)}</span>
          ${outOfStock ? '<span class="stock-tag out">Out of Stock</span>' : `<span class="stock-tag">${p.stockQuantity} in stock</span>`}
        </div>
        <div class="shop-card-body">
          <div class="shop-variant-row">
            <span class="record-type">${variantLabel}: ${esc(p.variant)}</span>
            <small class="muted">Demo Price</small>
          </div>
          <h3>${esc(p.name)}</h3>
          <p class="shop-desc">${esc(p.description)}</p>

          <div class="shop-size-price-row">
            <select class="filter-select shop-size-select" aria-label="Select pack size">
              ${sizes.map((s) => `<option value="${esc(s.label)}" data-price="${s.price}">${esc(s.label)} — ${money(s.price)}</option>`).join("")}
            </select>
            <strong class="shop-card-price">${money(sizes[0].price)}</strong>
          </div>

          <div class="shop-card-actions">
            <button type="button" class="primary-small shop-add-btn" ${outOfStock ? "disabled" : ""}>${outOfStock ? "Sold Out" : "+ Add to Cart"}</button>
            <button type="button" class="outline-btn shop-detail-btn">View Details</button>
          </div>
        </div>
      </article>`;
    })
    .join("");

  window.FlowerCycleMotion?.refresh();
}

function openProductDetail(prod) {
  activeDetailProduct = prod;
  const sizes = prod.sizeOptions && prod.sizeOptions.length > 0
    ? prod.sizeOptions
    : [{ label: prod.packSize, price: prod.price }];

  $("detailTitle").textContent = prod.name;
  $("detailBody").innerHTML = `
    <div class="shop-detail-grid">
      <img src="${esc(prod.image)}" alt="${esc(prod.name)}" class="shop-detail-img">
      <div>
        <span class="record-type">${esc(prod.category)}</span>
        <span class="record-type" style="margin-left:6px">${esc(prod.variant)}</span>
        <p style="margin:14px 0;font-size:13px;line-height:1.7;color:#4f6055">${esc(prod.description)}</p>
        <p class="muted">Product ID: <b>${esc(prod.productId)}</b> · Stock: <b>${prod.stockQuantity} units</b></p>

        <div class="form-field" style="margin-top:14px">
          <label for="detailSizeSelect">Select Pack Size / Variant</label>
          <select id="detailSizeSelect">
            ${sizes.map((s) => `<option value="${esc(s.label)}" data-price="${s.price}">${esc(s.label)} — ${money(s.price)}</option>`).join("")}
          </select>
        </div>

        <div class="form-field">
          <label for="detailQtyInput">Quantity</label>
          <input id="detailQtyInput" type="number" min="1" max="${Math.max(1, prod.stockQuantity)}" value="1">
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;gap:12px">
          <div><small class="muted">Demo Price</small><strong id="detailLivePrice" style="display:block;font-size:24px;color:var(--deep)">${money(sizes[0].price)}</strong></div>
          <button type="button" class="btn btn-primary" id="detailAddBtn" ${prod.stockQuantity <= 0 ? "disabled" : ""}>+ Add to Cart</button>
        </div>
      </div>
    </div>
  `;

  $("detailSizeSelect").addEventListener("change", (e) => {
    const opt = e.target.selectedOptions[0];
    $("detailLivePrice").textContent = money(opt.dataset.price);
  });

  $("detailAddBtn").addEventListener("click", () => {
    const sel = $("detailSizeSelect");
    const opt = sel.selectedOptions[0];
    const qty = Math.max(1, parseInt($("detailQtyInput").value || 1, 10));
    addToCart(prod, sel.value, Number(opt.dataset.price), qty);
    $("detailModal").classList.remove("show");
  });

  $("detailModal").classList.add("show");
}

// ── Event Listeners ─────────────────────────────────────────
$("categoryTabs").addEventListener("click", (e) => {
  const pill = e.target.closest(".shop-cat-pill");
  if (!pill) return;
  document.querySelectorAll(".shop-cat-pill").forEach((el) => el.classList.remove("active"));
  pill.classList.add("active");
  activeCategory = pill.dataset.cat;

  // Reset opposite variant filter cleanly when switching category
  if (activeCategory === "Natural Incense Sticks") $("colourFilter").value = "all";
  if (activeCategory === "Natural Organic Holi Colours") $("fragranceFilter").value = "all";
  loadProducts();
});

$("fragranceFilter").addEventListener("change", () => {
  if ($("fragranceFilter").value !== "all") {
    $("colourFilter").value = "all";
    activeCategory = "Natural Incense Sticks";
    document.querySelectorAll(".shop-cat-pill").forEach((el) => {
      el.classList.toggle("active", el.dataset.cat === activeCategory);
    });
  }
  loadProducts();
});

$("colourFilter").addEventListener("change", () => {
  if ($("colourFilter").value !== "all") {
    $("fragranceFilter").value = "all";
    activeCategory = "Natural Organic Holi Colours";
    document.querySelectorAll(".shop-cat-pill").forEach((el) => {
      el.classList.toggle("active", el.dataset.cat === activeCategory);
    });
  }
  loadProducts();
});

$("shopSearch").addEventListener("input", loadProducts);
$("shopSort").addEventListener("change", loadProducts);

$("catalogGrid").addEventListener("change", (e) => {
  if (!e.target.classList.contains("shop-size-select")) return;
  const card = e.target.closest(".shop-card");
  const price = e.target.selectedOptions[0].dataset.price;
  card.querySelector(".shop-card-price").textContent = money(price);
});

$("catalogGrid").addEventListener("click", (e) => {
  const card = e.target.closest(".shop-card");
  if (!card) return;
  const prod = catalog.find((p) => p._id === card.dataset.id);
  if (!prod) return;

  if (e.target.classList.contains("shop-add-btn")) {
    const { packSize, unitPrice } = getSelectedSize(prod, card);
    addToCart(prod, packSize, unitPrice, 1, e.target);
  }
  if (e.target.classList.contains("shop-detail-btn")) {
    openProductDetail(prod);
  }
});

// Cart Drawer Controls
function openCart() { $("cartBackdrop").classList.add("show"); }
function closeCart() { $("cartBackdrop").classList.remove("show"); }

$("openCartBtn").addEventListener("click", openCart);
$("closeCartBtn").addEventListener("click", closeCart);
$("cartBackdrop").addEventListener("click", (e) => {
  if (e.target === $("cartBackdrop")) closeCart();
});

$("cartItemsList").addEventListener("click", (e) => {
  const inc = e.target.dataset.inc;
  const dec = e.target.dataset.dec;
  const rem = e.target.dataset.rem;
  if (inc !== undefined) {
    cart[inc].quantity += 1;
    persistCart();
  } else if (dec !== undefined) {
    if (cart[dec].quantity > 1) cart[dec].quantity -= 1;
    else cart.splice(dec, 1);
    persistCart();
  } else if (rem !== undefined) {
    cart.splice(rem, 1);
    persistCart();
  }
});

// Checkout Flow (uses existing authentication system)
$("proceedCheckoutBtn").addEventListener("click", () => {
  if (!api.isLoggedIn()) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    alert("Please sign in to complete your order. Your cart items will stay saved.");
    location.href = "login.html?redirect=shop.html";
    return;
  }

  closeCart();
  const user = api.getUser();
  $("checkoutForm").hidden = false;
  $("coSuccessBox").hidden = true;
  $("checkoutModalTitle").textContent = "Checkout";
  if (user) {
    $("coName").value = user.name || "";
    $("coPhone").value = user.phone || "";
    $("coAddress").value = user.address || "";
  }

  const sub = cart.reduce((s, i) => s + Number(i.unitPrice) * Number(i.quantity), 0);
  const del = sub >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
  const tot = sub + del;

  $("coOrderSummary").innerHTML = `
    <h3>Order Summary (${cart.reduce((s, i) => s + i.quantity, 0)} items)</h3>
    <div class="fin-break-grid">
      ${cart.map((i) => `<div><span>${esc(i.name)} (${esc(i.packSize)} × ${i.quantity})</span><b>${money(i.unitPrice * i.quantity)}</b></div>`).join("")}
      <div><span>Subtotal</span><b>${money(sub)}</b></div>
      <div><span>Delivery Charge</span><b>${del === 0 ? "FREE" : money(del)}</b></div>
      <div><span><b>Total Payable</b></span><b class="fin-green">${money(tot)}</b></div>
    </div>
  `;

  $("checkoutModal").classList.add("show");
});

$("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const res = await api.placeOrder({
      customerName: $("coName").value.trim(),
      phone: $("coPhone").value.trim(),
      deliveryAddress: $("coAddress").value.trim(),
      paymentMethod: $("coPayment").value,
      items: cart,
    });

    const order = res.data;
    cart = [];
    localStorage.removeItem(CART_KEY);
    renderCart();
    await loadProducts();

    $("checkoutForm").hidden = true;
    $("coSuccessBox").hidden = false;
    $("checkoutModalTitle").textContent = "Order Confirmed";
    $("coSuccessBox").innerHTML = `
      <div class="fin-breakdown-box" style="text-align:center;padding:24px">
        <div style="font-size:38px;margin-bottom:8px">✅</div>
        <h3>Thank you! Order Placed</h3>
        <p class="muted" style="margin:8px 0 16px">Order ID: <b>${esc(order.orderId)}</b> · Status: <b>${esc(order.orderStatus)}</b></p>
        <p style="font-size:13px">Total Amount: <strong class="fin-green">${money(order.totalAmountINR)}</strong><br>
        <small class="muted">${esc(order.paymentMethod)} (${esc(order.paymentStatus)})</small></p>
        <div style="margin-top:18px;display:flex;gap:10px;justify-content:center">
          <button type="button" class="outline-btn" id="viewOrdersAfterCo">View Order History</button>
          <button type="button" class="primary-small" id="continueShopBtn">Continue Shopping</button>
        </div>
      </div>
    `;
    $("viewOrdersAfterCo").onclick = () => {
      $("checkoutModal").classList.remove("show");
      openOrdersModal();
    };
    $("continueShopBtn").onclick = () => $("checkoutModal").classList.remove("show");
    toast("Order placed successfully!");
  } catch (err) {
    toast(err.message || "Could not place order.");
  }
});

// Order History Modal
async function openOrdersModal() {
  if (!api.isLoggedIn()) {
    location.href = "login.html?redirect=shop.html";
    return;
  }
  $("ordersModal").classList.add("show");
  $("myOrdersBody").innerHTML = `<p class="muted">Loading your orders...</p>`;
  try {
    const res = await api.getOrders();
    const orders = res.data || [];
    if (orders.length === 0) {
      $("myOrdersBody").innerHTML = `<div class="empty-state">You haven't placed any orders yet.</div>`;
      return;
    }
    $("myOrdersBody").innerHTML = orders
      .map(
        (o) => `<div class="fin-breakdown-box" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div><b>${esc(o.orderId)}</b> <small class="muted">· ${new Date(o.createdAt).toLocaleDateString("en-IN")}</small></div>
            <span class="status collected">${esc(o.orderStatus)}</span>
          </div>
          <p style="font-size:12px;color:#4f6055;margin-bottom:6px">${o.items.map((i) => `${esc(i.name)} (${esc(i.packSize)}) × ${i.quantity}`).join(", ")}</p>
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span class="muted">${esc(o.paymentMethod)}</span>
            <strong class="fin-green">${money(o.totalAmountINR)}</strong>
          </div>
        </div>`
      )
      .join("");
  } catch (err) {
    $("myOrdersBody").innerHTML = `<p class="muted">Could not load orders.</p>`;
  }
}

$("openMyOrdersBtn").addEventListener("click", openOrdersModal);
$("closeDetailModal").addEventListener("click", () => $("detailModal").classList.remove("show"));
$("closeCheckoutModal").addEventListener("click", () => $("checkoutModal").classList.remove("show"));
$("cancelCheckoutBtn").addEventListener("click", () => $("checkoutModal").classList.remove("show"));
$("closeOrdersModal").addEventListener("click", () => $("ordersModal").classList.remove("show"));

[$("detailModal"), $("checkoutModal"), $("ordersModal")].forEach((m) => {
  m.addEventListener("click", (e) => {
    if (e.target === m) m.classList.remove("show");
  });
});

loadProducts();
initCart();
