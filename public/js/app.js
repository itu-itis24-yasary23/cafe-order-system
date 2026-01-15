/* =====================================================
   CAFE ORDER SYSTEM - Main Application JavaScript
   ===================================================== */

// API Base URL
const API_BASE = '/api';

// State
let currentOrderItems = [];
let menuItems = [];
let tables = [];
let categoriesCache = [];

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFilters();
    loadDashboard();
    fetchCategories(); // Fetch categories in background
});

// =====================================================
// NAVIGATION
// =====================================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // Update sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');

    // Load section data
    switch (sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'tables':
            loadTables();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'menu':
            loadMenu();
            break;
    }
}

// =====================================================
// DASHBOARD
// =====================================================
async function loadDashboard() {
    try {
        const [tableStats, orderStats, menuStats] = await Promise.all([
            fetch(`${API_BASE}/tables/stats`).then(r => r.json()),
            fetch(`${API_BASE}/orders/stats`).then(r => r.json()),
            fetch(`${API_BASE}/menu/stats`).then(r => r.json())
        ]);

        // Update stats
        document.getElementById('stat-tables-available').textContent = tableStats.available || 0;
        document.getElementById('stat-active-orders').textContent =
            (orderStats.pending || 0) + (orderStats.preparing || 0) + (orderStats.ready || 0) + (orderStats.served || 0);
        document.getElementById('stat-menu-items').textContent = menuStats.total || 0;
        document.getElementById('stat-today-revenue').textContent = `${(orderStats.today_revenue || 0).toFixed(0)} ₺`;

        // Load active orders preview
        const activeOrders = await fetch(`${API_BASE}/orders/active`).then(r => r.json());
        const ordersContainer = document.getElementById('dashboard-active-orders');

        if (activeOrders.length === 0) {
            ordersContainer.innerHTML = '<p class="empty-state">No active orders</p>';
        } else {
            ordersContainer.innerHTML = activeOrders.slice(0, 5).map(order => `
        <div class="order-mini-card">
          <div class="order-mini-info">
            <span class="order-mini-table">Table ${order.table_number}</span>
            <span class="order-mini-time">${formatTime(order.created_at)}</span>
          </div>
          <span class="order-status-badge ${order.status}">${order.status}</span>
        </div>
      `).join('');
        }

        // Load tables preview
        const allTables = await fetch(`${API_BASE}/tables`).then(r => r.json());
        const tablesContainer = document.getElementById('dashboard-tables');

        tablesContainer.innerHTML = allTables.map(table => `
      <div class="table-mini ${table.status}" onclick="showSection('tables')">
        <span class="table-mini-number">${table.table_number}</span>
        <span class="table-mini-status">${table.status}</span>
      </div>
    `).join('');

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard', 'error');
    }
}

// =====================================================
// TABLES
// =====================================================
async function loadTables() {
    try {
        const response = await fetch(`${API_BASE}/tables`);
        tables = await response.json();

        const container = document.getElementById('tables-grid');

        if (tables.length === 0) {
            container.innerHTML = '<p class="empty-state">No tables yet. Add your first table!</p>';
            return;
        }

        container.innerHTML = tables.map(table => `
      <div class="table-card ${table.status}">
        <div class="table-number">${table.table_number}</div>
        <span class="table-status ${table.status}">${table.status}</span>
        <div class="table-actions">
          <button class="btn-status" onclick="cycleTableStatus(${table.id}, '${table.status}')">
            Change Status
          </button>
          <button class="btn-edit" onclick="editTable(${table.id})">Edit</button>
          <button class="btn-delete" onclick="confirmDeleteTable(${table.id})">Delete</button>
        </div>
      </div>
    `).join('');

    } catch (error) {
        console.error('Error loading tables:', error);
        showToast('Error loading tables', 'error');
    }
}

