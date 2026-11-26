// ── Eco-Products ───────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const modal = $("productModal"),
  form = $("productForm");
let products = [];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function toast(s) {
  $("productToast").textContent = s;
  $("productToast").style.display = "block";
  setTimeout(() => ($("productToast").style.display = "none"), 2200);
}

async function render() {
  try {
    const params = {};
    const q = $("productSearch").value.trim();
    const cat = $("categoryFilter").value;
    if (q) params.search = q;
    if (cat !== "all") params.category = cat;

    const result = await api.getProducts(params);
    products = result.data;

    $("productRows").innerHTML = products
      .map(
        (p) =>
          `<tr><td><b>${esc(p.name)}</b><br><small class="muted">${esc(p.productId)}</small></td><td><span class="record-type">${esc(p.category)}</span></td><td>${Number(p.quantity).toLocaleString()}</td><td>₹${Number(p.price).toFixed(2)}</td><td>₹${(Number(p.quantity) * Number(p.price)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td><div class="row-actions"><button class="action-btn" data-edit-product="${p._id}">Edit</button><button class="action-btn" data-delete-product="${p._id}">Delete</button></div></td></tr>`
      )
      .join("");

    $("productEmpty").hidden = products.length > 0;

    // Stats (all products)
    const allResult = await api.getProducts();
    const all = allResult.data;
    $("typeCount").textContent = new Set(all.map((p) => p.category)).size;
    $("unitCount").textContent = all
      .reduce((a, p) => a + Number(p.quantity), 0)
      .toLocaleString();
    $("stockValue").textContent =
      "₹" +
      all
        .reduce((a, p) => a + Number(p.quantity) * Number(p.price), 0)
        .toLocaleString("en-IN", { maximumFractionDigits: 2 });
    $("lowStock").textContent = all.filter(
      (p) => Number(p.quantity) < 10
    ).length;
  } catch (err) {
    console.error("Failed to load products:", err.message);
    toast("Failed to load products.");
  }
}

function open(p) {
  form.reset();
  $("productId").value = p?._id || "";
  $("productModalTitle").textContent = p ? "Edit eco-product" : "Add eco-product";
  $("productName").value = p?.name || "";
  $("productCategory").value = p?.category || "";
  $("productQuantity").value = p?.quantity ?? "";
  $("productPrice").value = p?.price ?? "";
  $("productDate").value = p?.date || new Date().toISOString().slice(0, 10);
  $("productDescription").value = p?.description || "";
  modal.classList.add("show");
}

function close() {
  modal.classList.remove("show");
}

// Event listeners
$("addProduct").onclick = () => open();
$("closeProduct").onclick = close;
$("cancelProduct").onclick = close;
modal.addEventListener("click", (e) => {
  if (e.target === modal) close();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") close();
});

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("productId").value;
  const p = {
    name: $("productName").value.trim(),
    category: $("productCategory").value,
    quantity: Number($("productQuantity").value),
    price: Number($("productPrice").value),
    date: $("productDate").value,
    description: $("productDescription").value.trim(),
  };

  if (p.quantity < 0 || p.price < 0) {
    toast("Quantity and price cannot be negative.");
    return;
  }

  try {
    if (id) {
      await api.updateProduct(id, p);
      toast("Product updated.");
    } else {
      await api.createProduct(p);
      toast("Product added.");
    }
    close();
    await render();
  } catch (err) {
    toast(err.message || "Failed to save product.");
  }
});

// Search & filter
$("productSearch").addEventListener("input", render);
$("categoryFilter").addEventListener("change", render);

// Table actions
$("productRows").addEventListener("click", async (e) => {
  const edit = e.target.dataset.editProduct;
  const del = e.target.dataset.deleteProduct;

  if (edit) {
    const p = products.find((x) => x._id === edit);
    if (p) open(p);
  }

  if (del) {
    const p = products.find((x) => x._id === del);
    if (p && confirm("Delete " + p.name + "?")) {
      try {
        await api.deleteProduct(del);
        toast("Product deleted.");
        await render();
      } catch (err) {
        toast(err.message || "Failed to delete.");
      }
    }
  }
});

render();
