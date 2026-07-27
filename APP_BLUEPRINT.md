# Instamart Fresh & Smart Counter POS — Application Blueprint

## Overview
**Instamart Fresh & Smart Counter POS** is a lightning-fast, ultra-modern quick-commerce and fresh produce grocery retail platform designed for modern storefronts, dark stores, and daily vegetable & fruit vendors. Inspired by sleek quick-commerce interfaces (featuring 6-minute delivery badges, zero-fee banners, and high-contrast dark/purple themes), the app integrates a full Shopkeeper & Customer experience with a dedicated Counter POS billing workflow, live inventory management, and digital weight scale calculator.

---

## Architecture & Tech Stack

- **Frontend**: React 18+ with Vite, Tailwind CSS (utility-first styling), Lucide React icons, Motion animations.
- **Backend**: Node.js & Express (`server.ts`) supporting API routing and server-side operations.
- **State Management**: Robust React hooks with persistent localStorage synchronization and local state controllers.
- **Type Safety**: Fully typed with TypeScript (`/src/types.ts`).

---

## Core Modules & Features

### 1. Zepto-Style Quick Commerce Header & Navigation
- **Ultra-Fast Dispatch Hub**: Displays delivery timing estimates (e.g., "⚡ 6 minutes"), store location, and store branding badges (`zepto`, `MONSOON STORE`, `Fresh Store`).
- **Fee Transparency Banners**: Highlights ₹0 handling fees, ₹0 delivery fees, and everyday wholesale farm pricing.
- **Sleek Floating Bottom Dock**: A modern iOS/Android style bottom navigation bar for quick switching between Counter POS, Live Orders, Product Stock, and Store Settings.

### 2. Counter POS & Dedicated Checkout Page
- **Product Catalog Grid**: Filter produce by categories (*Daily Essentials, Root Vegetables, Leafy Greens, Exotic Fruits, Organic Herbs*) with instant search filtering.
- **Smart Weight & Quantity Presets**: Quick buttons for weight increments (500g, 1kg, 2kg) and custom unit types (`kg`, `pcs`, `bundles`).
- **Dedicated Checkout Page**: Dedicated full-screen bill review interface allowing cashiers and shopkeepers to review itemized bills, enter customer name & phone numbers, select payment modes (*Cash, UPI, Card*), and complete the counter sale with instant invoice generation.

### 3. Live Orders & Delivery Tracker
- Real-time customer online orders queue.
- Order status updates (*Pending, Preparing, Out for Delivery, Delivered, Cancelled*).
- Live simulated rider GPS tracking and delivery timeline.

### 4. Inventory & Stock Management
- Real-time stock level indicators, low-stock alerts, and restocking tools.
- Product price management and category filtering.

### 5. Store & Hub Settings
- Store name, address, operating hours, delivery radius configuration, and digital receipt header customization.

---

## Data Models (`/src/types.ts`)

- **Product**: `id`, `name`, `category`, `pricePerUnit`, `unitType` (`kg` | `pcs` | `bundle`), `image`, `inStock`, `stockQty`.
- **CartItem / POSItem**: `item`, `qtyOrWeight` (in grams for kg items, or units for pcs).
- **Order**: `id`, `customerName`, `customerPhone`, `items`, `totalAmount`, `paymentMethod`, `status`, `createdAt`, `deliveryTime`.
- **StoreConfig**: `name`, `address`, `phone`, `upiId`, `taxRate`, `deliveryFee`.

---

## User Flow
1. **Launch**: Opens directly into the Zepto-style fresh produce dashboard with the floating bottom navigation dock.
2. **Counter POS**: Shopkeeper selects items from the catalog or uses quick weight presets.
3. **Checkout**: Taps "View Bill" or "Proceed to Checkout Page" to review the itemized bill, customer details, and payment mode.
4. **Completion**: Completes the sale, prints/records the invoice, and updates inventory instantly.
