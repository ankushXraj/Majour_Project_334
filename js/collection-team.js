const KEY="flowerCycleTemplePortalRequests", $=id=>document.getElementById(id);
let requests=JSON.parse(localStorage.getItem(KEY)||"[]"),selectedId=null;
const statuses=["Pending","Collected","Processing","Completed"];
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(s){$("teamToast").textContent=s;$("teamToast").style.display="block";setTimeout(()=>$("teamToast").style.display="none",2200);}
function render(){
 requests=JSON.parse(localStorage.getItem(KEY)||"[]");
 const adminKey="flowerCycleRequests",admin=JSON.parse(localStorage.getItem(adminKey)||"[]");
 requests.forEach(r=>{
  const existing=admin.find(a=>a.id===r.id);
  const linked={id:r.id,temple:r.temple,flower:r.flower,quantity:Number(r.quantity),date:r.date,status:r.status,notes:r.notes||"",origin:"templePortal",contact:r.contact||"",address:r.address||"",sourceRequestId:r.id};
  if(existing)Object.assign(existing,linked);else admin.unshift(linked);
 });
 localStorage.setItem(adminKey,JSON.stringify(admin));
 const q=$("teamSearch").value.trim().toLowerCase(),filter=$("teamFilter").value;
 const list=requests.filter(r=>(r.temple+" "+r.flower).toLowerCase().includes(q)&&(filter==="all"||r.status===filter));
 $("teamTotal").textContent=requests.length;
 $("teamPending").textContent=requests.filter(r=>r.status==="Pending").length;
 $("teamCollected").textContent=requests.filter(r=>["Collected","Processing","Completed"].includes(r.status)).reduce((a,r)=>a+Number(r.quantity),0)+" kg";
 $("teamCompleted").textContent=requests.filter(r=>r.status==="Completed").length;
 $("teamRows").innerHTML=list.map(r=>`<tr><td><b>${esc(r.id)}</b><br>${esc(r.temple)}</td><td>${esc(r.flower)}</td><td>${r.quantity} kg</td><td>${esc(r.date)}</td><td>${esc(r.contact)}<br><small>${esc(r.address)}</small></td><td><select class="status-select" data-update="${r.id}">${statuses.map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("")}</select><br><button class="action-btn" data-view="${r.id}" style="margin-top:5px">View details</button></td></tr>`).join("");
 $("teamEmpty").hidden=list.length>0;
 if(selectedId){const r=requests.find(x=>x.id===selectedId);if(r)showDetails(r);}
}
function showDetails(r){selectedId=r.id;$("teamDetails").innerHTML=`<div class="team-detail-grid"><div><small>Request ID</small><b>${esc(r.id)}</b></div><div><small>Temple</small><b>${esc(r.temple)}</b></div><div><small>Flower type</small><b>${esc(r.flower)}</b></div><div><small>Estimated quantity</small><b>${r.quantity} kg</b></div><div><small>Pickup date</small><b>${esc(r.date)}</b></div><div><small>Contact</small><b>${esc(r.contact)}</b></div><div class="detail-wide"><small>Pickup address</small><b>${esc(r.address)}</b></div><div class="detail-wide"><small>Additional instructions</small><b>${esc(r.notes||"No additional instructions.")}</b></div></div>`;}
$("teamRows").addEventListener("change",e=>{
 const id=e.target.dataset.update;if(!id)return;
 const r=requests.find(x=>x.id===id);
 if(r){
  r.status=e.target.value;localStorage.setItem(KEY,JSON.stringify(requests));
  const adminKey="flowerCycleRequests",admin=JSON.parse(localStorage.getItem(adminKey)||"[]"),a=admin.find(x=>x.id===id);
  if(a){a.status=r.status;localStorage.setItem(adminKey,JSON.stringify(admin));}
  render();toast("Request status updated.");
 }
});
$("teamRows").addEventListener("click",e=>{const id=e.target.dataset.view;if(id){const r=requests.find(x=>x.id===id);if(r)showDetails(r);}});
$("teamSearch").addEventListener("input",render);$("teamFilter").addEventListener("change",render);$("teamRefresh").addEventListener("click",()=>{render();toast("Requests refreshed.");});
render();