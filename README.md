# NovaChat

NovaChat is a modern, real-time chat application built with the MERN stack. Users can create and moderate rooms with granular privacy controls, collaborate in real time through Socket.IO, and manage membership through an intuitive, responsive UI.

## Repository Structure

```
chat-app/
├─ client/               # React + Vite frontend (Tailwind, Socket.IO client)
├─ server/               # Express backend (REST + Socket.IO)
├─ package.json          # Root workspace scripts
├─ README.md
└─ ...
```

- **client/** – Vite/React application styled with Tailwind CSS, Headless UI, and Heroicons.
- **server/** – Express API with modular controllers, Mongoose models, JWT auth, and Socket.IO gateway.
- **workspaces** – Root `package.json` manages both client and server with shared scripts.

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **MongoDB** (local service, Docker container, or Atlas cluster)

## Getting Started

1. **Clone & install**
   ```bash
   npm install
   ```

2. **Environment variables**
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
   Update the copied files with your own values (see tables below).

3. **Run in development**
   ```bash
   npm run dev          # starts server (port 3001) and client (port 5173)
   ```
   - Backend only: `npm run dev:server`
   - Frontend only: `npm run dev:client`

4. **Open the app**
   Visit `http://localhost:5173` and sign in or register to start chatting.

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `PORT` | Express + Socket.IO port | `3001` |
| `MONGO_URI` | MongoDB connection string | _required_ |
| `JWT_SECRET` | Secret used to sign access tokens | _required_ |
| `BCRYPT_SALT_ROUNDS` | Salt rounds for password hashing | `10` |
| `CLIENT_ORIGIN` | Allowed origin for CORS & Socket.IO | `http://localhost:5173` |

### Client (`client/.env`)

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `VITE_API_URL` | REST API base URL | `http://localhost:3001/api` |
| `VITE_SOCKET_URL` | Socket.IO server URL | `http://localhost:3001` |

## Setting Up MongoDB Locally (macOS / Homebrew)

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0 mongosh
brew services start mongodb-community@7.0
```

Verify the service:

```bash
mongosh "mongodb://127.0.0.1:27017/chat-app"
```

Then update `server/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/chat-app
```

> Prefer Docker? Run `docker run --name chat-mongo -p 27017:27017 -d mongo:7.0` and keep the same URI.

## Key Features

- **Secure authentication** – JWT-based login/registration with hashed credentials.
- **Room privacy controls** – Public, private, and request-to-join modes with owner management tooling.
- **Real-time chat** – Socket.IO delivers live messaging, presence updates, and moderation signals.
- **Persistent history** – Messages, rooms, and users stored in MongoDB with Mongoose models.
- **Modern UI** – Tailwind-styled layout with room discovery, owner dashboards, and responsive design.

## Scripts

- `npm run dev` – Run server and client concurrently.
- `npm run dev:server` / `npm run dev:client` – Start each workspace independently.
- `npm run build` – Production build for the React client.
- `npm run lint` – Lint the frontend codebase.

## Tech Stack

- **Frontend** – React 19, Vite, Tailwind CSS, Headless UI, Heroicons, Socket.IO client.
- **Backend** – Node.js, Express, Socket.IO, Mongoose, JWT, bcrypt, Helmet, CORS.
- **Database** – MongoDB (Atlas or self-hosted).
- **Tooling** – npm workspaces, nodemon, concurrently, ESLint.

Happy chatting!
