# 🌊 AI FloodGuard — Autonomous Flood Early Warning & Evacuation System

> **Hackathon Submission** · Real-time Flood Intelligence Platform with Multi-Agent AI, Human-in-the-Loop Approval, and Emergency Broadcast

---

## 🎯 Project Overview

**AI FloodGuard** is a production-grade emergency response platform that uses an autonomous multi-agent AI pipeline to detect, predict, and respond to flood events in real time. The system ingests live weather telemetry, runs water-level analysis across IoT sensor networks, generates inundation maps, creates multilingual evacuation alerts, and routes them through a **Human-in-the-Loop (HITL)** approval gate before broadcasting to citizens — all in under 15 seconds.

---

## 🏗️ Architecture

```
Live Weather API (Open-Meteo)
        │
        ▼
[Hydrological Radar Agent]
  ├── Water level scoring (IoT sensors)
  ├── Rainfall index calculation
  └── Historical trend analysis
        │
        ▼
[Inundation Mapping Agent]
  ├── Flood propagation simulation
  └── Safe/Flooded zone classification
        │
        ▼
[Evacuation Routing Agent]
  ├── Path generation (OSRM-style)
  └── Safety confidence scoring
        │
        ▼
[Multilingual Alert Agent]
  ├── English / Tamil / Hindi synthesis
  └── Saves as 'pending_approval' in DB
        │
        ▼
[Human-In-The-Loop Gate — 15 seconds]
  ├── Admin/Coordinator reviews alert
  ├── APPROVE → Emergency Broadcast
  └── REJECT → Alert archived
        │
        ▼
Socket.io Emergency Broadcast
        │
        ▼
Citizen Notification + Evacuation Map
```

---

## ✨ Features

### Core Intelligence
- 🤖 **Multi-Agent AI Pipeline** — 4 specialist agents: Hydrological, Inundation, Routing, Multilingual
- 📊 **Real-time Risk Scoring** — Weighted probability model (water level 40%, forecast rain 25%, current rain 20%, history 15%)
- 🗺️ **Interactive Flood GIS Map** — Live sensor markers, flood buffer zones, evacuation polylines on OpenStreetMap
- 🌍 **Multilingual Alert Generation** — English, Tamil, Hindi alerts

### Real-time Infrastructure
- ⚡ **Socket.io Live Updates** — Sensor data, alerts, and chat broadcast instantly
- 📡 **IoT Telemetry Simulator** — Real-time water level updates across 4 sensor nodes
- 🔔 **Push Notifications** — In-app notification bell with unread count

### Emergency Response
- 🚨 **HITL Alert Verification** — 15-second approval window before public broadcast
- 🛡️ **Alert Dispatch Console** — Coordinators/Admins can create manual emergency alerts
- 🏕️ **Shelter Management** — Capacity tracking and status for emergency safe zones
- 🚁 **Rescue Request System** — Residents submit SOS requests, responders claim them
- 🗣️ **Coordination Chat** — Real-time inter-agency messaging with role badges

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS v4 |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL via Supabase |
| **Real-time** | Socket.io |
| **Authentication** | JWT + bcrypt |
| **Maps** | Leaflet.js + OpenStreetMap |
| **Charts** | Recharts |
| **Weather API** | Open-Meteo (free) + OpenWeatherMap backup |
| **Security** | Helmet.js + CORS |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- npm v9+
- PostgreSQL database (Supabase recommended)

