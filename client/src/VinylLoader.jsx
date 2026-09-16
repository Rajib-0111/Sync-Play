import "./VinylLoader.css";

function VinylLoader({ isPlaying }) {
  return (
    <div className="la-09">
      <div className="la-09__deck">
        <span className={`la-09__disc ${isPlaying ? "playing" : "paused"}`}>
          <span className="la-09__spindle"></span>
        </span>
        <span className="la-09__gloss"></span>
      </div>
    </div>
  );
}

export default VinylLoader;
