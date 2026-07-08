import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A simple dictionary mapping for major states and common districts
async function translateText(text, targetLang) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const json = await response.json();
    return json[0][0][0];
  } catch (err) {
    console.error(`Error translating ${text}:`, err.message);
    return text;
  }
}

// Map of state to its primary language code
const stateLanguageMap = {
  "Gujarat": "gu",
  "Maharashtra": "mr",
  "Punjab": "pa",
  "Tamil Nadu": "ta",
  "Karnataka": "kn",
  "Kerala": "ml",
  "Andhra Pradesh": "te",
  "Telangana": "te",
  "West Bengal": "bn",
  "Odisha": "or",
  "Assam": "as",
  "Goa": "kok", // Konkani
  "Uttar Pradesh": "hi",
  "Madhya Pradesh": "hi",
  "Rajasthan": "hi",
  "Bihar": "hi",
  "Haryana": "hi",
  "Himachal Pradesh": "hi",
  "Uttarakhand": "hi",
  "Jharkhand": "hi",
  "Chhattisgarh": "hi",
  "Delhi": "hi"
};

async function generate() {
  const isd = await import('india-states-districts');
  
  let allData = [];
  try {
    allData = isd.default.getAllStatesWithDistricts() || isd.getAllStatesWithDistricts();
  } catch (e) {
    allData = isd.getAllStatesWithDistricts();
  }

  // Fallback if package is structured weirdly
  if (!allData || allData.length === 0) {
     console.log("Could not find states array. Exiting.");
     return;
  }

  const result = [];
  
  for (const state of allData) {
    const stateName = state.name;
    const districts = state.districts || [];
    const targetLang = stateLanguageMap[stateName] || 'hi'; // Default to Hindi
    
    console.log(`Translating ${stateName} to ${targetLang}...`);
    const translatedStateName = await translateText(stateName, targetLang);
    
    const translatedDistricts = [];
    for (const d of districts) {
       const tDist = await translateText(d, targetLang);
       translatedDistricts.push({
           name: d,
           localName: tDist
       });
       await new Promise(r => setTimeout(r, 100)); // sleep to avoid rate limiting
    }
    
    result.push({
      name: stateName,
      localName: translatedStateName,
      languageCode: targetLang,
      districts: translatedDistricts
    });
    
    console.log(`Finished ${stateName}`);
  }
  
  const destDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(destDir, 'indianStatesDistricts.json'), JSON.stringify(result, null, 2), 'utf-8');
  console.log('Successfully generated translated dataset!');
}

generate().catch(console.error);
