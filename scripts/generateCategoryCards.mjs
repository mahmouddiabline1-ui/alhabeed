import { mkdir, readFile, writeFile } from "node:fs/promises";

const cards = [
  ["egypt", "مصر والقعدة", "../category-art-v1.png", 3, 2, 0, 0],
  ["history", "تاريخ وغرائب", "../category-art-v1.png", 3, 2, 1, 0],
  ["football", "كورة وتشجيع", "../category-art-v1.png", 3, 2, 2, 0],
  ["screen", "سينما وتلفزيون", "../category-art-v1.png", 3, 2, 0, 1],
  ["food", "أكل ومزاج", "../category-art-v1.png", 3, 2, 1, 1],
  ["science", "علوم ومعلومات", "../category-art-v1.png", 3, 2, 2, 1],
  ["music", "مزيكا وسماع", "../pack-art-v2.png", 4, 1, 0, 0],
  ["technology", "تكنولوجيا ونت", "../pack-art-v2.png", 4, 1, 1, 0],
  ["nature", "حيوانات وطبيعة", "../pack-art-v2.png", 4, 1, 2, 0],
  ["world", "حول العالم", "../pack-art-v2.png", 4, 1, 3, 0],
  ["egypt_landmarks", "معالم مصر", "../landmarks-egypt-v1.png", 3, 2, 1, 1],
  ["world_landmarks", "معالم العالم", "../landmarks-world-v1.png", 3, 2, 1, 0],
];

const destination = new URL("../client/public/cards/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const [id, title, image, columns, rows, column, row] of cards) {
  void image; void columns; void rows; void column; void row;
  const crop = await readFile(new URL(`../client/public/cards/source/${id}.jpg`, import.meta.url));
  const artwork = `data:image/jpeg;base64,${crop.toString("base64")}`;
  const labelLines = title.split(" ");
  const fontSize = title.length > 14 ? 76 : 88;
  const lineHeight = fontSize * 0.9;
  const lines = labelLines.map((line, index, all) => `<tspan x="300" dy="${index ? lineHeight : -(all.length - 1) * lineHeight / 2}">${line}</tspan>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" role="img" aria-label="${title}">
  <defs><filter id="title-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="9" stdDeviation="2" flood-color="#07183e" flood-opacity="0.95"/></filter></defs>
  <rect width="600" height="750" rx="34" fill="#102354"/>
  <image x="14" y="14" width="572" height="722" href="${artwork}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="14" y="14" width="572" height="722" rx="26" fill="none" stroke="#fff5d9" stroke-width="8"/>
  <text x="300" y="390" text-anchor="middle" direction="rtl" font-family="Tahoma, Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="#ffd447" stroke="#102354" stroke-width="24" paint-order="stroke" stroke-linejoin="round" filter="url(#title-shadow)">${lines}</text>
</svg>`;
  await writeFile(new URL(`${id}.svg`, destination), svg);
}