function openTableModal(tableId = null) {
    const modal = document.getElementById('table-modal');
    const title = document.getElementById('table-modal-title');
    const form = document.getElementById('table-form');

    form.reset();
    document.getElementById('table-id').value = '';

    if (tableId) {
        title.textContent = 'Edit Table';
        const table = tables.find(t => t.id === tableId);
        if (table) {
            document.getElementById('table-id').value = table.id;
            document.getElementById('table-number').value = table.table_number;
        }
    } else {
        title.textContent = 'Add New Table';
    }

    modal.classList.add('active');
}

function editTable(tableId) {
    openTableModal(tableId);
}

async function handleTableSubmit(e) {
    e.preventDefault();

    const tableId = document.getElementById('table-id').value;
    const tableNumber = parseInt(document.getElementById('table-number').value);

    try {
        let response;
        if (tableId) {
            response = await fetch(`${API_BASE}/tables/${tableId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_number: tableNumber })
            });
        } else {
            response = await fetch(`${API_BASE}/tables`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_number: tableNumber })
            });
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to save table');
        }

        closeModal('table-modal');
        loadTables();
        showToast(tableId ? 'Table updated successfully' : 'Table created successfully', 'success');

    } catch (error) {
        console.error('Error saving table:', error);
        showToast(error.message, 'error');
    }
}

async function cycleTableStatus(tableId, currentStatus) {
    const statusOrder = ['available', 'occupied', 'reserved'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    try {
        const response = await fetch(`${API_BASE}/tables/${tableId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }

        loadTables();
        showToast(`Table status changed to ${nextStatus}`, 'success');

    } catch (error) {
        console.error('Error updating table status:', error);
        showToast(error.message, 'error');
    }
}

function confirmDeleteTable(tableId) {
    showConfirmModal(
        'Delete Table',
        'Are you sure you want to delete this table? All associated orders will also be deleted.',
        () => deleteTable(tableId)
    );
}

async function deleteTable(tableId) {
    try {
        const response = await fetch(`${API_BASE}/tables/${tableId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }

        closeModal('confirm-modal');
        loadTables();
        showToast('Table deleted successfully', 'success');

    } catch (error) {
        console.error('Error deleting table:', error);
        showToast(error.message, 'error');
    }
}

// =====================================================
// ORDERS
// =====================================================
let ordersFilter = 'active';

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ordersFilter = btn.dataset.filter;
            loadOrders();
        });
    });
}

async function loadOrders() {
    try {
        const endpoint = ordersFilter === 'active' ? '/orders/active' : '/orders';
        const response = await fetch(`${API_BASE}${endpoint}`);
        const orders = await response.json();

        const container = document.getElementById('orders-list');

        if (orders.length === 0) {
            container.innerHTML = '<p class="empty-state">No orders found</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
      <div class="order-card ${order.order_type === 'delivery' ? 'order-delivery' : ''}">
        <div class="order-header">
          <div class="order-table-info">
            ${order.order_type === 'delivery'
                ? `<span class="order-table-badge delivery-badge">🛵 Delivery</span>`
                : `<span class="order-table-badge">Table ${order.table_number}</span>`
            }
            <span class="order-time">${formatTime(order.created_at)}</span>
          </div>
          <span class="order-status-badge ${order.status}">${order.status}</span>
        </div>
        <div class="order-body">
          <div class="order-items">
            ${order.items.slice(0, 3).map(item => `
              <div class="order-item">
                <span class="order-item-name">
                  ${item.name}
                  <span class="order-item-qty">x${item.quantity}</span>
                </span>
                <span class="order-item-price">${(item.price * item.quantity).toFixed(0)} ₺</span>
              </div>
            `).join('')}
            ${order.items.length > 3 ? `<p class="empty-state" style="padding: 0.5rem 0; font-size: 0.75rem;">+${order.items.length - 3} more items...</p>` : ''}
          </div>
          <div class="order-total-row">
            <span>Total</span>
            <span class="order-total-amount">${order.total_price.toFixed(0)} ₺</span>
          </div>
          <div class="order-actions">
            ${getOrderActionButtons(order)}
          </div>
        </div>
      </div>
    `).join('');

    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Error loading orders', 'error');
    }
}

function getOrderActionButtons(order) {
    const buttons = [];

    if (order.status !== 'paid') {
        const nextStatusMap = {
            'pending': 'preparing',
            'preparing': 'ready',
            'ready': 'served',
            'served': 'paid'
        };

        const nextStatus = nextStatusMap[order.status];
        if (nextStatus) {
            buttons.push(`
        <button class="btn-next-status" onclick="updateOrderStatus(${order.id}, '${nextStatus}')">
          Mark as ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
        </button>
      `);
        }

        if (order.status !== 'paid') {
            buttons.push(`
        <button class="btn-paid" onclick="updateOrderStatus(${order.id}, 'paid')">
          💰 Mark Paid
        </button>
      `);
        }
    }

    buttons.push(`
    <button class="btn-delete" onclick="confirmDeleteOrder(${order.id})">Delete</button>
  `);

    return buttons.join('');
}

// State for order modal
let selectedTableId = null;
let currentCategory = 'drinks';

async function openNewOrderModal() {
    currentOrderItems = [];
    selectedTableId = null;
    currentCategory = 'drinks';

    try {
        // Load available tables and menu items
        const [tablesData, menuData] = await Promise.all([
            fetch(`${API_BASE}/tables`).then(r => r.json()),
            fetch(`${API_BASE}/menu/available`).then(r => r.json())
        ]);

        menuItems = menuData;

        // Populate table grid (clickable cards instead of dropdown)
        const tableGrid = document.getElementById('order-table-grid');
        tableGrid.innerHTML = tablesData.map(t => `
            <div class="order-table-card ${t.status}" data-table-id="${t.id}" onclick="selectTable(${t.id}, ${t.table_number})" title="${t.status}">
                <span class="table-num">${t.table_number}</span>
            </div>
        `).join('');

        // Setup category tab handlers
        const categoryTabs = document.querySelectorAll('.order-cat-btn');
        categoryTabs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                categoryTabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = btn.dataset.category;
                renderOrderMenuItems(menuData, currentCategory);
            });
        });

        // Set first category as active
        categoryTabs.forEach(btn => {
            if (btn.dataset.category === 'drinks') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Render menu items for the default category
        renderOrderMenuItems(menuData, currentCategory);

        // Reset form
        document.getElementById('order-table').value = '';
        document.getElementById('order-id').value = '';
        document.getElementById('order-notes').value = '';
        document.getElementById('order-modal-title').textContent = 'New Order';

        // Reset Order Type
        const dineInRadio = document.querySelector('input[name="orderType"][value="dine_in"]');
        if (dineInRadio) {
            dineInRadio.checked = true;
            toggleOrderType('dine_in');
        }

        // Reset selected table display
        updateSelectedTableDisplay();
        updateOrderSummary();

        document.getElementById('order-modal').classList.add('active');

    } catch (error) {
        console.error('Error opening order modal:', error);
        showToast('Error loading data', 'error');
    }
}

