/* =====================================================
   CAFE ORDER SYSTEM - Main Application JavaScript
   ===================================================== */

// API Base URL
const API_BASE = '/api';

// State
let currentOrderItems = [];
let menuItems = [];
let tables = [];

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFilters();
    loadDashboard();
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
        document.getElementById('stat-today-revenue').textContent = `$${(orderStats.today_revenue || 0).toFixed(2)}`;

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
        <span class="table-mini-capacity">${table.capacity} seats</span>
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
        <div class="table-capacity">👥 ${table.capacity} seats</div>
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
            document.getElementById('table-capacity').value = table.capacity;
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
    const capacity = parseInt(document.getElementById('table-capacity').value);

    try {
        let response;
        if (tableId) {
            response = await fetch(`${API_BASE}/tables/${tableId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_number: tableNumber, capacity })
            });
        } else {
            response = await fetch(`${API_BASE}/tables`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_number: tableNumber, capacity })
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
      <div class="order-card">
        <div class="order-header">
          <div class="order-table-info">
            <span class="order-table-badge">Table ${order.table_number}</span>
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
                <span class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            ${order.items.length > 3 ? `<p class="empty-state" style="padding: 0.5rem 0; font-size: 0.75rem;">+${order.items.length - 3} more items...</p>` : ''}
          </div>
          <div class="order-total-row">
            <span>Total</span>
            <span class="order-total-amount">$${order.total_price.toFixed(2)}</span>
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

async function openNewOrderModal() {
    currentOrderItems = [];

    try {
        // Load available tables and menu items
        const [tablesData, menuData] = await Promise.all([
            fetch(`${API_BASE}/tables`).then(r => r.json()),
            fetch(`${API_BASE}/menu/available`).then(r => r.json())
        ]);

        menuItems = menuData;

        // Populate table select
        const tableSelect = document.getElementById('order-table');
        tableSelect.innerHTML = `
      <option value="">Choose a table...</option>
      ${tablesData.map(t => `
        <option value="${t.id}">Table ${t.table_number} (${t.capacity} seats) - ${t.status}</option>
      `).join('')}
    `;

        // Populate menu items grouped by category
        const menuContainer = document.getElementById('order-menu-items');
        const groupedMenu = groupByCategory(menuData);

        menuContainer.innerHTML = Object.entries(groupedMenu).map(([category, items]) => `
      <div class="menu-category-group">
        <h4 style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; margin: 0.75rem 0 0.5rem; letter-spacing: 1px;">
          ${formatCategory(category)}
        </h4>
        ${items.map(item => `
          <div class="order-menu-item ${item.available ? '' : 'unavailable'}">
            <div class="order-menu-item-info">
              <div class="order-menu-item-name">${item.name}</div>
              <div class="order-menu-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <button class="order-menu-item-btn" onclick="addToOrder(${item.id})">+</button>
          </div>
        `).join('')}
      </div>
    `).join('');

        updateOrderSummary();

        document.getElementById('order-id').value = '';
        document.getElementById('order-notes').value = '';
        document.getElementById('order-modal-title').textContent = 'New Order';
        document.getElementById('order-modal').classList.add('active');

    } catch (error) {
        console.error('Error opening order modal:', error);
        showToast('Error loading data', 'error');
    }
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
        totalEl.textContent = '$0.00';
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
      <span class="order-summary-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
      <button class="order-summary-item-remove" onclick="removeFromOrder(${item.id})">×</button>
    </div>
  `).join('');

    const total = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalEl.textContent = `$${total.toFixed(2)}`;
}

async function handleOrderSubmit(e) {
    e.preventDefault();

    const tableId = document.getElementById('order-table').value;
    const notes = document.getElementById('order-notes').value;

    if (!tableId) {
        showToast('Please select a table', 'error');
        return;
    }

    if (currentOrderItems.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table_id: parseInt(tableId),
                items: currentOrderItems,
                notes
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        closeModal('order-modal');
        loadOrders();
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

async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE}/menu`);
        const items = await response.json();

        // Setup category filters
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                menuFilter = btn.dataset.category;
                renderMenu(items);
            });
        });

        renderMenu(items);

    } catch (error) {
        console.error('Error loading menu:', error);
        showToast('Error loading menu', 'error');
    }
}

function renderMenu(items) {
    const filtered = menuFilter === 'all'
        ? items
        : items.filter(i => i.category === menuFilter);

    const container = document.getElementById('menu-grid');

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No items in this category</p>';
        return;
    }

    container.innerHTML = filtered.map(item => `
    <div class="menu-card ${item.available ? '' : 'unavailable'}">
      <div class="menu-card-header">
        <span class="menu-item-name">${item.name}</span>
        <span class="menu-item-price">$${item.price.toFixed(2)}</span>
      </div>
      <span class="menu-item-category">${formatCategory(item.category)}</span>
      <p class="menu-item-description">${item.description || 'No description'}</p>
      <div class="menu-item-availability">
        <div class="availability-toggle ${item.available ? 'active' : ''}" 
             onclick="toggleMenuAvailability(${item.id})"></div>
        <span class="availability-label">${item.available ? 'Available' : 'Unavailable'}</span>
      </div>
      <div class="menu-card-actions">
        <button class="btn-edit" onclick="editMenuItem(${item.id})">Edit</button>
        <button class="btn-delete" onclick="confirmDeleteMenuItem(${item.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function openMenuItemModal(itemId = null) {
    const modal = document.getElementById('menu-modal');
    const title = document.getElementById('menu-modal-title');
    const form = document.getElementById('menu-form');

    form.reset();
    document.getElementById('menu-item-id').value = '';

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
            });
    } else {
        title.textContent = 'Add Menu Item';
    }

    modal.classList.add('active');
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

    try {
        let response;
        if (itemId) {
            response = await fetch(`${API_BASE}/menu/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, price, category })
            });
        } else {
            response = await fetch(`${API_BASE}/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, price, category })
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
