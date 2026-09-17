import { useEffect, useState, useRef } from "react";
import SongSearch from "./SongSearch";
import YouTubePlayer from "./YoutubePlayer";
import IP from "./ip";

function App() {
  const [videoId, setVideoId] = useState("M7lc1UVf-VE");
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentSong, setCurrentSong] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [hostName, setHostName] = useState("");
  const [userName, setUserName] = useState("");
  const [roomUserNames, setRoomUserNames] = useState([]);
  const [joinMessage, setJoinMessage] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [socket, setSocket] = useState(null);
  const [roomUsers, setRoomUsers] = useState(0);
  const [activeTab, setActiveTab] = useState("music");
  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const socketRef = useRef(null);

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
    setCurrentSong(songs[index]);
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
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setSocket(null);
    }

    const ws = new WebSocket(
      `wss://${IP}/ws/${roomId.toUpperCase()}?user_name=${encodeURIComponent(userName)}`,
    );

    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket Connected");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("Server:", data);

      if (data.type === "room_status") {
        setRoomUsers(data.users);
        setRoomUserNames(data.names);
        setHostName(data.host);
      }

      if (data.type === "song_change") {
        const song = data.song;

        setVideoId(song.id.videoId);
        setCurrentSong(song);

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

      if (data.type === "chat") {
        setMessages((currentMessages) => [...currentMessages, data]);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket Disconnected");

      if (socketRef.current === ws) {
        socketRef.current = null;
        setSocket(null);
      }
    };

    ws.onerror = (error) => {
      console.log("WebSocket Error:", error);
    };
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;

    if (roomUsers > 1 && socket) {
      const message = {
        type: "chat",
        name: userName,
        message: chatMessage,
      };

      socket.send(JSON.stringify(message));

      setMessages((currentMessages) => [...currentMessages, message]);

      setChatMessage("");
    }
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
    
     console.log("Join started:", performance.now());

    if (isJoining) return;

    if (!userName.trim()) {
      setJoinMessage("Please enter your name first.");
      return;
    }

    if (!joinRoomId.trim()) {
      setJoinMessage("Please enter a Room ID.");
      return;
    }

    setIsJoining(true);
    setJoinMessage("");

    try {
      const response = await fetch(
        `https://${IP}/api/rooms/join?room_id=${joinRoomId.trim().toUpperCase()}&user_name=${encodeURIComponent(userName)}`,
        {
          method: "POST",
        },
      );

      console.log("API response:", performance.now());

      const data = await response.json();

      if (!response.ok) {
        setJoinMessage(data.detail || "Room Not Found");
        setIsJoining(false);
        return;
      }

      setJoinMessage(`Joined Room : ${data.room_id}`);

      connectToRoom(data.room_id);

      setIsJoining(false);
    } catch (error) {
      console.log("Join error:", error);
      setJoinMessage("Could not connect to server.");
      setIsJoining(false);
    }
  };

  const createRoom = async () => {
    if (!userName.trim()) {
      setJoinMessage("Please enter your name first.");
      return;
    }
    const response = await fetch(
      `https://${IP}/api/rooms/create?user_name=${encodeURIComponent(userName)}`,
      {
        method: "POST",
      },
    );

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
      setCurrentSong(songs[nextIndex]);

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
      setCurrentSong(songs[previousIndex]);
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
  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-10">
      <h1 className="text-3xl font-bold text-center mb-10">SyncPlay</h1>

      <div className="flex justify-center gap-3 mb-8">
        <button
          onClick={() => setActiveTab("room")}
          className={`px-5 py-2 rounded-lg font-medium transition ${
            activeTab === "room"
              ? "bg-white text-black"
              : "bg-[#242424] text-gray-300 hover:bg-[#303030]"
          }`}
        >
          Room
        </button>

        <button
          onClick={() => setActiveTab("music")}
          className={`px-5 py-2 rounded-lg font-medium transition ${
            activeTab === "music"
              ? "bg-white text-black"
              : "bg-[#242424] text-gray-300 hover:bg-[#303030]"
          }`}
        >
          Music
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`px-5 py-2 rounded-lg font-medium transition ${
            activeTab === "chat"
              ? "bg-white text-black"
              : "bg-[#242424] text-gray-300 hover:bg-[#303030]"
          }`}
        >
          Chat
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        {activeTab === "room" && (
          <div className="bg-[#181818] rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-5">Room</h2>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                Your Name
              </label>

              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-[#15121c] border border-[#332b40] text-white px-4 py-3 rounded-xl outline-none focus:border-[#ff2d95] transition"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#1f1a2b] border border-[#302745] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Create a Room
                </h3>

                <p className="text-sm text-gray-400 mb-5">
                  Create a room and invite others to listen together.
                </p>
                <button
                  onClick={createRoom}
                  className="w-full mt-4 bg-white text-black px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  Create Room
                </button>

                {roomId && (
                  <div className="mt-5 bg-[#15121c] border border-[#332b40] rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Your Room ID</p>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-bold tracking-[0.25em] text-white">
                        {roomId}
                      </p>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(roomId);
                          setCopyMessage("Room ID copied!");
                          setTimeout(() => setCopyMessage(""), 2000);
                        }}
                        className="text-sm text-[#ff2d95] hover:text-white transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#1f1a2b] border border-[#302745] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Join a Room
                </h3>

                <p className="text-sm text-gray-400 mb-5">
                  Enter a room ID to listen with your friends.
                </p>

                <label className="block text-sm text-gray-400 mb-2">
                  Room ID
                </label>

                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full bg-[#15121c] border border-[#332b40] text-white px-4 py-3 rounded-xl outline-none focus:border-[#ff2d95] transition uppercase"
                />

                <button
                  onClick={joinRoom}
                  className="w-full mt-4 bg-white text-black px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  {isJoining ? "Joining..." : "Join Room"}
                </button>
              </div>
            </div>

            {joinMessage && (
              <div className="mt-6 bg-[#15121c] border border-[#332b40] rounded-xl px-4 py-3">
                <p className="text-sm text-gray-300">{joinMessage}</p>
              </div>
            )}

            {roomUserNames.length > 0 && (
              <div className="mt-6 bg-[#1f1a2b] border border-[#302745] rounded-2xl p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    People in Room
                  </h3>

                  <p className="text-sm text-gray-400">
                    {roomUsers} {roomUsers === 1 ? "person" : "people"}{" "}
                    connected
                  </p>
                </div>

                <div className="space-y-2">
                  {roomUserNames.map((name, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-[#15121c] border border-[#332b40] px-4 py-3 rounded-xl"
                    >
                      <span className="text-white font-medium">{name}</span>

                      {name === hostName && (
                        <span className="text-xs font-medium text-[#ff2d95] bg-[#ff2d95]/10 px-3 py-1 rounded-full">
                          👑 Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${
            activeTab === "music" ? "block" : "hidden"
          }`}
        >
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

        {activeTab === "chat" && (
          <div className="bg-[#181818] rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-5">Chat</h2>

            {roomUsers <= 1 ? (
              <p className="text-gray-400">
                Chat will be available when someone joins the room.
              </p>
            ) : (
              <div>
                <div className="bg-[#121212] rounded-xl p-4 h-80 overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center">
                      No messages yet.
                    </p>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.name === userName;

                      return (
                        <div
                          key={index}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-[85%] px-4 py-3 rounded-2xl ${
                              isMe
                                ? "bg-[#ff2d95] text-white rounded-br-md"
                                : "bg-[#242424] text-white rounded-bl-md"
                            }`}
                          >
                            <p
                              className={`text-xs mb-1 font-semibold ${
                                isMe ? "text-white" : "text-[#ff2d95]"
                              }`}
                            >
                              {msg.name}
                            </p>

                            <p className="text-sm break-words">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendChatMessage();
                      }
                    }}
                    className="flex-1 min-w-0 bg-[#242424] text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                  />

                  <button
                    onClick={sendChatMessage}
                    className="bg-white text-black px-5 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {copyMessage && (
        <div className="fixed bottom-6 right-6 bg-[#1f1a2b] border border-[#ff2d95] text-white px-5 py-3 rounded-xl shadow-lg">
          {copyMessage}
        </div>
      )}
    </div>
  );
}

export default App;
