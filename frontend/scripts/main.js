// ========== CONFIGURACIÓN ==========
const API_BASE_URL = 'http://localhost:5000/api';

// Variables globales
let currentUser = null;
let cart = [];
let products = [];
let currentSellerInfo = null;
let userOrders = [];

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MakeApp iniciando...');
    checkAuth();
    loadProducts();
    setupEventListeners();
    updateCartCount();
    initModals();
    setupNavigation();
});

function setupNavigation() {
    // Botón Inicio
    const homeBtn = document.getElementById('home-link');
    const mobileHomeBtn = document.getElementById('mobile-home-link');
    
    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHomePage();
        });
    }
    
    if (mobileHomeBtn) {
        mobileHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHomePage();
        });
    }
    
    // Categorías
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.querySelector('h3').textContent;
            filterByCategory(category);
        });
    });
}

function showHomePage() {
    const heroSection = document.getElementById('hero-section');
    const productsSection = document.getElementById('products-section');
    const categoriesSection = document.getElementById('categories-section');
    const userProfileSection = document.getElementById('user-profile-section');
    const userOrdersSection = document.getElementById('user-orders-section');
    const sellerPanelSection = document.getElementById('seller-panel-section');
    
    // Mostrar todas las secciones principales
    if (heroSection) heroSection.style.display = 'block';
    if (productsSection) productsSection.style.display = 'block';
    if (categoriesSection) categoriesSection.style.display = 'block';
    
    // Ocultar secciones de usuario
    if (userProfileSection) userProfileSection.style.display = 'none';
    if (userOrdersSection) userOrdersSection.style.display = 'none';
    if (sellerPanelSection) sellerPanelSection.style.display = 'none';
    
    loadProducts();
}

// Verificar autenticación
function checkAuth() {
    const userData = localStorage.getItem('makeapp_user');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            console.log('✅ Usuario encontrado:', currentUser.username);
            updateAuthUI();
            loadUserCart();
            
            // Si es vendedor, cargar información
            if (currentUser.user_type === 'seller') {
                loadSellerInfo();
            }
            
            // Cargar pedidos del usuario
            loadUserOrders();
            
        } catch (e) {
            console.error('Error parsing user data:', e);
            logout();
        }
    }
}

// ========== AUTENTICACIÓN ==========
function updateAuthUI() {
    const loginLink = document.getElementById('login-link');
    const mobileLoginLink = document.getElementById('mobile-login-link');
    const sellerLink = document.getElementById('seller-link');
    const mobileSellerLink = document.getElementById('mobile-seller-link');
    
    if (currentUser) {
        const displayName = currentUser.full_name || currentUser.username || 'Mi Cuenta';
        
        // Actualizar enlaces de login
        if (loginLink) {
            loginLink.innerHTML = `<i class="fas fa-user"></i> ${displayName}`;
            loginLink.onclick = (e) => {
                e.preventDefault();
                showUserMenu(e.target);
            };
        }
        if (mobileLoginLink) {
            mobileLoginLink.innerHTML = `<i class="fas fa-user"></i> ${displayName}`;
            mobileLoginLink.onclick = (e) => {
                e.preventDefault();
                showUserMenu(e.target);
            };
        }
        
        // Mostrar/ocultar enlaces de vendedor
        const isSeller = currentUser.user_type === 'seller';
        if (sellerLink) {
            sellerLink.style.display = isSeller ? 'flex' : 'none';
            sellerLink.onclick = (e) => {
                e.preventDefault();
                showSellerPanel();
            };
        }
        if (mobileSellerLink) {
            mobileSellerLink.style.display = isSeller ? 'flex' : 'none';
            mobileSellerLink.onclick = (e) => {
                e.preventDefault();
                showSellerPanel();
            };
        }
        
    } else {
        // Restaurar valores por defecto
        if (loginLink) {
            loginLink.innerHTML = '<i class="fas fa-user"></i> Iniciar Sesión';
            loginLink.onclick = (e) => {
                e.preventDefault();
                openModal('login-modal');
            };
        }
        if (mobileLoginLink) {
            mobileLoginLink.innerHTML = '<i class="fas fa-user"></i> Iniciar Sesión';
            mobileLoginLink.onclick = (e) => {
                e.preventDefault();
                openModal('login-modal');
            };
        }
        if (sellerLink) sellerLink.style.display = 'none';
        if (mobileSellerLink) mobileSellerLink.style.display = 'none';
    }
}

// ========== PRODUCTOS ==========
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) throw new Error('Error cargando productos');
        
        const data = await response.json();
        products = data.products || [];
        displayProducts(products);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error cargando productos', 'error');
    }
}

function displayProducts(productsList) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    productsList.forEach(product => {
        const productCard = createProductCard(product);
        container.appendChild(productCard);
    });
}

function createProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.dataset.productId = product.id;
    
    let stockText = `En stock: ${product.stock_quantity}`;
    let stockClass = 'in-stock';
    let isDisabled = product.stock_quantity <= 0;
    
    if (product.stock_quantity < 10 && product.stock_quantity > 0) {
        stockText = `Stock bajo: ${product.stock_quantity}`;
        stockClass = 'low-stock';
    } else if (product.stock_quantity === 0) {
        stockText = 'Agotado';
        stockClass = 'out-of-stock';
    }
    
    productCard.innerHTML = `
        <div class="product-image">
            <img src="${product.images || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                 alt="${product.name}" 
                 loading="lazy">
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description || 'Producto de belleza'}</p>
            <div class="product-meta">
                <span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>
                <span class="stock ${stockClass}">${stockText}</span>
            </div>
            <div class="product-seller">
                <small>Vendedor: ${product.business_name || product.seller_name || 'MakeApp'}</small>
            </div>
            <button class="add-to-cart" 
                    data-product-id="${product.id}" 
                    ${isDisabled ? 'disabled' : ''}>
                <i class="fas fa-cart-plus"></i> 
                ${isDisabled ? 'Agotado' : 'Agregar al Carrito'}
            </button>
        </div>
    `;
    
    const addToCartBtn = productCard.querySelector('.add-to-cart');
    if (addToCartBtn && !isDisabled) {
        addToCartBtn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-product-id'));
            addToCart(productId);
        });
    }
    
    return productCard;
}

// ========== CARRITO ==========
async function addToCart(productId) {
    if (!currentUser) {
        showNotification('Debes iniciar sesión para agregar productos al carrito', 'warning');
        openModal('login-modal');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                product_id: productId,
                quantity: 1
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al agregar al carrito');
        }
        
        await loadUserCart();
        
        // Efecto visual
        const button = document.querySelector(`.add-to-cart[data-product-id="${productId}"]`);
        if (button) {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> ¡Agregado!';
            button.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.backgroundColor = '';
            }, 2000);
        }
        
        showNotification('Producto agregado al carrito', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
}

