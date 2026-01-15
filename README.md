# Cafe Order System

A modern, full-stack business process automation system for cafes and restaurants. Manage tables, orders, and menus with a beautiful dark-themed interface.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.18-blue)
![SQLite](https://img.shields.io/badge/SQLite-3-lightgrey)

## ✨ Features

### 📋 Table Management
- Add, edit, and delete restaurant tables
- Track table capacity (number of seats)
- Real-time status updates (Available, Occupied, Reserved)
- Visual status indicators

### 📝 Order Management
- Create orders by selecting tables and menu items
- Track order status (Pending → Preparing → Ready → Served → Paid)
- Automatic table status updates when orders are created/completed
- Order notes for special instructions
- Quick status transitions with one click

### 🍽️ Menu Management
- Full CRUD operations for menu items
- Categories: Drinks, Appetizers, Main Course, Desserts, Sides
- Toggle item availability
- Price management
- Item descriptions

### 📊 Dashboard
- Real-time statistics overview
- Available tables count
- Active orders count
- Today's revenue tracking
- Quick action buttons

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cafe-order-system.git
cd cafe-order-system
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## 📁 Project Structure

```
cafe-order-system/
├── package.json           # Dependencies and scripts
├── server.js              # Express server entry point
├── database/
│   └── db.js             # SQLite database setup and seed data
├── models/
│   ├── Table.js          # Table model with CRUD operations
│   ├── Order.js          # Order model with status management
│   └── MenuItem.js       # Menu item model
├── routes/
│   ├── tables.js         # Tables API endpoints
│   ├── orders.js         # Orders API endpoints
│   └── menu.js           # Menu API endpoints
└── public/
    ├── index.html        # Main application HTML
    ├── css/
    │   └── style.css     # Premium dark theme styles
    └── js/
        └── app.js        # Frontend application logic
```

## 🔌 API Endpoints

### Tables
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tables` | Get all tables |
| GET | `/api/tables/stats` | Get table statistics |
| GET | `/api/tables/:id` | Get single table |
| POST | `/api/tables` | Create new table |
| PUT | `/api/tables/:id` | Update table |
| PATCH | `/api/tables/:id/status` | Update table status |
| DELETE | `/api/tables/:id` | Delete table |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get all orders |
| GET | `/api/orders/active` | Get active orders |
| GET | `/api/orders/stats` | Get order statistics |
| GET | `/api/orders/:id` | Get single order |
| GET | `/api/orders/table/:tableId` | Get orders for table |
| POST | `/api/orders` | Create new order |
| PUT | `/api/orders/:id` | Update order |
| PATCH | `/api/orders/:id/status` | Update order status |
| DELETE | `/api/orders/:id` | Delete order |

### Menu
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | Get all menu items |
| GET | `/api/menu/available` | Get available items |
| GET | `/api/menu/categories` | Get all categories |
| GET | `/api/menu/stats` | Get menu statistics |
| GET | `/api/menu/:id` | Get single item |
| GET | `/api/menu/category/:category` | Get items by category |
| POST | `/api/menu` | Add new menu item |
| PUT | `/api/menu/:id` | Update menu item |
| PATCH | `/api/menu/:id/availability` | Toggle availability |
| DELETE | `/api/menu/:id` | Delete menu item |

## 💾 Database

The application uses SQLite with the following schema:

### Tables
- `id` - Primary key
- `table_number` - Unique table number
- `capacity` - Number of seats
- `status` - available | occupied | reserved
- `created_at`, `updated_at` - Timestamps

### Menu Items
- `id` - Primary key
- `name` - Item name
- `description` - Item description
- `price` - Price in dollars
- `category` - drinks | appetizers | main_course | desserts | sides
- `available` - Boolean availability flag
- `created_at`, `updated_at` - Timestamps

### Orders
- `id` - Primary key
- `table_id` - Foreign key to tables
- `items` - JSON array of order items
- `status` - pending | preparing | ready | served | paid
- `total_price` - Calculated total
- `notes` - Special instructions
- `created_at`, `updated_at` - Timestamps

## 🎨 Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite with better-sqlite3
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: Custom CSS with dark theme, glassmorphism effects

## 🔧 Configuration

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## 📄 License

MIT License - feel free to use this project for your restaurant or cafe!

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
