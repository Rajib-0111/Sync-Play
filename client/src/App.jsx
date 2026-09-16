import { useEffect, useState } from "react";
import SongSearch from "./SongSearch";
import YouTubePlayer from "./YoutubePlayer";
import IP from "./ip";

function App() {
  const [videoId, setVideoId] = useState("M7lc1UVf-VE");
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [roomUsers, setRoomUsers] = useState(0);


  const handlePlayPause = (playing) => {
    if (roomUsers > 1 && socket) {
      socket.send(
        JSON.stringify({
          type: "play_pause",
          playing: playing,
        }),
      );
    }
  };

  const selectSong = (id, index) => {
    setVideoId(id);
    setCurrentIndex(index);
    if (roomUsers > 1 && socket) {
      socket.send(
        JSON.stringify({
          type: "song_change",
          song: songs[index],
        }),
      );
    }
  };

  const connectToRoom = (roomId) => {
    const ws = new WebSocket(`wss://${IP}/ws/${roomId.toUpperCase()}`);
    ws.onopen = () => {
      console.log("WebSocket Connected");
      setSocket(ws);
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Server:", data);

      if (data.type == "room_status") {
        setRoomUsers(data.users);
      }
      if (data.type === "song_change") {
        const song = data.song;
        setVideoId(song.id.videoId);
        setSongs((currentSongs) => {
          const existingIndex = currentSongs.findIndex(
            (item) => item.id.videoId === song.id.videoId,
          );

          if (existingIndex !== -1) {
            setCurrentIndex(existingIndex);
            return currentSongs;
          }

          const newSongs = [...currentSongs, song];

          setCurrentIndex(newSongs.length - 1);

          return newSongs;
        });
      }
      if (data.type === "play_pause") {
        if (data.playing) {
          window.dispatchEvent(new CustomEvent("sync-play"));
        } else {
          window.dispatchEvent(new CustomEvent("sync-pause"));
        }
      }
      if (data.type === "seek") {
        window.dispatchEvent(
          new CustomEvent("sync-seek", {
            detail: data.time,
          }),
        );
      }
    };

    ws.onclose = () => {
      console.log("WebSocket Disconnected");
    };

    ws.onerror = (error) => {
      console.log("WebSocket Error:", error);
    };
  };

  useEffect(() => {
    const handleLocalSeek = (event) => {
      if (roomUsers > 1 && socket) {
        socket.send(
          JSON.stringify({
            type: "seek",
            time: event.detail,
          }),
        );
      }
    };

    window.addEventListener("local-seek", handleLocalSeek);

    return () => {
      window.removeEventListener("local-seek", handleLocalSeek);
    };
  }, [roomUsers, socket]);

  const joinRoom = async () => {
    const response = await fetch(
      `https://${IP}/api/rooms/join?room_id=${joinRoomId}`,
      {
        method: "POST",
      },
    );
    const data = await response.json();
    if (response.ok) {
      setJoinMessage(`Joined Room : ${data.room_id}`);
      connectToRoom(data.room_id);
    } else {
      setJoinMessage(data.detail);
    }
  };

  const createRoom = async () => {
  const response = await fetch(`https://${IP}/api/rooms/create`, {
    method: "POST",
  });

  console.log("Response:", response);

  const data = await response.json();

  console.log("Data:", data);

  setRoomId(data.room_id);

  console.log("Room ID:", data.room_id);

  connectToRoom(data.room_id);
};

  const nextTrack = () => {
    if (songs.length === 0) {
      return;
    }

    if (currentIndex < songs.length - 1) {
      const nextIndex = currentIndex + 1;

      setVideoId(songs[nextIndex].id.videoId);
      setCurrentIndex(nextIndex);

      if (roomUsers > 1 && socket) {
        socket.send(
          JSON.stringify({
            type: "song_change",
            song: songs[nextIndex],
          }),
        );
      }
    }
  };

  const previousTrack = () => {
    if (songs.length === 0) {
      return;
    }

    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;

      setVideoId(songs[previousIndex].id.videoId);
      setCurrentIndex(previousIndex);
      if (roomUsers > 1 && socket) {
        socket.send(
          JSON.stringify({
            type: "song_change",
            song: songs[previousIndex],
          }),
        );
      }
    }
  };
  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null;
  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-10">
      <h1 className="text-3xl font-bold text-center mb-10">SyncPlay</h1>

      <div className="max-w-6xl mx-auto">
        <div className="bg-[#181818] rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-5">Room</h2>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={createRoom}
              className="bg-white text-black px-5 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Create Room
            </button>

            {roomId && (
              <div className="bg-[#242424] px-5 py-3 rounded-lg">
                <p className="text-gray-400 text-sm">Room ID</p>

                <p className="text-xl font-bold tracking-widest">{roomId}</p>
              </div>
            )}

            <div className="flex flex-1 gap-3">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="flex-1 min-w-0 bg-[#242424] text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
              />

              <button
                onClick={joinRoom}
                className="bg-white text-black px-5 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Join Room
              </button>
            </div>
          </div>

          {joinMessage && <p className="mt-4 text-gray-300">{joinMessage}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#181818] rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-5">Search Music</h2>

            <SongSearch
              setVideoId={setVideoId}
              songs={songs}
              setSongs={setSongs}
              selectSong={selectSong}
            />
          </div>

          <div className="bg-[#181818] rounded-2xl p-6 flex flex-col items-center justify-center">
            <YouTubePlayer
              videoId={videoId}
              nextTrack={nextTrack}
              previousTrack={previousTrack}
              currentSong={currentSong}
              onPlayPause={handlePlayPause}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
