import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Initialize client with API key from environment
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Simple in-memory cache for file URIs (in production, use Redis or database)
const fileUriCache = new Map<string, string>();

type RefPayload = {
  name: string;
  dataUrl: string; // base64 data URL from the browser
};

// Veo 3 model configurations
const VEO_MODELS = {
  "veo-3.1": "veo-3.1-generate-preview",
  "veo-3.1-fast": "veo-3.1-fast-generate-preview",
  "veo-3.0": "veo-3.0-generate-001",
  "veo-3.0-fast": "veo-3.0-fast-generate-001",
};

// Map resolution strings to Veo format
function mapResolution(size: string): { resolution: "720p" | "1080p"; aspectRatio?: "16:9" | "9:16" } {
  const [width, height] = size.split("x").map(Number);
  const resolution: "720p" | "1080p" = width >= 1920 || height >= 1920 ? "1080p" : "720p";
  
  // Determine aspect ratio
  const aspectRatio = width > height ? "16:9" : height > width ? "9:16" : "16:9";
  
  return { resolution, aspectRatio };
}

// Map duration string to Veo format
function mapDuration(seconds: string): 4 | 6 | 8 {
  const duration = parseInt(seconds);
  if (duration <= 4) return 4;
  if (duration <= 6) return 6;
  return 8;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      size = "1280x720",
      seconds = "8",
      model = "veo-3.1",
      inputReference = null as RefPayload | null,
      inputReferences = null as RefPayload[] | null, // For multiple reference images (Veo 3.1)
      videoExtension = null as { videoId: string } | null, // For video extension
      frameSpecific = null as { firstFrame: RefPayload; lastFrame: RefPayload } | null, // For frame-specific generation
    } = body;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const veoModel = VEO_MODELS[model as keyof typeof VEO_MODELS];
    if (!veoModel) {
      throw new Error(`Invalid Veo model: ${model}`);
    }

    const { resolution, aspectRatio } = mapResolution(size);
    const duration = mapDuration(seconds);

    // Check model support
    const isVeo31 = model === "veo-3.1" || model === "veo-3.1-fast";
    const isVeo3 = model.startsWith("veo-3");
    
    // Both Veo 3.0 and 3.1 support 9:16, but Veo 2 does not
    if (aspectRatio === "9:16" && !isVeo3) {
      throw new Error("9:16 aspect ratio is only supported by Veo 3 models");
    }

    // Prepare video generation parameters based on Veo API
    const generateParams: any = {
      model: veoModel,
      prompt: prompt,
    };

    // Build config object according to Veo API documentation
    // Parameters like resolution, durationSeconds, aspectRatio go in config
    const config: any = {
      resolution: resolution,
      durationSeconds: duration,
    };
    
    // Add aspect ratio to config (always specify it, default is 16:9)
    // Both Veo 3.0 and 3.1 support aspectRatio parameter
    if (isVeo3) {
      config.aspectRatio = aspectRatio; // "16:9" or "9:16"
    }

    // Handle video extension (extend a previously generated video)
    if (videoExtension?.videoId) {
      // For video extension, use video parameter
      // This requires the video object from a previous generation
      generateParams.video = videoExtension.videoId; // This should be a video object, not just ID
    }

    // Handle image-to-video (animating a single image)
    // Use 'image' parameter to animate the reference image
    // Priority: single image animation > multiple reference images
    // The SDK expects raw inline data with bytesBase64Encoded and mimeType
    if (inputReference?.dataUrl && !frameSpecific?.firstFrame) {
      console.log("Preparing image for image-to-video animation...");
      const base64Data = inputReference.dataUrl.split(",")[1];
      
      // Determine mime type from data URL
      const mimeMatch = inputReference.dataUrl.match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      
      // SDK is transforming the object incorrectly, use REST API directly
      generateParams.image = {
        bytesBase64Encoded: base64Data,
        mimeType: mimeType,
      };
      console.log("Image prepared for REST API with mimeType:", mimeType);
    }

    // Handle multiple reference images (style/content references for Veo 3.1 ONLY)
    // These are used as style references, not for animation
    // Only use if no single image is provided (single image takes priority)
    // IMPORTANT: referenceImages only works with Veo 3.1 models, not Veo 3.0
    if (inputReferences && inputReferences.length > 0 && isVeo31 && !inputReference?.dataUrl && !generateParams.image) {
      // If only one image in references, treat it as image-to-video instead
      if (inputReferences.length === 1) {
        console.log("Single reference image detected, using for image-to-video animation...");
        const ref = inputReferences[0];
        const base64Data = ref.dataUrl.split(",")[1];
        const mimeMatch = ref.dataUrl.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        
        // Use REST API format
        generateParams.image = {
          bytesBase64Encoded: base64Data,
          mimeType: mimeType,
        };
        console.log("Image prepared for REST API with mimeType:", mimeType);
      } else {
        // Multiple images: use as style references (Veo 3.1 only)
        console.log(`Preparing ${inputReferences.length} reference images for style/content...`);
        // Create VideoGenerationReferenceImage objects with inlineData
        const referenceImageObjects = inputReferences.slice(0, 3).map((ref: RefPayload) => {
          const base64Data = ref.dataUrl.split(",")[1];
          
          // Determine mime type from data URL
          const mimeMatch = ref.dataUrl.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          
          // Use REST API format for reference images
          return {
            image: {
              bytesBase64Encoded: base64Data,
              mimeType: mimeType,
            },
            referenceType: "asset",
          };
        });
        
        // Add referenceImages to config
        config.referenceImages = referenceImageObjects;
        console.log(`Prepared ${referenceImageObjects.length} reference images`);
      }
    }

    // Add config to generateParams
    if (Object.keys(config).length > 0) {
      generateParams.config = config;
    }

    // Handle frame-specific generation (interpolation)
    // Use 'image' for first frame and 'lastFrame' in config for last frame
    // Veo API expects images with bytesBase64Encoded and mimeType
    if (frameSpecific?.firstFrame && frameSpecific?.lastFrame) {
      console.log("Preparing first and last frames for interpolation...");
      
      // Prepare first frame
      const firstFrameBase64 = frameSpecific.firstFrame.dataUrl.split(",")[1];
      const firstMimeMatch = frameSpecific.firstFrame.dataUrl.match(/data:([^;]+);/);
      const firstMimeType = firstMimeMatch ? firstMimeMatch[1] : "image/jpeg";
      
      // Prepare last frame
      const lastFrameBase64 = frameSpecific.lastFrame.dataUrl.split(",")[1];
      const lastMimeMatch = frameSpecific.lastFrame.dataUrl.match(/data:([^;]+);/);
      const lastMimeType = lastMimeMatch ? lastMimeMatch[1] : "image/jpeg";
      
      // Use REST API format
      generateParams.image = {
        bytesBase64Encoded: firstFrameBase64,
        mimeType: firstMimeType,
      };
      config.lastFrame = {
        bytesBase64Encoded: lastFrameBase64,
        mimeType: lastMimeType,
      };
      console.log("First and last frames prepared for REST API");
    }

    // Debug: Log the parameters being sent (without base64 data)
    console.log("Generating video with params:", {
      model: generateParams.model,
      hasImage: !!generateParams.image,
      hasVideo: !!generateParams.video,
      imageStructure: generateParams.image ? {
        keys: Object.keys(generateParams.image),
        hasInlineData: 'inlineData' in generateParams.image,
        inlineDataKeys: generateParams.image.inlineData ? Object.keys(generateParams.image.inlineData) : [],
        mimeType: generateParams.image.inlineData?.mimeType || generateParams.image.mimeType,
        dataLength: generateParams.image.inlineData?.data?.length || generateParams.image.bytesBase64Encoded?.length || 0,
      } : null,
      config: {
        resolution: config.resolution,
        durationSeconds: config.durationSeconds,
        aspectRatio: config.aspectRatio,
        hasReferenceImages: !!config.referenceImages,
        referenceImagesCount: config.referenceImages?.length || 0,
        hasLastFrame: !!config.lastFrame,
      },
    });
    
    // Try logging the actual generateParams structure (sanitized)
    console.log("Full generateParams structure:", JSON.stringify({
      model: generateParams.model,
      prompt: generateParams.prompt?.substring(0, 50) + "...",
      image: generateParams.image ? {
        structure: generateParams.image.inlineData ? "inlineData" : "direct",
        inlineData: generateParams.image.inlineData ? {
          data: `[${generateParams.image.inlineData.data?.length || 0} bytes]`,
          mimeType: generateParams.image.inlineData.mimeType,
        } : undefined,
        direct: !generateParams.image.inlineData ? {
          bytesBase64Encoded: `[${generateParams.image.bytesBase64Encoded?.length || 0} bytes]`,
          mimeType: generateParams.image.mimeType,
        } : undefined,
      } : undefined,
      config: generateParams.config,
    }, null, 2));

    // Generate video using REST API directly (SDK has issues with image format)
    console.log("Calling Veo REST API directly...");
    const restApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning`;
    
    // Build the REST API request body
    const restBody: any = {
      instances: [{
        prompt: generateParams.prompt,
      }],
      parameters: {
        sampleCount: 1,
        ...config,
      },
    };
    
    // Add image to instances if present
    if (generateParams.image) {
      restBody.instances[0].image = generateParams.image;
    }
    
    const restResponse = await fetch(restApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify(restBody),
    });
    
    if (!restResponse.ok) {
      const errorData = await restResponse.json();
      throw new Error(`REST API error: ${JSON.stringify(errorData)}`);
    }
    
    const operationData = await restResponse.json();
    const operationName = operationData.name;
    console.log("Operation started:", operationName);
    
    // Poll the operation using REST API
    let isDone = false;

    // Poll until the operation is complete using REST API
    let pollCount = 0;
    const maxPolls = 60; // Max 10 minutes (60 * 10 seconds)
    let operationResult: any = null;
    
    while (!isDone && pollCount < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
      const pollResponse = await fetch(pollUrl, {
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
      });
      
      operationResult = await pollResponse.json();
      isDone = operationResult.done === true;
      pollCount++;
      
      if (isDone) {
        console.log("Video generation completed!");
      }
    }

    if (!isDone) {
      throw new Error("Video generation timed out");
    }

    if (operationResult.error) {
      throw new Error(`Video generation failed: ${operationResult.error.message || "Unknown error"}`);
    }
    
    // Get the generated video from REST API response
    const generatedVideo = operationResult.response?.generateVideoResponse?.generatedSamples?.[0];
    if (!generatedVideo || !generatedVideo.video) {
      throw new Error("No video generated in response");
    }

    // Extract file information from the video object
    const videoFile = generatedVideo.video;
    
    // According to docs: video.uri contains the file URI
    // Format can be: "files/{fileId}" or full URL
    const videoUri = videoFile.uri || "";
    
    if (!videoUri) {
      throw new Error("No video URI found in response");
    }
    
    // Extract file ID from URI
    // URI format examples:
    // - "files/e3mmm42ycsr6"
    // - "https://generativelanguage.googleapis.com/v1beta/files/e3mmm42ycsr6"
    const filesMatch = videoUri.match(/files\/([^\/\?:]+)/);
    
    if (!filesMatch || !filesMatch[1]) {
      throw new Error(`Could not extract file ID from video URI: ${videoUri}`);
    }
    
    const fileId = filesMatch[1];
    
    // Use file ID as videoId for the download endpoint
    const videoId = fileId;
    
    // Construct the download URI according to Google API format
    // From docs: Use the URI directly or construct: files/{fileId}:download?alt=media
    const downloadUri = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media`;

    // Store the file URI mapping for download endpoint
    fileUriCache.set(videoId, downloadUri);
    // Clean up after 2 days (Veo videos are stored for 2 days)
    setTimeout(() => fileUriCache.delete(videoId), 2 * 24 * 60 * 60 * 1000);

    return NextResponse.json({
      videoId,
      status: "completed",
      model: veoModel,
      size: `${resolution}${aspectRatio ? ` ${aspectRatio}` : ""}`,
      seconds: duration,
      downloadUrl: `/api/veo3/download/${videoId}`,
      fileUri: downloadUri,
    });
  } catch (err: any) {
    console.error("Veo 3 API error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

