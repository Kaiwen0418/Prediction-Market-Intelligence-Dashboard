import type { MarketSnapshot } from "@/types/market";
import type { PollPoint } from "@/types/poll";

type CandidatePollSeries = Record<string, PollPoint[]>;

const texasGopSenatePolls: CandidatePollSeries = {
  "Ken Paxton": [
    {
      timestamp: "2026-02-15T00:00:00.000Z",
      pollAverage: 0.27,
      sampleSize: 1000,
      source: "Emerson College Polling",
      sourceUrl: "https://emersoncollegepolling.com/texas-2026-poll/",
      fieldDateLabel: "February 2026",
      methodology: "Likely Republican primary voters",
      candidate: "Ken Paxton"
    },
    {
      timestamp: "2026-02-26T00:00:00.000Z",
      pollAverage: 0.40,
      sampleSize: 860,
      source: "Emerson College Polling",
      sourceUrl: "https://emersoncollegepolling.com/texas-2026-poll/",
      fieldDateLabel: "February 26-27, 2026",
      methodology: "Likely Republican primary voters",
      candidate: "Ken Paxton"
    },
    {
      timestamp: "2026-02-28T00:00:00.000Z",
      pollAverage: 0.36,
      sampleSize: 1200,
      source: "UT/Texas Politics Project",
      sourceUrl:
        "https://texaspolitics.utexas.edu/blog/competition-remains-fierce-in-both-u-s-senate-primaries-in-texas-according-to-latest-ut-texas-politics-project-poll-2",
      fieldDateLabel: "Late February 2026",
      methodology: "Republican primary voters",
      candidate: "Ken Paxton"
    }
  ],
  "John Cornyn": [
    {
      timestamp: "2026-02-15T00:00:00.000Z",
      pollAverage: 0.26,
      sampleSize: 1000,
      source: "Emerson College Polling",
      sourceUrl: "https://emersoncollegepolling.com/texas-2026-poll/",
      fieldDateLabel: "February 2026",
      methodology: "Likely Republican primary voters",
      candidate: "John Cornyn"
    },
    {
      timestamp: "2026-02-26T00:00:00.000Z",
      pollAverage: 0.36,
      sampleSize: 860,
      source: "Emerson College Polling",
      sourceUrl: "https://emersoncollegepolling.com/texas-2026-poll/",
      fieldDateLabel: "February 26-27, 2026",
      methodology: "Likely Republican primary voters",
      candidate: "John Cornyn"
    },
    {
      timestamp: "2026-02-28T00:00:00.000Z",
      pollAverage: 0.34,
      sampleSize: 1200,
      source: "UT/Texas Politics Project",
      sourceUrl:
        "https://texaspolitics.utexas.edu/blog/competition-remains-fierce-in-both-u-s-senate-primaries-in-texas-according-to-latest-ut-texas-politics-project-poll-2",
      fieldDateLabel: "Late February 2026",
      methodology: "Republican primary voters",
      candidate: "John Cornyn"
    }
  ],
  "Wesley Hunt": [
    {
      timestamp: "2026-02-15T00:00:00.000Z",
      pollAverage: 0.16,
      sampleSize: 1000,
      source: "Emerson College Polling",
      sourceUrl: "https://emersoncollegepolling.com/texas-2026-poll/",
      fieldDateLabel: "February 2026",
      methodology: "Likely Republican primary voters",
      candidate: "Wesley Hunt"
    },
    {
      timestamp: "2026-02-26T00:00:00.000Z",
      pollAverage: 0.17,
      sampleSize: 860,
      source: "Emerson College Polling",
      sourceUrl: "https://emersoncollegepolling.com/texas-2026-poll/",
      fieldDateLabel: "February 26-27, 2026",
      methodology: "Likely Republican primary voters",
      candidate: "Wesley Hunt"
    },
    {
      timestamp: "2026-02-28T00:00:00.000Z",
      pollAverage: 0.26,
      sampleSize: 1200,
      source: "UT/Texas Politics Project",
      sourceUrl:
        "https://texaspolitics.utexas.edu/blog/competition-remains-fierce-in-both-u-s-senate-primaries-in-texas-according-to-latest-ut-texas-politics-project-poll-2",
      fieldDateLabel: "Late February 2026",
      methodology: "Republican primary voters",
      candidate: "Wesley Hunt"
    }
  ]
};

const aliasMap: Record<string, string> = {
  Paxton: "Ken Paxton",
  Cornyn: "John Cornyn",
  Hunt: "Wesley Hunt"
};

export function getTexasGopSenatePolls(market?: MarketSnapshot | null): PollPoint[] {
  const label = market?.outcomeLabel?.trim();
  const canonical = (label && (texasGopSenatePolls[label] ? label : aliasMap[label])) || "Ken Paxton";
  return texasGopSenatePolls[canonical] ?? [];
}
