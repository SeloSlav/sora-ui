"use client";
import { useState, useEffect, useRef } from "react";

export default function VideoPlayer({ 
  url, 
  videoId,
  onContinueFromLastFrame 
}: { 
  url: string; 
  videoId: string;
  onContinueFromLastFrame?: (frameDataUrl: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [showFrameExtractor, setShowFrameExtractor] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [framePreview, setFramePreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  function handleLoadedMetadata() {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setCurrentTime(videoRef.current.currentTime);
    }
  }

  function handleTimeUpdate() {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }

  function captureLastFrame() {
    if (!videoRef.current || !onContinueFromLastFrame) return;

    const video = videoRef.current;
    
    // Seek to the last frame (duration - 0.1 seconds to ensure we get a valid frame)
    video.currentTime = video.duration - 0.1;
    
    // Wait for seek to complete
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onContinueFromLastFrame(frameDataUrl);
        setShowFrameExtractor(false);
      }
    };
  }

  function captureCurrentFrame() {
    if (!videoRef.current || !onContinueFromLastFrame) return;

    const video = videoRef.current;
    
    // Pause the video to ensure we capture the right frame
    video.pause();
    
    // Wait a moment to ensure the frame is rendered
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onContinueFromLastFrame(frameDataUrl);
        setExtracting(true);
        setTimeout(() => {
          setExtracting(false);
          setShowFrameExtractor(false);
        }, 1500);
      }
    }, 100);
  }

  function seekToTime(time: number) {
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause(); // Pause when scrubbing
      video.currentTime = time;
      setCurrentTime(time);
      
      // Update preview after seeking
      video.onseeked = () => {
        updateFramePreview();
      };
    }
  }

  function updateFramePreview() {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const preview = canvas.toDataURL('image/jpeg', 0.8);
      setFramePreview(preview);
    }
  }

  // Update preview when extractor is shown
  useEffect(() => {
    if (showFrameExtractor && videoRef.current) {
      videoRef.current.pause();
      updateFramePreview();
    }
  }, [showFrameExtractor]);

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
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            className="w-full aspect-video object-contain bg-black"
            onError={() => setVideoError(true)}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-black hover:bg-gray-800 text-white font-medium rounded-lg px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
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

        {onContinueFromLastFrame && (
          <>
            <button
              onClick={() => setShowFrameExtractor(!showFrameExtractor)}
              disabled={!videoUrl || videoError}
              className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {showFrameExtractor ? 'Hide' : 'Extract'} Frame
            </button>
          </>
        )}
      </div>

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Frame Extractor UI */}
      {showFrameExtractor && onContinueFromLastFrame && duration > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Extract Frame</h3>
            <span className="text-sm text-gray-600 font-mono">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
          </div>
          
          {/* Frame Preview */}
          {framePreview && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-blue-300">
              <img src={framePreview} alt="Frame preview" className="w-full h-full object-contain" />
              <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                Preview
              </div>
            </div>
          )}
          
          {/* Timeline scrubber */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration}
              step="0.04"
              value={currentTime}
              onChange={(e) => seekToTime(parseFloat(e.target.value))}
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <button 
                onClick={() => seekToTime(0)} 
                className="hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
              >
                ⏮ Start
              </button>
              <button 
                onClick={() => seekToTime(duration / 2)} 
                className="hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
              >
                ⏸ Middle
              </button>
              <button 
                onClick={() => seekToTime(duration - 0.1)} 
                className="hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
              >
                ⏭ End
              </button>
            </div>
          </div>
          
          <button
            onClick={captureCurrentFrame}
            disabled={extracting}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              extracting
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {extracting ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Frame Extracted!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Extract This Frame
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-600 text-center">
            Drag the slider to find your frame, then click "Extract This Frame"
          </p>
        </div>
      )}

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