function toggleOrderType(type) {
    const tableGroup = document.getElementById('table-selection-group');
    const tableInput = document.getElementById('order-table');
    const tableDisplay = document.getElementById('selected-table-info');

    if (type === 'delivery') {
        if (tableGroup) tableGroup.style.display = 'none';
        tableInput.value = ''; // No table for delivery
        tableInput.required = false;

        // Update display to show Delivery
        const container = document.getElementById('selected-table-info');
        container.classList.add('has-table');
        container.innerHTML = `<span class="table-badge delivery-badge">🛵 Delivery Order</span>`;

        // Clear selected table visually
        selectedTableId = null;
        document.querySelectorAll('.order-table-card').forEach(c => c.classList.remove('selected'));
    } else {
        if (tableGroup) tableGroup.style.display = 'block';
        tableInput.required = true;

        // Reset display
        updateSelectedTableDisplay(selectedTableId ? document.querySelector(`.order-table-card[data-table-id="${selectedTableId}"] .table-num`)?.textContent : null);
    }
}

function selectTable(tableId, tableNumber) {
    selectedTableId = tableId;
    document.getElementById('order-table').value = tableId;

    // Update visual selection
    document.querySelectorAll('.order-table-card').forEach(card => {
        card.classList.remove('selected');
        if (parseInt(card.dataset.tableId) === tableId) {
            card.classList.add('selected');
        }
    });

    updateSelectedTableDisplay(tableNumber);
}