async function loadUserCart() {
    if (!currentUser) {
        cart = [];
        updateCartCount();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/${currentUser.id}`);
        if (!response.ok) throw new Error('Error cargando carrito');
        
        const data = await response.json();
        cart = data.cart || [];
        updateCartCount();
        
    } catch (error) {
        console.error('Error:', error);
        cart = [];
        updateCartCount();
    }
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    const mobileCartCount = document.querySelector('.mobile-cart-count');
    
    const totalItems = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    
    if (cartCount) cartCount.textContent = totalItems;
    if (mobileCartCount) mobileCartCount.textContent = totalItems;
}

async function removeFromCart(productId) {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/${currentUser.id}/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Error eliminando del carrito');
        
        await loadUserCart(); // Recargar carrito después de eliminar
        updateCartModal();
        showNotification('Producto eliminado del carrito', 'info');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
}

function updateCartModal() {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalAmount = document.getElementById('cart-total-amount');
    
    if (!cartItemsContainer || !cartTotalAmount) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Tu carrito está vacío</h3>
                <p>Agrega algunos productos para comenzar</p>
            </div>
        `;
        cartTotalAmount.textContent = '$0.00';
        return;
    }
    
    let total = 0;
    let cartHTML = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.images || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                         alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <p class="cart-item-seller">Vendedor: ${item.business_name || 'MakeApp'}</p>
                    <p class="cart-item-price">$${parseFloat(item.price).toFixed(2)} c/u</p>
                    <div class="cart-item-quantity">
                        <span>Cantidad: ${item.quantity}</span>
                        <button onclick="removeFromCart(${item.product_id})" class="remove-item">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                    <div class="cart-item-total">
                        Subtotal: <span>$${itemTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = cartHTML;
    cartTotalAmount.textContent = `$${total.toFixed(2)}`;
}

// ========== PEDIDOS Y PAGOS ==========
async function loadUserOrders() {
    if (!currentUser) {
        userOrders = [];
        return;
    }
    
    try {
        const endpoint = currentUser.user_type === 'seller' 
            ? `${API_BASE_URL}/orders/seller/${currentUser.id}`
            : `${API_BASE_URL}/orders/user/${currentUser.id}`;
            
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Error cargando pedidos');
        
        const data = await response.json();
        userOrders = data.orders || [];
        
    } catch (error) {
        console.error('Error:', error);
        userOrders = [];
    }
}

function showCheckoutModal() {
    if (!currentUser || cart.length === 0) {
        showNotification('Carrito vacío o usuario no autenticado', 'error');
        return;
    }
    
    const checkoutHTML = `
        <div class="modal active" id="checkout-modal">
            <div class="modal-content">
                <span class="close-modal" onclick="closeModal('checkout-modal')">&times;</span>
                <h3>Finalizar Compra</h3>
                
                <form id="checkout-form">
                    <div class="form-group">
                        <label for="shipping-address">Dirección de Envío *</label>
                        <textarea id="shipping-address" rows="3" required 
                                  placeholder="Calle, número, colonia, ciudad, código postal"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="payment-method">Método de Pago *</label>
                        <select id="payment-method" required>
                            <option value="">Selecciona un método</option>
                            <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                            <option value="paypal">PayPal</option>
                            <option value="efectivo">Pago en Efectivo</option>
                        </select>
                    </div>
                    
                    <div class="order-summary">
                        <h4>Resumen del Pedido</h4>
                        ${cart.map(item => `
                            <div class="order-item">
                                <span>${item.name} x${item.quantity}</span>
                                <span>$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                        <div class="order-total">
                            <span>Total:</span>
                            <span>$${calculateCartTotal().toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-shopping-bag"></i> Confirmar Pedido
                    </button>
                </form>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = checkoutHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    document.getElementById('checkout-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const shippingAddress = document.getElementById('shipping-address').value;
        const paymentMethod = document.getElementById('payment-method').value;
        
        // Agrupar por vendedor
        const ordersBySeller = {};
        
        cart.forEach(item => {
            const sellerId = item.seller_id;
            if (!sellerId) return;
            
            if (!ordersBySeller[sellerId]) {
                ordersBySeller[sellerId] = {
                    seller_id: sellerId,
                    items: [],
                    total: 0
                };
            }
            
            ordersBySeller[sellerId].items.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price
            });
            
            ordersBySeller[sellerId].total += item.price * item.quantity;
        });
        
        try {
            // Crear órdenes para cada vendedor
            const orderPromises = Object.values(ordersBySeller).map(sellerOrder => {
                return fetch(`${API_BASE_URL}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        seller_id: sellerOrder.seller_id,
                        total_amount: sellerOrder.total,
                        shipping_address: shippingAddress,
                        payment_method: paymentMethod,
                        status: 'pending',
                        items: sellerOrder.items
                    })
                });
            });
            
            const responses = await Promise.all(orderPromises);
            const results = await Promise.all(responses.map(r => r.json()));
            
            // Verificar errores
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                throw new Error(errors[0].error || 'Error creando pedido');
            }
            
            // Limpiar carrito después de orden exitosa
            await clearCart();
            
            // Recargar pedidos
            await loadUserOrders();
            
            showNotification('¡Pedido realizado exitosamente!', 'success');
            closeModal('checkout-modal');
            
            // Mostrar confirmación
            setTimeout(() => {
                showNotification('El vendedor ha recibido tu pedido y lo procesará pronto', 'info');
            }, 1000);
            
        } catch (error) {
            console.error('Error en checkout:', error);
            showNotification(error.message, 'error');
        }
    });
}

async function clearCart() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/clear/${currentUser.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Error limpiando carrito');
        
        cart = [];
        updateCartCount();
        updateCartModal();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

function calculateCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// ========== PANEL DE VENDEDOR ==========
async function loadSellerInfo() {
    if (!currentUser || currentUser.user_type !== 'seller') return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/sellers/${currentUser.id}`);
        if (!response.ok) {
            // Si no existe, crear perfil de vendedor
            await createSellerProfile();
            return;
        }
        
        const data = await response.json();
        currentSellerInfo = data.seller || data;
        
        // Actualizar formulario de configuración
        updateSellerForm();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function createSellerProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/sellers`, {  // POST a /api/sellers
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                business_name: `${currentUser.full_name || currentUser.username}'s Store`,
                business_description: 'Tienda de productos de belleza',
                store_address: '',
                payment_methods: 'Efectivo, Tarjeta'
            })
        });
        
        if (!response.ok) throw new Error('Error creando perfil de vendedor');
        
        const data = await response.json();
        currentSellerInfo = data.seller;
        updateSellerForm();
        
        showNotification('Perfil de vendedor creado', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error creando perfil de vendedor', 'error');
    }
}

function updateSellerForm() {
    if (!currentSellerInfo) return;
    
    const businessNameInput = document.getElementById('business-name');
    const businessDescInput = document.getElementById('business-description');
    const storeAddressInput = document.getElementById('store-address');
    const paymentMethodsInput = document.getElementById('payment-methods');
    
    if (businessNameInput) businessNameInput.value = currentSellerInfo.business_name || '';
    if (businessDescInput) businessDescInput.value = currentSellerInfo.business_description || '';
    if (storeAddressInput) storeAddressInput.value = currentSellerInfo.store_address || '';
    if (paymentMethodsInput) paymentMethodsInput.value = currentSellerInfo.payment_methods || '';
}

async function loadSellerProducts() {
    if (!currentUser || currentUser.user_type !== 'seller' || !currentSellerInfo) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/seller/${currentSellerInfo.id}`);
        if (!response.ok) throw new Error('Error cargando productos del vendedor');
        
        const data = await response.json();
        displaySellerProducts(data.products || data);
        
    } catch (error) {
        console.error('Error:', error);
        displaySellerProducts([]);
    }
}

function displaySellerProducts(productsList) {
    const container = document.getElementById('seller-products-container');
    if (!container) return;
    
    if (!productsList || productsList.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <i class="fas fa-box-open"></i>
                <h4>No tienes productos aún</h4>
                <p>Comienza agregando tu primer producto</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = productsList.map(product => `
        <div class="seller-product-item">
            <div class="seller-product-image">
                <img src="${product.images || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                     alt="${product.name}">
            </div>
            <div class="seller-product-info">
                <h4>${product.name}</h4>
                <p>${product.description || 'Sin descripción'}</p>
                <div class="seller-product-meta">
                    <span class="price">$${parseFloat(product.price).toFixed(2)}</span>
                    <span class="stock">Stock: ${product.stock_quantity}</span>
                    <span class="category">${product.category || 'Sin categoría'}</span>
                </div>
            </div>
            <div class="seller-product-actions">
                <button onclick="editProduct(${product.id})" class="btn btn-small">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="updateProductStock(${product.id})" class="btn btn-small">
                    <i class="fas fa-box"></i> Stock
                </button>
            </div>
        </div>
    `).join('');
}

async function updateProductStock(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newStock = prompt(`Actualizar stock para: ${product.name}\nStock actual: ${product.stock_quantity}\n\nNuevo stock:`, product.stock_quantity);
    
    if (newStock === null) return;
    
    const stockNum = parseInt(newStock);
    if (isNaN(stockNum) || stockNum < 0) {
        showNotification('Stock inválido', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock_quantity: stockNum })
        });
        
        if (!response.ok) throw new Error('Error actualizando stock');
        
        product.stock_quantity = stockNum;
        showNotification('Stock actualizado', 'success');
        
        // Recargar productos
        if (currentUser.user_type === 'seller') {
            loadSellerProducts();
        }
        loadProducts();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error actualizando stock', 'error');
    }
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Llenar formulario con datos del producto
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock_quantity;
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-brand').value = product.brand || '';
    document.getElementById('product-images').value = product.images || '';
    
    // Cambiar a tab de productos
    const addProductTab = document.querySelector('[data-tab="add-product"]');
    if (addProductTab) addProductTab.click();
    
    showNotification(`Editando producto: ${product.name}`, 'info');
}

// ========== PERFIL DE USUARIO ==========
function showUserProfile() {
    if (!currentUser) {
        showNotification('Debes iniciar sesión para ver tu perfil', 'warning');
        openModal('login-modal');
        return;
    }
    
    const heroSection = document.getElementById('hero-section');
    const productsSection = document.getElementById('products-section');
    const categoriesSection = document.getElementById('categories-section');
    const userProfileSection = document.getElementById('user-profile-section');
    
    // Ocultar otras secciones
    if (heroSection) heroSection.style.display = 'none';
    if (productsSection) productsSection.style.display = 'none';
    if (categoriesSection) categoriesSection.style.display = 'none';
    
    // Mostrar perfil
    if (userProfileSection) {
        userProfileSection.style.display = 'block';
        displayUserProfile();
    }
}

function displayUserProfile() {
    const userProfileSection = document.getElementById('user-profile-section');
    if (!userProfileSection || !currentUser) return;
    
    userProfileSection.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <h2><i class="fas fa-user"></i> Mi Perfil</h2>
                <button onclick="showHomePage()" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
            </div>
            
            <div class="profile-card">
                <div class="profile-info">
                    <div class="profile-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="profile-details">
                        <h3>${currentUser.full_name || currentUser.username}</h3>
                        <p><i class="fas fa-envelope"></i> ${currentUser.email}</p>
                        <p><i class="fas fa-tag"></i> ${currentUser.user_type === 'seller' ? 'Vendedor' : 'Comprador'}</p>
                        <p><i class="fas fa-calendar-alt"></i> Miembro desde: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button onclick="editProfile()" class="btn btn-primary">
                        <i class="fas fa-edit"></i> Editar Perfil
                    </button>
                </div>
            </div>
            
            <div class="profile-stats">
                <div class="stat-card">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>${userOrders.length}</h3>
                    <p>Pedidos Totales</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-box"></i>
                    <h3>${cart.length}</h3>
                    <p>En Carrito</p>
                </div>
            </div>
        </div>
    `;
}

function editProfile() {
    const newName = prompt('Nuevo nombre completo:', currentUser.full_name || '');
    if (newName === null) return;
    
    if (newName.trim() === '') {
        showNotification('El nombre no puede estar vacío', 'error');
        return;
    }
    
    // Actualizar localmente
    currentUser.full_name = newName.trim();
    localStorage.setItem('makeapp_user', JSON.stringify(currentUser));
    
    // Actualizar UI
    updateAuthUI();
    displayUserProfile();
    
    showNotification('Perfil actualizado', 'success');
}

