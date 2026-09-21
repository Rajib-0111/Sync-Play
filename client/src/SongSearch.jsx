import { useState, useRef } from "react";

function SongSearch({ songs, setSongs, selectSong, addToQueue }) {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  const [query, setQuery] = useState("");

  const searchCache = useRef(new Map());

  const searchSongs = async () => {
    if (!query.trim()) {
      return;
    }

    const searchQuery = query.trim().toLowerCase();

    if (searchCache.current.has(searchQuery)) {
      setSongs(searchCache.current.get(searchQuery));
      return;
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}`,
    );

    const data = await response.json();

    if (data.items) {
      searchCache.current.set(searchQuery, data.items);
      setSongs(data.items);
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          searchSongs();
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          placeholder="Search songs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full min-w-0 bg-[#242424] text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
        />

        <button
          type="submit"
          className="w-full sm:w-auto bg-white text-black px-5 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
        >
          Search
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {songs.map((song, index) => (
          <div
            key={song.id.videoId || song.etag}
            className="bg-[#1f1f1f] p-3 rounded-xl flex items-center gap-4"
          >
            <img
              src={song.snippet.thumbnails.medium.url}
              alt={song.snippet.title}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />

            <p className="text-white truncate min-w-0">{song.snippet.title}</p>
            <div className="flex gap-2 ml-auto flex-shrink-0">
              <button
                onClick={() => selectSong(song.id.videoId, index)}
                className="bg-white text-black px-3 py-2 rounded-lg"
              >
                ▶
              </button>

              <button
                onClick={() => addToQueue(song)}
                className="bg-[#ff2d95] text-white px-3 py-2 rounded-lg"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SongSearch;