function updateSelectedTableDisplay(tableNumber = null) {
    const container = document.getElementById('selected-table-info');
    if (tableNumber) {
        container.classList.add('has-table');
        container.innerHTML = `<span class="table-badge">📍 Table ${tableNumber}</span>`;
    } else {
        container.classList.remove('has-table');
        container.innerHTML = `<span class="table-badge">No table selected</span>`;
    }
}

function renderOrderMenuItems(items, category) {
    const container = document.getElementById('order-menu-items');
    const categoryLabel = document.getElementById('current-category-label');

    categoryLabel.textContent = formatCategory(category);

    const filtered = items.filter(item => item.category === category);

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No items in this category</p>';
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="order-menu-item ${item.available ? '' : 'unavailable'}">
            <div class="order-menu-item-name">${item.name}</div>
            <div class="order-menu-item-price">${item.price.toFixed(0)} ₺</div>
            <button type="button" class="order-menu-item-add" onclick="addToOrder(${item.id})">
                + Add
            </button>
        </div>
    `).join('');
}

function addToOrder(menuItemId) {
    const item = menuItems.find(m => m.id === menuItemId);
    if (!item) return;

    const existing = currentOrderItems.find(i => i.id === menuItemId);
    if (existing) {
        existing.quantity++;
    } else {
        currentOrderItems.push({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            quantity: 1
        });
    }

    updateOrderSummary();
}

function removeFromOrder(menuItemId) {
    currentOrderItems = currentOrderItems.filter(i => i.id !== menuItemId);
    updateOrderSummary();
}

function updateItemQuantity(menuItemId, delta) {
    const item = currentOrderItems.find(i => i.id === menuItemId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromOrder(menuItemId);
    } else {
        updateOrderSummary();
    }
}

function updateOrderSummary() {
    const container = document.getElementById('order-items-list');
    const totalEl = document.getElementById('order-total-price');

    if (currentOrderItems.length === 0) {
        container.innerHTML = '<p class="empty-state">No items added yet</p>';
        totalEl.textContent = '0 ₺';
        return;
    }

    container.innerHTML = currentOrderItems.map(item => `
    <div class="order-summary-item">
      <div class="order-summary-item-info">
        <div class="order-summary-item-qty">
          <button class="qty-btn" onclick="updateItemQuantity(${item.id}, -1)">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="updateItemQuantity(${item.id}, 1)">+</button>
        </div>
        <span class="order-summary-item-name">${item.name}</span>
      </div>
      <span class="order-summary-item-price">${(item.price * item.quantity).toFixed(0)} ₺</span>
      <button class="order-summary-item-remove" onclick="removeFromOrder(${item.id})">×</button>
    </div>
  `).join('');

    const total = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalEl.textContent = `${total.toFixed(0)} ₺`;
}
async function handleOrderSubmit(e) {
    e.preventDefault();

    const tableId = document.getElementById('order-table').value;
    const notes = document.getElementById('order-notes').value;

    // Get Order Type
    const orderType = document.querySelector('input[name="orderType"]:checked').value;

    if (orderType === 'dine_in' && !tableId) {
        showToast('Please select a table', 'error');
        return;
    }

    if (currentOrderItems.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }

    try {
        const payload = {
            items: currentOrderItems,
            notes,
            order_type: orderType
        };

        if (orderType === 'dine_in') {
            payload.table_id = parseInt(tableId);
        } else {
            payload.table_id = null;
        }

        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        closeModal('order-modal');
        loadOrders();
        // Refresh dashboard to show new order count/revenue
        loadDashboard();
        showToast('Order created successfully', 'success');

    } catch (error) {
        console.error('Error creating order:', error);
        showToast(error.message, 'error');
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }

        loadOrders();
        showToast(`Order marked as ${newStatus}`, 'success');

    } catch (error) {
        console.error('Error updating order:', error);
        showToast(error.message, 'error');
    }
}

function confirmDeleteOrder(orderId) {
    showConfirmModal(
        'Delete Order',
        'Are you sure you want to delete this order?',
        () => deleteOrder(orderId)
    );
}

async function deleteOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }

        closeModal('confirm-modal');
        loadOrders();
        showToast('Order deleted successfully', 'success');

    } catch (error) {
        console.error('Error deleting order:', error);
        showToast(error.message, 'error');
    }
}

// =====================================================
// MENU
// =====================================================
let menuFilter = 'all';
let allMenuItems = [];
let menuSearchTerm = '';

async function loadMenu() {
    try {
        const [menuResponse, categories] = await Promise.all([
            fetch(`${API_BASE}/menu`),
            fetchCategories()
        ]);

        allMenuItems = await menuResponse.json();

        // Render sidebar categories
        const sidebarProps = document.querySelector('.menu-sidebar');
        sidebarProps.innerHTML = `
            <div class="sidebar-category active" data-category="all">
              <span class="category-icon">📋</span>
              <span class="category-name">All Items</span>
            </div>
            ${categories.map(cat => `
            <div class="sidebar-category" data-category="${cat.slug}">
              <span class="category-icon">${cat.emoji}</span>
              <span class="category-name">${cat.name}</span>
            </div>
            `).join('')}
        `;

        // Setup sidebar category filters
        document.querySelectorAll('.sidebar-category').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-category').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                menuFilter = btn.dataset.category;
                updateCategoryTitle(btn.querySelector('.category-name').textContent);
                renderMenuNew(allMenuItems);
            });
        });

        renderMenuNew(allMenuItems);

    } catch (error) {
        console.error('Error loading menu:', error);
        showToast('Error loading menu', 'error');
    }
}

async function fetchCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        categoriesCache = await response.json();
        return categoriesCache;
    } catch (e) {
        console.error('Error fetching categories:', e);
        return [];
    }
}

function updateCategoryTitle(title) {
    document.getElementById('menu-category-title').textContent = title;
}

function filterMenuBySearch(term) {
    menuSearchTerm = term.toLowerCase();
    renderMenuNew(allMenuItems);
}

function getCategoryEmoji(categorySlug) {
    const category = categoriesCache.find(c => c.slug === categorySlug);
    return category ? category.emoji : '🍽️';
}

function renderMenuNew(items) {
    // Filter by category
    let filtered = menuFilter === 'all'
        ? items
        : items.filter(i => i.category === menuFilter);

    // Filter by search term
    if (menuSearchTerm) {
        filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(menuSearchTerm) ||
            (item.description && item.description.toLowerCase().includes(menuSearchTerm))
        );
    }

    const container = document.getElementById('menu-grid');
    const countEl = document.getElementById('menu-item-count');

    countEl.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No items found</p>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        const hasImage = item.image_url && item.image_url.trim() !== '';
        return `
        <div class="menu-card-new ${item.available ? '' : 'unavailable'}">
            <div class="menu-card-image" ${hasImage ? `style="background: url('${item.image_url}') center/cover no-repeat;"` : ''}>
                ${!hasImage ? `<span class="category-emoji">${getCategoryEmoji(item.category)}</span>` : ''}
                ${!item.available ? '<span class="menu-card-unavailable-badge">Unavailable</span>' : ''}
            </div>
            <div class="menu-card-body">
                <div class="menu-card-name">${item.name}</div>
                <div class="menu-card-description">${item.description || 'Delicious menu item'}</div>
                <div class="menu-card-availability">
                    <div class="toggle-switch ${item.available ? 'active' : ''}" 
                         onclick="toggleMenuAvailability(${item.id})"></div>
                    <span class="toggle-label">${item.available ? 'In Stock' : 'Out of Stock'}</span>
                </div>
                <div class="menu-card-footer">
                    <span class="menu-card-price">${item.price.toFixed(0)} ₺</span>
                    <div class="menu-card-actions-new">
                        <button class="btn-edit-small" onclick="editMenuItem(${item.id})" title="Edit">✏️</button>
                        <button class="btn-delete-small" onclick="confirmDeleteMenuItem(${item.id})" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// Keep old renderMenu for compatibility with order modal
function renderMenu(items) {
    renderMenuNew(items);
}

// Photo upload state
let pendingPhotoData = null;
let currentPhotoUrl = null;
let photoRemoved = false; // Track if user explicitly removed the photo

function openMenuItemModal(itemId = null) {
    const modal = document.getElementById('menu-modal');
    const title = document.getElementById('menu-modal-title');
    const form = document.getElementById('menu-form');
    const categorySelect = document.getElementById('menu-category');

    // Populate dynamic categories
    categorySelect.innerHTML = '<option value="">Select category</option>';
    categoriesCache.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.slug;
        option.textContent = `${cat.emoji} ${cat.name}`;
        categorySelect.appendChild(option);
    });

    form.reset();
    document.getElementById('menu-item-id').value = '';
    resetPhotoPreview();
    photoRemoved = false;

    if (itemId) {
        title.textContent = 'Edit Menu Item';
        // We need to fetch the item
        fetch(`${API_BASE}/menu/${itemId}`)
            .then(r => r.json())
            .then(item => {
                document.getElementById('menu-item-id').value = item.id;
                document.getElementById('menu-name').value = item.name;
                document.getElementById('menu-description').value = item.description || '';
                document.getElementById('menu-price').value = item.price;
                document.getElementById('menu-category').value = item.category;

                // Set current photo if exists
                if (item.image_url) {
                    setPhotoPreview(item.image_url);
                    currentPhotoUrl = item.image_url;
                }
            });
    } else {
        title.textContent = 'Add Menu Item';
    }

    modal.classList.add('active');
}

