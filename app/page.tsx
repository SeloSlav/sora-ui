"use client";
import { useState } from "react";
import PromptForm from "@/components/PromptForm";
import VideoPlayer from "@/components/VideoPlayer";
import VideoHistory, { VideoHistoryItem } from "@/components/VideoHistory";

export default function Home() {
  const [result, setResult] = useState<{ url: string; videoId: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  function handleSelectVideo(item: VideoHistoryItem) {
    setResult({
      url: `/api/sora2/download/${item.videoId}`,
      videoId: item.videoId,
    });
    setShowHistory(false);
  }

  function handleLoadVideoById(videoId: string) {
    setResult({
      url: `/api/sora2/download/${videoId}`,
      videoId: videoId,
    });
    setShowHistory(false);
  }

  return (
    <main className="min-h-screen bg-white flex">
      {/* Left Sidebar - Controls */}
      <div className="w-full lg:w-[480px] xl:w-[540px] border-r border-gray-200 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* History Toggle */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHistory ? "Hide History" : "Show History"}
            </button>
          </div>

          {showHistory ? (
            <VideoHistory 
              onSelectVideo={handleSelectVideo}
              onLoadVideoById={handleLoadVideoById}
            />
          ) : (
            <PromptForm onResult={(r) => setResult(r)} />
          )}
        </div>
      </div>

      {/* Right Panel - Video Preview */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 p-8">
        {result ? (
          <VideoPlayer url={result.url} videoId={result.videoId} />
        ) : (
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No video yet</h3>
            <p className="text-sm text-gray-500">Your generated video will appear here</p>
          </div>
        )}
      </div>

      {/* Mobile Video Display */}
      {result && (
        <div className="lg:hidden fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="p-4">
            <button
              onClick={() => setResult(null)}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to controls
            </button>
            <VideoPlayer url={result.url} videoId={result.videoId} />
          </div>
        </div>
      )}
    </main>
  );
}