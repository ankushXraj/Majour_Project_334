// ── Admin Shop & Order Management ──────────────────────────
const $ = (id) => document.getElementById(id);
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

let shopProducts = [];
let shopOrders = [];

function toast(msg) {
  const el = $("asToast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 2400);
}

async function loadAll() {
  try {
    const [prodRes, ordRes] = await Promise.all([
      api.getShopProducts({
        includeDisabled: "true",
        category: $("asCatFilter").value,
        search: $("asSearch").value.trim(),
      }),
      api.getOrders(),
    ]);

    shopProducts = prodRes.data || [];
    shopOrders = ordRes.data || [];

    const allProdsRes = await api.getShopProducts({ includeDisabled: "true" });
    const allProds = allProdsRes.data || [];

    $("asTotalProds").textContent = allProds.length;
    $("asActiveProds").textContent = allProds.filter((p) => p.isActive).length;
    $("asTotalOrders").textContent = shopOrders.length;
    $("asOrderValue").textContent = money(
      shopOrders.reduce((s, o) => s + Number(o.totalAmountINR || 0), 0)
    );

    $("asProductRows").innerHTML = shopProducts
      .map(
        (p) => `<tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <img src="${esc(p.image)}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover">
              <div><b>${esc(p.name)}</b><br><small class="muted">${esc(p.productId)}</small></div>
            </div>
          </td>
          <td>${esc(p.category)}<br><small class="muted">${esc(p.variant)}</small></td>
          <td><b>${money(p.price)}</b><br><small class="muted">${esc(p.packSize)}</small></td>
          <td>${p.stockQuantity} units</td>
          <td><span class="status ${p.isActive ? "collected" : "pending"}">${p.isActive ? "Enabled" : "Disabled"}</span></td>
          <td>
            <div class="row-actions">
              <button class="action-btn" data-edit-sp="${p._id}">Edit</button>
              <button class="action-btn" data-toggle-sp="${p._id}">${p.isActive ? "Disable" : "Enable"}</button>
              <button class="action-btn" data-del-sp="${p._id}">Delete</button>
            </div>
          </td>
        </tr>`
      )
      .join("");

    $("asOrdersEmpty").hidden = shopOrders.length > 0;
    const statuses = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"];
    $("asOrderRows").innerHTML = shopOrders
      .map(
        (o) => `<tr>
          <td><b>${esc(o.orderId)}</b><br><small class="muted">${new Date(o.createdAt).toLocaleDateString("en-IN")}</small></td>
          <td><b>${esc(o.customerName)}</b><br><small class="muted">${esc(o.phone)} · ${esc(o.deliveryAddress)}</small></td>
          <td>${o.items.map((i) => `${esc(i.name)} (${esc(i.packSize)}) × ${i.quantity}`).join("<br>")}</td>
          <td><b>${money(o.totalAmountINR)}</b></td>
          <td><small>${esc(o.paymentMethod)}</small></td>
          <td>
            <select class="status-select" data-order-status="${o._id}">
              ${statuses.map((s) => `<option ${s === o.orderStatus ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </td>
        </tr>`
      )
      .join("");
  } catch (err) {
    console.error("Admin shop load error:", err);
    toast("Failed to load shop management data. Sign in as Admin.");
  }
}

function openModal(prod = null) {
  $("shopProdForm").reset();
  $("spId").value = prod?._id || "";
  $("spModalTitle").textContent = prod ? "Edit Shop Product" : "Add Shop Product";
  $("spName").value = prod?.name || "";
  $("spCategory").value = prod?.category || "Natural Incense Sticks";
  $("spVariantType").value = prod?.variantType || "fragrance";
  $("spVariant").value = prod?.variant || "";
  $("spPackSize").value = prod?.packSize || "";
  $("spPrice").value = prod?.price ?? "";
  $("spStock").value = prod?.stockQuantity ?? 50;
  $("spActive").value = prod ? String(prod.isActive) : "true";
  $("spImageUrl").value = prod?.image || "assets/products/incense-sandalwood.jpg";
  $("spDescription").value = prod?.description || "";
  $("shopProdModal").classList.add("show");
}

$("openAddShopBtn").addEventListener("click", () => openModal());
$("closeSpModal").addEventListener("click", () => $("shopProdModal").classList.remove("show"));
$("cancelSpModal").addEventListener("click", () => $("shopProdModal").classList.remove("show"));

// Image file upload handler
$("spImageFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await api.uploadShopImage(reader.result);
      $("spImageUrl").value = res.url;
      toast("Image uploaded successfully.");
    } catch (err) {
      toast(err.message || "Image upload failed.");
    }
  };
  reader.readAsDataURL(file);
});

$("shopProdForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("spId").value;
  const payload = {
    name: $("spName").value.trim(),
    category: $("spCategory").value,
    variantType: $("spVariantType").value,
    variant: $("spVariant").value.trim(),
    packSize: $("spPackSize").value.trim(),
    price: Number($("spPrice").value),
    stockQuantity: Number($("spStock").value),
    isActive: $("spActive").value === "true",
    image: $("spImageUrl").value.trim() || "assets/products/incense-sandalwood.jpg",
    description: $("spDescription").value.trim(),
  };

  try {
    if (id) {
      await api.updateShopProduct(id, payload);
      toast("Product updated.");
    } else {
      await api.createShopProduct(payload);
      toast("Product added to Shop.");
    }
    $("shopProdModal").classList.remove("show");
    await loadAll();
  } catch (err) {
    toast(err.message || "Failed to save product.");
  }
});

$("asProductRows").addEventListener("click", async (e) => {
  const editId = e.target.dataset.editSp;
  const toggleId = e.target.dataset.toggleSp;
  const delId = e.target.dataset.delSp;

  if (editId) {
    const p = shopProducts.find((x) => x._id === editId);
    if (p) openModal(p);
  } else if (toggleId) {
    const p = shopProducts.find((x) => x._id === toggleId);
    if (p) {
      await api.updateShopProduct(toggleId, { isActive: !p.isActive });
      toast(`Product ${!p.isActive ? "enabled" : "disabled"}.`);
      await loadAll();
    }
  } else if (delId) {
    const p = shopProducts.find((x) => x._id === delId);
    if (p && confirm(`Delete "${p.name}"?`)) {
      await api.deleteShopProduct(delId);
      toast("Product deleted.");
      await loadAll();
    }
  }
});

$("asOrderRows").addEventListener("change", async (e) => {
  const oid = e.target.dataset.orderStatus;
  if (!oid) return;
  try {
    await api.updateOrderStatus(oid, e.target.value);
    toast("Order status updated.");
    await loadAll();
  } catch (err) {
    toast("Failed to update order status.");
  }
});

$("asSearch").addEventListener("input", loadAll);
$("asCatFilter").addEventListener("change", loadAll);

loadAll();
