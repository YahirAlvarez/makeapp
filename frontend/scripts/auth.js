// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
    }

    // Initialize authentication
    init() {
        this.loadUserFromStorage();
        this.updateUI();
    }

    // Load user from localStorage
    loadUserFromStorage() {
        const userData = localStorage.getItem('makeapp_user');
        this.token = localStorage.getItem('makeapp_token');
        
        if (userData && this.token) {
            try {
                this.currentUser = JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.logout();
            }
        }
    }

    // Save user to localStorage
    saveUserToStorage(user, token) {
        localStorage.setItem('makeapp_user', JSON.stringify(user));
        localStorage.setItem('makeapp_token', token);
        this.currentUser = user;
        this.token = token;
    }

    // Clear user from localStorage
    clearUserFromStorage() {
        localStorage.removeItem('makeapp_user');
        localStorage.removeItem('makeapp_token');
        this.currentUser = null;
        this.token = null;
    }

    // Register new user
    async register(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error en el registro');
            }

            const data = await response.json();
            
            // Save user and token
            this.saveUserToStorage(data.user, data.token);
            
            // Update UI
            this.updateUI();
            
            return { success: true, data };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Login user
    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error en el inicio de sesión');
            }

            const data = await response.json();
            
            // Save user and token
            this.saveUserToStorage(data.user, data.token);
            
            // Update UI
            this.updateUI();
            
            // Load user's cart
            if (window.CartManager) {
                await window.CartManager.init();
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    // Logout user
    logout() {
        this.clearUserFromStorage();
        this.updateUI();
        
        // Clear cart
        if (window.CartManager) {
            window.CartManager.cart = [];
            window.CartManager.updateCartUI();
        }
        
        showNotification('Sesión cerrada exitosamente', 'success');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser && !!this.token;
    }

    // Check if user is a seller
    isSeller() {
        return this.isAuthenticated() && this.currentUser.user_type === 'seller';
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get authentication token
    getToken() {
        return this.token;
    }

    // Update UI based on authentication state
    updateUI() {
        const loginLinks = document.querySelectorAll('#login-link, #mobile-login-link');
        const sellerLinks = document.querySelectorAll('#seller-link, #mobile-seller-link');
        
        if (this.isAuthenticated()) {
            // Update login links to show user name
            loginLinks.forEach(link => {
                link.innerHTML = `
                    <i class="fas fa-user"></i> 
                    ${this.currentUser.full_name || this.currentUser.username || 'Mi Cuenta'}
                `;
                
                // Change click behavior to show profile dropdown or logout
                link.onclick = (e) => {
                    e.preventDefault();
                    this.showUserMenu(link);
                };
            });
            
            // Show seller links if user is a seller
            sellerLinks.forEach(link => {
                if (this.isSeller()) {
                    link.style.display = 'flex';
                } else {
                    link.style.display = 'none';
                }
            });
        } else {
            // Reset login links
            loginLinks.forEach(link => {
                link.innerHTML = '<i class="fas fa-user"></i> Iniciar Sesión';
                link.onclick = (e) => {
                    e.preventDefault();
                    openLoginModal();
                };
            });
            
            // Hide seller links
            sellerLinks.forEach(link => {
                link.style.display = 'none';
            });
        }
    }

    // Show user menu dropdown
    showUserMenu(triggerElement) {
        // Remove existing menu if any
        const existingMenu = document.querySelector('.user-menu-dropdown');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }
        
        // Create menu
        const menu = document.createElement('div');
        menu.className = 'user-menu-dropdown';
        menu.innerHTML = `
            <div class="user-menu-header">
                <i class="fas fa-user-circle"></i>
                <div class="user-info">
                    <strong>${this.currentUser.full_name || this.currentUser.username}</strong>
                    <small>${this.currentUser.email}</small>
                </div>
            </div>
            <div class="user-menu-items">
                <a href="#" class="user-menu-item" id="view-profile">
                    <i class="fas fa-user"></i> Mi Perfil
                </a>
                <a href="#" class="user-menu-item" id="my-orders">
                    <i class="fas fa-shopping-bag"></i> Mis Pedidos
                </a>
                ${this.isSeller() ? `
                    <a href="#" class="user-menu-item" id="seller-dashboard">
                        <i class="fas fa-store"></i> Panel del Vendedor
                    </a>
                ` : ''}
                <div class="user-menu-divider"></div>
                <a href="#" class="user-menu-item" id="logout">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </a>
            </div>
        `;
        
        // Position menu
        const rect = triggerElement.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.style.zIndex = '1000';
        
        // Add styles
        menu.style.cssText += `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            width: 250px;
            overflow: hidden;
            animation: slideDown 0.2s ease;
        `;
        
        // Add to document
        document.body.appendChild(menu);
        
        // Add event listeners
        menu.querySelector('#view-profile').addEventListener('click', (e) => {
            e.preventDefault();
            this.showProfileModal();
            menu.remove();
        });
        
        menu.querySelector('#my-orders').addEventListener('click', (e) => {
            e.preventDefault();
            this.showOrdersModal();
            menu.remove();
        });
        
        if (this.isSeller()) {
            menu.querySelector('#seller-dashboard').addEventListener('click', (e) => {
                e.preventDefault();
                openSellerModal();
                menu.remove();
            });
        }
        
        menu.querySelector('#logout').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
            menu.remove();
        });
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !triggerElement.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    // Show profile modal
    async showProfileModal() {
        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar el perfil');
            }

            const data = await response.json();
            const user = data.user;
            
            // Create modal HTML
            const modalHTML = `
                <div class="modal" id="profile-modal">
                    <div class="modal-content">
                        <span class="close-modal">&times;</span>
                        <h3>Mi Perfil</h3>
                        
                        <div class="profile-header">
                            <div class="profile-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="profile-info">
                                <h4>${user.full_name || user.username}</h4>
                                <p>${user.email}</p>
                                <p class="user-type">${user.user_type === 'seller' ? 'Vendedor' : 'Comprador'}</p>
                            </div>
                        </div>
                        
                        <form id="profile-form">
                            <div class="form-group">
                                <label for="profile-full-name">Nombre Completo</label>
                                <input type="text" id="profile-full-name" value="${user.full_name || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="profile-phone">Teléfono</label>
                                <input type="tel" id="profile-phone" value="${user.phone || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="profile-address">Dirección</label>
                                <textarea id="profile-address" rows="3">${user.address || ''}</textarea>
                            </div>
                            
                            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        </form>
                    </div>
                </div>
            `;
            
            // Add modal to DOM
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer.firstElementChild);
            
            // Show modal
            const modal = document.getElementById('profile-modal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Add event listeners
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.remove();
                document.body.style.overflow = 'auto';
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    document.body.style.overflow = 'auto';
                }
            });
            
            // Handle form submission
            modal.querySelector('#profile-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    full_name: modal.querySelector('#profile-full-name').value,
                    phone: modal.querySelector('#profile-phone').value,
                    address: modal.querySelector('#profile-address').value
                };
                
                try {
                    const response = await fetch(`${API_BASE_URL}/profile`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    if (!response.ok) {
                        throw new Error('Error al actualizar el perfil');
                    }
                    
                    // Update local user data
                    this.currentUser = { ...this.currentUser, ...formData };
                    localStorage.setItem('makeapp_user', JSON.stringify(this.currentUser));
                    
                    // Update UI
                    this.updateUI();
                    
                    showNotification('Perfil actualizado exitosamente', 'success');
                    
                    // Close modal
                    modal.remove();
                    document.body.style.overflow = 'auto';
                } catch (error) {
                    console.error('Error updating profile:', error);
                    showNotification('Error al actualizar el perfil', 'error');
                }
            });
        } catch (error) {
            console.error('Error loading profile:', error);
            showNotification('Error al cargar el perfil', 'error');
        }
    }

    // Show orders modal
    async showOrdersModal() {
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar los pedidos');
            }

            const data = await response.json();
            const orders = data.orders || [];
            
            // Create modal HTML
            const modalHTML = `
                <div class="modal" id="orders-modal">
                    <div class="modal-content orders-modal">
                        <span class="close-modal">&times;</span>
                        <h3>Mis Pedidos</h3>
                        
                        ${orders.length === 0 ? `
                            <div class="no-orders">
                                <i class="fas fa-shopping-bag"></i>
                                <h4>No tienes pedidos aún</h4>
                                <p>¡Realiza tu primera compra!</p>
                            </div>
                        ` : `
                            <div class="orders-list">
                                ${orders.map(order => `
                                    <div class="order-card" data-order-id="${order.id}">
                                        <div class="order-header">
                                            <div class="order-info">
                                                <h4>Pedido #${order.order_number}</h4>
                                                <p class="order-date">${new Date(order.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div class="order-status ${order.order_status}">
                                                ${this.getOrderStatusText(order.order_status)}
                                            </div>
                                        </div>
                                        
                                        <div class="order-details">
                                            <p><strong>Total:</strong> $${order.total_amount.toFixed(2)}</p>
                                            <p><strong>Artículos:</strong> ${order.item_count}</p>
                                            <p><strong>Estado de pago:</strong> ${order.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}</p>
                                        </div>
                                        
                                        <button class="btn btn-outline view-order-details" data-order-id="${order.id}">
                                            Ver Detalles
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
            
            // Add modal to DOM
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer.firstElementChild);
            
            // Show modal
            const modal = document.getElementById('orders-modal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Add event listeners
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.remove();
                document.body.style.overflow = 'auto';
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    document.body.style.overflow = 'auto';
                }
            });
            
            // Add event listeners to view order details buttons
            modal.querySelectorAll('.view-order-details').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const orderId = e.target.dataset.orderId;
                    await this.showOrderDetails(orderId);
                });
            });
        } catch (error) {
            console.error('Error loading orders:', error);
            showNotification('Error al cargar los pedidos', 'error');
        }
    }

    // Show order details
    async showOrderDetails(orderId) {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar los detalles del pedido');
            }

            const data = await response.json();
            const order = data.order;
            
            // Create modal HTML
            const modalHTML = `
                <div class="modal" id="order-details-modal">
                    <div class="modal-content order-details-modal">
                        <span class="close-modal">&times;</span>
                        <h3>Pedido #${order.order_number}</h3>
                        
                        <div class="order-info-details">
                            <div class="info-row">
                                <strong>Fecha:</strong> ${new Date(order.created_at).toLocaleString()}
                            </div>
                            <div class="info-row">
                                <strong>Estado:</strong> 
                                <span class="order-status ${order.order_status}">
                                    ${this.getOrderStatusText(order.order_status)}
                                </span>
                            </div>
                            <div class="info-row">
                                <strong>Total:</strong> $${order.total_amount.toFixed(2)}
                            </div>
                            <div class="info-row">
                                <strong>Método de pago:</strong> ${order.payment_method}
                            </div>
                            <div class="info-row">
                                <strong>Dirección de envío:</strong> 
                                <p>${order.shipping_address}</p>
                            </div>
                        </div>
                        
                        <h4>Artículos del Pedido</h4>
                        <div class="order-items-list">
                            ${order.items.map(item => {
                                // Parse images
                                let images = [];
                                try {
                                    images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images || [];
                                } catch (e) {
                                    images = [];
                                }
                                
                                const imageUrl = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
                                
                                return `
                                    <div class="order-item">
                                        <img src="${imageUrl}" alt="${item.name}">
                                        <div class="order-item-details">
                                            <h5>${item.name}</h5>
                                            <p>Vendedor: ${item.seller_name || 'N/A'}</p>
                                            <p>Cantidad: ${item.quantity}</p>
                                            <p>Precio unitario: $${item.unit_price.toFixed(2)}</p>
                                            <p><strong>Subtotal: $${(item.unit_price * item.quantity).toFixed(2)}</strong></p>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to DOM
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer.firstElementChild);
            
            // Show modal
            const modal = document.getElementById('order-details-modal');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Add event listeners
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.remove();
                document.body.style.overflow = 'auto';
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    document.body.style.overflow = 'auto';
                }
            });
        } catch (error) {
            console.error('Error loading order details:', error);
            showNotification('Error al cargar los detalles del pedido', 'error');
        }
    }

    // Get order status text
    getOrderStatusText(status) {
        const statusMap = {
            'pending': 'Pendiente',
            'processing': 'Procesando',
            'shipped': 'Enviado',
            'delivered': 'Entregado',
            'cancelled': 'Cancelado'
        };
        
        return statusMap[status] || status;
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Export for use in other files
window.AuthManager = authManager;