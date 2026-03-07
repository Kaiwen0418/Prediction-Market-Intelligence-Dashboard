import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://github.com/kevin-claw-agent/poll-data";
const DEFAULT_INPUT_DIR = "/tmp/poll-data";

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizeParty(value) {
  if (value === "DEM") return "Democrat";
  if (value === "REP") return "Republican";
  return null;
}

function normalizeDate(value) {
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function appendCsvToGroups(grouped, text) {
  const rows = parseCsv(text);
  const [headers, ...dataRows] = rows;
  if (!headers) {
    throw new Error("CSV did not contain headers");
  }

  const columns = Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ""), index]));

  for (const row of dataRows) {
    const state = row[columns.state];
    const date = normalizeDate(row[columns.end_date]);
    const party = normalizeParty(row[columns.party]);
    const support = Number(row[columns.pct]);

    if (!state || !date || !party || !Number.isFinite(support)) {
      continue;
    }

    const stateMap = grouped.get(state) ?? new Map();
    const dayRecord = stateMap.get(date) ?? {
      date,
      democratTotal: 0,
      democratCount: 0,
      republicanTotal: 0,
      republicanCount: 0
    };

    if (party === "Democrat") {
      dayRecord.democratTotal += support;
      dayRecord.democratCount += 1;
    }

    if (party === "Republican") {
      dayRecord.republicanTotal += support;
      dayRecord.republicanCount += 1;
    }

    stateMap.set(date, dayRecord);
    grouped.set(state, stateMap);
  }
}

function toStructuredData(csvTexts) {
  const grouped = new Map();
  for (const text of csvTexts) {
    appendCsvToGroups(grouped, text);
  }

  const states = Array.from(grouped.entries())
    .map(([state, entries]) => ({
      state,
      series: Array.from(entries.values())
        .map((entry) => ({
          date: entry.date,
          ...(entry.republicanCount > 0
            ? { republican: Number(((entry.republicanTotal / entry.republicanCount) / 100).toFixed(4)) }
            : {}),
          ...(entry.democratCount > 0
            ? { democrat: Number(((entry.democratTotal / entry.democratCount) / 100).toFixed(4)) }
            : {})
        }))
        .filter((entry) => typeof entry.democrat === "number" && typeof entry.republican === "number")
        .sort((left, right) => left.date.localeCompare(right.date))
    }))
    .filter((entry) => entry.series.length > 0)
    .sort((left, right) => left.state.localeCompare(right.state));

  return {
    generatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    description:
      "State-level daily Democrat/Republican support rebuilt from kevin-claw-agent/poll-data by averaging all available FiveThirtyEight poll rows for each state-day-party bucket.",
    states
  };
}

async function resolveCsvTexts(inputPath) {
  const resolvedInput = path.resolve(process.cwd(), inputPath ?? DEFAULT_INPUT_DIR);
  const inputStats = await stat(resolvedInput).catch(() => null);
  if (!inputStats) {
    throw new Error(`Input path not found: ${resolvedInput}`);
  }

  if (inputStats.isFile()) {
    return [await readFile(resolvedInput, "utf8")];
  }

  if (!inputStats.isDirectory()) {
    throw new Error(`Input path is neither a file nor a directory: ${resolvedInput}`);
  }

  const fileNames = (await readdir(resolvedInput))
    .filter((fileName) => fileName.toLowerCase().endsWith("_538.csv"))
    .sort((left, right) => left.localeCompare(right));

  if (!fileNames.length) {
    throw new Error(`No *_538.csv files found in ${resolvedInput}`);
  }

  return Promise.all(fileNames.map((fileName) => readFile(path.join(resolvedInput, fileName), "utf8")));
}

async function main() {
  const cliArgs = process.argv.slice(2).filter((arg) => arg !== "--");
  const inputPath = cliArgs[0] ?? DEFAULT_INPUT_DIR;
  const csvTexts = await resolveCsvTexts(inputPath);
  const structured = toStructuredData(csvTexts);

  const outputDir = path.resolve(process.cwd(), "public", "data");
  const outputPath = path.join(outputDir, "state-party-support-2024.json");

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(structured, null, 2)}\n`, "utf8");

  console.log(`Wrote ${structured.states.length} states to ${outputPath} from ${csvTexts.length} CSV files`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
