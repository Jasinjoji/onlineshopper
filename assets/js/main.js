// main.js - handles auth, products, cart (LocalStorage based)

// ---------- LocalStorage keys ----------
const LS_USERS = 'os_users';
const LS_PRODUCTS = 'os_products';
const LS_CURRENT = 'os_current_user'; // stores email of logged-in user
const LS_CART_PREFIX = 'os_cart_';     // cart stored per user: os_cart_<email>

// ---------- Bootstrapping default data ----------
(function bootstrap(){
  // ensure at least one admin exists
  let users = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
  if(!users.find(u=>u.email==='admin@shop.com')){
    users.push({
      email: 'admin@shop.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }

  // example products if none exist
  let prods = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
  prods = normalizeProductImages(prods, true);
  if(prods.length === 0){
    prods = [
      { id: Date.now()+1, name:'Wireless Headphones', desc:'Comfortable over-ear Bluetooth headphones', price:1499, stock:10, image:'images/headphones.png' },
      { id: Date.now()+2, name:'Smart Watch', desc:'Track fitness & notifications', price:2499, stock:5, image:'images/watch.png' },
      { id: Date.now()+3, name:'Classic Backpack', desc:'Durable daily backpack', price:999, stock:12, image:'images/backpack.png' }
    ];
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(prods));
  }
})();

// ---------- Helpers ----------
function getUsers(){ return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); }
function setUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }

function cleanImagePath(path){
  if(!path) return '';
  let trimmed = path.trim();
  if(!trimmed) return '';
  if(/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  trimmed = trimmed.replace(/^\.\/+/, '');
  const segments = trimmed.split(/[/\\]+/).filter(Boolean);
  const imgIndex = segments.findIndex(seg => seg.toLowerCase() === 'images');
  if(imgIndex !== -1){
    const rest = segments.slice(imgIndex + 1).join('/');
    if(rest) return `images/${rest}`;
    return '';
  }
  if(/^[a-zA-Z]:/.test(trimmed) || trimmed.includes('\\')){
    const fileName = segments.pop();
    return fileName ? `images/${fileName}` : '';
  }
  if(trimmed.startsWith('/')){
    trimmed = trimmed.replace(/^\/+/, '');
  }
  if(segments.length === 1 && !trimmed.startsWith('images/')){
    return `images/${segments[0]}`;
  }
  return trimmed;
}

function normalizeProductImages(products, persist=false){
  if(!Array.isArray(products)) return [];
  let updated = false;
  const normalized = products.map(prod=>{
    if(!prod || typeof prod !== 'object') return prod;
    const normalizedImage = cleanImagePath(prod.image || '');
    if(normalizedImage !== (prod.image || '')){
      updated = true;
      return { ...prod, image: normalizedImage };
    }
    return prod;
  });
  if(updated && persist) setProducts(normalized);
  return normalized;
}

function getProducts(){
  const prods = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
  return normalizeProductImages(prods, true);
}
function setProducts(p){ localStorage.setItem(LS_PRODUCTS, JSON.stringify(p)); }

function getCurrentUser(){ return localStorage.getItem(LS_CURRENT) || null; }
function setCurrentUser(email){ if(email) localStorage.setItem(LS_CURRENT, email); else localStorage.removeItem(LS_CURRENT); }

function getCart(email){
  const key = LS_CART_PREFIX + encodeURIComponent(email);
  return JSON.parse(localStorage.getItem(key) || '[]');
}
function setCart(email, cart){ const key = LS_CART_PREFIX + encodeURIComponent(email); localStorage.setItem(key, JSON.stringify(cart)); }

// -------------- Auth (Register & Login) ----------------
function handleRegister(){
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const isAdmin = (document.getElementById('isAdmin').value === 'true');

  const alertEl = document.getElementById('regAlert');

  if(!firstName || !lastName || !email || !password || password.length < 6){
    alertEl.innerHTML = `<div class="alert alert-danger">Please fill valid details (password min 6 chars).</div>`;
    return;
  }

  const users = getUsers();
  if(users.some(u=>u.email === email)){
    alertEl.innerHTML = `<div class="alert alert-warning">Email already registered.</div>`;
    return;
  }

  users.push({ email, password, firstName, lastName, isAdmin });
  setUsers(users);
  alertEl.innerHTML = `<div class="alert alert-success">Registered successfully. Redirecting to login...</div>`;
  setTimeout(()=> location.href = 'login.html', 1000);
}

function handleLogin(){
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const alertEl = document.getElementById('loginAlert');

  if(!email || !password){
    alertEl.innerHTML = `<div class="alert alert-danger">Enter email & password.</div>`;
    return;
  }

  const users = getUsers();
  const user = users.find(u=>u.email === email && u.password === password);
  if(!user){
    alertEl.innerHTML = `<div class="alert alert-danger">Invalid credentials.</div>`;
    return;
  }

  setCurrentUser(user.email);
  alertEl.innerHTML = `<div class="alert alert-success">Login successful. Redirecting...</div>`;
  setTimeout(()=> location.href = 'products.html', 800);
}

function logout(){
  setCurrentUser(null);
  location.href = 'index.html';
}

// -------------- Product Rendering & CRUD --------------
function renderFeaturedProducts(page){
  const products = getProducts();
  const row = document.getElementById('featuredRow');
  if(!row) return;
  // show up to 3
  row.innerHTML = '';
  products.slice(0,3).forEach(prod => {
    const col = document.createElement('div');
    col.className = 'col-md-4';
    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${prod.image || './images/headphones.png'}" class="card-img-top" alt="${escapeHtml(prod.name)}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${escapeHtml(prod.name)}</h5>
          <p class="card-text text-muted small">${escapeHtml(prod.desc)}</p>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <strong>₹${prod.price}</strong>
            <a href="products.html" class="btn btn-outline-primary btn-sm shadow-sm"><span class="material-icons">storefront</span> View</a>
          </div>
        </div>
      </div>`;
    row.appendChild(col);
  });
}

function renderProducts(){
  const row = document.getElementById('productsRow');
  if(!row) return;
  const products = getProducts();
  row.innerHTML = '';
  products.forEach(prod => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4';
    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${prod.image || './images/headphones.png'}" class="card-img-top" alt="${escapeHtml(prod.name)}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${escapeHtml(prod.name)}</h5>
          <p class="card-text small text-muted">${escapeHtml(prod.desc)}</p>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <div>
              <strong>₹${prod.price}</strong><div class="small text-muted">Stock: ${prod.stock}</div>
            </div>
            <div>
              <button class="btn btn-sm btn-primary me-2" onclick="addToCart(${prod.id})"><span class="material-icons">add_shopping_cart</span></button>
              ${isCurrentAdmin() ? `<a class="btn btn-sm btn-outline-secondary me-1" href="edit-product.html?id=${prod.id}"><span class="material-icons">edit</span></a>
              <button class="btn btn-sm btn-danger" onclick="deleteProduct(${prod.id})"><span class="material-icons">delete</span></button>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    row.appendChild(col);
  });
}

function handleAddProduct(){
  const name = document.getElementById('pName').value.trim();
  const desc = document.getElementById('pDesc').value.trim();
  const price = Number(document.getElementById('pPrice').value);
  const stock = Number(document.getElementById('pStock').value);
  const image = cleanImagePath(document.getElementById('pImage').value);

  const alertEl = document.getElementById('addProdAlert');

  if(!name || isNaN(price) || isNaN(stock)){
    alertEl.innerHTML = `<div class="alert alert-danger">Please fill correct product data.</div>`;
    return;
  }

  const products = getProducts();
  const id = Date.now();
  products.push({ id, name, desc, price, stock, image });
  setProducts(products);
  alertEl.innerHTML = `<div class="alert alert-success">Product added. Redirecting...</div>`;
  setTimeout(()=> location.href = 'products.html', 800);
}

function populateEditFormFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  if(!id) return;
  const products = getProducts();
  const p = products.find(x=>x.id===id);
  if(!p){
    document.getElementById('editProdAlert').innerHTML = `<div class="alert alert-danger">Product not found.</div>`;
    return;
  }
  document.getElementById('editId').value = p.id;
  document.getElementById('editName').value = p.name;
  document.getElementById('editDesc').value = p.desc;
  document.getElementById('editPrice').value = p.price;
  document.getElementById('editStock').value = p.stock;
  document.getElementById('editImage').value = p.image || '';
}

