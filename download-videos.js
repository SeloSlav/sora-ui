#!/usr/bin/env node

/**
 * Script to download Sora 2 videos by their video IDs
 * 
 * Usage:
 *   node download-videos.js video_abc123 video_def456 video_ghi789
 * 
 * Or with a list:
 *   node download-videos.js video_68fcd14d548081917bc9f5997ee8da9106f760684808ea5d
 */

const fs = require('fs');
const path = require('path');

// Your video IDs from failed attempts
const VIDEO_IDS = process.argv.slice(2);

if (VIDEO_IDS.length === 0) {
  console.log('Usage: node download-videos.js <video_id1> <video_id2> ...');
  console.log('\nExample:');
  console.log('  node download-videos.js video_68fcd14d548081917bc9f5997ee8da9106f760684808ea5d');
  process.exit(1);
}

const BASE_URL = 'http://localhost:3000/api/sora2/download';
const OUTPUT_DIR = './downloaded-videos';

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadVideo(videoId) {
  const url = `${BASE_URL}/${videoId}`;
  const outputPath = path.join(OUTPUT_DIR, `sora-${videoId}.mp4`);

  console.log(`\n📥 Downloading: ${videoId}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(outputPath, buffer);
    
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`   ✅ Success! Saved to: ${outputPath}`);
    console.log(`   📊 Size: ${sizeMB} MB`);
    
    return { success: true, videoId, path: outputPath };
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, videoId, error: error.message };
  }
}

async function downloadAll() {
  console.log(`🎬 Starting download of ${VIDEO_IDS.length} video(s)...\n`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

  const results = [];
  
  for (const videoId of VIDEO_IDS) {
    const result = await downloadVideo(videoId);
    results.push(result);
    
    // Small delay between downloads
    if (VIDEO_IDS.indexOf(videoId) < VIDEO_IDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${VIDEO_IDS.length}`);
  console.log(`❌ Failed: ${failed.length}/${VIDEO_IDS.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successfully downloaded:');
    successful.forEach(r => {
      console.log(`   - ${r.videoId}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed downloads:');
    failed.forEach(r => {
      console.log(`   - ${r.videoId}: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run the script
downloadAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

