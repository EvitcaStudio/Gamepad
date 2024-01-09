// add-version-script.js
const fs = require('fs');
const path = require('path');
const packageJSON = require('./package.json');
const moduleName = JSON.stringify(packageJSON.name).replaceAll('"', '');
const version = JSON.stringify(packageJSON.version).replaceAll('"', '');

const sourceFilePath = path.join(__dirname, 'dist', 'gamepad.min.mjs');
let sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

sourceCode = sourceCode.replaceAll('"VERSION_REPLACE_ME"', JSON.stringify(version));

fs.writeFile(sourceFilePath, sourceCode, 'utf-8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing to the output file:', writeErr);
      return;
    }

    console.log(`${moduleName}@${version} version added successfully!`);
});