function handleEditProduct(){
  const id = Number(document.getElementById('editId').value);
  const name = document.getElementById('editName').value.trim();
  const desc = document.getElementById('editDesc').value.trim();
  const price = Number(document.getElementById('editPrice').value);
  const stock = Number(document.getElementById('editStock').value);
  const image = cleanImagePath(document.getElementById('editImage').value);

  const alertEl = document.getElementById('editProdAlert');
  if(!name || isNaN(price) || isNaN(stock)){
    alertEl.innerHTML = `<div class="alert alert-danger">Please provide valid values.</div>`;
    return;
  }

  const products = getProducts();
  const idx = products.findIndex(p=>p.id===id);
  if(idx === -1){
    alertEl.innerHTML = `<div class="alert alert-danger">Product not found.</div>`;
    return;
  }
  products[idx] = { id, name, desc, price, stock, image };
  setProducts(products);
  alertEl.innerHTML = `<div class="alert alert-success">Product updated. Redirecting...</div>`;
  setTimeout(()=> location.href = 'products.html', 800);
}

function deleteProduct(id){
  if(!confirm('Delete product?')) return;
  let products = getProducts();
  products = products.filter(p=>p.id !== id);
  setProducts(products);
  renderProducts();
  alert('Deleted');
}

// -------------- Cart operations ---------------
function addToCart(productId){
  const email = getCurrentUser();
  if(!email){
    alert('Please login to add to cart');
    location.href = 'login.html';
    return;
  }
  const products = getProducts();
  const p = products.find(x=>x.id === productId);
  if(!p) return alert('Product not found');

  let cart = getCart(email);
  let cartItem = cart.find(it => it.id === productId);
  if(cartItem){
    cartItem.qty += 1;
  } else {
    cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
  }
  setCart(email, cart);
  updateNavCartCountUI();
  alert('Added to cart');
}

