import { useEffect, useState, useRef } from "react";
import SongSearch from "./SongSearch";
import YouTubePlayer from "./YoutubePlayer";
import IP from "./ip";

function App() {
  const [videoId, setVideoId] = useState("M7lc1UVf-VE");
  const [songs, setSongs] = useState([]);
  const [playedSongs, setPlayedSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
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
  const [notification, setNotification] = useState("");

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const notificationTimerRef = useRef(null);
  const activeTabRef = useRef(activeTab);

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

  const showNotification = (message) => {
    setNotification(message);

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  const addToQueue = (song) => {
    if (isSongAlreadyInQueue(song)) {
      return;
    }
    setQueue((currentQueue) => [...currentQueue, song]);
  };

  const isSongAlreadyInQueue = (song) => {
    return queue.some((item) => item.id.videoId === song.id.videoId);
  };

  const selectSong = (id, index) => {
    setPlayedSongs((currentPlayed) => {
      if (currentPlayed.includes(id)) {
        return currentPlayed;
      }

      return [...currentPlayed, id];
    });
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

  const getRecommendations = async () => {
    if (!currentSong) {
      console.log("No current song");
      return;
    }

    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

    const query = `${currentSong.snippet.title} ${currentSong.snippet.channelTitle}`;

    console.log("Recommendation query:", query);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${apiKey}`,
    );

    console.log("Response status:", response.status);

    const data = await response.json();

    console.log("Recommendation response:", data);

    if (data.items) {
      setQueue((currentQueue) => [...currentQueue, ...data.items]);
    }
  };

  const generateRecommendations = async () => {
    if (!currentSong) {
      console.log("No current song");
      return;
    }

    const apiKey = import.meta.env.VITE_LASTFM_API_KEY;

    const searchQuery = currentSong.snippet.title;

    const searchResponse = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(
        searchQuery,
      )}&api_key=${apiKey}&format=json&limit=5`,
    );

    const searchData = await searchResponse.json();

    if (!searchData.results?.trackmatches?.track) {
      console.log("No Last.fm results");
      return;
    }

    const tracks = searchData.results.trackmatches.track;

    const bestMatch = tracks.reduce((best, track) => {
      return Number(track.listeners) > Number(best.listeners) ? track : best;
    });

    console.log("Best match:", bestMatch.artist, "-", bestMatch.name);

    const artist = bestMatch.artist;
    const trackName = bestMatch.name.includes("-")
      ? bestMatch.name.split("-").pop().trim()
      : bestMatch.name;

    console.log("Searching similar:", artist, "-", trackName);

    const similarResponse = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(
        artist,
      )}&track=${encodeURIComponent(
        trackName,
      )}&api_key=${import.meta.env.VITE_LASTFM_API_KEY}&format=json&limit=3`,
    );

    const similarData = await similarResponse.json();
    console.log("Last.fm tracks:", similarData.similartracks?.track);

    const similarTracks = similarData.similartracks?.track || [];

    if (similarTracks.length === 0) {
      console.log("No similar songs found");
      return;
    }

    const recommendedSongs = [];

    for (const track of similarTracks) {
      const artist = track.artist.name;
      const trackName = track.name;

      const youtubeResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=2&q=${encodeURIComponent(
          artist + " " + trackName,
        )}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`,
      );

      const youtubeData = await youtubeResponse.json();

      const youtubeResults = youtubeData.items || [];

      const filteredResults = youtubeResults.filter((video) => {
        const title = video.snippet.title.toLowerCase();

        if (
          title.includes("lyrics") ||
          title.includes("cover") ||
          title.includes("remix") ||
          title.includes("live") ||
          title.includes("slowed") ||
          title.includes("reverb") ||
          title.includes("karaoke") ||
          title.includes("instrumental")
        ) {
          return false;
        }

        return true;
      });

      if (filteredResults.length === 0) {
        continue;
      }

      const selectedVideo = filteredResults[0];

      recommendedSongs.push(selectedVideo);

      console.log(
        "Added:",
        selectedVideo.snippet.title,
        "-",
        selectedVideo.snippet.channelTitle,
      );
    }

    console.log("Recommended YouTube songs:", recommendedSongs);

    if (recommendedSongs.length === 0) {
      return;
    }

    setQueue((currentQueue) => [...currentQueue, ...recommendedSongs]);
  };

  const playRecommendedSong = async () => {
    if (!currentSong) {
      return;
    }

    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

    const query = `${currentSong.snippet.title} music`;

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${apiKey}`,
    );

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return;
    }

    const recommendedSongs = data.items.filter((song) => {
      const title = song.snippet.title.toLowerCase();

      if (playedSongs.includes(song.id.videoId)) {
        return false;
      }

      if (song.id.videoId === currentSong.id.videoId) {
        return false;
      }

      if (
        title.includes("cover") ||
        title.includes("remix") ||
        title.includes("live") ||
        title.includes("slowed") ||
        title.includes("reverb") ||
        title.includes("instrumental") ||
        title.includes("karaoke")
      ) {
        return false;
      }

      return true;
    });

    if (recommendedSongs.length === 0) {
      return;
    }

    const nextSong = recommendedSongs[0];

    setQueue(recommendedSongs.slice(1));

    setVideoId(nextSong.id.videoId);
    setCurrentSong(nextSong);
    setCurrentIndex(-1);

    if (roomUsers > 1 && socket) {
      socket.send(
        JSON.stringify({
          type: "song_change",
          song: nextSong,
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
        if (activeTabRef.current !== "chat") {
          showNotification(`New message from ${data.name}`);
        }
      }
      if (data.type === "room_event") {
        if (data.event === "join") {
          showNotification(`${data.name} joined the room`);
        }

        if (data.event === "leave") {
          showNotification(`${data.name} left the room`);
        }
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

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
    if (queue.length > 0) {
      const nextSong = queue[0];

      setQueue((currentQueue) => currentQueue.slice(1));

      setVideoId(nextSong.id.videoId);
      setCurrentSong(nextSong);

      if (roomUsers > 1 && socket) {
        socket.send(
          JSON.stringify({
            type: "song_change",
            song: nextSong,
          }),
        );
      }

      return;
    }

    generateRecommendations();
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
    <div className="min-h-screen text-white px-4 sm:px-6 py-8 sm:py-10 bg-[#09070d] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#7b5cff]/15 blur-[120px] rounded-full" />
        <div className="absolute top-[35%] -left-40 w-[400px] h-[400px] bg-[#ff2d95]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 -right-40 w-[450px] h-[450px] bg-[#7b5cff]/10 blur-[120px] rounded-full" />
      </div>
      {notification && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 sm:max-w-sm bg-[#24102f] border border-[#ff2d95] text-white px-5 py-3 rounded-xl shadow-lg">
          {notification}
        </div>
      )}
      <div className="relative text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#ff2d95] shadow-[0_0_12px_#ff2d95]" />
          <span className="text-xs uppercase tracking-[0.3em] text-[#ff2d95]">
            Listen together
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Sync<span className="text-[#ff2d95]">Play</span>
        </h1>

        <p className="mt-3 text-sm sm:text-base text-gray-400">
          Your music. Your room. In sync.
        </p>
      </div>

      <div className="relative flex justify-center mb-10">
        <div className="flex items-center gap-1 p-1.5 bg-[#15111d] border border-[#2d2438] rounded-[14px] shadow-[0_0_25px_rgba(123,92,255,0.08)]">
          <button
            type="button"
            onClick={() => setActiveTab("room")}
            className={
              activeTab === "room"
                ? "min-w-[90px] px-5 py-2.5 rounded-[10px] text-sm font-medium bg-[#ff2d95] text-white shadow-[0_0_18px_rgba(255,45,149,0.45)]"
                : "min-w-[90px] px-5 py-2.5 rounded-[10px] text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            }
          >
            Room
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("music")}
            className={
              activeTab === "music"
                ? "min-w-[90px] px-5 py-2.5 rounded-[10px] text-sm font-medium bg-[#ff2d95] text-white shadow-[0_0_18px_rgba(255,45,149,0.45)]"
                : "min-w-[90px] px-5 py-2.5 rounded-[10px] text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            }
          >
            Music
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={
              activeTab === "chat"
                ? "min-w-[90px] px-5 py-2.5 rounded-[10px] text-sm font-medium bg-[#ff2d95] text-white shadow-[0_0_18px_rgba(255,45,149,0.45)]"
                : "min-w-[90px] px-5 py-2.5 rounded-[10px] text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            }
          >
            Chat
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {activeTab === "room" && (
          <div className="bg-[#120e19] border border-[#2d2438] rounded-3xl p-5 sm:p-6 mb-8 shadow-[0_0_40px_rgba(123,92,255,0.06)]">
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
                  <div className="bg-[#120e19] border border-[#2d2438] rounded-3xl p-5 sm:p-6 mb-8 shadow-[0_0_40px_rgba(123,92,255,0.06)]">
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
          className={`grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 ${
            activeTab === "music" ? "grid" : "hidden"
          }`}
        >
          <div className="bg-[#120e19] border border-[#2d2438] rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(123,92,255,0.06)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#ff2d95] mb-1">
                  Discover
                </p>

                <h2 className="text-2xl font-semibold">Search Music</h2>
              </div>

              <div className="w-10 h-10 rounded-xl bg-[#ff2d95]/10 border border-[#ff2d95]/20 flex items-center justify-center">
                <span className="text-[#ff2d95]">♫</span>
              </div>
            </div>

            <SongSearch
              setVideoId={setVideoId}
              songs={songs}
              setSongs={setSongs}
              selectSong={selectSong}
              addToQueue={addToQueue}
            />
            <button
              onClick={generateRecommendations}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[#7b5cff]/10 border border-[#7b5cff]/30 text-[#b8aaff] px-4 py-3 rounded-xl font-medium hover:bg-[#7b5cff]/20 hover:border-[#7b5cff]/50 transition"
            >
              <span>✦</span>
              Generate Recommendations
            </button>
            {queue.length > 0 && (
              <div className="mt-6 bg-[#0e0b14] border border-[#2d2438] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Up Next</h2>

                    <p className="text-xs text-gray-500 mt-1">
                      {queue.length} {queue.length === 1 ? "song" : "songs"}{" "}
                      queued
                    </p>
                  </div>

                  <span className="text-xs text-[#ff2d95] bg-[#ff2d95]/10 px-3 py-1.5 rounded-full">
                    Queue
                  </span>
                </div>

                <div className="space-y-3">
                  {queue.map((song, index) => (
                    <div
                      key={`${song.id.videoId}-${index}`}
                      className="group bg-[#17121f] border border-[#292131] p-3 rounded-xl flex items-center gap-3 hover:border-[#ff2d95]/30 hover:bg-[#1c1525] transition"
                    >
                      <img
                        src={song.snippet.thumbnails.default.url}
                        alt={song.snippet.title}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />

                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">
                          {song.snippet.title}
                        </p>

                        <p className="text-xs text-gray-500 truncate mt-1">
                          {song.snippet.channelTitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#120e19] border border-[#2d2438] rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(255,45,149,0.06)]">
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
          <div className="bg-[#120e19] border border-[#2d2438] rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(123,92,255,0.06)]">
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
                  <div ref={chatEndRef} />
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
