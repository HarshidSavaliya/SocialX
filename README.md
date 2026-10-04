# SocialX — Full-Stack MERN Social Media Platform with Real-Time Messaging & Agora Video Calling

SocialX is a modern, unified social media platform built with the MERN stack (MongoDB + Express.js + React 19 + Node.js), powered by Tailwind CSS, Cloudinary media handling, Socket.IO real-time event streaming, and Agora.io WebRTC audio/video calling.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Completed Requirements (R.1 – R.10)](#completed-requirements-r1--r10)
5. [Agora.io Video Calling System](#agoraio-video-calling-system)
6. [Environment Variables](#environment-variables)
7. [Installation & Setup](#installation--setup)
8. [Running the Application](#running-the-application)
9. [Agora Setup Guide](#agora-setup-guide)
10. [Cloudinary Setup Guide](#cloudinary-setup-guide)
11. [MongoDB Atlas Setup Guide](#mongodb-atlas-setup-guide)
12. [REST API Documentation](#rest-api-documentation)
13. [Socket.IO Events Documentation](#socketio-events-documentation)
14. [Automated Test Suites](#automated-test-suites)
15. [License](#license)

---

## 1. Overview

SocialX bridges the visual clarity of clean desktop social dashboards with the refined aesthetics of dark editorial interfaces. The application provides end-to-end features including user authentication, multimedia post sharing, social interactions (likes, comments, shares, follows), one-to-one real-time messaging, PIN-secured ephemeral Secret Chat, role-based admin moderation, and real-time one-to-one Agora.io HD video calling.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 19 (Hooks, Context API, Suspense, Lazy Loading)
- **Bundler:** Vite 8 with optimized Rolldown code splitting
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) with glassmorphism design tokens
- **Media RTC:** `agora-rtc-sdk-ng` (v4.24+) for hardware media track capture and playback
- **Real-Time Client:** `socket.io-client` (v4.8+) for persistent bi-directional signaling
- **Icons:** `lucide-react`
- **HTTP Client:** `axios` with bearer token interceptors

### Backend
- **Runtime:** Node.js (v24.x)
- **Framework:** Express.js (v4.x) with MVC architectural pattern
- **Database:** MongoDB & Mongoose ODM (v8.x)
- **Authentication:** JWT (JSON Web Tokens) & `bcryptjs` password hashing
- **RTC Token Generator:** `agora-token` (official standard Agora AccessToken builder)
- **Real-Time Server:** `socket.io` (v4.8+) with room namespaces and JWT handshake middleware
- **File Uploads:** Multer (memoryStorage streaming) & Cloudinary SDK

### Cloud Services
- **Agora.io:** Global low-latency Real-Time Communication (RTC) audio/video network
- **Cloudinary:** Cloud storage, dynamic transformations, and CDN asset delivery
- **MongoDB Atlas:** Distributed cloud database cluster

---

## 3. Architecture

### A. REST API Data Flow (MVC Pattern)
```
Browser / React UI
        │ (HTTP JSON Requests + JWT Bearer Token)
        ▼
Express Route Handlers (/api/*)
        │
Middleware Layer (authMiddleware, errorMiddleware, multer)
        │
Controllers (Request parsing & response dispatch)
        │
Services (Business logic, validation, token generation, cascade triggers)
        │
Mongoose Models (Schema validation, pre-save hooks, indexes)
        ▼
MongoDB Atlas Database
```

### B. Real-Time Socket.IO Signaling Flow
```
Browser / React UI
        │ (WebSocket Connection authenticated via handshake JWT)
        ▼
Socket Server (/socket/socketServer.js)
        ├── Personal Room: user:{userId} (Targeted call alerts & direct notifications)
        ├── Conversation Room: conversation:{id} (Real-time normal chat & typing)
        ├── Secret Room: secret:conversation:{id} (PIN-isolated ephemeral chat)
        └── Call Room: call:{channelName} (Hardware media toggles & mute states)
```

### C. Agora.io Audio & Video Transport Flow
```
User A (Caller)                            User B (Receiver)
      │                                          │
      ├───── 1. Request Video Call (REST) ─────►│
      │◄──── 2. Token & Channel Generated ──────┤
      │                                          │
      │───── 3. Socket Call Invitation ─────────►│
      │                                          ├─ 4. Accept Call (REST)
      │◄──── 5. Socket Call Accepted ────────────┤
      │                                          │
      ▼                                          ▼
┌────────────────────────────────────────────────────────┐
│             Agora Global RTC SD-RTN Media Mesh         │
│  - User A publishes local Audio & Camera Video Tracks  │
│  - User B publishes local Audio & Camera Video Tracks  │
│  - Hardware muting controlled via local track APIs     │
└────────────────────────────────────────────────────────┘
```

---

## 4. Completed Requirements (R.1 – R.10)

| Requirement | Module | Feature Highlights |
|---|---|---|
| **R.1** | Profile Management | Register, Login, Logout, Profile update, Avatar upload, Password/Email update |
| **R.3** | Post Management | Create post (text, image, video), Edit post, Cascade delete post & Cloudinary cleanup |
| **R.4** | Social Interaction | Atomic Like/Unlike, Post comments, Delete comment, Post sharing with counters |
| **R.5** | Follow System | Follow/Unfollow user, Followers list, Following list, Self-follow protection |
| **R.6** | Messaging | 1-to-1 normal chat, real-time typing indicators, read receipts, message history |
| **R.7** | Notifications | Real-time & persistent notifications for Likes, Comments, Follows, Messages, Video Calls |
| **R.8** | Search | Multi-entity search for Users, Posts, Hashtags with debounced filtering |
| **R.9** | Admin Moderation | User management, Account blocking/suspension enforcement, Harmful post deletion, Audit logs |
| **R.10** | Secret Chat | PIN-locked ephemeral chat, auto-delete message limits, delete-on-exit purge, view-once media |
| **Phase 5** | Agora Video Calling | One-to-one video calling, incoming/outgoing UI, camera/mic controls, busy & missed call flow |

---

## 5. Agora.io Video Calling System

### Security Principles
1. **Zero Secret Leakage:** `AGORA_APP_CERTIFICATE` resides strictly on the backend server. It is NEVER exposed to the frontend, network payloads, or client bundles.
2. **Ephemeral Scoped Tokens:** Agora RTC tokens are generated with strict integer UIDs and short expiration windows (default: 3600 seconds).
3. **Session Participant Authorization:** Only authenticated participants belonging to the specific `CallSession` can request an Agora token for that channel.
4. **Account Suspension Enforcement:** Blocked accounts (`accountStatus === 'BLOCKED'`) cannot initiate or participate in video calls.
5. **Simultaneous Call Prevention (Busy State):** Users currently engaged in a call reject incoming calls with HTTP 486 Busy and an informative message.

---

## 6. Environment Variables

Create `.env` in the `backend/` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/socialx
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Agora.io Configuration (BACKEND ONLY)
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
AGORA_TOKEN_EXPIRY=3600
```

---

## 7. Installation & Setup

### Prerequisites
- Node.js (v18+ or v24.x recommended)
- MongoDB (Local instance or MongoDB Atlas URI)
- Git

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/HarshidSavaliya/SocialX.git
cd SocialX

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Seed Initial Database (Demo Data & Admin Account)
```bash
# From root directory:
npm run seed

# Or from backend directory:
cd backend
npm run seed
```

---

## 8. Running the Application

Both backend and frontend can be started easily:

### Option A: From Root Directory
- **Run Backend:** `npm run dev-server` (runs on http://localhost:5000)
- **Run Frontend:** `npm run dev` or `npm run dev-client` (runs on http://localhost:5173)

### Option B: In Separate Terminals
```bash
# Terminal 1 - Backend Server
cd backend
npm run dev

# Terminal 2 - Frontend Client
cd frontend
npm run dev
```

---

## 9. Agora Setup Guide

1. Sign up or log into [Agora.io Console](https://console.agora.io/).
2. Create a new Project with **App ID + App Certificate** token authentication mode.
3. Copy your **App ID** and paste into `backend/.env` as `AGORA_APP_ID`.
4. Copy your **Primary Certificate** and paste into `backend/.env` as `AGORA_APP_CERTIFICATE`.
5. Restart the backend server. The application will now generate live Agora RTC tokens for hardware audio/video streaming.

---

## 10. Cloudinary Setup Guide

1. Create a free account at [Cloudinary](https://cloudinary.com/).
2. Retrieve your **Cloud Name**, **API Key**, and **API Secret** from the dashboard.
3. Paste credentials into `backend/.env`.
4. Images and videos uploaded to posts or avatars are automatically stored and served via Cloudinary.

---

## 11. MongoDB Atlas Setup Guide

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write privileges.
3. Whitelist your IP address (or `0.0.0.0/0` for development).
4. Copy the connection string (e.g. `mongodb+srv://...`) into `MONGO_URI` in `backend/.env`.

---

## 12. REST API Documentation

### Authentication & Users
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login user (returns JWT token)
- `GET /api/auth/me` — Get authenticated user details
- `PUT /api/users/profile` — Update bio, location, website
- `POST /api/users/profile/picture` — Upload avatar to Cloudinary
- `POST /api/users/:id/follow` — Follow user
- `DELETE /api/users/:id/follow` — Unfollow user

### Video Calls (Phase 5)
- `POST /api/video-calls/initiate` — Initiate 1-on-1 video call session
- `POST /api/video-calls/accept` — Accept incoming call & receive receiver Agora token
- `POST /api/video-calls/reject` — Reject incoming call
- `POST /api/video-calls/end` — Terminate call and compute duration
- `POST /api/video-calls/missed` — Mark unanswered call as missed and notify
- `GET /api/video-calls/token/:callSessionId` — Retrieve temporary Agora token for session
- `GET /api/video-calls/history` — Get user call history

### Normal Chat & Messaging
- `GET /api/conversations` — Get user conversations list
- `POST /api/conversations` — Create or retrieve 1-to-1 conversation
- `GET /api/conversations/:id/messages` — Get paginated message history
- `POST /api/messages` — Send text/media message
- `PATCH /api/conversations/:id/read` — Mark conversation messages as read

### Ephemeral Secret Chat
- `POST /api/secret-chats/initialize` — Create PIN-protected secret chat
- `POST /api/secret-chats/:id/verify-pin` — Verify PIN and obtain scoped secret session token
- `POST /api/secret-messages` — Send secret message (requires `x-secret-token`)
- `POST /api/secret-chats/:id/exit` — Wipe all messages and close session

### Admin Moderation
- `GET /api/admin/dashboard` — Platform statistics (users, posts, status)
- `GET /api/admin/users` — Paginated user listing with search filters
- `PATCH /api/admin/users/:id/block` — Suspend user account
- `PATCH /api/admin/users/:id/unblock` — Restore user account
- `DELETE /api/admin/posts/:id` — Delete harmful post with moderation audit log

---

## 13. Socket.IO Events Documentation

### Video Calling Events
| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `call:invite` | Server ➔ Receiver | `{ callSessionId, channelName, caller, callerUid }` | Alerts receiver of incoming call |
| `call:ringing` | Server ➔ Caller | `{ callSessionId, channelName, receiver }` | Informs caller that receiver is ringing |
| `call:accept` | Server ➔ Caller | `{ callSessionId, channelName, receiverUid }` | Informs caller that call was accepted |
| `call:reject` | Server ➔ Caller | `{ callSessionId, reason }` | Informs caller that call was declined |
| `call:busy` | Server ➔ Caller | `{ callSessionId, message }` | Informs caller that receiver is on another call |
| `call:end` | Server ➔ Peer | `{ callSessionId, endedBy, duration, reason }` | Informs peer that call has terminated |
| `call:missed` | Server ➔ Both | `{ callSessionId, message }` | Signals call timeout / missed call |
| `call:media-state` | Client ⇄ Peer | `{ targetUserId, isAudioMuted, isVideoMuted }` | Syncs microphone / camera mute states |

---

## 14. Multi-Computer & Cross-Device Setup Guide

SocialX is designed to run seamlessly across multiple computers and devices on the same local network (Wi-Fi/LAN) or over the internet without conflicts:

### 1. Running the Backend for Network Access
Start the backend server on the host machine:
```bash
cd backend
npm run dev
```
The server automatically configures dynamic CORS origins and binds to all interfaces on port `5000`.

### 2. Running the Frontend for Multiple Computers
Start the frontend development server:
```bash
cd frontend
npm run dev
```
Vite automatically listens on `0.0.0.0` (`host: true`), displaying your local network IP (e.g., `http://192.168.1.15:5173`).

### 3. Connecting from Other Computers or Mobile Devices
- On any second computer or smartphone connected to the same Wi-Fi, open your browser and navigate to:
  `http://<HOST_IP_ADDRESS>:5173` (e.g. `http://192.168.1.15:5173`)
- The frontend dynamically routes all API requests and WebSocket signaling to the host machine.
- Multiple users can log in simultaneously (e.g. User A as `@alexrivera`, User B as `@georgelobko`), chat in real-time, initiate video calls, and interact on posts without conflicts.

### 4. MongoDB Atlas Multi-Computer Access
To allow all computers to connect to MongoDB Atlas without individual IP restrictions:
1. Go to [MongoDB Atlas](https://cloud.mongodb.com) ➔ **Network Access**.
2. Click **Add IP Address** ➔ Select **Allow Access From Anywhere** (`0.0.0.0/0`).
3. Save changes. All computers will now share the same cloud database!
*(Note: If Atlas is temporarily unreachable, the backend automatically falls back to your local MongoDB instance without crashing).*

---

## 15. Stories Feature (Instagram-Style Ephemeral Content)

SocialX includes a full-stack, production-grade Instagram-like Story feature:

### Capabilities
- **Multimedia Stories:** Upload images (JPEG, PNG, WEBP) and videos (MP4, WEBM, MOV) up to 30MB directly to Cloudinary.
- **24-Hour Expiration:** Stories automatically expire after 24 hours (`expiresAt = createdAt + 24 hours`). All queries strictly filter active stories (`expiresAt > now`), backed by asynchronous MongoDB TTL index cleanup.
- **Privacy Controls:** Choose between `public` (visible to followers and discoverable profiles) and `followers` (strictly restricted to authenticated followers).
- **Two-Way Block Protection:** Automatically prevents blocked users from viewing, discovering, or interacting with stories.
- **View Tracking & Viewer Lists:** View records are uniquely tracked per story using the `StoryView` model. Only the story author can inspect their story's viewer list.
- **Full-Screen Responsive Viewer:** Features segmented multi-story progress bars, 5-second auto-advance for images, video-duration synchronization for videos, tap-to-navigate, keyboard shortcuts (`ArrowLeft`, `ArrowRight`, `Space`, `Escape`), and hold-to-pause.
- **Feed & Profile Integration:** Story tray appears naturally at the top of the feed with vibrant unviewed rings and subtle viewed rings. Profile avatars display glowing story rings when active stories exist.

### Database Models

#### `Story`
| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique story identifier |
| `user` | ObjectId (ref: User) | Story creator / author |
| `mediaUrl` | String | Cloudinary secure delivery URL |
| `mediaPublicId` | String | Cloudinary asset public ID for deletion |
| `mediaType` | String (`image` \| `video`) | Media format |
| `caption` | String (max 200 chars) | Sanitized story caption / text |
| `privacy` | String (`public` \| `followers`) | Audience visibility |
| `expiresAt` | Date | Expiration timestamp (created + 24h) |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

#### `StoryView`
| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique view record identifier |
| `story` | ObjectId (ref: Story) | Story reference |
| `viewer` | ObjectId (ref: User) | Authenticated viewer reference |
| `viewedAt` | Date | Timestamp when story was viewed |

*Compound Unique Index:* `{ story: 1, viewer: 1 }` prevents duplicate view records.

### Stories REST API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/stories` | Yes | Upload image/video story with caption & privacy |
| `GET` | `/api/stories/feed` | Yes | Get active stories feed grouped by user |
| `GET` | `/api/stories/user/:userId` | Optional | Get active stories for a specific user profile |
| `GET` | `/api/stories/:storyId` | Optional | Get single active story by ID |
| `POST` | `/api/stories/:storyId/view` | Yes | Record a view for an active story |
| `DELETE` | `/api/stories/:storyId` | Yes | Delete story & Cloudinary asset (owner/admin) |
| `GET` | `/api/stories/:storyId/viewers` | Yes | Get viewer list with timestamps (author only) |

---

## 16. License

This project is licensed under the ISC License.
