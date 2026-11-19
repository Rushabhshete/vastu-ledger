import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const possiblePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
];

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();

          // Strip surrounding quotes
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }

          // Unescape newlines or characters if any
          val = val.replace(/\\n/g, "\n");

          // Always set key in process.env
          process.env[key] = val;
        }
      }
      break;
    } catch {
      // Continue searching
    }
  }
}