function renderCart(){
  const email = getCurrentUser();
  const container = document.getElementById('cartContainer');
  if(!container) return;
  if(!email){
    container.innerHTML = `<div class="alert alert-info">Please <a href="login.html">login</a> to view your cart.</div>`;
    return;
  }
  const cart = getCart(email);
  if(cart.length === 0){
    container.innerHTML = `<div class="alert alert-secondary">Your cart is empty. <a href="products.html">Browse products</a></div>`;
    return;
  }

  let html = `<div class="table-responsive"><table class="table align-middle"><thead><tr>
    <th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead><tbody>`;
  let total = 0;
  cart.forEach(item=>{
    const sub = item.price * item.qty;
    total += sub;
    html += `<tr>
      <td>${escapeHtml(item.name)}</td>
      <td>₹${item.price}</td>
      <td>
        <input type="number" min="1" value="${item.qty}" style="width:80px" onchange="updateCartQty(${item.id}, this.value)">
      </td>
      <td>₹${sub}</td>
      <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.id})"><span class="material-icons">delete</span></button></td>
    </tr>`;
  });
  html += `</tbody></table></div>
    <div class="d-flex justify-content-between align-items-center">
      <h5>Total: ₹${total}</h5>
      <div>
        <button class="btn btn-success me-2" onclick="checkout()">Checkout</button>
        <button class="btn btn-outline-secondary" onclick="clearCart()">Clear Cart</button>
      </div>
    </div>`;

  container.innerHTML = html;
}

function updateCartQty(productId, qty){
  const email = getCurrentUser();
  if(!email) return;
  qty = Number(qty);
  if(isNaN(qty) || qty < 1) return;
  let cart = getCart(email);
  cart = cart.map(it => it.id === productId ? {...it, qty} : it);
  setCart(email, cart);
  renderCart();
  updateNavCartCountUI();
}

function removeFromCart(productId){
  const email = getCurrentUser();
  if(!email) return;
  let cart = getCart(email);
  cart = cart.filter(it => it.id !== productId);
  setCart(email, cart);
  renderCart();
  updateNavCartCountUI();
}

function clearCart(){
  const email = getCurrentUser();
  if(!email) return;
  if(!confirm('Clear cart?')) return;
  setCart(email, []);
  renderCart();
  updateNavCartCountUI();
}

function checkout(){
  const email = getCurrentUser();
  if(!email) { alert('Login first'); return; }
  // For demo: just clear cart and show a success alert
  setCart(email, []);
  renderCart();
  updateNavCartCountUI();
  alert('Checkout successful (demo). Thank you!');
}

// -------------- Utility functions --------------
function escapeHtml(text){
  if(!text) return '';
  return text.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
}

function isCurrentAdmin(){
  const email = getCurrentUser();
  if(!email) return false;
  const users = getUsers();
  const u = users.find(x=>x.email === email);
  return u && u.isAdmin;
}

// ensure only admin can access add/edit product pages
function requireAdmin(){
  if(!isCurrentAdmin()){
    alert('Admin access only');
    location.href = 'login.html';
  }
}

// Show add product button if admin
function toggleAdminAddBtn(){
  const el = document.getElementById('addProductBtn');
  if(!el) return;
  if(isCurrentAdmin()) el.classList.remove('d-none');
  else el.classList.add('d-none');
}

// Navbar cart count helpers
function initNavCartCount(){
  updateNavCartCountUI();
}
function updateNavCartCountUI(){
  const email = getCurrentUser();
  const countEls = [document.getElementById('navCartCount'), document.getElementById('navCartCount2')];
  const cnt = email ? getCart(email).reduce((s,i)=>s+i.qty,0) : 0;
  countEls.forEach(e=>{ if(e) e.textContent = cnt; });
}

// small function to ensure counts update periodically (in case of page changes)
setInterval(()=>{ updateNavCartCountUI(); }, 1000);

// Expose a few functions globally for html inline handlers
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleAddProduct = handleAddProduct;
window.handleEditProduct = handleEditProduct;
window.renderProducts = renderProducts;
window.renderFeaturedProducts = renderFeaturedProducts;
window.addToCart = addToCart;
window.deleteProduct = deleteProduct;
window.renderCart = renderCart;
window.updateCartQty = updateCartQty;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.checkout = checkout;
window.requireAdmin = requireAdmin;
window.populateEditFormFromUrl = populateEditFormFromUrl;
window.toggleAdminAddBtn = toggleAdminAddBtn;
window.initNavCartCount = initNavCartCount;
window.logout = logout;
