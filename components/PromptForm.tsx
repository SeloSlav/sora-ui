"use client";
import { useState } from "react";
import Uploader from "./Uploader";
import { saveToHistory } from "./VideoHistory";

type RefFile = {
  name: string;
  dataUrl: string;
};

export default function PromptForm({
  onResult,
}: {
  onResult: (data: { url: string; videoId: string }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1280x720");
  const [seconds, setSeconds] = useState("8");
  const [model, setModel] = useState("sora-2");

  const [inputReference, setInputReference] = useState<RefFile | null>(null);
  const [resizedReference, setResizedReference] = useState<RefFile | null>(null);

  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Resize image to match selected resolution
  async function resizeImage(file: RefFile, targetSize: string): Promise<RefFile> {
    return new Promise((resolve) => {
      const [width, height] = targetSize.split('x').map(Number);
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve({ name: file.name, dataUrl: resizedDataUrl });
        }
      };
      
      img.src = file.dataUrl;
    });
  }

  // Handle reference image change and resize
  async function handleReferenceChange(file: RefFile | null) {
    setInputReference(file);
    if (file) {
      const resized = await resizeImage(file, size);
      setResizedReference(resized);
    } else {
      setResizedReference(null);
    }
  }

  // Re-resize when size changes
  async function handleSizeChange(newSize: string) {
    setSize(newSize);
    if (inputReference) {
      const resized = await resizeImage(inputReference, newSize);
      setResizedReference(resized);
    }
  }

  async function enhancePrompt() {
    if (!prompt.trim()) return;
    
    setEnhancing(true);
    setErr(null);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to enhance");
      
      setPrompt(data.enhanced);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setEnhancing(false);
    }
  }

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/sora2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          size, 
          seconds, 
          model, 
          inputReference: resizedReference // Use resized image
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      
      // Save to history with thumbnail
      saveToHistory({
        videoId: data.videoId,
        prompt,
        model,
        size,
        seconds,
        thumbnail: inputReference?.dataUrl, // Use original uploaded image as thumbnail
      });
      
      // Use the download URL returned from the API
      onResult({ url: data.downloadUrl, videoId: data.videoId });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-5">
      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
        <div className="relative">
          <textarea
            className="w-full bg-white border border-gray-300 rounded-lg p-4 min-h-[140px] resize-y text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm"
            placeholder="Describe your video idea..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            onClick={enhancePrompt}
            disabled={enhancing || !prompt.trim() || loading}
            className="absolute bottom-3 right-3 bg-black hover:bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            title="Use GPT-4o to enhance your prompt with Sora 2 best practices"
          >
            {enhancing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Enhancing...
              </span>
            ) : (
              "✨ Enhance"
            )}
          </button>
        </div>
      </div>

      {/* Reference Image Upload */}
      <div>
        <Uploader
          label="Reference Image"
          onFile={handleReferenceChange}
        />
        {inputReference && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
              <svg className="w-4 h-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="truncate flex-1">{inputReference.name}</span>
              <button
                onClick={() => setInputReference(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
              <img
                src={inputReference.dataUrl}
                alt="Reference preview"
                className="w-full h-auto max-h-48 object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm" 
            value={size} 
            onChange={(e) => handleSizeChange(e.target.value)}
          >
            <option value="1280x720">1280×720</option>
            <option value="720x1280">720×1280</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm" 
            value={seconds} 
            onChange={(e) => setSeconds(e.target.value)}
          >
            <option value="4">4s</option>
            <option value="8">8s</option>
            <option value="12">12s</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm" 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="sora-2">Sora 2</option>
            <option value="sora-2-pro">Sora 2 Pro</option>
          </select>
        </div>
      </div>
      
      {/* Generate Button */}
      <button
        onClick={submit}
        disabled={loading || !prompt.trim()}
        className="w-full bg-black hover:bg-gray-800 text-white font-medium rounded-lg px-6 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-sm"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </span>
        ) : (
          "Generate Video"
        )}
      </button>
      
      {/* Error Message */}
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{err}</span>
        </div>
      )}
    </div>
  );
}