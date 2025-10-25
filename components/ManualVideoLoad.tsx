"use client";
import { useState } from "react";

export default function ManualVideoLoad({
  onLoadVideo,
}: {
  onLoadVideo: (videoId: string) => void;
}) {
  const [videoId, setVideoId] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = videoId.trim();
    
    if (!trimmed) {
      setError("Please enter a video ID");
      return;
    }

    if (!trimmed.startsWith("video_")) {
      setError("Video ID must start with 'video_'");
      return;
    }

    onLoadVideo(trimmed);
    setVideoId("");
  }

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Load Video by ID</h3>
      <p className="text-xs text-gray-500 mb-4">
        Enter a video ID to load a previously generated video (even if history was cleared)
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            placeholder="video_abc123..."
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-gray-900 hover:bg-black text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-all shadow-sm"
        >
          Load Video
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> Video IDs can be found in your terminal logs or browser network tab
        </p>
      </div>
    </div>
  );
}

