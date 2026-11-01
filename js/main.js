const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
if (menuToggle && mainNav) menuToggle.addEventListener("click", () => mainNav.classList.toggle("open"));

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const role = document.getElementById("role").value;
    const message = document.getElementById("loginMessage");
    message.textContent = "Frontend demo: " + role + " login screen is ready. Real authentication will be connected with the backend later.";
    message.classList.add("message-success");
  });
}

const addRequest = document.getElementById("addRequest");
if (addRequest) {
  addRequest.addEventListener("click", () => {
    const temple = prompt("Enter temple name:");
    if (!temple) return;
    const flower = prompt("Enter flower type (Marigold / Rose / Mixed):");
    if (!flower) return;
    const quantity = prompt("Enter quantity in kg:");
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    const row = document.createElement("tr");
    [temple, flower, quantity + " kg"].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "status pending";
    badge.textContent = "Pending";
    statusCell.appendChild(badge);
    row.appendChild(statusCell);
    document.getElementById("requestRows").prepend(row);
  });
}