// ========== PEDIDOS DEL USUARIO ==========
function showUserOrders() {
    if (!currentUser) {
        showNotification('Debes iniciar sesión para ver tus pedidos', 'warning');
        openModal('login-modal');
        return;
    }
    
    const heroSection = document.getElementById('hero-section');
    const productsSection = document.getElementById('products-section');
    const categoriesSection = document.getElementById('categories-section');
    const userOrdersSection = document.getElementById('user-orders-section');
    const sellerPanelSection = document.getElementById('seller-panel-section');
    const userProfileSection = document.getElementById('user-profile-section');
    
    // Ocultar todas las otras secciones
    if (heroSection) heroSection.style.display = 'none';
    if (productsSection) productsSection.style.display = 'none';
    if (categoriesSection) categoriesSection.style.display = 'none';
    if (sellerPanelSection) sellerPanelSection.style.display = 'none';
    if (userProfileSection) userProfileSection.style.display = 'none';
    
    // Mostrar pedidos
    if (userOrdersSection) {
        userOrdersSection.style.display = 'block';
        displayUserOrders();
    }
}

function displayUserOrders() {
    const userOrdersSection = document.getElementById('user-orders-section');
    if (!userOrdersSection) return;
    
    // Mostrar loading mientras se cargan los pedidos
    userOrdersSection.innerHTML = `
        <div class="orders-container" style="max-width: 1200px; margin: 0 auto; padding: 20px;">
            <div class="orders-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <h2 style="margin: 0; color: #333; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-shopping-bag"></i> Mis Pedidos
                </h2>
                <button onclick="showHomePage()" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Volver al Inicio
                </button>
            </div>
            
            <div id="user-orders-list" style="min-height: 400px; display: flex; align-items: center; justify-content: center;">
                <div class="loading" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #6a5acd; margin-bottom: 15px;"></i>
                    <p style="color: #666; margin: 0;">Cargando tus pedidos...</p>
                </div>
            </div>
        </div>
    `;
    
    // Cargar pedidos del usuario
    loadUserOrdersForDisplay();
}

// Función para cargar y mostrar los pedidos del usuario
async function loadUserOrdersForDisplay() {
    if (!currentUser) return;
    
    const container = document.getElementById('user-orders-list');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/user/${currentUser.id}`);
        if (!response.ok) throw new Error('Error cargando pedidos');
        
        const data = await response.json();
        userOrders = data.orders || [];
        
        if (userOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-orders" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-shopping-bag" style="font-size: 64px; color: #ddd; margin-bottom: 20px;"></i>
                    <h3 style="color: #666; margin-bottom: 10px;">No tienes pedidos aún</h3>
                    <p style="color: #999; margin-bottom: 25px; max-width: 500px; margin-left: auto; margin-right: auto;">
                        Realiza tu primera compra para ver tus pedidos aquí
                    </p>
                    <button onclick="showHomePage()" class="btn btn-primary">
                        <i class="fas fa-shopping-cart"></i> Explorar Productos
                    </button>
                </div>
            `;
            return;
        }
        
        // Ordenar pedidos por fecha (más recientes primero)
        userOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        
        container.innerHTML = userOrders.map(order => {
            const orderDate = order.order_date ? new Date(order.order_date) : new Date();
            const statusText = getStatusText(order.status);
            const statusClass = getStatusClass(order.status);
            const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
            
            return `
                <div class="order-card" style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e9ecef;">
                    <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
                        <div>
                            <h3 style="margin: 0 0 8px 0; color: #333;">Orden #${order.id}</h3>
                            <div style="display: flex; align-items: center; gap: 15px; color: #666; font-size: 14px;">
                                <span style="display: flex; align-items: center; gap: 5px;">
                                    <i class="fas fa-calendar"></i>
                                    ${orderDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                                <span style="display: flex; align-items: center; gap: 5px;">
                                    <i class="fas fa-clock"></i>
                                    ${orderDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span class="order-status ${statusClass}" style="padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; display: inline-block;">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px;">
                        <div class="order-info" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-store"></i> Vendedor
                            </h4>
                            <p style="margin: 0; color: #333; font-weight: 500;">${order.business_name || 'Tienda'}</p>
                        </div>
                        
                        <div class="order-info" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-money-bill-wave"></i> Total
                            </h4>
                            <p style="margin: 0; color: #333; font-weight: 500; font-size: 20px;">$${parseFloat(order.total_amount).toFixed(2)}</p>
                        </div>
                        
                        <div class="order-info" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-credit-card"></i> Método de Pago
                            </h4>
                            <p style="margin: 0; color: #333; font-weight: 500;">${getPaymentMethodText(order.payment_method)}</p>
                        </div>
                        
                        <div class="order-info" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-truck"></i> Dirección de Envío
                            </h4>
                            <p style="margin: 0; color: #333; font-weight: 500; font-size: 14px; line-height: 1.4;">
                                ${order.shipping_address || 'No especificada'}
                            </p>
                        </div>
                    </div>
                    
                    ${order.items && order.items.length > 0 ? `
                        <div class="order-products" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0;">
                            <h4 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-box"></i> Productos (${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'})
                            </h4>
                            <div style="max-height: 250px; overflow-y: auto; padding-right: 10px;">
                                ${order.items.map(item => `
                                    <div class="order-item" style="display: flex; align-items: center; gap: 15px; padding: 12px; background: white; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 10px;">
                                        <div style="width: 60px; height: 60px; overflow: hidden; border-radius: 6px; flex-shrink: 0;">
                                            <img src="${item.image || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                                                 alt="${item.product_name}" 
                                                 style="width: 100%; height: 100%; object-fit: cover;">
                                        </div>
                                        <div style="flex: 1;">
                                            <h5 style="margin: 0 0 5px 0; color: #333; font-size: 14px;">${item.product_name}</h5>
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <div style="color: #666; font-size: 13px;">
                                                    <span>Cantidad: ${item.quantity}</span>
                                                    <span style="margin-left: 15px;">$${parseFloat(item.price).toFixed(2)} c/u</span>
                                                </div>
                                                <div style="font-weight: 500; color: #333;">
                                                    $${parseFloat(item.price * item.quantity).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Acciones según el estado -->
                    <div class="order-actions" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #f0f0f0; display: flex; gap: 10px; justify-content: flex-end;">
                        ${getUserActionButtons(order.id, order.status)}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        container.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 40px; color: #721c24; background: #f8d7da; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <h3 style="margin: 0 0 10px 0;">Error cargando pedidos</h3>
                <p style="margin: 0 0 20px 0;">${error.message}</p>
                <button onclick="loadUserOrdersForDisplay()" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Función para obtener botones de acción del usuario según estado
function getUserActionButtons(orderId, status) {
    switch(status) {
        case 'pending':
            return `
                <button onclick="cancelUserOrder(${orderId})" class="btn btn-danger">
                    <i class="fas fa-times"></i> Cancelar Pedido
                </button>
                <button onclick="contactSeller(${orderId})" class="btn btn-secondary">
                    <i class="fas fa-envelope"></i> Contactar Vendedor
                </button>
            `;
        
        case 'processing':
            return `
                <button onclick="contactSeller(${orderId})" class="btn btn-secondary">
                    <i class="fas fa-envelope"></i> Contactar Vendedor
                </button>
                <button onclick="askForTracking(${orderId})" class="btn btn-primary">
                    <i class="fas fa-truck"></i> Consultar Envío
                </button>
            `;
        
        case 'shipped':
            return `
                <button onclick="markAsDelivered(${orderId})" class="btn btn-success">
                    <i class="fas fa-check-circle"></i> Marcar como Recibido
                </button>
                <button onclick="trackPackage(${orderId})" class="btn btn-primary">
                    <i class="fas fa-map-marker-alt"></i> Rastrear Paquete
                </button>
            `;
        
        case 'delivered':
            return `
                <button onclick="leaveReview(${orderId})" class="btn btn-primary">
                    <i class="fas fa-star"></i> Dejar Reseña
                </button>
                <button onclick="reorder(${orderId})" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> Volver a Pedir
                </button>
            `;
        
        case 'cancelled':
            return `
                <button onclick="showOrderDetails(${orderId})" class="btn btn-secondary">
                    <i class="fas fa-info-circle"></i> Ver Detalles
                </button>
                <button onclick="contactSupport(${orderId})" class="btn btn-primary">
                    <i class="fas fa-headset"></i> Soporte
                </button>
            `;
        
        default:
            return `
                <button onclick="contactSeller(${orderId})" class="btn btn-secondary">
                    <i class="fas fa-envelope"></i> Contactar Vendedor
                </button>
            `;
    }
}

// ========== ACCIONES DEL CLIENTE ==========

// Cancelar pedido (cliente)
async function cancelUserOrder(orderId) {
    if (!confirm(`¿Estás seguro de que quieres cancelar el pedido #${orderId}?\n\nSolo puedes cancelar pedidos en estado "Pendiente".`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error cancelando pedido');
        }
        
        showNotification(`Pedido #${orderId} cancelado`, 'success');
        
        // Recargar la lista de pedidos
        await loadUserOrdersForDisplay();
        
    } catch (error) {
        console.error('Error cancelando pedido:', error);
        showNotification(error.message, 'error');
    }
}

// Contactar vendedor
function contactSeller(orderId) {
    // Buscar la orden para obtener info del vendedor
    const order = userOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const sellerName = order.business_name || 'el vendedor';
    const modalHTML = `
        <div class="modal active" id="contact-seller-modal">
            <div class="modal-content" style="max-width: 500px;">
                <span class="close-modal" onclick="closeModal('contact-seller-modal')">&times;</span>
                <h3><i class="fas fa-envelope"></i> Contactar Vendedor</h3>
                <p style="color: #666; margin-bottom: 20px;">
                    Enviar mensaje a ${sellerName} sobre el pedido #${orderId}
                </p>
                
                <form id="contact-seller-form">
                    <div class="form-group">
                        <label for="contact-subject">Asunto</label>
                        <input type="text" id="contact-subject" required 
                               value="Consulta sobre pedido #${orderId}">
                    </div>
                    
                    <div class="form-group">
                        <label for="contact-message">Mensaje *</label>
                        <textarea id="contact-message" rows="5" required 
                                  placeholder="Escribe tu mensaje aquí..."></textarea>
                    </div>
                    
                    <div style="margin-top: 25px; display: flex; gap: 10px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-paper-plane"></i> Enviar Mensaje
                        </button>
                        <button type="button" onclick="closeModal('contact-seller-modal')" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    document.getElementById('contact-seller-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const subject = document.getElementById('contact-subject').value;
        const message = document.getElementById('contact-message').value;
        
        try {
            // Simular envío de mensaje
            console.log('Mensaje al vendedor:', { orderId, subject, message });
            
            showNotification('Mensaje enviado al vendedor', 'success');
            closeModal('contact-seller-modal');
            
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            showNotification('Error enviando mensaje', 'error');
        }
    });
}

// Marcar como recibido
async function markAsDelivered(orderId) {
    if (!confirm(`¿Confirmas que has recibido el pedido #${orderId}?\n\nEsto completará tu compra.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'delivered' })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error actualizando estado');
        }
        
        showNotification(`¡Gracias! Pedido #${orderId} marcado como recibido`, 'success');
        
        // Mostrar modal para dejar reseña
        setTimeout(() => {
            showReviewModalForUser(orderId);
        }, 1000);
        
        // Recargar pedidos
        await loadUserOrdersForDisplay();
        
    } catch (error) {
        console.error('Error marcando como recibido:', error);
        showNotification(error.message, 'error');
    }
}

