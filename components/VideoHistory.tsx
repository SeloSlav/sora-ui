"use client";
import { useState, useEffect } from "react";
import ManualVideoLoad from "./ManualVideoLoad";

export type VideoHistoryItem = {
  id: string;
  videoId: string;
  prompt: string;
  model: string;
  size: string;
  seconds: string;
  thumbnail?: string;
  createdAt: number;
};

export default function VideoHistory({
  onSelectVideo,
  onLoadVideoById,
}: {
  onSelectVideo: (item: VideoHistoryItem) => void;
  onLoadVideoById: (videoId: string) => void;
}) {
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  function loadHistory() {
    try {
      const stored = localStorage.getItem("sora2-history");
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed.sort((a: VideoHistoryItem, b: VideoHistoryItem) => b.createdAt - a.createdAt));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  function deleteItem(id: string) {
    try {
      const updated = history.filter((item) => item.id !== id);
      localStorage.setItem("sora2-history", JSON.stringify(updated));
      setHistory(updated);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  }

  function clearAll() {
    if (confirm("Are you sure you want to clear all history?")) {
      localStorage.removeItem("sora2-history");
      setHistory([]);
    }
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No videos yet</p>
        <p className="text-xs mt-1">Your generated videos will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">History ({history.length})</h3>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => onSelectVideo(item)}
          >
            <div className="flex gap-3">
              {/* Thumbnail */}
              <div className="w-20 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 line-clamp-2 mb-1">
                  {item.prompt.slice(0, 80)}{item.prompt.length > 80 ? "..." : ""}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(item.createdAt)}</span>
                  <span>•</span>
                  <span>{item.model === "sora-2-pro" ? "Pro" : "Standard"}</span>
                  <span>•</span>
                  <span>{item.seconds}s</span>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all p-1"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Video Load */}
      <ManualVideoLoad onLoadVideo={onLoadVideoById} />
    </div>
  );
}

// Helper function to save to history (export for use in PromptForm)
export function saveToHistory(item: Omit<VideoHistoryItem, "id" | "createdAt">) {
  try {
    const stored = localStorage.getItem("sora2-history");
    const history: VideoHistoryItem[] = stored ? JSON.parse(stored) : [];
    
    const newItem: VideoHistoryItem = {
      ...item,
      id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    
    history.unshift(newItem);
    
    // Keep only last 50 items
    const trimmed = history.slice(0, 50);
    localStorage.setItem("sora2-history", JSON.stringify(trimmed));
    
    return newItem;
  } catch (error) {
    console.error("Failed to save to history:", error);
    return null;
  }
}

