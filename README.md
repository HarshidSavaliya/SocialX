# SocialX — Full-Stack MERN Social Media Platform

SocialX is a modern, unified social media platform built with the MERN stack (MongoDB + Express.js + React 19 + Node.js) with Tailwind CSS, Cloudinary media handling, and MVC backend architecture.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Phase 2 Implementation](#phase-2-implementation)
  - [R.3 Post Management](#r3-post-management)
  - [R.4 Social Interaction](#r4-social-interaction)
  - [R.5 Follow System](#r5-follow-system)
  - [Feed Algorithm & Pagination](#feed-algorithm--pagination)
- [Database Schema & Scalability](#database-schema--scalability)
- [Cloudinary Media Handling & Cleanup](#cloudinary-media-handling--cleanup)
- [REST API Reference](#rest-api-reference)
- [Getting Started](#getting-started)
- [Running Automated Tests](#running-automated-tests)
- [License](#license)

---

## Overview

SocialX combines the clarity of clean social dashboards (Reference 1) with the refined elegance of modern dark editorial interfaces (Reference 2). In **Phase 2**, the platform transitions from an interface shell into a live, connected social application backed by MongoDB Atlas and Express MVC services.

---

## Architecture & Tech Stack

### Backend: MVC Architecture

```
Route ──> Middleware ──> Controller ──> Service ──> Model ──> MongoDB
```

- **Runtime:** Node.js (v24.x)
- **Framework:** Express.js (v4.x)
- **Database:** MongoDB & Mongoose (v8.x)
- **Authentication:** JWT (JSON Web Tokens) & bcryptjs password hashing
- **Media Engine:** Cloudinary SDK & Multer (memoryStorage streaming)
- **CORS & Environment:** cors & dotenv

### Frontend Architecture

- **Core:** React 19 & Vite 8
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) with custom glassmorphism utilities
- **Typography:** Plus Jakarta Sans
- **Icons:** Lucide React
- **Client Layer:** Axios API instance with request/response interceptors
- **State Management:** React Context (`AuthContext`, `ThemeContext`) & local component state

---

## Phase 2 Implementation

### R.3 Post Management
- **R.3.1 Create Post (`POST /api/posts`):**
  - Authenticated user author auto-assignment (`req.user._id`).
  - Supports text caption, image upload, video upload, and hashtags.
  - Normalizes hashtags (lowercase, deduplicated, prefixed with `#`).
  - Cloudinary asset upload with metadata storage (`mediaUrl`, `mediaPublicId`, `mediaType`).
- **R.3.2 Edit Post (`PUT /api/posts/:id`):**
  - Strict authorization: only the authenticated post author can edit (`post.author === req.user._id`).
  - Media replacement safely deletes the old Cloudinary asset.
- **R.3.3 Delete Post (`DELETE /api/posts/:id`):**
  - Owner-only authorization check.
  - Cascade deletes associated comments, likes, and shares.
  - Cleans up Cloudinary asset via `cloudinary.uploader.destroy`.

### R.4 Social Interaction
- **R.4.1 Like Post (`POST /api/posts/:id/like`):**
  - Atomically creates a `Like` document with compound unique index `{ post: 1, user: 1 }`.
  - Atomically increments `likesCount`.
  - Duplicate clicks prevent double-counting.
- **R.4.2 Unlike Post (`DELETE /api/posts/:id/like`):**
  - Deletes `Like` document and atomically decrements `likesCount`.
  - Optimistic UI on frontend with instant rollback on API error.
- **R.4.3 Comment on Post (`POST /api/posts/:id/comments`):**
  - Non-empty validation, max 1000 characters limit.
  - Populates author info (`name`, `username`, `profileImage`).
  - Atomically increments `commentsCount`.
- **R.4.4 Delete Comment (`DELETE /api/comments/:id`):**
  - Moderation authorization: either the comment author OR the post owner can delete.
  - Atomically decrements `commentsCount`.
- **R.4.5 Share Post (`POST /api/posts/:id/share`):**
  - Records share relationship in `Share` collection.
  - Increments `sharesCount` and displays real-time feedback toast.

### R.5 Follow System
- **R.5.1 Follow User (`POST /api/users/:id/follow`):**
  - Prevents self-follow (`follower !== following`).
  - Compound unique index `{ follower: 1, following: 1 }` prevents duplicates.
  - Atomically updates `followingCount` and `followersCount`.
- **R.5.2 Unfollow User (`DELETE /api/users/:id/follow`):**
  - Removes follow document and decrements counters atomically.
- **R.5.3 View Followers (`GET /api/users/:id/followers`):**
  - Lists followers with profile avatar, name, username, and mutual follow state.
- **R.5.4 View Following (`GET /api/users/:id/following`):**
  - Lists followed users with profile avatar, name, username, and follow state.

---

## Database Schema & Scalability

Instead of embedding unbounded arrays inside a single document (which fails MongoDB's 16MB document limit and causes lock contention), SocialX uses reference-based relational collections with targeted indexes:

```
┌───────────┐         ┌───────────┐         ┌───────────┐
│   User    │◄────────│   Post    │◄────────│  Comment  │
└───────────┘         └───────────┘         └───────────┘
      ▲                     ▲                     ▲
      │                     │                     │
┌───────────┐         ┌───────────┐         ┌───────────┐
│  Follow   │         │   Like    │         │   Share   │
└───────────┘         └───────────┘         └───────────┘
```

### Applied Indexes:
- **`User`**: `username: 1` (unique), `email: 1` (unique)
- **`Post`**: `{ author: 1, createdAt: -1 }`, `{ createdAt: -1 }`, `hashtags: 1`
- **`Like`**: `{ post: 1, user: 1 }` (unique compound index)
- **`Comment`**: `{ post: 1, createdAt: 1 }`
- **`Follow`**: `{ follower: 1, following: 1 }` (unique compound index), `{ following: 1 }`, `{ follower: 1 }`
- **`Share`**: `{ post: 1, user: 1 }`, `{ user: 1, createdAt: -1 }`

---

## REST API Reference

### Authentication
- `POST /api/auth/register` — Create account (`name`, `username`, `email`, `password`)
- `POST /api/auth/login` — Sign in (`emailOrUsername`, `password`)
- `POST /api/auth/logout` — Sign out
- `GET /api/auth/me` — Get current user (protected)

### Posts
- `POST /api/posts` — Create post with text/image/video/hashtags (protected, multipart)
- `GET /api/posts/feed?page=1&limit=10&filter=all` — Paginated feed
- `GET /api/posts/:id` — Single post details
- `PUT /api/posts/:id` — Edit own post (protected)
- `DELETE /api/posts/:id` — Delete own post with cascade cleanup (protected)

### Social Interactions
- `POST /api/posts/:id/like` — Like post (protected)
- `DELETE /api/posts/:id/like` — Unlike post (protected)
- `POST /api/posts/:id/comments` — Add comment (protected)
- `GET /api/posts/:id/comments` — List comments for post
- `DELETE /api/comments/:id` — Delete comment (protected: author or post owner)
- `POST /api/posts/:id/share` — Share post (protected)

### Users & Follow System
- `GET /api/users/:username` — Public profile details with `isFollowing` flag
- `PUT /api/users/profile` — Update profile details (protected)
- `PUT /api/users/profile-image` — Upload avatar to Cloudinary (protected)
- `GET /api/users/suggestions?limit=5` — Suggested creators not yet followed
- `POST /api/users/:id/follow` — Follow user (protected)
- `DELETE /api/users/:id/follow` — Unfollow user (protected)
- `GET /api/users/:id/followers` — Followers list
- `GET /api/users/:id/following` — Following list

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+ or v24+)
- MongoDB running locally on port 27017 or MongoDB Atlas URI

### 2. Environment Configuration
Create `backend/.env` (see `backend/.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/socialx
JWT_SECRET=your_jwt_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Install Dependencies
```sh
npm run install-server
npm run install-client
```

### 4. Seed Demo Data
Populate MongoDB with demo users, posts, comments, likes, and follow relationships:
```sh
cd backend
node config/seed.js
cd ..
```

### 5. Run the Application
- **Run Backend Server:**
  ```sh
  npm run dev-server
  ```
  Runs at `http://localhost:5000`.

- **Run Frontend Client:**
  ```sh
  npm run dev
  ```
  Runs at `http://localhost:5173`.

### 6. Build Frontend for Production
```sh
npm run build-client
```

---

## Running Automated Tests

Run the comprehensive Phase 2 automated test suite:
```sh
cd backend
node test_phase2.js
```

The test suite runs 26 automated assertions testing authentication, post CRUD, authorization guards, duplicate like prevention, atomic like count updates, comments, shares, follow rules, self-follow prevention, feed pagination, and user profile queries.

---

## License

Distributed under the ISC License.
