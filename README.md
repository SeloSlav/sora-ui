# Sora 2 Studio

A Next.js 15 application for generating AI videos using OpenAI's Sora 2 API with GPT-4o-powered prompt enhancement.

## Features

- 🎬 **Video Generation**: Create AI videos using Sora 2 and Sora 2 Pro models
- ✨ **Smart Prompt Enhancement**: Transform simple ideas into production-ready prompts using GPT-4o
- 🖼️ **Reference Image Support**: Upload an image to use as the first frame
- ⚙️ **Flexible Controls**: Choose resolution, duration, and model quality
- 🎨 **Modern UI**: Clean, responsive interface with real-time feedback

## Getting Started

### Prerequisites

- Node.js 18+ 
- OpenAI API key with Sora 2 access

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd sora2-studio
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Basic Workflow

1. **Enter a prompt** - Describe the video you want to create
2. **Enhance (optional)** - Click "✨ Enhance Prompt" to optimize with GPT-4o
3. **Upload reference (optional)** - Add an image to use as the first frame
4. **Configure settings** - Choose size, duration, and model
5. **Generate** - Click "Generate Video" and wait for completion

### Example Prompts

**Simple input:**
```
A child flying a kite in a park at sunset
```

**After enhancement:**
```
Style: Warm cinematic realism with golden hour lighting and soft focus.

Wide shot of a grassy park at golden hour. A child in a yellow jacket runs across the frame, red kite trailing behind, catching the last rays of sunlight. Trees frame the background, leaves glowing amber and green.

Cinematography:
Camera shot: wide establishing shot, eye level, slow pan right
Lens: 35mm, shallow depth of field
Lighting: natural golden hour key, warm backlight with soft rim
Mood: nostalgic, peaceful, cinematic

Actions:
- Child runs three steps forward, kite lifting
- Kite catches wind and rises sharply
- Child stops, looks up, and smiles

Background Sound:
Wind rustling leaves, distant birds, kite fabric flutter
```

## API Endpoints

### POST `/api/sora2`
Generate a video using Sora 2.

**Request:**
```json
{
  "prompt": "Your video description",
  "size": "1280x720",
  "seconds": "8",
  "model": "sora-2",
  "inputReference": {
    "name": "image.jpg",
    "dataUrl": "data:image/jpeg;base64,..."
  }
}
```

**Response:**
```json
{
  "videoId": "video_abc123",
  "downloadUrl": "/api/sora2/download/video_abc123",
  "status": "completed"
}
```

### POST `/api/enhance-prompt`
Enhance a prompt using GPT-4o.

**Request:**
```json
{
  "prompt": "A robot fixing a light bulb"
}
```

**Response:**
```json
{
  "original": "A robot fixing a light bulb",
  "enhanced": "Style: Hand-painted 2D/3D hybrid animation..."
}
```

### GET `/api/sora2/download/:videoId`
Stream the generated video MP4 file.

## Configuration Options

### Models
- **sora-2**: Faster, cheaper (~$0.10/sec at 720p) - Best for iteration
- **sora-2-pro**: Higher quality (~$0.30-0.50/sec) - Best for production

### Resolutions
- **1280x720**: Landscape (both models)
- **720x1280**: Portrait (both models)
- **1024x1792**: Tall portrait (sora-2-pro only)
- **1792x1024**: Wide landscape (sora-2-pro only)

### Duration
- **4 seconds**: Quick clips, best instruction following
- **8 seconds**: Standard duration (default)
- **12 seconds**: Longer scenes (sora-2-pro only)

## Cost Estimates

### Video Generation (Sora 2, 8s, 720p)
- Per video: ~$0.80
- 10 videos: ~$8
- 50 videos: ~$40

### Video Generation (Sora 2 Pro, 8s, 720p)
- Per video: ~$2.40-4.00
- 10 videos: ~$24-40
- 50 videos: ~$120-200

### Prompt Enhancement (GPT-4o)
- Per enhancement: ~$0.01-0.03
- Negligible compared to video generation

## Project Structure

```
sora2-studio/
├── app/
│   ├── api/
│   │   ├── sora2/
│   │   │   └── route.ts          # Video generation endpoint
│   │   └── enhance-prompt/
│   │       └── route.ts           # Prompt enhancement endpoint
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Main UI
├── components/
│   ├── Uploader.tsx               # Image upload component
│   ├── PromptForm.tsx             # Main form with enhancement
│   └── VideoPlayer.tsx            # Video playback component
├── .env.local                     # API keys (not in git)
└── package.json
```

## Important Notes

### Serverless Timeout Warning ⚠️
Video generation can take 2-5 minutes. On Vercel:
- **Free tier**: 10s timeout (will fail)
- **Pro tier**: 30s timeout (may fail)
- **Enterprise**: 5min timeout (recommended)

**Alternative**: Deploy to Railway, Render, or implement client-side polling.

### Polling Behavior
The current implementation polls the Sora API every 5 seconds until completion. This is handled server-side and does not incur additional costs beyond the video generation itself.

## Deployment

### Vercel (Recommended for Enterprise tier)
```bash
vercel --prod
```

### Railway / Render
1. Connect your repository
2. Add `OPENAI_API_KEY` environment variable
3. Deploy

## Troubleshooting

### "OPENAI_API_KEY not configured"
- Ensure `.env.local` exists with your API key
- Restart the dev server after adding the key

### "Property 'create' does not exist on type 'Videos'"
- Update OpenAI SDK: `npm install openai@latest`

### Video generation times out
- Deploy to a platform with longer timeout limits
- Or implement client-side polling (see ENHANCE_PROMPT_GUIDE.md)

### Enhancement not working
- Check that GPT-4o access is enabled on your API key
- Verify the prompt is not empty

## Resources

- [OpenAI Sora 2 Documentation](https://platform.openai.com/docs/guides/video-generation)
- [Sora 2 Prompting Guide](https://cookbook.openai.com/examples/sora/sora2_prompting_guide)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Enhance Prompt Guide](./ENHANCE_PROMPT_GUIDE.md)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
