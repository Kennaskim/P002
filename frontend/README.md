# Textbook-exchange-platform: Multi-Sided Educational Logistics & Exchange Marketplace

A full-stack, multi-tenant logistical marketplace built to solve regional educational supply friction. EduSwap connects peer-to-peer textbook swappers, verified retail bookshops, academic institutions, and third-party delivery riders into a single synchronized platform[cite: 1, 2].

## System Architecture & Portals

The frontend is a React Single Page Application (SPA) utilizing Vite, structured into four strictly bounded user portals[cite: 1]:

1. **The Consumer / Parent Portal** (`ParentDashboard.jsx`): Enables peer-to-peer textbook discovery, automated swap-matching requests, and standard e-commerce cart checkouts[cite: 1].
2. **The Retailer Portal** (`BookshopDashboard.jsx`): A B2C vendor dashboard for local bookshops to upload digital inventory, track gross earnings, and process incoming fulfillment orders[cite: 1].
3. **The Institution Portal** (`SchoolDashboard.jsx`): Allows school administrators to officially publish and update verified seasonal reading lists (`SchoolBookListsPage.jsx`) for parents to one-click bulk order[cite: 1].
4. **The Dispatch / Rider Portal** (`RiderDashboard.jsx`): An operational interface for delivery drivers to view available neighborhood dispatches, claim order deliveries, and trigger fulfillment updates[cite: 1].

## Core Technical Highlights

* **State Management:** Fully decoupled client-side state utilizing custom React Context providers (`AuthContext.jsx`, `CartContext.jsx`, `NotificationContext.jsx`)[cite: 1].
* **Live GPS Tracking:** Integrated interactive mapping panels (`TrackingMapPanel.jsx`, `TrackingInfoPanel.jsx`) allowing buyers to track driver dispatch coordinates[cite: 1].
* **Real-Time Infrastructure:** Bi-directional WebSockets (`ws.js`) powering an instant customer support chat widget (`ChatWidget.jsx`, `ChatPage.jsx`)[cite: 1].
* **Fintech Integration:** Automated mobile money payment triggers and verification via M-Pesa push APIs (`mpesa_utils.py`, `PaymentVerifyPage.jsx`)[cite: 1].

## Technology Stack

### Frontend
* **Core:** React (Vite)[cite: 1, 2]
* **Routing:** React Router (`ProtectedRoute.jsx`)[cite: 1]
* **State:** React Context API[cite: 1]

### Backend & DevOps
* **Framework:** Python / Django REST Framework[cite: 2]
* **Database:** PostgreSQL / SQLite robust relational schemas[cite: 1, 2]
* **Orchestration:** Docker Compose (`docker-compose.yml`)[cite: 1]

---

## Quickstart (Local Development)