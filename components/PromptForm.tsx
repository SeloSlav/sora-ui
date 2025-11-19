"use client";
import { useState, useEffect } from "react";
import Uploader from "./Uploader";
import { saveToHistory } from "./VideoHistory";

type RefFile = {
  name: string;
  dataUrl: string;
};

export default function PromptForm({
  onResult,
  initialReference,
  onReferenceUsed,
}: {
  onResult: (data: { url: string; videoId: string }) => void;
  initialReference?: string;
  onReferenceUsed?: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("720x1280");
  const [seconds, setSeconds] = useState("8");
  const [model, setModel] = useState("veo-3.1-fast");

  const [inputReference, setInputReference] = useState<RefFile | null>(null);
  const [resizedReference, setResizedReference] = useState<RefFile | null>(null);
  const [inputReferences, setInputReferences] = useState<RefFile[]>([]); // For Veo 3.1 multiple images

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

  // Handle initial reference image from continuation - runs on mount
  useEffect(() => {
    if (initialReference) {
      const refFile = { name: "last-frame.jpg", dataUrl: initialReference };
      setInputReference(refFile);
      resizeImage(refFile, size).then(setResizedReference);
    }
  }, []); // Only run on mount since key forces remount

  // Check if model is Veo 3
  function isVeo3Model(): boolean {
    return model.startsWith("veo-");
  }

  // Check if model supports multiple reference images
  function supportsMultipleReferences(): boolean {
    return model === "veo-3.1" || model === "veo-3.1-fast";
  }

  // Get available resolutions based on model
  function getAvailableResolutions(): string[] {
    if (isVeo3Model()) {
      // Veo 3.1 supports both 16:9 and 9:16 aspect ratios
      // Veo 3.0 only supports 16:9
      if (model === "veo-3.1" || model === "veo-3.1-fast") {
        return ["1280x720", "1920x1080", "720x1280", "1080x1920"];
      } else {
        // Veo 3.0 only supports 16:9
        return ["1280x720", "1920x1080"];
      }
    }
    // Sora models
    return ["1920x1080", "1080x1920", "1280x720", "720x1280"];
  }

  // Get available durations based on model
  function getAvailableDurations(): string[] {
    if (isVeo3Model()) {
      // Veo 3 supports 4s, 6s, 8s (8s only when using reference images)
      if (inputReference || inputReferences.length > 0) {
        return ["8"]; // 8s only when using reference images
      }
      return ["4", "6", "8"];
    }
    // Sora models
    return ["4", "8", "12"];
  }

  // Calculate estimated cost
  function getEstimatedCost(): string {
    const duration = parseInt(seconds);
    
    if (isVeo3Model()) {
      // Veo 3 pricing - approximate estimates
      // Actual pricing may vary, check Google's pricing page
      return "~$0.05-0.15"; // Rough estimate per video
    }
    
    const isPro = model === "sora-2-pro";
    const costPerSecond = isPro ? 0.40 : 0.10;
    const totalCost = duration * costPerSecond;
    
    return totalCost.toFixed(2);
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
    // Clear multiple references when single reference is set
    if (file) {
      setInputReferences([]);
    }
  }

  // Handle multiple reference images (Veo 3.1)
  async function handleMultipleReferencesChange(files: RefFile[]) {
    if (files.length > 3) {
      files = files.slice(0, 3); // Limit to 3 images
    }
    setInputReferences(files);
    // Clear single reference when multiple references are set
    if (files.length > 0) {
      setInputReference(null);
      setResizedReference(null);
    }
  }

  // Remove a specific reference image from multiple
  function removeReference(index: number) {
    const updated = inputReferences.filter((_, i) => i !== index);
    setInputReferences(updated);
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
      // Determine API endpoint based on model
      const apiEndpoint = isVeo3Model() ? "/api/veo3" : "/api/sora2";
      
      // Prepare request body
      const body: any = {
        prompt,
        size,
        seconds,
        model,
      };

      // Add reference images based on model support
      if (isVeo3Model()) {
        if (inputReferences.length > 0 && supportsMultipleReferences()) {
          // Veo 3.1 multiple reference images
          body.inputReferences = inputReferences;
        } else if (inputReference) {
          // Single reference image
          body.inputReference = inputReference; // Use original, Veo handles sizing
        }
      } else {
        // Sora models - use resized reference
        if (resizedReference) {
          body.inputReference = resizedReference;
        }
      }

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      
      // Save to history with thumbnail (await async function)
      await saveToHistory({
        videoId: data.videoId,
        prompt,
        model,
        size,
        seconds,
        thumbnail: inputReference?.dataUrl || inputReferences[0]?.dataUrl, // Use first image as thumbnail
      });
      
      // Use the download URL returned from the API
      // For Veo 3, append file URI as query param for download endpoint
      const downloadUrl = isVeo3Model() && data.fileUri
        ? `${data.downloadUrl}?uri=${encodeURIComponent(data.fileUri)}`
        : data.downloadUrl;
      onResult({ url: downloadUrl, videoId: data.videoId });
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
        {/* Always show single reference image preview if attached */}
        {inputReference && (
          <div className="mb-3 space-y-3">
            <div className="flex items-center gap-2 text-xs bg-green-50 px-3 py-2 rounded-md border border-green-200">
              <svg className="w-4 h-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="truncate flex-1 font-medium text-green-700">
                ✓ Image attached: {inputReference.name}
              </span>
              <button
                onClick={() => {
                  setInputReference(null);
                  setResizedReference(null);
                }}
                className="text-green-600 hover:text-red-600 transition-colors"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="relative rounded-lg overflow-hidden border-2 border-green-200 bg-gray-50 shadow-sm">
              <img
                src={inputReference.dataUrl}
                alt="Reference preview"
                className="w-full h-auto max-h-48 object-contain"
              />
              <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                Reference Image
              </div>
            </div>
          </div>
        )}

        {/* Show upload UI only if no single reference */}
        {!inputReference && supportsMultipleReferences() && isVeo3Model() ? (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Images (up to 3) - Veo 3.1
            </label>
            <Uploader
              label="Add Reference Image"
              onFile={(file) => {
                if (file) {
                  handleMultipleReferencesChange([...inputReferences, file]);
                }
              }}
            />
            {inputReferences.length > 0 && (
              <div className="mt-3 space-y-2">
                {inputReferences.map((ref, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                    <svg className="w-4 h-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate flex-1">{ref.name}</span>
                    <button
                      onClick={() => removeReference(index)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2">
                  {inputReferences.map((ref, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
                      <img
                        src={ref.dataUrl}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-auto max-h-32 object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : !inputReference ? (
          <Uploader
            label="Reference Image"
            onFile={handleReferenceChange}
          />
        ) : null}
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
            {getAvailableResolutions().map((res) => {
              const [w, h] = res.split("x");
              const aspectRatio = (parseInt(w) / parseInt(h)).toFixed(2);
              return (
                <option key={res} value={res}>
                  {w}×{h} ({aspectRatio === "1.78" ? "16:9" : aspectRatio === "0.56" ? "9:16" : aspectRatio})
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm" 
            value={seconds} 
            onChange={(e) => setSeconds(e.target.value)}
          >
            {getAvailableDurations().map((dur) => (
              <option key={dur} value={dur}>{dur}s</option>
            ))}
          </select>
          {isVeo3Model() && (inputReference || inputReferences.length > 0) && seconds !== "8" && (
            <p className="text-xs text-amber-600 mt-1">⚠️ Veo 3 requires 8s duration when using reference images</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all shadow-sm" 
            value={model} 
            onChange={(e) => {
              setModel(e.target.value);
              // Don't clear references when switching models - keep them attached
              // Only clear multi-image references if switching away from Veo 3.1
              const newModel = e.target.value;
              const isNewModelVeo31 = newModel === "veo-3.1" || newModel === "veo-3.1-fast";
              if (!isNewModelVeo31 && inputReferences.length > 0) {
                // Convert first reference image to single reference
                if (inputReferences.length > 0 && !inputReference) {
                  setInputReference(inputReferences[0]);
                }
                setInputReferences([]);
              }
            }}
          >
            <optgroup label="Sora Models">
              <option value="sora-2">Sora 2</option>
              <option value="sora-2-pro">Sora 2 Pro</option>
            </optgroup>
            <optgroup label="Veo 3 Models">
              <option value="veo-3.1">Veo 3.1</option>
              <option value="veo-3.1-fast">Veo 3.1 Fast</option>
              <option value="veo-3.0">Veo 3.0</option>
              <option value="veo-3.0-fast">Veo 3.0 Fast</option>
            </optgroup>
          </select>
        </div>
      </div>
      
      {/* Generate Button */}
      <div className="space-y-2">
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
        <p className="text-xs text-center text-gray-500">
          Estimated cost: <span className="font-semibold text-gray-700">{isVeo3Model() ? getEstimatedCost() : `$${getEstimatedCost()}`}</span>
          {model === "sora-2-pro" && " (Pro quality)"}
          {isVeo3Model() && " (Veo 3 with audio)"}
        </p>
      </div>
      
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