### 1. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
DATABASE_URL=your_supabase_postgres_connection_string
JWT_SECRET=your_super_secure_secret_key
JWT_EXPIRE=24h
WEATHER_API_KEY=your_openweathermap_api_key
```

Start the backend:
```bash
node server.js
```

The server will automatically initialize the database schema and seed demo data.

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:
```bash
npm run dev
```

Open: **http://localhost:5173**

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **System Administrator** | admin@floodguard.org | admin123 |
| **Emergency Coordinator** | coordinator@floodguard.org | coord123 |
| **Resident** | resident@floodguard.org | user123 |

---

## 📡 API Documentation

All endpoints require `Authorization: Bearer <JWT_TOKEN>` header (except auth routes).

### Authentication
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Weather Intelligence
```
GET /api/weather/current
GET /api/weather/forecast
```

### Flood Prediction (AI)
```
GET  /api/flood/risk
GET  /api/flood/history
POST /api/ai/predict          (Admin/Coord only)
```

### Sensor Telemetry (IoT)
```
GET /api/sensors/live
```

### Emergency Alerts
```
GET  /api/alerts/live
POST /api/alerts/create             (Coord/Admin)
POST /api/alerts/:id/verify         (Admin — HITL gate)
```

### Map & Evacuation
```
GET /api/map/evacuation-routes
```

### Rescue Operations
```
GET  /api/rescue/requests
POST /api/rescue/request
PUT  /api/rescue/:id/claim
PUT  /api/rescue/:id/status
```

### Shelter Management
```
GET  /api/shelters
POST /api/shelters               (Admin)
PUT  /api/shelters/:id/occupancy
```

### Dashboard
```
GET /api/dashboard/stats
```

### Admin
```
GET    /api/users
DELETE /api/users/:id           (Admin)
```

---

## 🎬 Demo Workflow (For Judges)

1. **Login** as `admin@floodguard.org`
2. **Dashboard** — View live weather stats, sensor risk levels, recent alerts
3. **Live Map** — See sensor nodes color-coded (green/amber/red), evacuation route polylines
4. **Weather** — Live temperature, rainfall, forecast chart  
5. **Flood Prediction** — Click "Execute AI Recalculation" → Full agent pipeline runs
6. **Alert Center** — View auto-generated HITL alert, click "APPROVE DISPATCH" within 15s
7. **Admin Dashboard** — View all users, active sensors, prediction history
8. **Rescue Requests** — Submit SOS as resident, claim as coordinator
9. **Chat** — Real-time coordination between roles

### AI Pipeline Flow
```
Click "Execute AI Recalculation"
  → HydrologicalAgent scores water level + rain data
  → InundationAgent identifies flooded sensor zones
  → RoutingAgent generates evacuation paths to safe zones
  → MultilingualAlertAgent creates trilingual alert (EN/TA/HI)
  → Alert saved as 'pending_approval'
  → Alert appears in Alert Center for HITL review
  → Admin approves → Broadcast via Socket.io
  → All connected clients see alert instantly
```

---

## 🔒 Security Features

- ✅ JWT Authentication — 24-hour expiry
- ✅ Password Hashing — bcrypt salt rounds=10
- ✅ Role-based Authorization — Resident/Coordinator/Admin middleware
- ✅ Protected Routes — Frontend guards + backend middleware
- ✅ Helmet.js — HTTP security headers
- ✅ Input Validation — Required field checks on all endpoints
- ✅ Environment Variables — All secrets in `.env`

---

## 📁 Project Structure

```
Flood/
├── backend/
│   ├── config/          # Database connection pool
│   ├── controllers/     # Route handler logic
│   ├── db/              # Schema init + seeding
│   ├── middleware/       # JWT auth, error handling
│   ├── routes/          # Express router definitions
│   ├── services/        # AI agents, prediction engine, weather
│   └── server.js        # Entry point
│
└── frontend/
    └── src/
        ├── components/  # Layout, shared UI
        ├── context/     # Auth context (JWT state)
        ├── pages/       # All page components
        ├── services/    # Axios API client
        └── main.tsx     # Vite entry point
```

---

## 🏆 Hackathon Highlights

| Feature | Implementation |
|---------|---------------|
| **AI Agents** | 4-agent pipeline (Hydrological → Inundation → Routing → Multilingual) |
| **Real Data** | Live Open-Meteo weather, real Supabase DB, real sensor simulation |
| **Human-in-Loop** | 15-second HITL gate before emergency broadcast |
| **Multilingual** | English + Tamil + Hindi alert synthesis |
| **Real-time** | Socket.io for live sensor/alert/chat updates |
| **Role-based** | 3-tier access control with JWT |
| **Maps** | Interactive Leaflet GIS with flood zones + evacuation routes |

---

*AI FloodGuard — Because every second counts when floodwaters rise.*
