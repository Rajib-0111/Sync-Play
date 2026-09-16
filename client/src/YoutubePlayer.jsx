import { useEffect, useRef, useState } from "react";

function YouTubePlayer({
  videoId,
  nextTrack,
  previousTrack,
  currentSong,
  onPlayPause,
}) {
  const playerRef = useRef(null);
  const nextTrackRef = useRef(nextTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  useEffect(() => {
    const loadPlayer = () => {
      playerRef.current = new window.YT.Player("youtube-player", {
        height: "180",
        width: "320",
        videoId: videoId,

        playerVars: {
          playsinline: 1,
        },

        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration());
          },

          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            }

            if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setCurrentTime(0);
              nextTrackRef.current();
            }
          },
        },
      });
    };

    if (window.YT) {
      loadPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = loadPlayer;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const playFromSync = () => {
      if (playerRef.current) {
        playerRef.current.playVideo();
      }
    };

    const pauseFromSync = () => {
      if (playerRef.current) {
        playerRef.current.pauseVideo();
      }
    };

    window.addEventListener("sync-play", playFromSync);
    window.addEventListener("sync-pause", pauseFromSync);

    return () => {
      window.removeEventListener("sync-play", playFromSync);
      window.removeEventListener("sync-pause", pauseFromSync);
    };
  }, []);

  useEffect(() => {
    const seekFromSync = (event) => {
      if (playerRef.current) {
        playerRef.current.seekTo(event.detail, true);
        setCurrentTime(event.detail);
      }
    };

    window.addEventListener("sync-seek", seekFromSync);

    return () => {
      window.removeEventListener("sync-seek", seekFromSync);
    };
  }, []);

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    playerRef.current.loadVideoById(videoId);

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [videoId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && !isSeeking) {
        const time = playerRef.current.getCurrentTime();

        setCurrentTime(time);
        setDuration(playerRef.current.getDuration());
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [isSeeking]);

  const togglePlay = () => {
    if (!playerRef.current) {
      return;
    }

    if (isPlaying) {
      playerRef.current.pauseVideo();
      onPlayPause(false);
    } else {
      playerRef.current.playVideo();
      onPlayPause(true);
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);

    setCurrentTime(newTime);

    if (playerRef.current) {
      playerRef.current.seekTo(newTime, true);
    }

    window.dispatchEvent(
      new CustomEvent("local-seek", {
        detail: newTime,
      }),
    );
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleVolume = (e) => {
    const newVolume = Number(e.target.value);

    setVolume(newVolume);

    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);

      if (newVolume === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) {
      return;
    }

    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="hidden">
        <div id="youtube-player"></div>
      </div>
      <div>
        {currentSong && (
          <img
            src={currentSong.snippet.thumbnails.medium.url}
            alt={currentSong.snippet.title}
            className="w-65 h-65 object-cover rounded-xl mx-auto"
          />
        )}
      </div>

      <div className="mt-6 text-center">
        <h2 className="text-lg font-semibold">Now Playing</h2>

        <p className="text-white text-sm mt-2 truncate max-w-[320px]">
          {currentSong ? currentSong.snippet.title : "No song selected"}
        </p>

        <p className="text-gray-400 text-xs mt-1">
          {currentSong ? currentSong.snippet.channelTitle : ""}
        </p>
      </div>

      <div className="mt-5 w-full max-w-[320px]">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
          onTouchStart={() => setIsSeeking(true)}
          onTouchEnd={() => setIsSeeking(false)}
          onChange={handleSeek}
          className="w-full cursor-pointer"
        />

        <div className="flex justify-between text-sm text-gray-400">
          <span>{formatTime(currentTime)}</span>

          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 w-full max-w-[320px]">
        <button
          onClick={toggleMute}
          className="text-xl w-8 hover:scale-110 transition"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={handleVolume}
          className="flex-1 cursor-pointer"
        />

        <span className="text-sm text-gray-400 w-10 text-right">
          {isMuted ? 0 : volume}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-8">
        <button
          onClick={previousTrack}
          className="text-2xl hover:scale-110 transition"
        >
          ⏮
        </button>

        <button
          onClick={togglePlay}
          className="bg-white text-black w-14 h-14 rounded-full text-xl hover:bg-gray-200 transition"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <button
          onClick={nextTrack}
          className="text-2xl hover:scale-110 transition"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}

export default YouTubePlayer;
