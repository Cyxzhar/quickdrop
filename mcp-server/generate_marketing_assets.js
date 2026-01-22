const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function generateAndSaveImage(prompt, outputName, subDir, modelName = "gemini-2.5-flash-image") {
  try {
    console.log(`Generating with ${modelName}: ${outputName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "GENERATE_IMAGE: " + prompt }] }],
    });
    
    const response = await result.response;
    
    const assetsDir = path.join(__dirname, "..", "assets", subDir);
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
    // Product Hunt
    {
      prompt: "A 1270x760 Product Hunt featured image for 'QuickDrop'. Vibrant blue to purple gradient background, high-res app icon in center, text 'Screenshot to Link in 1 Second' in bold modern font. Three badges at bottom: Free, No Account, Privacy.",
      name: "featured_image.png",
      dir: "product_hunt"
    },
    // Reddit
    {
      prompt: "A side-by-side comparison image. Left side: 'BEFORE' with a red border, showing a cluttered desktop and many manual steps. Right side: 'AFTER' with a green border, showing a clean desktop, a 'Link Copied' notification, and a 1s timer. Professional tech style.",
      name: "comparison.png",
      dir: "reddit"
    },
    // Tutorial Screens
    {
      prompt: "A tutorial illustration showing a macOS DMG file being dragged into the Applications folder. Numbered circle '1' with text 'Drag to install'.",
      name: "01_installation.png",
      dir: "tutorial"
    },
    {
      prompt: "A tutorial illustration showing the macOS system tray with a glowing QuickDrop icon. Numbered circle '2' with text 'QuickDrop is ready'.",
      name: "02_first_launch.png",
      dir: "tutorial"
    },
    {
      prompt: "A tutorial illustration showing a user selecting a portion of the screen with a crosshair (macOS screenshot style). Numbered circle '3' with text 'Select area'.",
      name: "03_screenshot.png",
      dir: "tutorial"
    },
    {
      prompt: "A tutorial illustration showing a 'Link Copied!' notification appearing. Numbered circle '4' with text 'Paste anywhere'.",
      name: "04_link_copied.png",
      dir: "tutorial"
    }
  ];

  for (const asset of assets) {
    await generateAndSaveImage(asset.prompt, asset.name, asset.dir);
  }
}

run();
