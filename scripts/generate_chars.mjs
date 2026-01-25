import fs from "fs";
import path from "path";

console.log("Generating chars.txt...");

// 1. ASCII (U+0020-007E)
const ascii = [];
for (let i = 0x20; i <= 0x7e; i++) ascii.push(String.fromCharCode(i));

// 2. Hiragana (U+3040-309F)
const hiragana = [];
for (let i = 0x3040; i <= 0x309f; i++) hiragana.push(String.fromCharCode(i));

// 3. Katakana (U+30A0-30FF)
const katakana = [];
for (let i = 0x30a0; i <= 0x30ff; i++) katakana.push(String.fromCharCode(i));

// 4. Half-width Katakana (U+FF65-FF9F)
const halfKana = [];
for (let i = 0xff65; i <= 0xff9f; i++) halfKana.push(String.fromCharCode(i));

// 5. Symbols
const symbolStr =
  "。、・「」『』【】（）〈〉《》〔〕！？…―～　％＆＊＋－／＝＠０１２３４５６７８９：；＜＞";
const symbols = Array.from(symbolStr);

// 6. JIS Level 1 Kanji (EUC-JP Rows 16-47)
const jisL1 = [];
try {
  // Check if TextDecoder supports euc-jp
  // Node.js environments typically support this with full-icu or modern Node versions
  const decoder = new TextDecoder("euc-jp", { fatal: false });
  for (let row = 16; row <= 47; row++) {
    for (let cell = 1; cell <= 94; cell++) {
      // EUC-JP encoding:
      // Byte 1: 0xA0 + row
      // Byte 2: 0xA0 + cell
      const b1 = 0xa0 + row;
      const b2 = 0xa0 + cell;
      const buffer = new Uint8Array([b1, b2]);
      try {
        const char = decoder.decode(buffer);
        // TextDecoder return U+FFFD for invalid
        if (char && char !== "\uFFFD") {
          jisL1.push(char);
        }
      } catch (e) {
        // ignore
      }
    }
  }
} catch (e) {
  console.error("TextDecoder/EUC-JP error:", e);
  process.exit(1);
}

// 7. Medical Terms (from provided list)
const medicalRaw = `
膝、腰、肩、股、腕、脚、筋、骨、頸、頚、胸、腹、臀、踵、趾、肘、腱、靭、椎、髄
屈、伸、旋、挙、転、倒、仰、臥、俯、坐、端、蹲、踞、匍、匐
歩、階、段、差、棒、杖、輪、椅、器
吸、呼、腹、胸、式
疼、痛、麻、痺、拘、縮、萎、浮、腫、攣、痙
筋、力、持、久、協、調、均、衡
療、法、士、患、担、当、禁、忌、注、休、憩、止、継、続、反、復
`;

const medicalChars = Array.from(medicalRaw).filter((c) => {
  // Filter out punctuation and whitespace
  return (
    c !== "、" &&
    c !== "\n" &&
    c !== "\r" &&
    c !== " " &&
    c !== "\t" &&
    c !== "　"
  );
});

// Combine all in priority order
const allChars = [
  ...ascii,
  ...hiragana,
  ...katakana,
  ...halfKana,
  ...symbols,
  ...jisL1,
  ...medicalChars,
];

// Deduplicate (Set preserves insertion order)
const uniqueChars = new Set(allChars);

const result = Array.from(uniqueChars).join("");

// Verify output size
console.log(`Generated ${uniqueChars.size} unique characters.`);

// Write to file
const outputPath = path.join(process.cwd(), "scripts", "chars.txt");
fs.writeFileSync(outputPath, result, "utf8");
console.log(`Success! File written to: ${outputPath}`);
