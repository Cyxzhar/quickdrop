const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function generateAndSaveImage(prompt, outputName) {
  try {
    console.log(`Generating: ${outputName}...`);
    
    // Attempting to use the gemini-2.0-flash experimental model which supports image generation in its generation flow
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp-image-generation" });

    // For image generation models in the Gemini family, 
    // the request usually expects a prompt that triggers image output.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    const assetsDir = path.join(__dirname, "..", "assets", "generated");
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const filePath = path.join(assetsDir, outputName);
    
    // Extracting image data from response
    // Response structure for image generation models might include inlineData or parts with images
    const parts = response.candidates[0].content.parts;
    const imagePart = parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith("image/"));

    if (imagePart) {
      const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`Successfully saved ${outputName} to ${filePath}`);
    } else {
      console.log(`No image part found in response for ${outputName}.`);
      console.log("Full response text:", response.text());
    }
  } catch (error) {
    console.error(`Error generating ${outputName}:`, error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(error.response, null, 2));
    }
  }
}

async function run() {
  const iconPrompt = "Generate a professional 1024x1024 PNG app icon for a screenshot tool. Dotted rectangle frame with a golden lightning bolt overlay. Blue to purple gradient background. Modern macOS Big Sur aesthetic.";
  
  const heroPrompt = "Generate a 16:9 professional marketing hero image for a software called QuickDrop. Show a sleek macOS desktop with a notification that says 'Link copied!'. Modern SaaS style, high quality.";

  await generateAndSaveImage(iconPrompt, "app_icon.png");
  await generateAndSaveImage(heroPrompt, "hero_image.png");
}

run();