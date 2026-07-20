import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const ROOT = "C:\\Users\\CETUAdmin1\\cetu-lms";
const OUTPUT_DIR = path.join(ROOT, "outputs", "aar-survey-export");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "PACT-July-26-Anonymous-Survey-Results.xlsx");
const COHORT_ID = "62604531-460f-4b85-86f6-dc74ec286421";
const require = createRequire(path.join(ROOT, "backend", "package.json"));
require("dotenv").config({ path: path.join(ROOT, "backend", ".env") });
const { sequelize } = require(path.join(ROOT, "backend", "src", "config", "database"));

const palette = {
  navy: "#17365D",
  blue: "#2F75B5",
  paleBlue: "#D9EAF7",
  paleGold: "#FFF2CC",
  paleGreen: "#E2F0D9",
  ink: "#1F2937",
  muted: "#667085",
  line: "#D0D5DD",
  white: "#FFFFFF",
};

function redactFreeText(input) {
  return String(input ?? "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL REDACTED]")
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[URL REDACTED]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[ID REDACTED]")
    .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[PHONE REDACTED]")
    .replace(/\b(?:my name is|i am|i'm)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g, "[NAME REDACTED]")
    .trim();
}

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function safeSheetName(value) {
  return value.replace(/[\\/*?:[\]]/g, " ").slice(0, 31);
}

function setTitle(sheet, range, text) {
  sheet.getRange(range).merge();
  const cell = sheet.getRange(range.split(":")[0]);
  cell.values = [[text]];
  cell.format = {
    fill: palette.navy,
    font: { bold: true, color: palette.white, size: 16 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  sheet.getRange(range).format.rowHeight = 30;
}

function styleHeader(range) {
  range.format = {
    fill: palette.blue,
    font: { bold: true, color: palette.white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
  };
  range.format.rowHeight = 34;
}

async function extractSurvey() {
  const [rows] = await sequelize.query(
    `SELECT a.id, a.title, a.questions, s.content
       FROM assignments a
       JOIN submissions s ON s.assignment_id = a.id
       JOIN enrollments e ON e.user_id = s.user_id
      WHERE e.cohort_id = :cohortId
        AND e.role = 'student'
        AND a.type = 'survey'
        AND s.status IN ('submitted', 'graded', 'returned')
      ORDER BY a.created_at DESC`,
    { replacements: { cohortId: COHORT_ID } },
  );
  if (!rows.length) throw new Error("No completed survey responses found for the cohort.");
  const latestId = rows[0].id;
  const latest = rows.filter((row) => row.id === latestId);
  const questions = Array.isArray(latest[0].questions) ? latest[0].questions : [];
  const responses = latest
    .map((row) => {
      try {
        const parsed = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
        return parsed?.surveyResponses ?? null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return { title: latest[0].title, questions, responses };
}

async function build() {
  const survey = await extractSurvey();
  const randomized = shuffled(survey.responses);
  const workbook = Workbook.create();
  const overview = workbook.worksheets.add("Overview");
  const raw = workbook.worksheets.add("Raw Responses");
  const codebook = workbook.worksheets.add("Question Codebook");
  const distribution = workbook.worksheets.add("Answer Distributions");

  for (const sheet of [overview, raw, codebook, distribution]) {
    sheet.showGridLines = false;
  }

  setTitle(overview, "A1:H1", "PACT July 26 — Anonymous Survey Results");
  overview.getRange("A3:B8").values = [
    ["Measure", "Value"],
    ["Cohort", "PACT July 26"],
    ["Course dates", "July 13–17, 2026"],
    ["Survey", survey.title],
    ["Anonymous responses", null],
    ["Privacy status", "Identity fields removed"],
  ];
  overview.getRange("B7").formulas = [[`=COUNTA('Raw Responses'!$A$5:$A$${randomized.length + 4})`]];
  styleHeader(overview.getRange("A3:B3"));
  overview.getRange("A4:A8").format = { fill: palette.paleBlue, font: { bold: true, color: palette.ink } };
  overview.getRange("A10:H10").merge();
  overview.getRange("A10").values = [["Privacy and interpretation notes"]];
  overview.getRange("A10:H10").format = { fill: palette.blue, font: { bold: true, color: palette.white } };
  overview.getRange("A11:H16").merge();
  overview.getRange("A11").values = [[
    "This workbook contains no learner names, user IDs, email addresses, squad IDs, submission IDs, or timestamps. " +
    "Rows were randomized and assigned nonpersistent ANON labels that cannot be joined back to PACT records. " +
    "Free-text answers preserve the original response except for automated redaction of common emails, phone numbers, URLs, UUIDs, and explicit self-introduction phrases. " +
    "Because free text can contain context that indirectly identifies a respondent, share this workbook only with staff who have a legitimate course-improvement need. " +
    "Do not combine these rows with other learner-level datasets."
  ]];
  overview.getRange("A11:H16").format = {
    fill: palette.paleGold,
    font: { color: palette.ink },
    wrapText: true,
    verticalAlignment: "top",
  };
  overview.getRange("A18:H18").merge();
  overview.getRange("A18").values = [["Workbook contents"]];
  overview.getRange("A18:H18").format = { fill: palette.blue, font: { bold: true, color: palette.white } };
  overview.getRange("A19:B22").values = [
    ["Sheet", "Purpose"],
    ["Raw Responses", "One randomized anonymous row per completed response"],
    ["Question Codebook", "Question IDs, sections, prompts, types, and answer options"],
    ["Answer Distributions", "Formula-driven counts and percentages for categorical answers"],
  ];
  styleHeader(overview.getRange("A19:B19"));
  overview.getRange("A1:H22").format.font = { name: "Aptos" };
  overview.getRange("A:A").format.columnWidth = 25;
  overview.getRange("B:B").format.columnWidth = 42;
  overview.getRange("C:H").format.columnWidth = 12;

  const rawHeaders = ["Anonymous Response ID", ...survey.questions.map((q) => q.id)];
  setTitle(raw, `A1:${columnName(rawHeaders.length)}1`, "Randomized Anonymous Response Records");
  raw.getRange(`A2:${columnName(rawHeaders.length)}2`).merge();
  raw.getRange("A2").values = [[
    "No identity or submission metadata is included. Free-text fields received automated direct-identifier redaction."
  ]];
  raw.getRange("A2").format = { fill: palette.paleGold, font: { italic: true, color: palette.ink }, wrapText: true };
  raw.getRange(`A4:${columnName(rawHeaders.length)}4`).values = [rawHeaders];
  styleHeader(raw.getRange(`A4:${columnName(rawHeaders.length)}4`));
  const rawRows = randomized.map((response, index) => [
    `ANON-${String(index + 1).padStart(3, "0")}`,
    ...survey.questions.map((question) => {
      const value = response[question.id];
      return question.type === "text" ? redactFreeText(value) : String(value ?? "");
    }),
  ]);
  if (rawRows.length) {
    raw.getRange(`A5:${columnName(rawHeaders.length)}${rawRows.length + 4}`).values = rawRows;
    raw.getRange(`A4:${columnName(rawHeaders.length)}${rawRows.length + 4}`).format.font = { name: "Aptos", size: 10 };
    const rawTable = raw.tables.add(`A4:${columnName(rawHeaders.length)}${rawRows.length + 4}`, true, "AnonymousResponses");
    rawTable.style = "TableStyleMedium2";
  }
  raw.freezePanes.freezeRows(4);
  raw.freezePanes.freezeColumns(1);
  raw.getRange("A:A").format.columnWidth = 18;
  if (rawHeaders.length > 1) raw.getRange(`B:${columnName(rawHeaders.length)}`).format.columnWidth = 24;
  const textColumns = survey.questions
    .map((q, i) => ({ q, col: i + 2 }))
    .filter(({ q }) => q.type === "text");
  for (const { col } of textColumns) {
    raw.getRange(`${columnName(col)}:${columnName(col)}`).format.columnWidth = 40;
  }
  raw.getRange(`A5:${columnName(rawHeaders.length)}${rawRows.length + 4}`).format.wrapText = true;

  setTitle(codebook, "A1:F1", "Survey Question Codebook");
  codebook.getRange("A3:F3").values = [["Question ID", "Section", "Prompt", "Type", "Answer Options", "Raw Column"]];
  styleHeader(codebook.getRange("A3:F3"));
  const codeRows = survey.questions.map((q, index) => [
    q.id,
    q.section ?? "Other",
    q.prompt ?? "",
    q.type ?? "",
    (q.options ?? []).map((o) => o.label ?? o.value).join(" | "),
    columnName(index + 2),
  ]);
  codebook.getRange(`A4:F${codeRows.length + 3}`).values = codeRows;
  const codeTable = codebook.tables.add(`A3:F${codeRows.length + 3}`, true, "QuestionCodebook");
  codeTable.style = "TableStyleMedium2";
  codebook.freezePanes.freezeRows(3);
  codebook.getRange("A:A").format.columnWidth = 12;
  codebook.getRange("B:B").format.columnWidth = 30;
  codebook.getRange("C:C").format.columnWidth = 60;
  codebook.getRange("D:D").format.columnWidth = 12;
  codebook.getRange("E:E").format.columnWidth = 55;
  codebook.getRange("F:F").format.columnWidth = 12;
  codebook.getRange(`A4:F${codeRows.length + 3}`).format.wrapText = true;

  setTitle(distribution, "A1:F1", "Categorical Answer Distributions");
  distribution.getRange("A3:F3").values = [["Question ID", "Section", "Answer", "Count", "Percent", "Prompt"]];
  styleHeader(distribution.getRange("A3:F3"));
  const distRows = [];
  for (let questionIndex = 0; questionIndex < survey.questions.length; questionIndex++) {
    const q = survey.questions[questionIndex];
    if (q.type === "text") continue;
    const options = q.options ?? [];
    for (const option of options) {
      distRows.push({
        id: q.id,
        section: q.section ?? "Other",
        answer: option.value ?? option.label,
        prompt: q.prompt ?? "",
        rawColumn: columnName(questionIndex + 2),
      });
    }
  }
  const distValues = distRows.map((row) => [row.id, row.section, row.answer, null, null, row.prompt]);
  if (distValues.length) {
    distribution.getRange(`A4:F${distValues.length + 3}`).values = distValues;
    for (let index = 0; index < distRows.length; index++) {
      const excelRow = index + 4;
      const source = `'Raw Responses'!$${distRows[index].rawColumn}$5:$${distRows[index].rawColumn}$${rawRows.length + 4}`;
      distribution.getRange(`D${excelRow}`).formulas = [[`=COUNTIF(${source},C${excelRow})`]];
      distribution.getRange(`E${excelRow}`).formulas = [[`=IFERROR(D${excelRow}/COUNTA(${source}),0)`]];
    }
    distribution.getRange(`E4:E${distValues.length + 3}`).format.numberFormat = "0.0%";
    const distTable = distribution.tables.add(`A3:F${distValues.length + 3}`, true, "AnswerDistributions");
    distTable.style = "TableStyleMedium2";
  }
  distribution.freezePanes.freezeRows(3);
  distribution.getRange("A:A").format.columnWidth = 12;
  distribution.getRange("B:B").format.columnWidth = 30;
  distribution.getRange("C:C").format.columnWidth = 38;
  distribution.getRange("D:E").format.columnWidth = 12;
  distribution.getRange("F:F").format.columnWidth = 65;
  distribution.getRange(`A4:F${distValues.length + 3}`).format.wrapText = true;

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const exported = await SpreadsheetFile.exportXlsx(workbook);
  await exported.save(OUTPUT_FILE);

  const inspections = [];
  inspections.push((await workbook.inspect({
    kind: "table",
    range: "Overview!A1:H22",
    include: "values,formulas",
    tableMaxRows: 22,
    tableMaxCols: 8,
  })).ndjson);
  inspections.push((await workbook.inspect({
    kind: "table",
    range: `Raw Responses!A1:F${Math.min(rawRows.length + 4, 10)}`,
    include: "values,formulas",
    tableMaxRows: 10,
    tableMaxCols: 6,
  })).ndjson);
  inspections.push((await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "final formula error scan",
  })).ndjson);
  inspections.push((await workbook.inspect({
    kind: "match",
    searchTerm: "@|https?://|www\\.|[0-9a-f]{8}-[0-9a-f]{4}",
    options: { useRegex: true, maxResults: 300 },
    summary: "direct identifier residue scan",
  })).ndjson);
  await fs.writeFile(path.join(OUTPUT_DIR, "inspection.ndjson"), inspections.join("\n"));

  for (const [sheetName, range] of [
    ["Overview", "A1:H22"],
    ["Raw Responses", `A1:F${Math.min(rawRows.length + 4, 14)}`],
    ["Question Codebook", `A1:F${Math.min(codeRows.length + 3, 16)}`],
    ["Answer Distributions", `A1:F${Math.min(distValues.length + 3, 18)}`],
  ]) {
    const preview = await workbook.render({ sheetName, range, scale: 1.2, format: "png" });
    await fs.writeFile(
      path.join(OUTPUT_DIR, `${safeSheetName(sheetName).replaceAll(" ", "-")}.png`),
      new Uint8Array(await preview.arrayBuffer()),
    );
  }

  console.log(JSON.stringify({
    output: OUTPUT_FILE,
    responses: rawRows.length,
    questions: survey.questions.length,
    categoricalDistributionRows: distRows.length,
  }));
}

function columnName(oneBasedIndex) {
  let value = oneBasedIndex;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

try {
  await build();
} finally {
  await sequelize.close();
}
