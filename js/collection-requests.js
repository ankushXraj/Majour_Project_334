const STORAGE_KEY = "flowerCycleRequests";
const PORTAL_KEY = "flowerCycleTemplePortalRequests";
const WASTE_KEY = "flowerCycleWasteRecords";
const sampleRequests = [
 {id:"FC1001",temple:"Shiv Temple",flower:"Marigold",quantity:25,date:"2026-10-31",status:"Pending",notes:"",origin:"admin"},
 {id:"FC1002",temple:"Hanuman Temple",flower:"Rose",quantity:15,date:"2026-10-30",status:"Collected",notes:"",origin:"admin"},
 {id:"FC1003",temple:"Durga Temple",flower:"Mixed",quantity:30,date:"2026-11-01",status:"Processing",notes:"",origin:"admin"}
];
const $ = id => document.getElementById(id);
const modal = $("requestModal"), form = $("requestForm");
let requests = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
if(requests===null){requests=sampleRequests;localStorage.setItem(STORAGE_KEY,JSON.stringify(requests));}
function portalRequests(){return JSON.parse(localStorage.getItem(PORTAL_KEY)||"[]");}
function wasteRecords(){return JSON.parse(localStorage.getItem(WASTE_KEY)||"[]");}
function mergePortalRequests(){
 const admin=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
 const portal=portalRequests();
 const adminById=new Map(admin.map(r=>[r.id,r]));
 portal.forEach(p=>{
   const existing=adminById.get(p.id);
   const merged={id:p.id,temple:p.temple,flower:p.flower,quantity:Number(p.quantity),date:p.date,status:p.status,notes:p.notes||"",origin:"templePortal",contact:p.contact||"",address:p.address||"",sourceRequestId:p.id};
   if(existing && existing.origin==="templePortal") Object.assign(existing,merged);
   else if(!existing) admin.unshift(merged);
 });
 localStorage.setItem(STORAGE_KEY,JSON.stringify(admin));
 requests=admin;
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(requests));render();}
function safe(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function hasWasteRecord(id){return wasteRecords().some(w=>w.sourceRequestId===id);}
function render(){
 mergePortalRequests();
 const q=$("searchRequests").value.trim().toLowerCase(), filter=$("statusFilter").value;
 const visible=requests.filter(r=>(r.temple.toLowerCase().includes(q)||r.flower.toLowerCase().includes(q))&&(filter==="all"||r.status===filter));
 $("requestTable").innerHTML=visible.map(r=>{
   const portal=r.origin==="templePortal";
   const createWaste=portal&&r.status==="Collected"&&!hasWasteRecord(r.id)
     ? `<button class="action-btn" data-create-waste="${safe(r.id)}">Create waste record</button>`
     : portal&&hasWasteRecord(r.id) ? `<span class="muted" style="font-size:11px">Waste record created</span>` : "";
   return `<tr>
   <td><b>${safe(r.temple)}</b><br><small class="muted">${safe(r.id)}${portal?" · Temple portal":" · Admin entry"}</small></td>
   <td>${safe(r.flower)}</td><td>${Number(r.quantity).toLocaleString()} kg</td><td>${safe(r.date)}</td>
   <td><select class="status-select ${r.status.toLowerCase()}" data-status="${safe(r.id)}" aria-label="Update status">${["Pending","Collected","Processing","Completed"].map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("")}</select></td>
   <td><div class="row-actions">${portal?createWaste:`<button class="action-btn" data-edit="${safe(r.id)}">Edit</button><button class="action-btn" data-delete="${safe(r.id)}">Delete</button>`}</div></td></tr>`;
 }).join("");
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
function toast(message){const el=$("toast");el.textContent=message;el.style.display="block";setTimeout(()=>el.style.display="none",2500);}
$("openAddModal").addEventListener("click",()=>openModal());
$("closeModal").addEventListener("click",closeModal);$("cancelModal").addEventListener("click",closeModal);
modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
form.addEventListener("submit",e=>{
 e.preventDefault();
 const id=$("requestId").value||"FC"+Date.now().toString().slice(-8);
 const record={id,temple:$("templeName").value.trim(),flower:$("flowerType").value,quantity:Number($("quantity").value),date:$("pickupDate").value,status:$("requestStatus").value,notes:$("requestNotes").value.trim(),origin:"admin"};
 if(!record.temple||!record.flower||!record.date||record.quantity<=0){toast("Please complete all required fields.");return;}
 const index=requests.findIndex(r=>r.id===id);if(index>=0)requests[index]=record;else requests.unshift(record);
 save();closeModal();toast(index>=0?"Request updated successfully.":"Request added successfully.");
});
$("searchRequests").addEventListener("input",render);$("statusFilter").addEventListener("change",render);
$("requestTable").addEventListener("click",e=>{
 const edit=e.target.dataset.edit, del=e.target.dataset.delete, create=e.target.dataset.createWaste;
 if(create){const r=requests.find(x=>x.id===create);if(r){const params=new URLSearchParams({requestId:r.id,source:r.temple,flower:r.flower,received:String(r.quantity),date:r.date});location.href="waste-records.html?"+params.toString();}}
 if(edit){const r=requests.find(x=>x.id===edit);if(r)openModal(r);}
 if(del){const r=requests.find(x=>x.id===del);if(r&&confirm(`Delete the request from ${r.temple}?`)){requests=requests.filter(x=>x.id!==del);save();toast("Request deleted.");}}
});
$("requestTable").addEventListener("change",e=>{
 const id=e.target.dataset.status;if(!id)return;
 const r=requests.find(x=>x.id===id);
 if(r){
   r.status=e.target.value;
   if(r.origin==="templePortal"){
     const portal=portalRequests(),p=portal.find(x=>x.id===id);
     if(p){p.status=r.status;localStorage.setItem(PORTAL_KEY,JSON.stringify(portal));}
   }
   save();toast("Request status updated.");
 }
});
window.addEventListener("storage",e=>{if([PORTAL_KEY,WASTE_KEY].includes(e.key))render();});
render();
