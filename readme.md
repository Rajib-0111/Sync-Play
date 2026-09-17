# 🎵 SyncPlay

**SyncPlay** is a web-based collaborative music player that allows users to listen to music individually or create shared listening rooms where multiple users can listen together in real time.

The project focuses on learning and implementing **real-time communication, synchronized playback, room management, chat, and shared playlists** using modern web technologies.

---

## ✨ Features

### 🎧 Single Listening

* Listen to music independently.
* Search for songs using YouTube.
* Play, pause, seek, and switch between songs.
* Responsive music-player interface.

### 👥 Listening Rooms

* Create a room with a unique Room ID.
* Automatically connect the room creator to the room.
* Join an existing room using its Room ID.
* Display the number of connected users.
* Display the names of users currently in the room.
* Automatically transfer host ownership when the host leaves.
* Automatically remove empty temporary rooms.

### 🔄 Real-Time Synchronization

When multiple users are connected to a room:

* ▶️ Play/pause synchronization
* ⏩ Seek synchronization
* 🎵 Song-change synchronization
* 👑 Host management
* 👤 Join/leave events

### 💬 Room Chat

* Real-time text chat between room members.
* User names are displayed with messages.
* Messages from other users trigger notifications when the Chat tab isn't active.
* Chat automatically scrolls to the latest message.

### 🔔 Notifications

Users receive notifications when:

* Someone joins the room.
* Someone leaves the room.
* Someone sends a new chat message while the Chat tab isn't active.

Notifications automatically disappear after a few seconds.

### 📱 Responsive UI

The interface is designed to work across:

* Desktop
* Tablet
* Mobile

The UI uses a dark purple/black theme with neon magenta and violet accents.

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* JavaScript
* YouTube API / YouTube embedded player

### Backend

* Python
* FastAPI
* WebSockets

### Planned Infrastructure

* MongoDB — room existence / persistence
* Redis or another Pub/Sub system — cross-instance real-time communication

### Deployment

* Vercel — frontend
* Backend currently deployed on Vercel during development

---

## 📁 Project Structure

```text
music_player/
│
├── client/
│   ├── public/
│   │   └── music/
│   │       └── music.mp3
│   │
│   ├── src/
│   │   ├── App.jsx
│   │   ├── MusicPlayer.jsx
│   │   ├── SongSearch.jsx
│   │   ├── YouTubePlayer.jsx
│   │   ├── VinylLoader.jsx
│   │   ├── VinylLoader.css
│   │   └── index.css
│   │
│   ├── .env
│   └── package.json
│
└── server/
    ├── main.py
    ├── venv/
    └── requirements.txt
```

---

## 🏗️ Current Architecture

```text
                    ┌──────────────────┐
                    │   React Client   │
                    │                  │
                    │ Music Player     │
                    │ Rooms            │
                    │ Chat             │
                    └────────┬─────────┘
                             │
                       HTTP / WebSocket
                             │
                             ▼
                    ┌──────────────────┐
                    │     FastAPI      │
                    │                  │
                    │ REST API         │
                    │ WebSocket Server │
                    │ Room State       │
                    └────────┬─────────┘
                             │
                             ▼
                       Temporary
                     In-Memory State
```

The current development version keeps active WebSocket connections and temporary room state in FastAPI memory.

---

## ⚠️ Current Architecture Limitation

When deployed across multiple server instances, in-memory room state is **not shared between instances**.

For example:

```text
                Vercel
        ┌───────────────────┐
        │                   │
        ▼                   ▼
   Instance A          Instance B
   ┌─────────┐         ┌─────────┐
   │ Room A  │         │ Room A? │
   │ User 1  │         │ User 2  │
   └─────────┘         └─────────┘
```

Instance A and Instance B have separate memory.

Therefore, MongoDB alone cannot solve real-time synchronization.

MongoDB can provide shared room existence:

```text
Instance A ──┐
             ├──► MongoDB
Instance B ──┘
```

But real-time events require a shared communication layer.

---

## 🚀 Planned Production Architecture

The planned architecture separates persistent room information from real-time communication.

```text
                         ┌──────────────┐
                         │   MongoDB    │
                         │              │
                         │ Room ID      │
                         │ Room metadata│
                         └──────┬───────┘
                                │
                         Room existence
                                │
                                ▼

Users ───── WebSocket ───► Real-Time Server
                                │
                                ▼
                         ┌──────────────┐
                         │ Redis /      │
                         │ Pub/Sub      │
                         └──────┬───────┘
                                │
                    Cross-instance events
                                │
                         ┌──────┴───────┐
                         ▼              ▼
                       User A         User B
```

Redis/Pub/Sub will be responsible for distributing real-time events such as:

```text
play_pause
song_change
seek
chat
join
leave
queue_update
host_change
```

MongoDB will not be used to broadcast real-time events.

---

## 📋 Planned Shared Queue

SyncPlay will support a shared room queue.

Example:

```text
Room: ABC123

Queue
────────────────────
1. Song A
2. Song B
3. Song C
4. Song D
```

All connected users will receive queue updates in real time.

Planned operations:

* Add song
* Remove song
* Reorder songs
* Change current song
* Synchronize queue between members

The queue will initially be temporary and associated with the active room.

---

## 📱 Mobile Reconnection

Mobile browsers can suspend background tabs to save battery and memory.

This can interrupt WebSocket connections.

SyncPlay therefore plans to implement:

```text
Browser backgrounded
        ↓
WebSocket disconnected
        ↓
Room remains available
        ↓
User returns
        ↓
WebSocket reconnects
        ↓
Current room state restored
```

The goal is to make temporary mobile disconnections recover gracefully instead of treating every disconnect as a permanent room departure.

---

## 🔐 Data Philosophy

SyncPlay is designed to minimize stored user information.

The planned database should store only information necessary for room management.

For example:

```text
rooms
├── room_id
└── creation / expiry metadata
```

User names, chat messages, and temporary WebSocket state are not intended to be permanently stored in MongoDB.

---

## 🔌 API

### Create Room

```http
POST /api/rooms/create
```

Example response:

```json
{
  "room_id": "Z5Z912"
}
```

---

### Join Room

```http
POST /api/rooms/join
```

Parameters:

```text
room_id
user_name
```

Example response:

```json
{
  "message": "Joined room successfully",
  "room_id": "Z5Z912"
}
```

---

### WebSocket

```text
/ws/{room_id}?user_name={user_name}
```

The WebSocket connection is used for real-time room communication.

---

## 📡 WebSocket Events

### Play / Pause

```json
{
  "type": "play_pause",
  "playing": true
}
```

### Seek

```json
{
  "type": "seek",
  "time": 42.5
}
```

### Song Change

```json
{
  "type": "song_change",
  "song": {}
}
```

### Chat

```json
{
  "type": "chat",
  "name": "User",
  "message": "Hello!"
}
```

### Room Event

Join:

```json
{
  "type": "room_event",
  "event": "join",
  "name": "User"
}
```

Leave:

```json
{
  "type": "room_event",
  "event": "leave",
  "name": "User"
}
```

### Room Status

```json
{
  "type": "room_status",
  "users": 2,
  "names": [
    "Rajib",
    "Alex"
  ],
  "host": "Rajib"
}
```

---

## ⚙️ Local Development

### 1. Clone the repository

```bash
git clone <repository-url>
cd music_player
```

### 2. Start the backend

```bash
cd server
```

Create and activate a virtual environment:

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install fastapi uvicorn
```

Run the server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

### 3. Start the frontend

Open another terminal:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 🔑 Environment Variables

Create:

```text
client/.env
```

Add:

```env
VITE_YOUTUBE_API_KEY=your_api_key_here
```

The API key should be restricted through the Google Cloud Console according to the deployment requirements.

---

## 🎨 UI Design

SyncPlay uses a dark music-focused interface.

### Main visual direction

* Deep black/purple backgrounds
* Neon magenta accents
* Violet highlights
* Dark cards
* Subtle borders
* Soft glow effects
* Responsive layouts
* Animated vinyl record while music is playing

---

## 🧠 Learning Goals

This project is also being developed as a practical learning project.

The main concepts explored include:

* React state management
* React hooks
* WebSockets
* FastAPI
* REST APIs
* Real-time synchronization
* Client/server architecture
* Room management
* Event-driven communication
* Reconnection handling
* Database integration
* Redis Pub/Sub
* Responsive UI design
* Vercel deployment
* Distributed server architecture

---

## 🗺️ Roadmap

### ✅ Completed

* [x] React/Vite frontend
* [x] FastAPI backend
* [x] Music player
* [x] YouTube song search
* [x] Create room
* [x] Join room
* [x] Room ID generation
* [x] WebSocket connection
* [x] User count
* [x] User names
* [x] Host assignment
* [x] Host reassignment
* [x] Join notifications
* [x] Leave notifications
* [x] Play/pause synchronization
* [x] Song synchronization
* [x] Seek synchronization
* [x] Room chat
* [x] Chat auto-scroll
* [x] New-message notifications
* [x] Responsive UI
* [x] Mobile-friendly notifications

### 🚧 In Progress

* [ ] Robust mobile WebSocket reconnection
* [ ] Persistent room existence
* [ ] Cross-instance real-time communication
* [ ] Production WebSocket architecture

### 🔮 Planned

* [ ] Shared synchronized queue
* [ ] Queue reordering
* [ ] Better playback-state recovery
* [ ] Redis Pub/Sub
* [ ] MongoDB room management
* [ ] Room expiration
* [ ] Improved connection handling
* [ ] Production deployment architecture

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

If you find a bug or have an idea for SyncPlay, feel free to open an issue or submit a pull request.

---

## 📄 License

This project is currently intended as a personal learning and development project.

A formal open-source license can be added when the project is ready for public distribution.