// Modal para dejar reseña
function showReviewModalForUser(orderId) {
    const modalHTML = `
        <div class="modal active" id="user-review-modal">
            <div class="modal-content" style="max-width: 500px;">
                <span class="close-modal" onclick="closeModal('user-review-modal')">&times;</span>
                <h3><i class="fas fa-star"></i> Califica tu Compra</h3>
                <p style="color: #666; margin-bottom: 20px;">
                    ¡Gracias por tu compra! ¿Cómo calificarías el pedido #${orderId}?
                </p>
                
                <form id="user-review-form">
                    <div class="form-group" style="text-align: center; margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500;">Calificación</label>
                        <div class="star-rating" style="display: inline-flex; flex-direction: row-reverse; gap: 5px;">
                            ${[5,4,3,2,1].map(num => `
                                <input type="radio" id="star${num}" name="rating" value="${num}" ${num === 5 ? 'checked' : ''}>
                                <label for="star${num}" style="font-size: 30px; color: #ddd; cursor: pointer;">★</label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="review-title">Título de la reseña</label>
                        <input type="text" id="review-title" placeholder="Ej: Excelente producto, llegó rápido">
                    </div>
                    
                    <div class="form-group">
                        <label for="review-comment">Comentario</label>
                        <textarea id="review-comment" rows="4" placeholder="Comparte tu experiencia..."></textarea>
                    </div>
                    
                    <div style="margin-top: 25px; display: flex; gap: 10px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-check"></i> Enviar Reseña
                        </button>
                        <button type="button" onclick="closeModal('user-review-modal')" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Ahora no
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <style>
            .star-rating input[type="radio"] { display: none; }
            .star-rating label:hover,
            .star-rating label:hover ~ label,
            .star-rating input[type="radio"]:checked ~ label {
                color: #ffc107;
            }
        </style>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    document.getElementById('user-review-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const rating = document.querySelector('input[name="rating"]:checked').value;
        const title = document.getElementById('review-title').value;
        const comment = document.getElementById('review-comment').value;
        
        try {
            // Simular envío de reseña
            console.log('Reseña enviada:', { orderId, rating, title, comment });
            
            showNotification('¡Gracias por tu reseña!', 'success');
            closeModal('user-review-modal');
            
        } catch (error) {
            console.error('Error enviando reseña:', error);
            showNotification('Error enviando reseña', 'error');
        }
    });
}

// Consultar envío
function askForTracking(orderId) {
    showNotification('Solicitud de información de envío enviada al vendedor', 'info');
}

// Rastrear paquete
function trackPackage(orderId) {
    window.open(`https://www.google.com/search?q=rastrear+paquete+${orderId}`, '_blank');
}

// Dejar reseña
function leaveReview(orderId) {
    showReviewModalForUser(orderId);
}

// Volver a pedir
async function reorder(orderId) {
    const order = userOrders.find(o => o.id === orderId);
    if (!order || !order.items) return;
    
    if (confirm(`¿Quieres volver a pedir los ${order.items.length} productos de esta orden?`)) {
        try {
            // Agregar cada producto al carrito
            for (const item of order.items) {
                await addToCart(item.product_id);
            }
            
            showNotification('Productos agregados al carrito', 'success');
            
            // Mostrar carrito
            setTimeout(() => {
                openModal('cart-modal');
            }, 1000);
            
        } catch (error) {
            console.error('Error reordenando:', error);
            showNotification('Error al reordenar', 'error');
        }
    }
}

// Ver detalles
function showOrderDetails(orderId) {
    const order = userOrders.find(o => o.id === orderId);
    if (!order) return;
    
    alert(`Detalles del pedido #${orderId}\n\n` +
          `Estado: ${getStatusText(order.status)}\n` +
          `Total: $${order.total_amount}\n` +
          `Fecha: ${new Date(order.order_date).toLocaleDateString()}\n` +
          `Vendedor: ${order.business_name || 'No especificado'}`);
}

// Contactar soporte
function contactSupport(orderId) {
    window.open(`mailto:soporte@makeapp.com?subject=Soporte Pedido #${orderId}&body=Necesito ayuda con mi pedido #${orderId}`, '_blank');
}

// Función para texto de método de pago
function getPaymentMethodText(method) {
    const methods = {
        'tarjeta': 'Tarjeta de Crédito/Débito',
        'paypal': 'PayPal',
        'efectivo': 'Pago en Efectivo',
        'transferencia': 'Transferencia Bancaria'
    };
    return methods[method] || method || 'No especificado';
}

function getStatusClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'processing': 'status-processing',
        'shipped': 'status-shipped',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'processing': 'En Proceso',
        'shipped': 'Enviado',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

