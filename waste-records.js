const KEY="flowerCycleWasteRecords";
const samples=[
{id:"WR1001",source:"Shiv Temple",flower:"Marigold",received:25,usable:21,other:4,date:"2026-10-31",stage:"Ready for processing",notes:""},
{id:"WR1002",source:"Hanuman Temple",flower:"Rose",received:15,usable:12,other:3,date:"2026-10-30",stage:"Sent for processing",notes:""},
{id:"WR1003",source:"Durga Temple",flower:"Mixed",received:30,usable:24,other:6,date:"2026-11-01",stage:"Awaiting processing",notes:""}
];
let records=JSON.parse(localStorage.getItem(KEY)||"null");
if(records===null){records=samples;localStorage.setItem(KEY,JSON.stringify(records));}
const $=id=>document.getElementById(id), modal=$("wasteModal"), form=$("wasteForm");
function persist(){localStorage.setItem(KEY,JSON.stringify(records));render();}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 const q=$("searchWaste").value.trim().toLowerCase(),f=$("wasteStatusFilter").value;
 const list=records.filter(r=>(r.source.toLowerCase().includes(q)||r.flower.toLowerCase().includes(q))&&(f==="all"||r.stage===f));
 $("wasteTable").innerHTML=list.map(r=>`<tr><td><b>${esc(r.source)}</b><br><small class="muted">${esc(r.id)} · ${esc(r.date)}</small></td><td><span class="record-type">${esc(r.flower)}</span></td><td>${r.received} kg</td><td>${r.usable} kg</td><td>${r.other} kg</td><td><select class="status-select ${r.stage==="Sent for processing"?"processing":r.stage==="Ready for processing"?"collected":"pending"}" data-stage="${r.id}">${["Awaiting processing","Ready for processing","Sent for processing"].map(s=>`<option ${s===r.stage?"selected":""}>${s}</option>`).join("")}</select></td><td><div class="row-actions"><button class="action-btn" data-edit-waste="${r.id}">Edit</button><button class="action-btn" data-delete-waste="${r.id}">Delete</button></div></td></tr>`).join("");
 $("wasteEmpty").hidden=list.length>0;
 $("wTotalRecords").textContent=records.length;
 const sum=k=>records.reduce((a,r)=>a+Number(r[k]),0);
 $("wReceived").textContent=sum("received").toLocaleString()+" kg";$("wUsable").textContent=sum("usable").toLocaleString()+" kg";$("wOther").textContent=sum("other").toLocaleString()+" kg";
}
function open(r){form.reset();$("wasteId").value=r?.id||"";$("wasteModalTitle").textContent=r?"Edit waste record":"Add waste record";$("wSource").value=r?.source||"";$("wFlower").value=r?.flower||"";$("wReceivedInput").value=r?.received??"";$("wUsableInput").value=r?.usable??"";$("wOtherInput").value=r?.other??"";$("wDate").value=r?.date||new Date().toISOString().slice(0,10);$("wStage").value=r?.stage||"Awaiting processing";$("wNotes").value=r?.notes||"";modal.classList.add("show");}
function close(){modal.classList.remove("show");}
function toast(s){$("wToast").textContent=s;$("wToast").style.display="block";setTimeout(()=>$("wToast").style.display="none",2200);}
$("openWasteModal").onclick=()=>open();$("wClose").onclick=close;$("wCancel").onclick=close;modal.addEventListener("click",e=>{if(e.target===modal)close();});document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
form.addEventListener("submit",e=>{
 e.preventDefault();const received=Number($("wReceivedInput").value),usable=Number($("wUsableInput").value),other=Number($("wOtherInput").value);
 if(usable+other>received+0.00001){toast("Usable flowers + other material cannot exceed received quantity.");return;}
 const id=$("wasteId").value||"WR"+Date.now().toString().slice(-8);
 const rec={id,source:$("wSource").value.trim(),flower:$("wFlower").value,received,usable,other,date:$("wDate").value,stage:$("wStage").value,notes:$("wNotes").value.trim()};
 const i=records.findIndex(x=>x.id===id);if(i>=0)records[i]=rec;else records.unshift(rec);persist();close();toast(i>=0?"Waste record updated.":"Waste record added.");
});
$("searchWaste").addEventListener("input",render);$("wasteStatusFilter").addEventListener("change",render);
$("wasteTable").addEventListener("click",e=>{
 const edit=e.target.dataset.editWaste,del=e.target.dataset.deleteWaste;
 if(edit){const r=records.find(x=>x.id===edit);if(r)open(r);}
 if(del){const r=records.find(x=>x.id===del);if(r&&confirm("Delete this waste record?")){records=records.filter(x=>x.id!==del);persist();toast("Waste record deleted.");}}
});
$("wasteTable").addEventListener("change",e=>{const id=e.target.dataset.stage;if(!id)return;const r=records.find(x=>x.id===id);if(r){r.stage=e.target.value;persist();toast("Processing stage updated.");}});
render();