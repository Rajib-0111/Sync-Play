import { useState } from "react";

function SongSearch({ songs, setSongs, selectSong }) {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  const [query, setQuery] = useState("");

  const searchSongs = async () => {
    if (!query.trim()) {
      return;
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}`,
    );

    const data = await response.json();

    if (data.items) {
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
            onClick={() => selectSong(song.id.videoId, index)}
            className="bg-[#1f1f1f] p-3 rounded-xl flex items-center gap-4 cursor-pointer hover:bg-[#292929] transition"
          >
            <img
              src={song.snippet.thumbnails.medium.url}
              alt={song.snippet.title}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />

            <p className="text-white truncate min-w-0">{song.snippet.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SongSearch;