async function cancelOrder(orderId) {
    if (!confirm('¿Estás seguro de que quieres cancelar este pedido?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (!response.ok) throw new Error('Error cancelando pedido');
        
        // Recargar pedidos
        await loadUserOrders();
        displayUserOrders();
        
        showNotification('Pedido cancelado', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error cancelando pedido', 'error');
    }
}

// ========== PANEL DE VENDEDOR (COMPLETO) ==========
function showSellerPanel() {
    if (!currentUser) {
        showNotification('Debes iniciar sesión como vendedor', 'warning');
        openModal('login-modal');
        return;
    }
    
    if (currentUser.user_type !== 'seller') {
        showNotification('Debes ser vendedor para acceder a esta sección', 'warning');
        return;
    }
    
    const heroSection = document.getElementById('hero-section');
    const productsSection = document.getElementById('products-section');
    const categoriesSection = document.getElementById('categories-section');
    const sellerPanelSection = document.getElementById('seller-panel-section');
    
    // Ocultar otras secciones
    if (heroSection) heroSection.style.display = 'none';
    if (productsSection) productsSection.style.display = 'none';
    if (categoriesSection) categoriesSection.style.display = 'none';
    
    // Mostrar panel de vendedor
    if (sellerPanelSection) {
        sellerPanelSection.style.display = 'block';
        displaySellerPanel();
    }
}

function displaySellerPanel() {
    const sellerPanelSection = document.getElementById('seller-panel-section');
    if (!sellerPanelSection || !currentSellerInfo) return;
    
    sellerPanelSection.innerHTML = `
        <div class="seller-panel-container">
            <!-- Header -->
            <div class="seller-panel-header">
                <h2><i class="fas fa-store"></i> Panel de Vendedor</h2>
                <button onclick="showHomePage()" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Volver al Inicio
                </button>
            </div>
            
            <!-- Información del vendedor -->
            <div class="seller-info-card" style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 15px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6a5acd, #ff6b9d); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
                        <i class="fas fa-store"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0 0 5px 0; color: #333;">${currentSellerInfo.business_name || 'Mi Tienda'}</h3>
                        <p style="margin: 0; color: #666; font-size: 14px;"><i class="fas fa-user"></i> ${currentUser.full_name || currentUser.username}</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <i class="fas fa-box" style="color: #6a5acd; font-size: 24px; margin-bottom: 10px;"></i>
                        <h4 style="margin: 0; font-size: 24px; color: #333;" id="product-count">0</h4>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Productos</p>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <i class="fas fa-shopping-bag" style="color: #28a745; font-size: 24px; margin-bottom: 10px;"></i>
                        <h4 style="margin: 0; font-size: 24px; color: #333;" id="sales-count">0</h4>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Ventas</p>
                    </div>
                    <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <i class="fas fa-star" style="color: #ffc107; font-size: 24px; margin-bottom: 10px;"></i>
                        <h4 style="margin: 0; font-size: 24px; color: #333;">${currentSellerInfo.rating || '0.00'}</h4>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Calificación</p>
                    </div>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="seller-tabs-container">
                <!-- Navegación de tabs -->
                <div class="tabs-nav">
                    <button class="tab-button active" data-tab="products">
                        <i class="fas fa-box"></i> Mis Productos
                    </button>
                    <button class="tab-button" data-tab="orders">
                        <i class="fas fa-shopping-bag"></i> Mis Ventas
                    </button>
                    <button class="tab-button" data-tab="add">
                        <i class="fas fa-plus"></i> Agregar Producto
                    </button>
                    <button class="tab-button" data-tab="settings">
                        <i class="fas fa-cog"></i> Configuración
                    </button>
                </div>
                
                <!-- Contenido de tabs -->
                <div class="tabs-content">
                    <!-- Tab: Productos -->
                    <div id="products-tab" class="tab-panel active">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h3 style="margin: 0; color: #333;">Mis Productos</h3>
                            <button class="btn btn-primary" data-tab="add">
                                <i class="fas fa-plus"></i> Nuevo Producto
                            </button>
                        </div>
                        <div id="seller-products-list" class="products-grid">
                            <div class="loading">
                                <i class="fas fa-spinner"></i> Cargando productos...
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Ventas -->
                    <div id="orders-tab" class="tab-panel">
                        <h3 style="margin: 0 0 20px 0; color: #333;">Mis Ventas</h3>
                        <div id="seller-orders-list" class="orders-list">
                            <div class="loading">
                                <i class="fas fa-spinner"></i> Cargando ventas...
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Agregar Producto -->
                    <div id="add-tab" class="tab-panel">
                        <h3 style="margin: 0 0 20px 0; color: #333;">Agregar Nuevo Producto</h3>
                        <form id="add-product-form" class="seller-form">
                            <div class="form-group">
                                <label for="product-name">Nombre del Producto *</label>
                                <input type="text" id="product-name" required placeholder="Ej: Labial Rojo Intenso">
                            </div>
                            
                            <div class="form-group">
                                <label for="product-description">Descripción *</label>
                                <textarea id="product-description" rows="4" required placeholder="Describe tu producto..."></textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="product-price">Precio ($) *</label>
                                    <input type="number" id="product-price" step="0.01" min="0" required placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label for="product-stock">Stock *</label>
                                    <input type="number" id="product-stock" min="0" required placeholder="Cantidad disponible">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="product-category">Categoría *</label>
                                <select id="product-category" required>
                                    <option value="">Selecciona una categoría</option>
                                    <option value="labios">Labiales</option>
                                    <option value="ojos">Ojos</option>
                                    <option value="rostro">Rostro</option>
                                    <option value="piel">Cuidado de la Piel</option>
                                    <option value="fragancias">Fragancias</option>
                                    <option value="accesorios">Accesorios</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="product-brand">Marca (opcional)</label>
                                <input type="text" id="product-brand" placeholder="Ej: Maybelline, L'Oréal">
                            </div>
                            
                            <div class="form-group">
                                <label for="product-images">URL de Imagen (opcional)</label>
                                <input type="text" id="product-images" placeholder="https://ejemplo.com/imagen.jpg">
                                <small style="color: #666; display: block; margin-top: 5px;">
                                    Deja vacío para usar imagen por defecto
                                </small>
                            </div>
                            
                            <div style="display: flex; gap: 10px; margin-top: 30px;">
                                <button type="submit" class="btn btn-primary btn-block">
                                    <i class="fas fa-check"></i> Publicar Producto
                                </button>
                                <button type="button" class="btn btn-secondary" data-tab="products">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                    
                    <!-- Tab: Configuración -->
                    <div id="settings-tab" class="tab-panel">
                        <h3 style="margin: 0 0 20px 0; color: #333;">Configuración de Tienda</h3>
                        <form id="seller-settings-form" class="seller-form">
                            <div class="form-group">
                                <label for="business-name">Nombre de la Tienda *</label>
                                <input type="text" id="business-name" value="${currentSellerInfo.business_name || ''}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="business-description">Descripción de la Tienda</label>
                                <textarea id="business-description" rows="3">${currentSellerInfo.business_description || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="store-address">Dirección de la Tienda</label>
                                <textarea id="store-address" rows="2">${currentSellerInfo.store_address || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="payment-methods">Métodos de Pago Aceptados</label>
                                <input type="text" id="payment-methods" value="${currentSellerInfo.payment_methods || ''}" placeholder="Efectivo, Tarjeta, PayPal">
                                <small style="color: #666; display: block; margin-top: 5px;">
                                    Separa con comas los métodos de pago
                                </small>
                            </div>
                            
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Configurar event listeners para los tabs
    setupSellerTabs();
    
    // Configurar formularios
    setupSellerForms();
    
    // Cargar datos iniciales
    loadSellerProducts();
    loadSellerOrders();
    updateSellerStats();
}

async function loadSellerOrders() {
    if (!currentSellerInfo) return;
    
    const container = document.getElementById('seller-orders-list');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/seller/${currentSellerInfo.id}`);
        if (!response.ok) throw new Error('Error cargando ventas');
        
        const data = await response.json();
        const orders = data.orders || [];
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>No tienes ventas</h3>
                    <p>Aún no has recibido ninguna orden</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map(order => {
            const orderDate = order.order_date ? new Date(order.order_date) : new Date();
            const statusText = getStatusText(order.status);
            const statusClass = getStatusClass(order.status);
            
            return `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Orden #${order.id}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                <i class="fas fa-calendar"></i> ${orderDate.toLocaleDateString()} 
                                <i class="fas fa-clock" style="margin-left: 10px;"></i> ${orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                        <div class="order-status ${statusClass}">
                            ${statusText}
                        </div>
                    </div>
                    
                    <div class="order-details">
                        <div class="order-detail">
                            <strong>Cliente</strong>
                            <span>${order.buyer_name || 'Cliente'}</span>
                        </div>
                        <div class="order-detail">
                            <strong>Total</strong>
                            <span>$${parseFloat(order.total_amount).toFixed(2)}</span>
                        </div>
                        <div class="order-detail">
                            <strong>Pago</strong>
                            <span>${order.payment_method || 'No especificado'}</span>
                        </div>
                        <div class="order-detail">
                            <strong>Dirección</strong>
                            <span>${order.shipping_address ? order.shipping_address.substring(0, 30) + '...' : 'No especificada'}</span>
                        </div>
                    </div>
                    
                    ${order.items && order.items.length > 0 ? `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">
                                <i class="fas fa-box"></i> Productos (${order.items.length})
                            </h4>
                            <div style="max-height: 150px; overflow-y: auto;">
                                ${order.items.map(item => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px; font-size: 13px;">
                                        <div>
                                            <span style="font-weight: 500;">${item.product_name || 'Producto'}</span>
                                            <span style="color: #666; margin-left: 10px;">x${item.quantity}</span>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: 500;">$${parseFloat(item.price * item.quantity).toFixed(2)}</div>
                                            <div style="font-size: 11px; color: #666;">$${parseFloat(item.price).toFixed(2)} c/u</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Botones de acción según el estado -->
                    <div class="order-actions" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef; display: flex; gap: 10px; justify-content: flex-end;">
                        ${getActionButtons(order.id, order.status)}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        container.innerHTML = `
            <div class="no-content" style="color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error cargando ventas</h3>
                <p>${error.message}</p>
                <button onclick="loadSellerOrders()" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Función para obtener botones de acción según el estado
function getActionButtons(orderId, status) {
    switch(status) {
        case 'pending':
            return `
                <button onclick="cancelOrder(${orderId})" class="btn btn-small btn-danger">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button onclick="updateOrderStatus(${orderId}, 'processing')" class="btn btn-small btn-primary">
                    <i class="fas fa-check"></i> Procesar
                </button>
            `;
        
        case 'processing':
            return `
                <button onclick="updateOrderStatus(${orderId}, 'shipped')" class="btn btn-small btn-primary">
                    <i class="fas fa-shipping-fast"></i> Marcar como Enviado
                </button>
                <button onclick="updateOrderStatus(${orderId}, 'cancelled')" class="btn btn-small btn-danger">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            `;
        
        case 'shipped':
            return `
                <button onclick="updateOrderStatus(${orderId}, 'delivered')" class="btn btn-small btn-success">
                    <i class="fas fa-check-circle"></i> Marcar como Entregado
                </button>
                <button onclick="showTrackingModal(${orderId})" class="btn btn-small btn-secondary">
                    <i class="fas fa-truck"></i> Agregar Seguimiento
                </button>
            `;
        
        case 'delivered':
            return `
                <button onclick="showReviewModal(${orderId})" class="btn btn-small btn-secondary">
                    <i class="fas fa-star"></i> Ver Reseña
                </button>
            `;
        
        case 'cancelled':
            return `
                <button onclick="reactivateOrder(${orderId})" class="btn btn-small btn-secondary">
                    <i class="fas fa-redo"></i> Reactivar
                </button>
            `;
        
        default:
            return '';
    }
}

// Función para obtener clase CSS según el estado
function getStatusClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'processing': 'status-processing',
        'shipped': 'status-shipped',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
}

// Función para configurar los tabs
function setupSellerTabs() {
    // Botones de los tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Actualizar botones activos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Actualizar paneles activos
            tabPanels.forEach(panel => panel.classList.remove('active'));
            const activePanel = document.getElementById(`${tabId}-tab`);
            if (activePanel) {
                activePanel.classList.add('active');
                
                // Cargar contenido según el tab
                switch(tabId) {
                    case 'products':
                        loadSellerProducts();
                        break;
                    case 'orders':
                        loadSellerOrders();
                        break;
                    case 'add':
                        // Resetear formulario
                        const addForm = document.getElementById('add-product-form');
                        if (addForm) addForm.reset();
                        break;
                }
            }
        });
    });
    
    // También configurar botones que cambian de tab
    document.querySelectorAll('[data-tab]').forEach(element => {
        if (element.tagName === 'BUTTON' && element !== tabButtons) {
            element.addEventListener('click', () => {
                const tabId = element.getAttribute('data-tab');
                const targetButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
                if (targetButton) targetButton.click();
            });
        }
    });
}

// Función simplificada para cargar productos
async function loadSellerProducts() {
    if (!currentSellerInfo) return;
    
    const container = document.getElementById('seller-products-list');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/seller/${currentSellerInfo.id}`);
        if (!response.ok) throw new Error('Error cargando productos');
        
        const data = await response.json();
        const products = data.products || [];
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="no-content" style="grid-column: 1/-1;">
                    <i class="fas fa-box-open"></i>
                    <h3>No tienes productos</h3>
                    <p>Aún no has publicado ningún producto</p>
                    <button class="btn btn-primary" data-tab="add">
                        <i class="fas fa-plus"></i> Agregar Primer Producto
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.images || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                         alt="${product.name}"
                         onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description || 'Sin descripción'}</p>
                    <div class="product-meta">
                        <span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>
                        <span class="product-stock ${product.stock_quantity > 0 ? 'in-stock' : 'out-stock'}">
                            ${product.stock_quantity > 0 ? `Stock: ${product.stock_quantity}` : 'Agotado'}
                        </span>
                    </div>
                    <div class="product-actions">
                        <button onclick="editProduct(${product.id})" class="btn btn-small btn-secondary">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="deleteProduct(${product.id})" class="btn btn-small btn-danger">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        container.innerHTML = `
            <div class="no-content" style="grid-column: 1/-1; color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error cargando productos</h3>
                <p>${error.message}</p>
                <button onclick="loadSellerProducts()" class="btn btn-secondary">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Nueva función para actualizar estadísticas
async function updateSellerStats() {
    if (!currentSellerInfo) return;
    
    try {
        // Contar productos
        const productsResponse = await fetch(`${API_BASE_URL}/products/seller/${currentSellerInfo.id}`);
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            const productCount = productsData.products ? productsData.products.length : 0;
            const productCountElement = document.getElementById('product-count');
            if (productCountElement) productCountElement.textContent = productCount;
        }
        
        // Contar ventas
        const ordersResponse = await fetch(`${API_BASE_URL}/orders/seller/${currentSellerInfo.id}`);
        if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            const salesCount = ordersData.orders ? ordersData.orders.length : 0;
            const salesCountElement = document.getElementById('sales-count');
            if (salesCountElement) salesCountElement.textContent = salesCount;
        }
        
    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
    }
}

function showSellerTab(tabName, event) {
    // Si se llama desde onclick, usar el event
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Actualizar botones de tabs
    document.querySelectorAll('.seller-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activar el botón clickeado
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // O encontrar el botón por el tabName
        const targetBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if (targetBtn) targetBtn.classList.add('active');
    }
    
    // Ocultar todos los paneles
    document.querySelectorAll('.seller-tabs .tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Mostrar el panel correspondiente
    const targetPane = document.getElementById(`${tabName}-tab`);
    if (targetPane) {
        targetPane.classList.add('active');
        
        // Cargar contenido según el tab
        switch(tabName) {
            case 'products':
                loadSellerProductsForPanel();
                break;
            case 'orders':
                loadSellerOrdersForPanel();
                break;
            case 'add':
                // Resetear formulario
                const addForm = document.getElementById('add-product-form');
                if (addForm) addForm.reset();
                break;
            case 'settings':
                // Ya debería estar cargado
                break;
        }
    }
}

async function loadSellerOrdersForPanel() {
    if (!currentSellerInfo) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/seller/${currentSellerInfo.id}`);
        if (!response.ok) throw new Error('Error cargando ventas');
        
        const data = await response.json();
        const ordersList = data.orders || [];
        
        const container = document.getElementById('seller-orders-list');
        if (!container) return;
        
        if (ordersList.length === 0) {
            container.innerHTML = `
                <div class="no-orders" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-shopping-bag" style="font-size: 48px; color: #ddd; margin-bottom: 15px;"></i>
                    <h4 style="margin-bottom: 10px;">No tienes ventas aún</h4>
                    <p style="margin-bottom: 20px;">Cuando los clientes compren tus productos, aparecerán aquí</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = ordersList.map(order => `
            <div class="order-item" style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px; border: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #dee2e6;">
                    <div>
                        <h4 style="margin: 0; color: #333;">Orden #${order.id}</h4>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                            <i class="fas fa-user"></i> ${order.buyer_name || 'Cliente'}
                        </p>
                    </div>
                    <span style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #${order.status === 'delivered' ? 'd4edda' : order.status === 'shipped' ? 'cce5ff' : order.status === 'processing' ? 'fff3cd' : 'f8d7da'}; color: #${order.status === 'delivered' ? '155724' : order.status === 'shipped' ? '004085' : order.status === 'processing' ? '856404' : '721c24'};">
                        ${getStatusText(order.status)}
                    </span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                    <div>
                        <p style="margin: 5px 0; color: #666;"><strong>Total:</strong> $${parseFloat(order.total_amount).toFixed(2)}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Fecha:</strong> ${new Date(order.order_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p style="margin: 5px 0; color: #666;"><strong>Pago:</strong> ${order.payment_method || 'No especificado'}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Dirección:</strong> ${order.shipping_address || 'No especificada'}</p>
                    </div>
                </div>
                
                ${order.items && order.items.length > 0 ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                        <h5 style="margin: 0 0 10px 0; color: #333;">Productos:</h5>
                        ${order.items.map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border-radius: 4px; margin-bottom: 5px;">
                                <div>
                                    <span style="font-weight: 500;">${item.product_name}</span>
                                    <span style="color: #666; font-size: 14px;"> x${item.quantity}</span>
                                </div>
                                <span style="font-weight: 500;">$${parseFloat(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${order.status === 'pending' ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; text-align: right;">
                        <button onclick="updateOrderStatus(${order.id}, 'processing')" class="btn btn-small" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            <i class="fas fa-check"></i> Procesar
                        </button>
                    </div>
                ` : order.status === 'processing' ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; text-align: right;">
                        <button onclick="updateOrderStatus(${order.id}, 'shipped')" class="btn btn-small" style="background: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            <i class="fas fa-shipping-fast"></i> Marcar como Enviado
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        const container = document.getElementById('seller-orders-list');
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px; color: #721c24; background: #f8d7da; border-radius: 8px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <h4>Error cargando ventas</h4>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

// Función auxiliar para actualizar estado de orden
async function updateOrderStatus(orderId, newStatus) {
    if (!confirm(getConfirmationMessage(orderId, newStatus))) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error actualizando estado');
        }
        
        showNotification(`Orden #${orderId} actualizada a: ${getStatusText(newStatus)}`, 'success');
        
        // Recargar la lista de ventas
        await loadSellerOrders();
        
        // Si se marcó como entregado, mostrar modal de reseña
        if (newStatus === 'delivered') {
            setTimeout(() => {
                showReviewModal(orderId);
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error actualizando estado:', error);
        showNotification(error.message, 'error');
    }
}

// Función para cancelar orden
async function cancelOrder(orderId) {
    if (!confirm(`¿Estás seguro de que quieres cancelar la orden #${orderId}?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error cancelando orden');
        }
        
        showNotification(`Orden #${orderId} cancelada`, 'success');
        await loadSellerOrders();
        
    } catch (error) {
        console.error('Error cancelando orden:', error);
        showNotification(error.message, 'error');
    }
}

// Función para reactivar orden cancelada
async function reactivateOrder(orderId) {
    if (!confirm(`¿Quieres reactivar la orden #${orderId}?\n\nEl estado cambiará a "Pendiente".`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'pending' })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error reactivando orden');
        }
        
        showNotification(`Orden #${orderId} reactivada`, 'success');
        await loadSellerOrders();
        
    } catch (error) {
        console.error('Error reactivando orden:', error);
        showNotification(error.message, 'error');
    }
}

// Función para obtener mensaje de confirmación según el estado
function getConfirmationMessage(orderId, newStatus) {
    const messages = {
        'processing': `¿Confirmas que has comenzado a procesar la orden #${orderId}?\n\nEl cliente será notificado.`,
        'shipped': `¿Confirmas que has enviado la orden #${orderId}?\n\nEl cliente recibirá una notificación de envío.`,
        'delivered': `¿Confirmas que la orden #${orderId} ha sido entregada?\n\nEl pedido se marcará como completado.`,
        'cancelled': `¿Estás seguro de cancelar la orden #${orderId}?\n\nEsta acción notificará al cliente.`
    };
    
    return messages[newStatus] || `¿Confirmas cambiar el estado de la orden #${orderId}?`;
}

function showTrackingModal(orderId) {
    const modalHTML = `
        <div class="modal active" id="tracking-modal">
            <div class="modal-content" style="max-width: 500px;">
                <span class="close-modal" onclick="closeModal('tracking-modal')">&times;</span>
                <h3><i class="fas fa-truck"></i> Información de Envío</h3>
                <p style="color: #666; margin-bottom: 20px;">Agrega los detalles del envío para la orden #${orderId}</p>
                
                <form id="tracking-form">
                    <div class="form-group">
                        <label for="tracking-number">Número de Seguimiento</label>
                        <input type="text" id="tracking-number" placeholder="Ej: RA123456789MX">
                    </div>
                    
                    <div class="form-group">
                        <label for="shipping-company">Empresa de Envío</label>
                        <select id="shipping-company">
                            <option value="">Selecciona una opción</option>
                            <option value="fedex">FedEx</option>
                            <option value="dhl">DHL</option>
                            <option value="ups">UPS</option>
                            <option value="estafeta">Estafeta</option>
                            <option value="correos">Correos de México</option>
                            <option value="otra">Otra</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="estimated-delivery">Fecha Estimada de Entrega</label>
                        <input type="date" id="estimated-delivery">
                    </div>
                    
                    <div class="form-group">
                        <label for="shipping-notes">Notas Adicionales</label>
                        <textarea id="shipping-notes" rows="3" placeholder="Información adicional para el cliente..."></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 25px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-save"></i> Guardar Información
                        </button>
                        <button type="button" onclick="closeModal('tracking-modal')" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Configurar fecha mínima (mañana)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dateInput = document.getElementById('estimated-delivery');
    if (dateInput) {
        dateInput.min = tomorrowStr;
        dateInput.value = tomorrowStr;
    }
    
    // Configurar formulario
    document.getElementById('tracking-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const trackingData = {
            order_id: orderId,
            tracking_number: document.getElementById('tracking-number').value,
            shipping_company: document.getElementById('shipping-company').value,
            estimated_delivery: document.getElementById('estimated-delivery').value,
            notes: document.getElementById('shipping-notes').value
        };
        
        try {
            // En una implementación real, aquí enviarías los datos al servidor
            console.log('Datos de seguimiento:', trackingData);
            
            showNotification('Información de envío guardada', 'success');
            closeModal('tracking-modal');
            
            // También podrías cambiar el estado a "shipped" automáticamente
            await updateOrderStatus(orderId, 'shipped');
            
        } catch (error) {
            console.error('Error guardando seguimiento:', error);
            showNotification('Error guardando información', 'error');
        }
    });
}

// Modal para reseñas (cuando se marca como entregado)
function showReviewModal(orderId) {
    const modalHTML = `
        <div class="modal active" id="review-modal">
            <div class="modal-content" style="max-width: 500px;">
                <span class="close-modal" onclick="closeModal('review-modal')">&times;</span>
                <h3><i class="fas fa-star"></i> Pedido Entregado</h3>
                
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 64px; color: #28a745; margin-bottom: 20px;"></i>
                    <h4 style="color: #28a745;">¡Orden #${orderId} Entregada!</h4>
                    <p style="color: #666; margin: 15px 0;">
                        El cliente ha recibido su pedido exitosamente.
                    </p>
                    <p style="color: #666; margin: 15px 0;">
                        <strong>Próximos pasos:</strong><br>
                        1. El cliente puede dejar una reseña<br>
                        2. El sistema generará una calificación<br>
                        3. Se completará el proceso de venta
                    </p>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                    <div style="display: flex; gap: 10px;">
                        <button onclick="closeModal('review-modal')" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-check"></i> Entendido
                        </button>
                        <button onclick="sendReviewRequest(${orderId})" class="btn btn-secondary">
                            <i class="fas fa-envelope"></i> Solicitar Reseña
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
}

// Función para solicitar reseña
async function sendReviewRequest(orderId) {
    try {
        // Simular envío de solicitud de reseña
        showNotification('Solicitud de reseña enviada al cliente', 'success');
        closeModal('review-modal');
        
        // En una implementación real, aquí enviarías una notificación/email al cliente
        
    } catch (error) {
        console.error('Error solicitando reseña:', error);
        showNotification('Error enviando solicitud', 'error');
    }
}

async function loadSellerProductsForPanel() {
    if (!currentSellerInfo) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/seller/${currentSellerInfo.id}`);
        if (!response.ok) throw new Error('Error cargando productos');
        
        const data = await response.json();
        const productsList = data.products || [];
        
        const container = document.getElementById('seller-products-list');
        if (!container) return;
        
        if (productsList.length === 0) {
            container.innerHTML = `
                <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 48px; color: #ddd; margin-bottom: 15px;"></i>
                    <h4 style="color: #666; margin-bottom: 10px;">No tienes productos publicados</h4>
                    <p style="color: #999; margin-bottom: 20px;">Comienza agregando tu primer producto</p>
                    <button onclick="showSellerTab('add', event)" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Agregar Primer Producto
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = productsList.map(product => `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.images || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                         alt="${product.name}"
                         onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
                </div>
                <div class="product-info">
                    <h3 style="margin-top: 0; color: #333;">${product.name}</h3>
                    <p style="color: #666; font-size: 14px; margin-bottom: 10px;">${product.description || 'Sin descripción'}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 18px; font-weight: bold; color: #6a5acd;">$${parseFloat(product.price).toFixed(2)}</span>
                        <span style="font-size: 12px; padding: 4px 8px; background: #${product.stock_quantity > 0 ? 'd4edda' : 'f8d7da'}; color: #${product.stock_quantity > 0 ? '155724' : '721c24'}; border-radius: 12px;">
                            ${product.stock_quantity > 0 ? `Stock: ${product.stock_quantity}` : 'Agotado'}
                        </span>
                    </div>
                    <div class="product-actions">
                        <button onclick="editProduct(${product.id})" class="btn btn-small" style="flex: 1;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="deleteProduct(${product.id})" class="btn btn-small btn-danger" style="flex: 1;">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        const container = document.getElementById('seller-products-list');
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #721c24; background: #f8d7da; border-radius: 8px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <h4>Error cargando productos</h4>
                    <p>${error.message}</p>
                    <button onclick="loadSellerProductsForPanel()" class="btn btn-secondary" style="margin-top: 15px;">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            `;
        }
    }
}

function setupSellerForms() {
    // Formulario para agregar producto
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentSellerInfo) {
                showNotification('Error: Información del vendedor no disponible', 'error');
                return;
            }
            
            const productData = {
                seller_id: currentSellerInfo.id,
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-description').value,
                price: parseFloat(document.getElementById('product-price').value),
                stock_quantity: parseInt(document.getElementById('product-stock').value),
                category: document.getElementById('product-category').value,
                brand: document.getElementById('product-brand').value || '',
                images: document.getElementById('product-images').value || ''
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Error creando producto');
                }
                
                showNotification('Producto publicado exitosamente', 'success');
                this.reset();
                
                // Recargar productos y estadísticas
                loadSellerProducts();
                updateSellerStats();
                
                // Cambiar al tab de productos
                const productsTab = document.querySelector('.tab-button[data-tab="products"]');
                if (productsTab) productsTab.click();
                
            } catch (error) {
                console.error('Error:', error);
                showNotification(error.message, 'error');
            }
        });
    }
    
    // Formulario de configuración
    const settingsForm = document.getElementById('seller-settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const settingsData = {
                business_name: document.getElementById('business-name').value,
                business_description: document.getElementById('business-description').value,
                store_address: document.getElementById('store-address').value,
                payment_methods: document.getElementById('payment-methods').value
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/sellers/${currentSellerInfo.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settingsData)
                });
                
                if (!response.ok) throw new Error('Error actualizando configuración');
                
                // Actualizar información local
                currentSellerInfo = { ...currentSellerInfo, ...settingsData };
                
                showNotification('Configuración actualizada exitosamente', 'success');
                
            } catch (error) {
                console.error('Error:', error);
                showNotification(error.message, 'error');
            }
        });
    }
}

