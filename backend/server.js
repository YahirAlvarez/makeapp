const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path'); // ⭐ AGREGAR ESTA LÍNEA

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración CORS
app.use(cors({
    origin: '*', // ¡PERMITE TODOS LOS ORÍGENES!
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⭐⭐ SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND ⭐⭐
// Tu frontend está en la carpeta 'frontend' al mismo nivel que 'backend'
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Base de datos
let db;

async function connectDB() {
    try {
        console.log('🔌 Conectando a MySQL...');
        
        // ⭐⭐ CONFIGURACIÓN CORRECTA PARA RAILWAY ⭐⭐
        const dbConfig = {
            host: process.env.DB_HOST || 'switchback.proxy.rlwy.net',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'PNNnPebkJaexxnDfrnrAPBAgbRyWEpou',
            database: process.env.DB_NAME || 'railway',
            port: parseInt(process.env.DB_PORT) || 16729,  // ← ¡16729, NO 3306!
            
            // SSL SIEMPRE para Railway en producción
            ssl: process.env.NODE_ENV === 'production' ? {
                rejectUnauthorized: false
            } : undefined,
            
            connectTimeout: 15000
        };
        
        console.log('📡 Config MySQL:', {
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database,
            usingSSL: !!dbConfig.ssl
        });
        
        db = await mysql.createConnection(dbConfig);
        console.log('✅ ¡Conectado a MySQL en Railway!');
        
    } catch (err) {
        console.error('❌ Error MySQL:', err.message);
        console.error('Código:', err.code);
        
        // Modo demo para producción
        console.log('⚠️  Continuando en modo sin base de datos...');
        db = { 
            execute: async () => Promise.resolve([[]]), 
            query: async () => Promise.resolve([[]]) 
        };
    }
}

connectDB();

// ========== RUTA PARA SERVIR EL FRONTEND ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ========== RUTAS API ==========
app.get('/api', (req, res) => {
    res.json({ 
        message: 'MakeApp API funcionando',
        endpoints: {
            auth: ['POST /api/register', 'POST /api/login'],
            products: ['GET /api/products', 'GET /api/products/seller/:sellerId', 'POST /api/products'],
            cart: ['POST /api/cart/add', 'GET /api/cart/:userId', 'DELETE /api/cart/:userId/:productId', 'DELETE /api/cart/clear/:userId'],
            orders: ['POST /api/orders', 'GET /api/orders/user/:userId', 'GET /api/orders/seller/:sellerId', 'PUT /api/orders/:id'],
            sellers: ['GET /api/sellers/:userId', 'POST /api/sellers', 'PUT /api/sellers/:userId'],
            products_crud: ['PUT /api/products/:id', 'DELETE /api/products/:id']
        }
    });
});

// ========== USUARIOS ==========
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, user_type = 'buyer', full_name } = req.body;
        
        console.log('📝 Registro:', username, email, user_type);
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ? OR username = ?', 
            [email, username]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Usuario o email ya existen' });
        }
        
        const [result] = await db.query(
            'INSERT INTO users (username, email, password, user_type, full_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, password, user_type, full_name || username]
        );
        
        const userId = result.insertId;
        const userData = {
            id: userId,
            username,
            email,
            user_type,
            full_name: full_name || username
        };
        
        if (user_type === 'seller') {
            await db.query(
                'INSERT INTO sellers (user_id, business_name) VALUES (?, ?)',
                [userId, `${full_name || username}'s Business`]
            );
        }
        
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: userData
        });
        
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login:', email);
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }
        
        const [users] = await db.query(
            'SELECT id, username, email, user_type, full_name FROM users WHERE email = ? AND password = ?',
            [email, password]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        
        const user = users[0];
        
        if (user.user_type === 'seller') {
            const [sellers] = await db.query(
                'SELECT * FROM sellers WHERE user_id = ?',
                [user.id]
            );
            
            if (sellers.length > 0) {
                user.seller = sellers[0];
            }
        }
        
        res.json({
            message: 'Login exitoso',
            user
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ========== PRODUCTOS ==========
app.get('/api/products', async (req, res) => {
    try {
        console.log('📦 Obteniendo productos');
        
        const [products] = await db.query(
            `SELECT p.*, s.business_name, s.user_id as seller_user_id, u.full_name as seller_name 
             FROM products p 
             LEFT JOIN sellers s ON p.seller_id = s.id 
             LEFT JOIN users u ON s.user_id = u.id 
             ORDER BY p.created_at DESC`
        );
        
        console.log(`✅ Productos enviados: ${products.length}`);
        res.json({ products });
        
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({ error: 'Error obteniendo productos' });
    }
});

app.get('/api/products/seller/:sellerId', async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        
        const [products] = await db.query(
            'SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC',
            [sellerId]
        );
        
        res.json({ products });
        
    } catch (error) {
        console.error('Error obteniendo productos del vendedor:', error);
        res.status(500).json({ error: 'Error obteniendo productos' });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { seller_id, name, description, category, price, stock_quantity, brand, images } = req.body;
        
        console.log('➕ Creando producto:', name);
        
        if (!seller_id || !name || !price) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        const [result] = await db.query(
            `INSERT INTO products (seller_id, name, description, category, price, stock_quantity, brand, images) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [seller_id, name, description || '', category || '', price, stock_quantity || 0, brand || '', images || '']
        );
        
        console.log('✅ Producto creado:', result.insertId);
        res.status(201).json({
            message: 'Producto creado exitosamente',
            productId: result.insertId
        });
        
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ error: 'Error creando producto' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }
        
        values.push(id);
        
        await db.query(
            `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        res.json({ success: true, message: 'Producto actualizado' });
        
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        
        res.json({ success: true, message: 'Producto eliminado' });
        
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== CARRITO ==========
app.post('/api/cart/add', async (req, res) => {
    try {
        const { user_id, product_id, quantity = 1 } = req.body;
        
        if (!user_id || !product_id) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        const [existingItem] = await db.query(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );
        
        if (existingItem.length > 0) {
            await db.query(
                'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [quantity, user_id, product_id]
            );
        } else {
            await db.query(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [user_id, product_id, quantity]
            );
        }
        
        res.json({ success: true, message: 'Producto agregado al carrito' });
        
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cart/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        
        const [cartItems] = await db.query(`
            SELECT c.*, p.name, p.price, p.images, p.seller_id, s.business_name
            FROM cart c
            JOIN products p ON c.product_id = p.id
            LEFT JOIN sellers s ON p.seller_id = s.id
            WHERE c.user_id = ?
        `, [user_id]);
        
        res.json({ cart: cartItems });
        
    } catch (error) {
        console.error('Error obteniendo carrito:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/cart/:user_id/:product_id', async (req, res) => {
    try {
        const { user_id, product_id } = req.params;
        
        await db.query(
            'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );
        
        res.json({ success: true, message: 'Producto eliminado del carrito' });
        
    } catch (error) {
        console.error('Error eliminando del carrito:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/cart/clear/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        
        await db.query('DELETE FROM cart WHERE user_id = ?', [user_id]);
        
        res.json({ success: true, message: 'Carrito limpiado' });
        
    } catch (error) {
        console.error('Error limpiando carrito:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== VENDEDORES ==========
app.post('/api/sellers', async (req, res) => {
    try {
        const { user_id, business_name, business_description, store_address, payment_methods } = req.body;
        
        if (!user_id || !business_name) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        const [existingSellers] = await db.query(
            'SELECT id FROM sellers WHERE user_id = ?',
            [user_id]
        );
        
        if (existingSellers.length > 0) {
            return res.status(400).json({ error: 'Ya existe un perfil de vendedor para este usuario' });
        }
        
        const [result] = await db.query(
            `INSERT INTO sellers (user_id, business_name, business_description, store_address, payment_methods) 
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, business_name, business_description || '', store_address || '', payment_methods || '']
        );
        
        res.status(201).json({
            message: 'Perfil de vendedor creado exitosamente',
            seller: {
                id: result.insertId,
                user_id,
                business_name,
                business_description,
                store_address,
                payment_methods
            }
        });
        
    } catch (error) {
        console.error('Error creando vendedor:', error);
        res.status(500).json({ error: 'Error creando perfil de vendedor' });
    }
});

app.get('/api/sellers/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const [sellers] = await db.query(
            'SELECT * FROM sellers WHERE user_id = ?',
            [userId]
        );
        
        if (sellers.length === 0) {
            return res.status(404).json({ error: 'Vendedor no encontrado' });
        }
        
        res.json({ seller: sellers[0] });
        
    } catch (error) {
        console.error('Error obteniendo vendedor:', error);
        res.status(500).json({ error: 'Error obteniendo vendedor' });
    }
});

app.put('/api/sellers/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { business_name, business_description, store_address, payment_methods } = req.body;
        
        await db.query(
            `UPDATE sellers 
             SET business_name = ?, business_description = ?, store_address = ?, payment_methods = ? 
             WHERE user_id = ?`,
            [business_name, business_description, store_address, payment_methods, userId]
        );
        
        res.json({ message: 'Información actualizada exitosamente' });
        
    } catch (error) {
        console.error('Error actualizando vendedor:', error);
        res.status(500).json({ error: 'Error actualizando vendedor' });
    }
});

// ========== ÓRDENES ==========
app.post('/api/orders', async (req, res) => {
    try {
        const { user_id, seller_id, total_amount, shipping_address, payment_method, items } = req.body;
        
        if (!user_id || !seller_id || !total_amount || !items || items.length === 0) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        // Intentar insertar con status, si falla, intentar sin status
        try {
            const [result] = await db.query(
                'INSERT INTO orders (user_id, seller_id, total_amount, shipping_address, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)',
                [user_id, seller_id, total_amount, shipping_address || '', payment_method || 'efectivo', 'pending']
            );
            
            const orderId = result.insertId;
            
            // Agregar items de la orden
            for (const item of items) {
                await db.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderId, item.product_id, item.quantity, item.price]
                );
            }
            
            res.json({ success: true, orderId });
            
        } catch (error) {
            // Si falla por la columna status, intentar sin ella
            if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('status')) {
                const [result] = await db.query(
                    'INSERT INTO orders (user_id, seller_id, total_amount, shipping_address, payment_method) VALUES (?, ?, ?, ?, ?)',
                    [user_id, seller_id, total_amount, shipping_address || '', payment_method || 'efectivo']
                );
                
                const orderId = result.insertId;
                
                for (const item of items) {
                    await db.query(
                        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                        [orderId, item.product_id, item.quantity, item.price]
                    );
                }
                
                res.json({ success: true, orderId });
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.error('Error creando orden:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        
        // Intentar obtener con status
        try {
            const [orders] = await db.query(`
                SELECT o.*, s.business_name
                FROM orders o
                LEFT JOIN sellers s ON o.seller_id = s.id
                WHERE o.user_id = ?
                ORDER BY o.order_date DESC
            `, [user_id]);
            
            // Obtener detalles de los productos para cada orden
            for (let order of orders) {
                const [items] = await db.query(`
                    SELECT oi.*, p.name as product_name
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                `, [order.id]);
                
                order.items = items;
            }
            
            res.json({ orders });
            
        } catch (error) {
            // Si falla por columna status, intentar sin ella
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                const [orders] = await db.query(`
                    SELECT o.id, o.user_id, o.seller_id, o.total_amount, o.shipping_address, o.payment_method, o.order_date, s.business_name
                    FROM orders o
                    LEFT JOIN sellers s ON o.seller_id = s.id
                    WHERE o.user_id = ?
                    ORDER BY o.order_date DESC
                `, [user_id]);
                
                // Agregar status por defecto
                orders.forEach(order => {
                    order.status = 'pending';
                });
                
                for (let order of orders) {
                    const [items] = await db.query(`
                        SELECT oi.*, p.name as product_name
                        FROM order_items oi
                        JOIN products p ON oi.product_id = p.id
                        WHERE oi.order_id = ?
                    `, [order.id]);
                    
                    order.items = items;
                }
                
                res.json({ orders });
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.error('Error obteniendo pedidos del usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/seller/:seller_id', async (req, res) => {
    try {
        const { seller_id } = req.params;
        
        // Intentar obtener con status
        try {
            const [orders] = await db.query(`
                SELECT o.*, u.full_name as buyer_name
                FROM orders o
                JOIN users u ON o.user_id = u.id
                WHERE o.seller_id = ?
                ORDER BY o.order_date DESC
            `, [seller_id]);
            
            // Obtener detalles de los productos para cada orden
            for (let order of orders) {
                const [items] = await db.query(`
                    SELECT oi.*, p.name as product_name
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                `, [order.id]);
                
                order.items = items;
            }
            
            res.json({ orders });
            
        } catch (error) {
            // Si falla por columna status, intentar sin ella
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                const [orders] = await db.query(`
                    SELECT o.id, o.user_id, o.seller_id, o.total_amount, o.shipping_address, o.payment_method, o.order_date, u.full_name as buyer_name
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    WHERE o.seller_id = ?
                    ORDER BY o.order_date DESC
                `, [seller_id]);
                
                // Agregar status por defecto
                orders.forEach(order => {
                    order.status = 'pending';
                });
                
                for (let order of orders) {
                    const [items] = await db.query(`
                        SELECT oi.*, p.name as product_name
                        FROM order_items oi
                        JOIN products p ON oi.product_id = p.id
                        WHERE oi.order_id = ?
                    `, [order.id]);
                    
                    order.items = items;
                }
                
                res.json({ orders });
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.error('Error obteniendo pedidos del vendedor:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'Estado requerido' });
        }
        
        // Intentar actualizar status, si falla es porque no existe la columna
        try {
            await db.query(
                'UPDATE orders SET status = ? WHERE id = ?',
                [status, id]
            );
        } catch (error) {
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                // La columna status no existe, no podemos actualizarla
                console.log('Columna status no existe en la tabla orders');
            } else {
                throw error;
            }
        }
        
        res.json({ success: true, message: 'Orden actualizada' });
        
    } catch (error) {
        console.error('Error actualizando orden:', error);
        res.status(500).json({ error: error.message });
    }
});

// ⭐⭐ RUTA PARA MANEJAR SINGLE PAGE APPLICATION (SPA) ⭐⭐
// Esto sirve index.html para todas las rutas que no sean API
app.get('*', (req, res) => {
    // Si es una ruta API, devolver 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Ruta API no encontrada' });
    }
    
    // De lo contrario, servir el frontend
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`
    🚀 MakeApp Backend
    📍 Puerto: ${PORT}
    ⏰ ${new Date().toLocaleString()}
    ✅ Listo para recibir peticiones
    🌐 URL pública: https://makeapp-mttq.onrender.com
    📁 Sirviendo frontend desde: ${path.join(__dirname, '..', 'frontend')}
    `);
});
