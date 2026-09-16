from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import random
import string

app = FastAPI()
rooms = {}

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:5173",
    "http://10.145.200.222:5173",
    "https://md1h5l7g-5173.inc1.devtunnels.ms"
  ],
  allow_credentials=False,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.get("/api/test")
def test():
  return {
    "message": "Server Working"
  } 

@app.post("/api/rooms/create")
def create_room():
  room_id ="".join(
    random.choices(
      string.ascii_uppercase + string.digits,
      k=6
    )
  )
  rooms[room_id]={
    "host":None,
    "users":[],
    "is_playing": False
  }

  return{
    "room_id": room_id
  }


@app.post("/api/rooms/join")
def join_room(room_id:str):
  room_id = room_id.upper()
  if room_id not in rooms:
    raise HTTPException(
      status_code=404,
      detail="Room Not Found"
    )
  return{
    "message":"Joined room successfully",
    "room_id":room_id
  }

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
  await websocket.accept()
  room_id = room_id.upper()
  if room_id not in rooms:
    await websocket.send_json({
      "error": "Room Not Found"
    })
    await websocket.close()
    return
  rooms[room_id]["users"].append(websocket)
  print("Users in room:",len(rooms[room_id]["users"]))

  for user in rooms[room_id]["users"]:
    await user.send_json({
        "type": "room_status",
        "users": len(rooms[room_id]["users"])
    })
  await websocket.send_json({
    "message": "WebSocket Connected",
    "room_id": room_id,
    "users": len(rooms[room_id]["users"])
  })
  try:
    while True:
      data = await websocket.receive_json()
      print(data)
      if data["type"] == "song_change":
        rooms[room_id]["is_playing"] = True

      if data["type"] == "play_pause":
        rooms[room_id]["is_playing"] = data["playing"]


      for user in rooms[room_id]["users"]:
        if user != websocket:
            await user.send_json(data)
  except Exception:
    rooms[room_id]["users"].remove(websocket)
    print("User disconnected. Users in room:",len(rooms[room_id]["users"]))