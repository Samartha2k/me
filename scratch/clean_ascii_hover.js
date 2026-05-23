const fs = require('fs');

const asciiHoverPath = 'c:/Users/Samar/Downloads/me-main/js/ascii-hover.js';
let content = fs.readFileSync(asciiHoverPath, 'utf8');

const startStr = '// Pre-rendered 30px low-res image data URIs to bypass CORS protocol restrictions on local file:// links';
const startIdx = content.indexOf(startStr);
if (startIdx === -1) {
  console.error("Could not find start of comment string in ascii-hover.js");
  process.exit(1);
}

const endStr = '(function () {';
const endIdx = content.indexOf(endStr);
if (endIdx === -1) {
  console.error("Could not find start of IIFE in ascii-hover.js");
  process.exit(1);
}

// Replace the block from startIdx to endIdx with a clean comment
const targetBlock = content.substring(startIdx, endIdx);
const replacement = `// Fallback low-resolution images are loaded from js/fallback-images.js to prevent
// taining local canvas renders and bypass CORS protocols when hosting on file://.
// This splits data from execution logic to keep the codebase organized.

`;

content = content.replace(targetBlock, replacement);

fs.writeFileSync(asciiHoverPath, content, 'utf8');
console.log("Successfully cleaned up ascii-hover.js!");
