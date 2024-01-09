// add-banner-script.js
const fs = require('fs');
const path = require('path');
const packageJSON = require('./package.json');
const moduleName = JSON.stringify(packageJSON.name).replaceAll('"', '');
const version = JSON.stringify(packageJSON.version).replaceAll('"', '');
const repo = JSON.stringify(packageJSON.repository.url).replaceAll('.git', '').replaceAll('"', '');
const date = new Date();
const UTCTime = date.toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' });

const banner = `/**
 * ${moduleName}@${version} ${repo}
 * Compiled ${UTCTime}
 * 
 * ${moduleName} is licensed under a MIT styled License. See LICENSE.md for more info.
 * 
 * Copyright ${date.getFullYear()}, Evitca Studio, All Rights Reserved
 */
`;

const sourceFilePath = path.join(__dirname, 'dist', 'gamepad.min.mjs');
let sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

sourceCode = `${banner} ${sourceCode}`;

fs.writeFile(sourceFilePath, sourceCode, 'utf-8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing to the output file:', writeErr);
      return;
    }

    console.log(`${moduleName}@${version} banner added successfully!`);
});