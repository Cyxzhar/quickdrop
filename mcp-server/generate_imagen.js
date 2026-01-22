const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const API_KEY = process.env.GOOGLE_AI_API_KEY;

async function generateImagen(prompt, outputName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${API_KEY}`;
  
  const payload = {
    instances: [
      { prompt: prompt }
    ],
    parameters: {
      sampleCount: 1,
      // You can add more parameters here like aspect ratio if supported
    }
  };

  try {
    console.log(`Generating with Imagen: ${outputName}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
      console.error(`API Error for ${outputName}:`, data.error.message);
      return;
    }

    // The response structure for Imagen 3 in vertex/generative AI usually returns base64 in predictions
    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
      const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
      const assetsDir = path.join(__dirname, "..", "assets", "generated");
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const filePath = path.join(assetsDir, outputName);
      fs.writeFileSync(filePath, buffer);
      console.log(`Successfully saved ${outputName} to ${filePath}`);
    } else {
      console.log(`Unexpected response structure for ${outputName}:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`Fetch error for ${outputName}:`, error.message);
  }
}

async function run() {
  await generateImagen("A professional 1024x1024 app icon, blue to purple gradient, golden lightning bolt, minimal.", "app_icon_imagen.png");
}

run();
