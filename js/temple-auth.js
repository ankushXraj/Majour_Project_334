const USERS_KEY="flowerCycleTempleUsers",SESSION_KEY="flowerCycleCurrentTemple";
const $=id=>document.getElementById(id);
const registerForm=$("templeRegisterForm");
if(registerForm){
 registerForm.addEventListener("submit",e=>{
  e.preventDefault();
  const users=JSON.parse(localStorage.getItem(USERS_KEY)||"[]");
  const user={id:"TM"+Date.now().toString().slice(-7),name:$("templeName").value.trim(),contact:$("contactPerson").value.trim(),email:$("templeEmail").value.trim().toLowerCase(),phone:$("templePhone").value.trim(),address:$("templeAddress").value.trim(),password:$("templePassword").value};
  if(users.some(u=>u.email===user.email)){ $("registerMessage").textContent="An account with this email already exists.";return;}
  users.push(user);localStorage.setItem(USERS_KEY,JSON.stringify(users));localStorage.setItem(SESSION_KEY,user.id);
  $("registerMessage").textContent="Registration successful. Opening your temple dashboard...";
  setTimeout(()=>location.href="temple-dashboard.html",600);
 });
}
const loginForm=$("loginForm");
if(loginForm){
 loginForm.addEventListener("submit",e=>{
  e.preventDefault();
  const role=$("role").value;
  if(role!=="temple"){ $("loginMessage").textContent="This demo currently supports Temple login. Admin and staff login will be connected later.";return;}
  const email=$("email").value.trim().toLowerCase(),password=$("password").value;
  const users=JSON.parse(localStorage.getItem(USERS_KEY)||"[]");
  const user=users.find(u=>u.email===email&&u.password===password);
  if(!user){$("loginMessage").textContent="Account not found or password is incorrect. Please register first.";return;}
  localStorage.setItem(SESSION_KEY,user.id);location.href="temple-dashboard.html";
 });
}