function resetPhotoPreview() {
    pendingPhotoData = null;
    currentPhotoUrl = null;
    const preview = document.getElementById('menu-photo-preview');
    preview.innerHTML = `
        <span class="photo-placeholder">📷</span>
        <span class="photo-text">No photo</span>
    `;
    preview.classList.remove('has-image');
    document.getElementById('remove-photo-btn').style.display = 'none';
    document.getElementById('menu-photo-input').value = '';
}

function setPhotoPreview(imageUrl) {
    const preview = document.getElementById('menu-photo-preview');
    preview.innerHTML = `<img src="${imageUrl}" alt="Item photo">`;
    preview.classList.add('has-image');
    document.getElementById('remove-photo-btn').style.display = 'inline-flex';
}

function previewMenuPhoto(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            pendingPhotoData = {
                data: e.target.result,
                filename: file.name
            };
            setPhotoPreview(e.target.result);
            photoRemoved = false; // User is adding a new photo, not removing
            console.log('Photo loaded:', file.name); // Debug log
        };

        reader.onerror = function () {
            showToast('Error reading file', 'error');
            pendingPhotoData = null;
        };

        reader.readAsDataURL(file);
    }
}

function removeMenuPhoto() {
    resetPhotoPreview();
    currentPhotoUrl = null;
    photoRemoved = true; // User explicitly wants to remove the photo
}

