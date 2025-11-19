import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    if (!videoId) {
      throw new Error("Video ID required");
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Extract clean file ID from videoId
    // videoId should be just the file ID (e.g., "e3mmm42ycsr6")
    // But handle cases where it might include ":download?alt=media" or query params
    const fileId = videoId.split(":")[0].split("?")[0];
    
    if (!fileId) {
      throw new Error("Invalid video ID format");
    }

    // Construct download URI according to Google API format
    // From docs: https://generativelanguage.googleapis.com/v1beta/files/{fileId}:download?alt=media
    const downloadUri = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}:download?alt=media`;

    // Fetch the video file directly from Google's API
    // According to REST example in docs, use x-goog-api-key header
    const response = await fetch(downloadUri, {
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google API error:", response.status, errorText);
      throw new Error(`Failed to download video: ${response.status} ${errorText}`);
    }

    // Get the video data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="veo-${fileId}.mp4"`,
        "Content-Length": String(arrayBuffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("Veo 3 download error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

