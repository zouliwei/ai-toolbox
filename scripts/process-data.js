import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../notion-database');
const outPath = path.resolve(__dirname, '../src/data.json');

const files = fs.readdirSync(dbPath);
const getFile = (prefix) => files.find(f => f.startsWith(prefix) && f.endsWith('_all.csv')) || files.find(f => f.startsWith(prefix) && f.endsWith('.csv'));

const appsFile = getFile('AI Apps');
const companiesFile = getFile('AI Companies');
const modelsFile = getFile('AI Models');

if (!appsFile || !companiesFile || !modelsFile) {
    console.error("Missing CSV files");
    process.exit(1);
}

const cleanString = (str) => {
    if (!str) return '';
    return str.replace(/\s*\(https:\/\/www\.notion\.so\/.*?\)/g, '').trim();
};

const parseList = (str) => {
    if (!str) return [];
    // Papaparse already handles quotes. The comma inside quotes won't be split.
    // So str is just a string with commas like "Text, Image, Video"
    return str.split(',').map(s => cleanString(s.trim())).filter(s => s.length > 0);
};

const readCSV = (fileName) => {
    const raw = fs.readFileSync(path.join(dbPath, fileName), 'utf-8');
    const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
    return parsed.data;
};

const rawApps = readCSV(appsFile);
const rawCompanies = readCSV(companiesFile);
const rawModels = readCSV(modelsFile);

const data = {
    apps: rawApps.map(row => ({
        name: cleanString(row['Name / 名称']),
        company: cleanString(row['Company']),
        country: cleanString(row['Country']),
        models: parseList(row['Proprietary Models']),
        outputs: parseList(row['Proprietary Output']),
        type: cleanString(row['Type']),
        linkIntl: row["Int'l link"]?.trim() || '',
        linkCn: row['国内链接']?.trim() || ''
    })),
    companies: rawCompanies.map(row => ({
        name: cleanString(row['Name']),
        country: cleanString(row['Country']),
        apps: parseList(row['Apps']),
        models: parseList(row['Models']),
        // order: parseInt(row['Order']) || 999
    })),
    models: rawModels.map(row => ({
        name: cleanString(row['Name']),
        company: cleanString(row['Company']),
        country: cleanString(row['Country']),
        apps: parseList(row['Apps']),
        outputs: parseList(row['Output'])
    }))
};

fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Successfully generated src/data.json with ${data.apps.length} apps, ${data.companies.length} companies, and ${data.models.length} models.`);
