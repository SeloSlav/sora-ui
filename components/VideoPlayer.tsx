"use client";
import { useState, useEffect } from "react";

export default function VideoPlayer({ url, videoId }: { url: string; videoId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");

  useEffect(() => {
    // Fetch the video blob and create an object URL for playback
    async function loadVideo() {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load video: ${response.status}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
      } catch (error) {
        console.error("Video load error:", error);
        setVideoError(true);
      }
    }
    loadVideo();

    // Cleanup
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [url]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `sora-${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download video. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="w-full max-w-4xl space-y-4">
      {/* Video Container */}
      <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg">
        {videoError ? (
          <div className="w-full aspect-video bg-gray-50 flex items-center justify-center text-red-600 p-8 text-center">
            <div>
              <svg className="w-12 h-12 mx-auto mb-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="font-medium text-gray-900">Failed to load video</p>
              <p className="text-sm text-gray-500 mt-1">Try downloading it instead</p>
            </div>
          </div>
        ) : !videoUrl ? (
          <div className="w-full aspect-video bg-gray-50 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="animate-spin h-10 w-10 mx-auto mb-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm">Loading video...</p>
            </div>
          </div>
        ) : (
          <video
            src={videoUrl}
            controls
            playsInline
            autoPlay
            loop
            className="w-full aspect-video object-contain bg-black"
            onError={() => setVideoError(true)}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 bg-black hover:bg-gray-800 text-white font-medium rounded-lg px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
        >
          {downloading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </>
          )}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium rounded-lg px-5 py-3 transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Video
        </button>
      </div>

      {/* Video Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
        <div className="flex items-center gap-2 font-mono">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>{videoId}</span>
        </div>
      </div>
    </div>
  );
}