// Función auxiliar para texto de estado
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'processing': 'En Proceso',
        'shipped': 'Enviado',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

async function deleteProduct(productId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Error eliminando producto');
        
        showNotification('Producto eliminado', 'success');
        
        // Recargar productos
        await loadSellerProductsForPanel();
        await loadProducts();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error eliminando producto', 'error');
    }
}

// ========== MODALES ==========
function initModals() {
    // Cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });
    
    // Modal de login
    initLoginModal();
    
    // Modal del carrito
    initCartModal();
}

function initLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (!loginModal) return;
    
    // Tabs
    loginModal.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            loginModal.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            loginModal.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            loginModal.querySelector(`#${tabId}-tab`).classList.add('active');
        });
    });
    
    // Formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Error en el login');
                }
                
                currentUser = data.user;
                localStorage.setItem('makeapp_user', JSON.stringify(data.user));
                
                updateAuthUI();
                await loadUserCart();
                
                if (currentUser.user_type === 'seller') {
                    await loadSellerInfo();
                }
                
                closeModal('login-modal');
                showNotification(`¡Bienvenido ${currentUser.full_name || currentUser.username}!`, 'success');
                
            } catch (error) {
                console.error('Login error:', error);
                showNotification(error.message, 'error');
            }
        });
    }
    
    // Formulario de registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const userType = document.querySelector('input[name="user-type"]:checked').value;
            
            if (password !== confirmPassword) {
                showNotification('Las contraseñas no coinciden', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            
            const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
            
            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        email,
                        password,
                        user_type: userType,
                        full_name: fullName
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Error en el registro');
                }
                
                currentUser = data.user;
                localStorage.setItem('makeapp_user', JSON.stringify(data.user));
                
                updateAuthUI();
                
                closeModal('login-modal');
                showNotification('¡Cuenta creada exitosamente!', 'success');
                
            } catch (error) {
                console.error('Register error:', error);
                showNotification(error.message, 'error');
            }
        });
    }
}

