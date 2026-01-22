const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const API_KEY = process.env.GOOGLE_AI_API_KEY;

async function downloadVideo(uri, outputName) {
  const url = `${uri}&key=${API_KEY}`;
  try {
    console.log(`Downloading video from: ${url}`);
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    const filePath = path.join(__dirname, "..", "assets", "video", outputName);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`Successfully saved video to ${filePath}`);
  } catch (error) {
    console.error("Download error:", error.message);
  }
}

// Since we know the URI from the previous poll
const uri = "https://generativelanguage.googleapis.com/v1beta/files/5f1fpna7hmq3:download?alt=media";
downloadVideo(uri, "demo_video.mp4");
