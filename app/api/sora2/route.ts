import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type RefPayload = {
  name: string;
  dataUrl: string; // base64 data URL from the browser
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      size = "1280x720",
      seconds = "8",
      model = "sora-2",
      inputReference = null as RefPayload | null,
    } = body;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Prepare the request parameters
    const params: any = {
      model,
      prompt,
      size,
      seconds,
    };

    // If there's an input reference image, convert it to a file
    if (inputReference?.dataUrl) {
      const base64Data = inputReference.dataUrl.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      
      // Determine mime type from data URL
      const mimeMatch = inputReference.dataUrl.match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      
      params.input_reference = await toFile(buffer, inputReference.name || "reference.jpg", {
        type: mimeType,
      });
    }

    // Create the video job
    let video = await client.videos.create(params);

    // Poll until completed
    while (video.status === "queued" || video.status === "in_progress") {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      video = await client.videos.retrieve(video.id);
    }

    if (video.status === "failed") {
      throw new Error("Video generation failed");
    }

    if (video.status !== "completed") {
      throw new Error(`Unexpected status: ${video.status}`);
    }
    
    return NextResponse.json({
      videoId: video.id,
      status: video.status,
      model: video.model,
      size: video.size,
      seconds: video.seconds,
      downloadUrl: `/api/sora2/download/${video.id}`,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}