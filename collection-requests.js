const STORAGE_KEY = "flowerCycleRequests";
const sampleRequests = [
 {id:"FC1001",temple:"Shiv Temple",flower:"Marigold",quantity:25,date:"2026-10-31",status:"Pending",notes:""},
 {id:"FC1002",temple:"Hanuman Temple",flower:"Rose",quantity:15,date:"2026-10-30",status:"Collected",notes:""},
 {id:"FC1003",temple:"Durga Temple",flower:"Mixed",quantity:30,date:"2026-11-01",status:"Processing",notes:""}
];
let requests = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || sampleRequests; 
if (localStorage.getItem(STORAGE_KEY) === null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRequests));
}
const $ = id => document.getElementById(id);
const modal = $("requestModal");
const form = $("requestForm");
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(requests));render();}
function safe(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 const q=$("searchRequests").value.trim().toLowerCase(), filter=$("statusFilter").value;
 const visible=requests.filter(r=>(r.temple.toLowerCase().includes(q)||r.flower.toLowerCase().includes(q))&&(filter==="all"||r.status===filter));
 $("requestTable").innerHTML=visible.map(r=>`<tr>
 <td><b>${safe(r.temple)}</b><br><small class="muted">${safe(r.id)}</small></td><td>${safe(r.flower)}</td><td>${Number(r.quantity).toLocaleString()} kg</td><td>${safe(r.date)}</td>
 <td><select class="status-select ${r.status.toLowerCase()}" data-status="${r.id}" aria-label="Update status">${["Pending","Collected","Processing","Completed"].map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("")}</select></td>
 <td><div class="row-actions"><button class="action-btn" data-edit="${r.id}">Edit</button><button class="action-btn" data-delete="${r.id}">Delete</button></div></td></tr>`).join("");
 $("emptyState").hidden=visible.length!==0;
 $("totalCount").textContent=requests.length;
 $("pendingCount").textContent=requests.filter(r=>r.status==="Pending").length;
 $("totalKg").textContent=requests.reduce((sum,r)=>sum+Number(r.quantity),0).toLocaleString()+" kg";
}
function openModal(request){
 form.reset();$("requestId").value=request?.id||"";$("modalTitle").textContent=request?"Edit collection request":"Add collection request";
 $("templeName").value=request?.temple||"";$("flowerType").value=request?.flower||"";$("quantity").value=request?.quantity||"";
 $("pickupDate").value=request?.date||new Date().toISOString().slice(0,10);$("requestStatus").value=request?.status||"Pending";$("requestNotes").value=request?.notes||"";
 modal.classList.add("show");$("templeName").focus();
}
function closeModal(){modal.classList.remove("show");}
function toast(message){const el=$("toast");el.textContent=message;el.style.display="block";setTimeout(()=>el.style.display="none",2300);}
$("openAddModal").addEventListener("click",()=>openModal());
$("closeModal").addEventListener("click",closeModal);$("cancelModal").addEventListener("click",closeModal);
modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
form.addEventListener("submit",e=>{
 e.preventDefault();
 const id=$("requestId").value||"FC"+Date.now().toString().slice(-8);
 const record={id,temple:$("templeName").value.trim(),flower:$("flowerType").value,quantity:Number($("quantity").value),date:$("pickupDate").value,status:$("requestStatus").value,notes:$("requestNotes").value.trim()};
 if(!record.temple||!record.flower||!record.date||record.quantity<=0){toast("Please complete all required fields.");return;}
 const index=requests.findIndex(r=>r.id===id);if(index>=0)requests[index]=record;else requests.unshift(record);
 save();closeModal();toast(index>=0?"Request updated successfully.":"Request added successfully.");
});
$("searchRequests").addEventListener("input",render);$("statusFilter").addEventListener("change",render);
$("requestTable").addEventListener("click",e=>{
 const edit=e.target.dataset.edit, del=e.target.dataset.delete;
 if(edit){const r=requests.find(x=>x.id===edit);if(r)openModal(r);}
 if(del){const r=requests.find(x=>x.id===del);if(r&&confirm(`Delete the request from ${r.temple}?`)){requests=requests.filter(x=>x.id!==del);save();toast("Request deleted.");}}
});
$("requestTable").addEventListener("change",e=>{
 const id=e.target.dataset.status;if(!id)return;const r=requests.find(x=>x.id===id);if(r){r.status=e.target.value;save();toast("Request status updated.");}
});
render();