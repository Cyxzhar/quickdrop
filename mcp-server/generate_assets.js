const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function generateAndSaveImage(prompt, outputName, modelName = "gemini-2.5-flash-image") {
  try {
    console.log(`Generating with ${modelName}: ${outputName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "GENERATE_IMAGE: " + prompt }] }],
    });
    
    const response = await result.response;
    
    const assetsDir = path.join(__dirname, "..", "assets", "generated");
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const filePath = path.join(assetsDir, outputName);
    let imageSaved = false;
    
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith("image/")) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync(filePath, buffer);
          console.log(`Successfully saved ${outputName} to ${filePath}`);
          imageSaved = true;
          break;
        }
      }
    }

    if (!imageSaved) {
      console.log(`No image part found in response for ${outputName}.`);
    }
    
    return imageSaved;
  } catch (error) {
    console.error(`Error generating ${outputName}:`, error.message);
    return false;
  }
}

async function run() {
  const assets = [
    {
      prompt: "A 32x32 favicon icon for a screenshot app, featuring a simplified golden lightning bolt on a blue background, professional minimal design.",
      name: "favicon.png"
    },
    {
      prompt: "A 1200x630 Open Graph sharing image for 'QuickDrop'. Central logo with text 'Screenshot to link in 1 second'. Vibrant blue/purple gradient background, professional tech style.",
      name: "og-image.png"
    },
    {
      prompt: "A professional illustration representing 'Instant Speed' for a tech app. A lightning bolt moving through a digital space, blue and amber colors, flat vector style.",
      name: "feature-speed.png"
    },
    {
      prompt: "A professional illustration representing 'Privacy & Security'. A stylized shield or lock with a clock showing 24h expiry. Clean vector style, purple and green colors.",
      name: "feature-privacy.png"
    },
    {
      prompt: "A Twitter header image for QuickDrop app. Text 'QuickDrop - Screenshot sharing evolved'. Space for profile picture on the left. Tech-focused abstract background.",
      name: "twitter-header.png"
    }
  ];

  for (const asset of assets) {
    await generateAndSaveImage(asset.prompt, asset.name);
  }
}

run();