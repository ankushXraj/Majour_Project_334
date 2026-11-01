const $=id=>document.getElementById(id);
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||"null")||[];}catch{return [];}};
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let reportData={};
function render(){
 const demoWaste=[
  {id:"WR1001",source:"Shiv Temple",flower:"Marigold",received:25,usable:21,other:4,date:"2026-10-31",stage:"Ready for processing",notes:""},
  {id:"WR1002",source:"Hanuman Temple",flower:"Rose",received:15,usable:12,other:3,date:"2026-10-30",stage:"Sent for processing",notes:""},
  {id:"WR1003",source:"Durga Temple",flower:"Mixed",received:30,usable:24,other:6,date:"2026-11-01",stage:"Awaiting processing",notes:""}
 ];
 const demoProducts=[
  {id:"EP1001",name:"Flower-based incense sticks",category:"Incense",quantity:24,price:35,date:"2026-10-31",description:"Sample inventory record"},
  {id:"EP1002",name:"Organic flower compost",category:"Compost",quantity:28,price:20,date:"2026-10-30",description:"Sample inventory record"},
  {id:"EP1003",name:"Natural flower colours",category:"Organic colours",quantity:12,price:60,date:"2026-10-29",description:"Sample inventory record"}
 ];
 if(localStorage.getItem("flowerCycleWasteRecords")===null)localStorage.setItem("flowerCycleWasteRecords",JSON.stringify(demoWaste));
 if(localStorage.getItem("flowerCycleProducts")===null)localStorage.setItem("flowerCycleProducts",JSON.stringify(demoProducts));
 const requests=read("flowerCycleRequests"),waste=read("flowerCycleWasteRecords"),products=read("flowerCycleProducts");
 const sum=(arr,key)=>arr.reduce((a,x)=>a+Number(x[key]||0),0);
 const received=sum(waste,"received"),usable=sum(waste,"usable"),other=sum(waste,"other"),units=sum(products,"quantity");
 $("rRequests").textContent=requests.length;$("rReceived").textContent=received.toLocaleString()+" kg";$("rUsable").textContent=usable.toLocaleString()+" kg";$("rUnits").textContent=units.toLocaleString();
 const uPct=received?usable/received*100:0,oPct=received?other/received*100:0;
 $("usableBar").style.width=uPct+"%";$("otherBar").style.width=oPct+"%";
 $("segregationSummary").textContent=received?`${usable} kg usable flowers (${uPct.toFixed(1)}%) · ${other} kg other material (${oPct.toFixed(1)}%)`:"No waste records yet";
 const statuses=["Pending","Collected","Processing","Completed"],counts=statuses.map(s=>requests.filter(r=>r.status===s).length),max=Math.max(1,...counts);
 $("statusBreakdown").innerHTML=statuses.map((s,i)=>`<div class="breakdown-item"><span>${s}</span><div class="breakdown-track"><b style="width:${counts[i]/max*100}%"></b></div><strong>${counts[i]}</strong></div>`).join("");
 const categories=[...new Set(products.map(p=>p.category))],catTotals=categories.map(c=>({name:c,total:products.filter(p=>p.category===c).reduce((a,p)=>a+Number(p.quantity||0),0)})),maxCat=Math.max(1,...catTotals.map(x=>x.total));
 $("categoryBars").innerHTML=catTotals.length?catTotals.map(c=>`<div class="category-bar-row"><span>${safe(c.name)}</span><div class="category-bar-track"><b style="width:${c.total/maxCat*100}%"></b></div><strong>${c.total}</strong></div>`).join(""):`<p class="muted">No product records yet.</p>`;
 const activity=[
 ...requests.map(r=>({id:r.id,name:r.temple,detail:`${r.quantity} kg · ${r.flower}`,status:r.status,date:r.date})),
 ...waste.map(r=>({id:r.id,name:r.source,detail:`${r.received} kg received · ${r.usable} kg usable`,status:r.stage,date:r.date})),
 ...products.map(p=>({id:p.id,name:p.name,detail:`${p.quantity} units · ${money(p.price)} each`,status:p.category,date:p.date}))
 ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
 $("activityRows").innerHTML=activity.map(a=>`<tr><td>${safe(a.id)}</td><td><b>${safe(a.name)}</b></td><td>${safe(a.detail)}</td><td>${safe(a.status)}</td></tr>`).join("");
 $("activityEmpty").hidden=activity.length>0;
 reportData={requests,waste,products,received,usable,other,units};
}
function exportCSV(){
 const rows=[["Section","Record ID","Name","Details","Status/Category","Date"]];
 reportData.requests.forEach(r=>rows.push(["Collection",r.id,r.temple,`${r.quantity} kg ${r.flower}`,r.status,r.date]));
 reportData.waste.forEach(r=>rows.push(["Waste",r.id,r.source,`${r.received} kg received; ${r.usable} kg usable; ${r.other} kg other`,r.stage,r.date]));
 reportData.products.forEach(p=>rows.push(["Product",p.id,p.name,`${p.quantity} units; ${p.price} per unit`,p.category,p.date]));
 const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="flowercycle-report.csv";a.click();URL.revokeObjectURL(url);
 $("reportToast").textContent="CSV report downloaded."; $("reportToast").style.display="block";setTimeout(()=>$("reportToast").style.display="none",2200);
}
$("refreshReports").addEventListener("click",render);$("exportReport").addEventListener("click",exportCSV);render();