function editMenuItem(itemId) {
    openMenuItemModal(itemId);
}

async function handleMenuSubmit(e) {
    e.preventDefault();

    const itemId = document.getElementById('menu-item-id').value;
    const name = document.getElementById('menu-name').value;
    const description = document.getElementById('menu-description').value;
    const price = parseFloat(document.getElementById('menu-price').value);
    const category = document.getElementById('menu-category').value;

    let imageUrl = currentPhotoUrl;

    // If user explicitly removed the photo, set to null
    if (photoRemoved) {
        imageUrl = null;
    }

    try {
        // If there's a new photo to upload
        if (pendingPhotoData && pendingPhotoData.data) {
            console.log('Uploading photo:', pendingPhotoData.filename);
            showToast('Uploading photo...', 'info');
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: pendingPhotoData.data,
                    filename: pendingPhotoData.filename
                })
            });

            if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                imageUrl = uploadResult.imageUrl;
                console.log('Photo uploaded successfully:', imageUrl);
            } else {
                const errorData = await uploadResponse.json();
                console.error('Upload failed:', errorData);
                throw new Error('Failed to upload photo');
            }
        } else {
            console.log('No pending photo data, imageUrl:', imageUrl);
        }

        let response;
        if (itemId) {
            response = await fetch(`${API_BASE}/menu/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, price, category, image_url: imageUrl })
            });
        } else {
            response = await fetch(`${API_BASE}/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, price, category, image_url: imageUrl })
            });
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        closeModal('menu-modal');
        loadMenu();
        showToast(itemId ? 'Menu item updated' : 'Menu item added', 'success');

    } catch (error) {
        console.error('Error saving menu item:', error);
        showToast(error.message, 'error');
    }
}

