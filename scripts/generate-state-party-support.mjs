import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/fivethirtyeight/data/master/polls/2024-averages/presidential_general_averages_2024-09-12_uncorrected.csv";

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

function toStructuredData(text) {
  const rows = parseCsv(text);
  const [headers, ...dataRows] = rows;
  if (!headers) {
    throw new Error("CSV did not contain headers");
  }

  const columns = Object.fromEntries(headers.map((header, index) => [header, index]));
  const grouped = new Map();

  for (const row of dataRows) {
    const cycle = row[columns.cycle];
    const state = row[columns.state];
    const date = row[columns.date];
    const party = normalizeParty(row[columns.party]);
    const support = Number(row[columns.pct_estimate]);

    if (cycle !== "2024" || !state || !date || !party || !Number.isFinite(support)) {
      continue;
    }

    const stateMap = grouped.get(state) ?? new Map();
    const dayRecord = stateMap.get(date) ?? { date };

    if (party === "Democrat") {
      dayRecord.democrat = Number((support / 100).toFixed(4));
    }

    if (party === "Republican") {
      dayRecord.republican = Number((support / 100).toFixed(4));
    }

    stateMap.set(date, dayRecord);
    grouped.set(state, stateMap);
  }

  const states = Array.from(grouped.entries())
    .map(([state, entries]) => ({
      state,
      series: Array.from(entries.values())
        .filter((entry) => typeof entry.democrat === "number" && typeof entry.republican === "number")
        .sort((left, right) => left.date.localeCompare(right.date))
    }))
    .filter((entry) => entry.series.length > 0)
    .sort((left, right) => left.state.localeCompare(right.state));

  return {
    generatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    description: "FiveThirtyEight 2024 presidential general averages cleaned to Democrat/Republican state support rates.",
    states
  };
}

async function main() {
  const cliArgs = process.argv.slice(2).filter((arg) => arg !== "--");
  const inputPath = cliArgs[0];
  const csv = inputPath
    ? await readFile(path.resolve(process.cwd(), inputPath), "utf8")
    : await fetch(SOURCE_URL, {
        headers: {
          Accept: "text/csv"
        }
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch source CSV: ${response.status}`);
        }
        return response.text();
      });
  const structured = toStructuredData(csv);

  const outputDir = path.resolve(process.cwd(), "public", "data");
  const outputPath = path.join(outputDir, "state-party-support-2024.json");

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(structured, null, 2)}\n`, "utf8");

  console.log(`Wrote ${structured.states.length} states to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
