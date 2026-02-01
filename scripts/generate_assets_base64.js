
import fs from 'fs';
import path from 'path';

const assetsDir = path.join(process.cwd(), 'public', 'assets');

const processImage = (sourceFilename, targetFilename, borderColor) => {
    const sourcePath = path.join(assetsDir, sourceFilename);
    const targetPath = path.join(assetsDir, targetFilename);

    try {
        const bitmap = fs.readFileSync(sourcePath);
        const base64 = Buffer.from(bitmap).toString('base64');
        const uri = `data:image/png;base64,${base64}`;

        const svgContent = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="circleView">
      <circle cx="100" cy="100" r="95" />
    </clipPath>
  </defs>
  <image href="${uri}" x="0" y="0" width="200" height="200" clip-path="url(#circleView)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="100" cy="100" r="95" fill="none" stroke="${borderColor}" stroke-width="4"/>
</svg>`;

        fs.writeFileSync(targetPath, svgContent);
        console.log(`Generated ${targetFilename} from ${sourceFilename}`);
    } catch (e) {
        console.error(`Error processing ${sourceFilename}:`, e);
    }
};

// Doge (Gold Border)
processImage('stock_0_source.png', 'stock_0.svg', '#F0C330');

// SK Hynix (Red Border)
processImage('stock_4_source.png', 'stock_4.svg', '#DB0025');
