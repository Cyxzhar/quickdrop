const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const API_KEY = process.env.GOOGLE_AI_API_KEY;

async function generateVideo() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key=${API_KEY}`;
  
  const payload = {
    instances: [
      { 
        prompt: "A cinematic professional 6-second video showing a macOS desktop. A user takes a screenshot, and immediately a notification 'Link Copied' appears in the top right. Modern SaaS style." 
      }
    ],
    parameters: {
      sampleCount: 1,
      durationSeconds: 6
    }
  };

  try {
    console.log("Requesting video generation (this is a long-running operation)...");
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
      console.error("Video API Error:", data.error.message);
      return;
    }

    console.log("Operation started successfully:", JSON.stringify(data, null, 2));
    
    const videoDir = path.join(__dirname, "..", "assets", "video");
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    fs.writeFileSync(path.join(videoDir, "OPERATION_LOG.json"), JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error("Video Fetch error:", error.message);
  }
}

generateVideo();