function initCartModal() {
    const cartModal = document.getElementById('cart-modal');
    if (!cartModal) return;
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (!currentUser) {
                showNotification('Debes iniciar sesión para proceder al pago', 'warning');
                closeModal('cart-modal');
                openModal('login-modal');
                return;
            }
            
            if (cart.length === 0) {
                showNotification('Tu carrito está vacío', 'info');
                return;
            }
            
            closeModal('cart-modal');
            showCheckoutModal();
        });
    }
}

// ========== UTILIDADES ==========
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        if (modalId === 'cart-modal') {
            updateCartModal();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function showUserMenu(element) {
    const menuHTML = `
        <div class="user-menu">
            <div class="user-menu-header">
                <i class="fas fa-user-circle"></i>
                <div>
                    <strong>${currentUser.username}</strong>
                    <small>${currentUser.user_type === 'seller' ? 'Vendedor' : 'Comprador'}</small>
                </div>
            </div>
            <div class="user-menu-items">
                <a href="#" class="menu-item" onclick="viewProfile()">
                    <i class="fas fa-user"></i> Mi Perfil
                </a>
                <a href="#" class="menu-item" onclick="viewOrders()">
                    <i class="fas fa-shopping-bag"></i> Mis Pedidos
                </a>
                ${currentUser.user_type === 'seller' ? `
                    <a href="#" class="menu-item" onclick="viewSellerPanel()">
                        <i class="fas fa-store"></i> Panel Vendedor
                    </a>
                ` : ''}
                <div class="menu-divider"></div>
                <a href="#" class="menu-item logout" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </a>
            </div>
        </div>
    `;
    
    const oldMenu = document.querySelector('.user-menu');
    if (oldMenu) oldMenu.remove();
    
    const menuContainer = document.createElement('div');
    menuContainer.innerHTML = menuHTML;
    document.body.appendChild(menuContainer.firstElementChild);
    
    const menu = document.querySelector('.user-menu');
    const rect = element.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.zIndex = '1001';
    
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && !element.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
}

function logout() {
    currentUser = null;
    cart = [];
    currentSellerInfo = null;
    userOrders = [];
    
    localStorage.removeItem('makeapp_user');
    
    updateAuthUI();
    updateCartCount();
    
    const menu = document.querySelector('.user-menu');
    if (menu) menu.remove();
    
    showHomePage();
    showNotification('Sesión cerrada', 'info');
}

function viewProfile() {
    if (!currentUser) {
        openModal('login-modal');
        return;
    }
    
    const menu = document.querySelector('.user-menu');
    if (menu) menu.remove();
    
    showUserProfile();
}

function viewOrders() {
    if (!currentUser) {
        openModal('login-modal');
        return;
    }
    
    const menu = document.querySelector('.user-menu');
    if (menu) menu.remove();
    
    showUserOrders();
}

function viewSellerPanel() {
    if (!currentUser) {
        openModal('login-modal');
        return;
    }
    
    const menu = document.querySelector('.user-menu');
    if (menu) menu.remove();
    
    showSellerPanel();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background-color: ${type === 'success' ? '#d4edda' : 
                         type === 'warning' ? '#fff3cd' : 
                         type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : 
                type === 'warning' ? '#856404' : 
                type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : 
                          type === 'warning' ? '#ffeaa7' : 
                          type === 'error' ? '#f5c6cb' : '#bee5eb'};
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, 5000);
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    console.log('⚡ Configurando event listeners...');
    
    // Búsqueda
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.querySelector('.search-bar input');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) searchProducts(query);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) searchProducts(query);
            }
        });
    }
    
    // Carrito
    const cartLink = document.getElementById('cart-link');
    const mobileCartLink = document.getElementById('mobile-cart-link');
    
    if (cartLink) {
        cartLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('cart-modal');
        });
    }
    if (mobileCartLink) {
        mobileCartLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('cart-modal');
        });
    }
    
    // Vendedor
    const registerSellerLink = document.getElementById('register-seller-link');
    if (registerSellerLink) {
        registerSellerLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('login-modal');
            
            setTimeout(() => {
                const registerTab = document.querySelector('[data-tab="register"]');
                const sellerRadio = document.querySelector('input[value="seller"]');
                if (registerTab && sellerRadio) {
                    registerTab.click();
                    sellerRadio.checked = true;
                }
            }, 100);
        });
    }
    
    // Menú móvil
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }
}