async function toggleMenuAvailability(itemId) {
    try {
        const response = await fetch(`${API_BASE}/menu/${itemId}/availability`, {
            method: 'PATCH'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }

        loadMenu();

    } catch (error) {
        console.error('Error toggling availability:', error);
        showToast(error.message, 'error');
    }
}

function confirmDeleteMenuItem(itemId) {
    showConfirmModal(
        'Delete Menu Item',
        'Are you sure you want to delete this menu item?',
        () => deleteMenuItem(itemId)
    );
}

async function deleteMenuItem(itemId) {
    try {
        const response = await fetch(`${API_BASE}/menu/${itemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }

        closeModal('confirm-modal');
        loadMenu();
        showToast('Menu item deleted', 'success');

    } catch (error) {
        console.error('Error deleting menu item:', error);
        showToast(error.message, 'error');
    }
}

// =====================================================
// MODALS & UTILITIES
// =====================================================
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;

    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.onclick = onConfirm;

    document.getElementById('confirm-modal').classList.add('active');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const messageEl = document.getElementById('toast-message');

    toast.className = 'toast';
    toast.classList.add(type);
    messageEl.textContent = message;
    toast.classList.add('active');

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatCategory(category) {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function groupByCategory(items) {
    return items.reduce((groups, item) => {
        const category = item.category;
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(item);
        return groups;
    }, {});
}

// =====================================================
// Z-REPORT
// =====================================================
function openZReport() {
    const modal = document.getElementById('zreport-modal');
    const dateInput = document.getElementById('zreport-date');

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    modal.classList.add('active');
    loadZReport();
}

async function loadZReport() {
    const date = document.getElementById('zreport-date').value;
    const itemsContainer = document.getElementById('zreport-items');
    const categoriesContainer = document.getElementById('zreport-categories');
    const statusContainer = document.getElementById('zreport-status');
    const generatedEl = document.getElementById('zreport-generated');

    try {
        const response = await fetch(`${API_BASE}/orders/z-report?date=${date}`);
        const report = await response.json();

        // Update summary stats
        document.getElementById('zreport-total-orders').textContent = report.totalOrders;
        document.getElementById('zreport-total-revenue').textContent = `${report.totalRevenue.toFixed(0)} ₺`;

        // Render Top Items
        if (report.items.length === 0) {
            itemsContainer.innerHTML = '<p class="empty-state">No items sold on this date.</p>';
        } else {
            itemsContainer.innerHTML = `
                <table class="z-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Qty</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.items.map(item => `
                            <tr>
                                <td class="z-stat-name">${item.name}</td>
                                <td>${getCategoryEmoji(item.category)} ${formatCategory(item.category)}</td>
                                <td class="z-stat-count">${item.quantity}</td>
                                <td>${item.revenue.toFixed(0)} ₺</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        // Render Category Breakdown
        const categoriesHtml = Object.entries(report.categoryCounts)
            .map(([cat, count]) => {
                if (count === 0) return '';
                return `
                    <div class="z-stat-row">
                        <span class="z-stat-name">${getCategoryEmoji(cat)} ${formatCategory(cat)}</span>
                        <span class="z-stat-count">${count} items</span>
                    </div>
                `;
            }).join('');

        categoriesContainer.innerHTML = categoriesHtml || '<p class="empty-state">No sales yet.</p>';

        // Render Order Status
        const statusHtml = Object.entries(report.statusBreakdown)
            .map(([status, count]) => `
                <div class="z-stat-row">
                    <span class="z-stat-name">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    <span class="z-stat-count">${count}</span>
                </div>
            `).join('');

        statusContainer.innerHTML = statusHtml;

        // Update timestamp
        const genDate = new Date(report.generatedAt);
        generatedEl.textContent = `Generated: ${genDate.toLocaleDateString()} ${genDate.toLocaleTimeString()}`;

    } catch (error) {
        console.error('Error loading Z-Report:', error);
        showToast('Error loading report', 'error');
    }
}

function printZReport() {
    window.print();
}

// Close modals on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});
// =====================================================
// CATEGORIES MANAGEMENT
// =====================================================
function openCategoriesModal() {
    const modal = document.getElementById('categories-modal');
    modal.classList.add('active');
    loadCategoriesList();
    resetCategoryForm();
}

async function loadCategoriesList() {
    const categories = await fetchCategories(); // Refresh cache
    const tbody = document.getElementById('categories-table-body');

    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td>${cat.sort_order}</td>
            <td style="font-size: 1.5rem; text-align: center;">${cat.emoji}</td>
            <td style="font-weight: 500;">${cat.name}</td>
            <td style="color: var(--text-secondary); font-family: monospace;">${cat.slug}</td>
            <td>
                <div class="table-actions" style="justify-content: flex-start;">
                    <button class="btn-edit-small" onclick="editCategory(${cat.id})" title="Edit">✏️</button>
                    <button class="btn-delete-small" onclick="confirmDeleteCategory(${cat.id})" title="Delete">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function resetCategoryForm() {
    const form = document.getElementById('category-form');
    form.reset();
    document.getElementById('category-id').value = '';
    // Default sort order
    document.getElementById('category-order').value = categoriesCache.length + 1;
}

function generateSlug(name) {
    const slugInput = document.getElementById('category-slug');
    // Only auto-generate if user hasn't manually edited it (simple check: if it's empty or matches previous auto-gen)
    // For now, just always auto-gen if name changes and slug is empty or we force it? 
    // Let's just do it simple: auto-fill.
    const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    slugInput.value = slug;
}

async function handleCategorySubmit(e) {
    e.preventDefault();

    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value;
    const slug = document.getElementById('category-slug').value;
    const emoji = document.getElementById('category-emoji').value;
    const sort_order = parseInt(document.getElementById('category-order').value);

    const payload = { name, slug, emoji, sort_order };

    try {
        let response;
        if (id) {
            response = await fetch(`${API_BASE}/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(`${API_BASE}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }

        showToast(id ? 'Category updated' : 'Category created', 'success');
        resetCategoryForm();
        loadCategoriesList();

        // Refresh menu and sidebar to reflect changes
        loadMenu();

    } catch (error) {
        console.error('Error saving category:', error);
        showToast(error.message, 'error');
    }
}

async function editCategory(id) {
    const category = categoriesCache.find(c => c.id === id);
    if (!category) return;

    document.getElementById('category-id').value = category.id;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-slug').value = category.slug;
    document.getElementById('category-emoji').value = category.emoji;
    document.getElementById('category-order').value = category.sort_order;
}

function confirmDeleteCategory(id) {
    const category = categoriesCache.find(c => c.id === id);
    showConfirmModal(
        'Delete Category',
        `Are you sure you want to delete category "${category.name}"? This is only possible if no menu items are assigned to it.`,
        () => deleteCategory(id)
    );
}

async function deleteCategory(id) {
    try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }

        closeModal('confirm-modal');
        showToast('Category deleted', 'success');
        loadCategoriesList();
        loadMenu();

    } catch (error) {
        console.error('Error deleting category:', error);
        showToast(error.message, 'error');
    }
}
