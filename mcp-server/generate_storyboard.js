const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function generateStoryboard() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = "Create a 30-second professional video storyboard for 'QuickDrop', an app that converts screenshots to links in 1 second. Focus on the contrast between the frustration of the 'old way' and the speed of QuickDrop. Include scene descriptions, text overlays, and visual metaphors for speed.";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const assetsDir = path.join(__dirname, "..", "assets", "video");
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(assetsDir, "STORYBOARD.md"), text);
    console.log("Storyboard generated and saved to assets/video/STORYBOARD.md");
  } catch (error) {
    console.error("Error generating storyboard:", error.message);
  }
}

generateStoryboard();