function searchProducts(query) {
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
    );
    
    if (filtered.length > 0) {
        displayProducts(filtered);
        showNotification(`Encontrados ${filtered.length} productos`, 'success');
    } else {
        showNotification('No se encontraron productos', 'warning');
    }
}

function filterByCategory(category) {
    const categoryMap = {
        'Labiales': 'labios',
        'Ojos': 'ojos',
        'Rostro': 'rostro',
        'Cuidado de la Piel': 'piel',
        'Fragancias': 'fragancias',
        'Accesorios': 'accesorios'
    };
    
    const engCategory = categoryMap[category] || category.toLowerCase();
    const filtered = products.filter(p => 
        p.category && p.category.toLowerCase() === engCategory
    );
    
    if (filtered.length > 0) {
        displayProducts(filtered);
        showNotification(`${filtered.length} productos en ${category}`, 'success');
    } else {
        showNotification(`No hay productos en ${category}`, 'warning');
    }
}

// ========== FUNCIONES GLOBALES ==========
window.updateOrderStatus = updateOrderStatus;
window.addToCart = addToCart;
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = logout;
window.removeFromCart = removeFromCart;
window.viewProfile = viewProfile;
window.viewOrders = viewOrders;
window.viewSellerPanel = viewSellerPanel;
window.updateProductStock = updateProductStock;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.showSellerTab = showSellerTab;
window.editSellerProduct = editProduct;
window.cancelOrder = cancelOrder;
window.showHomePage = showHomePage;
window.loadSellerProducts = loadSellerProducts; // Nueva
window.loadSellerOrders = loadSellerOrders; // Nueva

// Nuevas funciones para cliente
window.cancelUserOrder = cancelUserOrder;
window.contactSeller = contactSeller;
window.markAsDelivered = markAsDelivered;
window.askForTracking = askForTracking;
window.trackPackage = trackPackage;
window.leaveReview = leaveReview;
window.reorder = reorder;
window.showOrderDetails = showOrderDetails;
window.contactSupport = contactSupport;
window.loadUserOrdersForDisplay = loadUserOrdersForDisplay;

// Agregar animación CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .user-menu {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        overflow: hidden;
        min-width: 250px;
    }
    
    .user-menu-header {
        padding: 15px;
        background: linear-gradient(135deg, #ff6b9d, #6a5acd);
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .user-menu-items {
        padding: 10px 0;
    }
    
    .menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 15px;
        text-decoration: none;
        color: #333;
        transition: background-color 0.2s;
    }
    
    .menu-item:hover {
        background-color: #f5f5f5;
    }
    
    .menu-divider {
        height: 1px;
        background-color: #eee;
        margin: 10px 0;
    }
    
    .menu-item.logout {
        color: #dc3545;
    }
    
    .seller-panel-container,
    .profile-container,
    .orders-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    
    .seller-info-card,
    .profile-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    
    .seller-info,
    .profile-info {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
    }
    
    .seller-avatar,
    .profile-avatar {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #ff6b9d, #6a5acd);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        color: white;
    }
    
    .seller-details h3,
    .profile-details h3 {
        margin: 0 0 10px 0;
        color: #333;
    }
    
    .seller-details p,
    .profile-details p {
        margin: 5px 0;
        color: #666;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .seller-stats,
    .profile-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin-top: 20px;
    }
    
    .stat-card {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        border: 1px solid #e9ecef;
    }
    
    .stat-card i {
        font-size: 24px;
        color: #6a5acd;
        margin-bottom: 10px;
    }
    
    .stat-card h3 {
        margin: 10px 0 5px 0;
        font-size: 28px;
        color: #333;
    }
    
    .stat-card p {
        margin: 0;
        color: #666;
        font-size: 14px;
    }
    
    .seller-tabs {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    
    .tab-buttons {
        display: flex;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        overflow-x: auto;
    }
    
    .tab-btn {
        padding: 15px 24px;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        font-size: 14px;
        color: #666;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        transition: all 0.3s;
    }
    
    .tab-btn:hover {
        background: #e9ecef;
    }
    
    .tab-btn.active {
        color: #6a5acd;
        border-bottom-color: #6a5acd;
        background: white;
    }
    
    .tab-content {
        padding: 24px;
    }
    
    .tab-pane {
        display: none;
    }
    
    .tab-pane.active {
        display: block;
    }
    
    .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }
    
    .seller-form .form-group {
        margin-bottom: 20px;
    }
    
    .seller-form label {
        display: block;
        margin-bottom: 8px;
        color: #333;
        font-weight: 500;
    }
    
    .seller-form input,
    .seller-form textarea,
    .seller-form select {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s;
    }
    
    .seller-form input:focus,
    .seller-form textarea:focus,
    .seller-form select:focus {
        outline: none;
        border-color: #6a5acd;
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }
    
    .no-products {
        text-align: center;
        padding: 60px 20px;
        color: #999;
    }
    
    .no-products i {
        font-size: 48px;
        margin-bottom: 20px;
        opacity: 0.5;
    }
    
    .order-card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        border: 1px solid #e9ecef;
    }
    
    .order-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 15px;
        border-bottom: 1px solid #eee;
    }
    
    .order-status {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .order-status.pending {
        background: #fff3cd;
        color: #856404;
    }
    
    .order-status.processing {
        background: #cce5ff;
        color: #004085;
    }
    
    .order-status.shipped {
        background: #d4edda;
        color: #155724;
    }
    
    .order-status.delivered {
        background: #d1ecf1;
        color: #0c5460;
    }
    
    .order-status.cancelled {
        background: #f8d7da;
        color: #721c24;
    }
    
    .empty-orders {
        text-align: center;
        padding: 60px 20px;
    }
    
    .empty-orders i {
        font-size: 48px;
        color: #ddd;
        margin-bottom: 20px;
    }
    
    .seller-panel-header,
    .orders-header,
    .profile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
    }
    
    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }
        
        .tab-buttons {
            flex-wrap: wrap;
        }
        
        .tab-btn {
            flex: 1;
            min-width: 120px;
            justify-content: center;
        }
        
        .seller-info,
        .profile-info {
            flex-direction: column;
            text-align: center;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ MakeApp JavaScript cargado correctamente');