const USERS_KEY="flowerCycleTempleUsers",SESSION_KEY="flowerCycleCurrentTemple",REQUESTS_KEY="flowerCycleTemplePortalRequests";
const $=id=>document.getElementById(id);
const users=JSON.parse(localStorage.getItem(USERS_KEY)||"[]"),session=localStorage.getItem(SESSION_KEY),temple=users.find(u=>u.id===session);
if(!temple){alert("Please register or sign in to access the temple dashboard.");location.href="login.html";}
let requests=JSON.parse(localStorage.getItem(REQUESTS_KEY)||"[]");
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(s){$("templeToast").textContent=s;$("templeToast").style.display="block";setTimeout(()=>$("templeToast").style.display="none",2300);}
function render(){
 const mine=requests.filter(r=>r.templeId===temple.id),q=$("templeSearch").value.trim().toLowerCase();
 $("welcomeTemple").textContent="Welcome, "+temple.name;$("templeProfileName").textContent=temple.name;
 $("templeTotal").textContent=mine.length;$("templePending").textContent=mine.filter(r=>r.status==="Pending").length;
 $("templeCollected").textContent=mine.filter(r=>["Collected","Processing","Completed"].includes(r.status)).reduce((a,r)=>a+Number(r.quantity),0)+" kg";
 $("templeCompleted").textContent=mine.filter(r=>r.status==="Completed").length;
 const list=mine.filter(r=>r.flower.toLowerCase().includes(q));
 $("templeRequestRows").innerHTML=list.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.flower)}</td><td>${r.quantity} kg</td><td>${esc(r.date)}</td><td><span class="status ${r.status.toLowerCase()}">${esc(r.status)}</span></td><td>${esc(r.contact)}</td></tr>`).join("");
 $("templeEmpty").hidden=list.length>0;
}
$("templeRequestForm").addEventListener("submit",e=>{
 e.preventDefault();const quantity=Number($("requestQuantity").value);
 const record={id:"TP"+Date.now().toString().slice(-8),templeId:temple.id,temple:temple.name,flower:$("requestFlower").value,quantity,date:$("requestDate").value,contact:$("requestContact").value.trim(),address:$("requestAddress").value.trim(),notes:$("requestNotes").value.trim(),status:"Pending",createdAt:new Date().toISOString()};
 if(quantity<=0){toast("Enter a valid quantity.");return;}
 requests.unshift(record);localStorage.setItem(REQUESTS_KEY,JSON.stringify(requests));e.target.reset();render();toast("Collection request submitted successfully.");
});
$("templeSearch").addEventListener("input",render);
$("templeLogout").addEventListener("click",()=>{localStorage.removeItem(SESSION_KEY);location.href="login.html";});
render();