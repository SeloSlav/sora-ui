import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    console.log("Download request for video ID:", videoId);

    if (!videoId) {
      throw new Error("Video ID required");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Download the video content from OpenAI
    const content = await client.videos.downloadContent(videoId);
    const arrayBuffer = await content.arrayBuffer();

    console.log("Video downloaded successfully, size:", arrayBuffer.byteLength);

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="sora-${videoId}.mp4"`,
        "Content-Length": String(arrayBuffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("Download error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

