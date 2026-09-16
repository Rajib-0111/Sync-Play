import { useEffect, useRef, useState } from "react"

function MusicPlayer({songUrl}) {

  const songs = [
    {
      title: "My Song",
      src: "/music/music.mp3"
    },
    {
      title: "Second Song",
      src: "/music/music2.mp3"
    }
  ]

  const audioRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [volume, setVolume] = useState(1)
  const [songIndex, setSongIndex] = useState(0)

  const playMusic = () => {
    audioRef.current.play()
    setIsPlaying(true)
  }

  const pauseMusic = () => {
    audioRef.current.pause()
    setIsPlaying(false)
  }

  useEffect(() => {

    const audio = audioRef.current

    const updateTime = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime)
      }
    }

    const loadDuration = () => {
      setDuration(audio.duration)
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", loadDuration)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", loadDuration)
    }

  }, [isSeeking])

  useEffect(() => {

    const audio = audioRef.current

    audio.load()

    setCurrentTime(0)
    setDuration(0)

    if (isPlaying) {
      audio.play()
    }

  }, [songIndex])

  const formatTime = (time) => {

    if (!time || isNaN(time)) {
      return "0:00"
    }

    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)

    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleSeek = (e) => {

    const newTime = Number(e.target.value)

    setCurrentTime(newTime)

    audioRef.current.currentTime = newTime
  }

  const previousSong = () => {

    if (songIndex > 0) {
      setSongIndex(songIndex - 1)
    }
  }

  const nextSong = () => {

    if (songIndex < songs.length - 1) {
      setSongIndex(songIndex + 1)
    }
  }

  return (

    <div className="w-full max-w-md bg-[#1f1f1f] rounded-2xl p-6 text-white">

      <h2 className="text-2xl font-semibold">
        🎵 {songs[songIndex].title}
      </h2>

      <p className="text-gray-400 mt-2">
        Playing locally
      </p>

      <audio
        ref={audioRef}
        src={songUrl}
      />

      <div className="mt-8">

        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
          onChange={handleSeek}
          className="w-full cursor-pointer"
        />

        <div className="flex justify-between text-sm text-gray-400">

          <span>
            {formatTime(currentTime)}
          </span>

          <span>
            {formatTime(duration)}
          </span>

        </div>

      </div>

      <div className="mt-6 flex items-center gap-3">

        <span>🔊</span>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => {

            const newVolume = Number(e.target.value)

            setVolume(newVolume)

            audioRef.current.volume = newVolume

          }}
          className="w-full cursor-pointer"
        />

      </div>

      <div className="flex justify-center items-center gap-4 mt-8">

        <button
          onClick={previousSong}
          className="bg-[#292929] px-4 py-3 rounded-lg hover:bg-[#333333]"
        >
          ⏮
        </button>

        {!isPlaying ? (

          <button
            onClick={playMusic}
            className="bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-200"
          >
            ▶ Play
          </button>

        ) : (

          <button
            onClick={pauseMusic}
            className="bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-200"
          >
            ⏸ Pause
          </button>

        )}

        <button
          onClick={nextSong}
          className="bg-[#292929] px-4 py-3 rounded-lg hover:bg-[#333333]"
        >
          ⏭
        </button>

      </div>

    </div>

  )
}

export default MusicPlayer

