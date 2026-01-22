const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const API_KEY = process.env.GOOGLE_AI_API_KEY;

async function pollVideo(operationName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${API_KEY}`;
  
  try {
    console.log(`Polling operation: ${operationName}...`);
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("Poll API Error:", data.error.message);
      return;
    }

    if (data.done) {
      console.log("Generation complete!");
      // The video usually comes back in response.output.predictions[0].bytesBase64Encoded
      // for video, it might be a GCS URI or a blob depending on the model
      console.log(JSON.stringify(data, null, 2));
      
      if (data.response && data.response.predictions && data.response.predictions[0]) {
         const pred = data.response.predictions[0];
         if (pred.bytesBase64Encoded) {
           const buffer = Buffer.from(pred.bytesBase64Encoded, 'base64');
           const filePath = path.join(__dirname, "..", "assets", "video", "demo_video.mp4");
           fs.writeFileSync(filePath, buffer);
           console.log(`Successfully saved video to ${filePath}`);
         }
      }
    } else {
      console.log("Generation still in progress...");
    }
  } catch (error) {
    console.error("Poll error:", error.message);
  }
}

// Get operation name from the log file
const logPath = path.join(__dirname, "..", "assets", "video", "OPERATION_LOG.json");
if (fs.existsSync(logPath)) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  pollVideo(log.name);
} else {
  console.log("No operation log found.");
}
