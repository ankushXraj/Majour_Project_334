const KEY="flowerCycleProducts";
const samples=[
{id:"EP1001",name:"Flower-based incense sticks",category:"Incense",quantity:24,price:35,date:"2026-10-31",description:"Sample inventory record"},
{id:"EP1002",name:"Organic flower compost",category:"Compost",quantity:28,price:20,date:"2026-10-30",description:"Sample inventory record"},
{id:"EP1003",name:"Natural flower colours",category:"Organic colours",quantity:12,price:60,date:"2026-10-29",description:"Sample inventory record"}
];
let products=JSON.parse(localStorage.getItem(KEY)||"null");
if(products===null){products=samples;localStorage.setItem(KEY,JSON.stringify(products));}
const $=id=>document.getElementById(id),modal=$("productModal"),form=$("productForm");
function save(){localStorage.setItem(KEY,JSON.stringify(products));render();}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 const q=$("productSearch").value.trim().toLowerCase(),cat=$("categoryFilter").value;
 const list=products.filter(p=>(p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q))&&(cat==="all"||p.category===cat));
 $("productRows").innerHTML=list.map(p=>`<tr><td><b>${esc(p.name)}</b><br><small class="muted">${esc(p.id)}</small></td><td><span class="record-type">${esc(p.category)}</span></td><td>${Number(p.quantity).toLocaleString()}</td><td>₹${Number(p.price).toFixed(2)}</td><td>₹${(Number(p.quantity)*Number(p.price)).toLocaleString("en-IN",{maximumFractionDigits:2})}</td><td><div class="row-actions"><button class="action-btn" data-edit-product="${p.id}">Edit</button><button class="action-btn" data-delete-product="${p.id}">Delete</button></div></td></tr>`).join("");
 $("productEmpty").hidden=list.length>0;
 $("typeCount").textContent=new Set(products.map(p=>p.category)).size;
 $("unitCount").textContent=products.reduce((a,p)=>a+Number(p.quantity),0).toLocaleString();
 $("stockValue").textContent="₹"+products.reduce((a,p)=>a+Number(p.quantity)*Number(p.price),0).toLocaleString("en-IN",{maximumFractionDigits:2});
 $("lowStock").textContent=products.filter(p=>Number(p.quantity)<10).length;
}
function open(p){form.reset();$("productId").value=p?.id||"";$("productModalTitle").textContent=p?"Edit eco-product":"Add eco-product";$("productName").value=p?.name||"";$("productCategory").value=p?.category||"";$("productQuantity").value=p?.quantity??"";$("productPrice").value=p?.price??"";$("productDate").value=p?.date||new Date().toISOString().slice(0,10);$("productDescription").value=p?.description||"";modal.classList.add("show");}
function close(){modal.classList.remove("show");}
function toast(s){$("productToast").textContent=s;$("productToast").style.display="block";setTimeout(()=>$("productToast").style.display="none",2200);}
$("addProduct").onclick=()=>open();$("closeProduct").onclick=close;$("cancelProduct").onclick=close;modal.addEventListener("click",e=>{if(e.target===modal)close();});document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
form.addEventListener("submit",e=>{e.preventDefault();const id=$("productId").value||"EP"+Date.now().toString().slice(-8);const p={id,name:$("productName").value.trim(),category:$("productCategory").value,quantity:Number($("productQuantity").value),price:Number($("productPrice").value),date:$("productDate").value,description:$("productDescription").value.trim()};if(p.quantity<0||p.price<0){toast("Quantity and price cannot be negative.");return;}const i=products.findIndex(x=>x.id===id);if(i>=0)products[i]=p;else products.unshift(p);save();close();toast(i>=0?"Product updated.":"Product added.");});
$("productSearch").addEventListener("input",render);$("categoryFilter").addEventListener("change",render);
$("productRows").addEventListener("click",e=>{const edit=e.target.dataset.editProduct,del=e.target.dataset.deleteProduct;if(edit){const p=products.find(x=>x.id===edit);if(p)open(p);}if(del){const p=products.find(x=>x.id===del);if(p&&confirm("Delete "+p.name+"?")){products=products.filter(x=>x.id!==del);save();toast("Product deleted.");}}});
render();