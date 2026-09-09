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
  ["egypt_landmarks", "معالم مصر", "../landmarks-egypt-v1.png", 3, 2, 0, 0],
  ["world_landmarks", "معالم العالم", "../landmarks-world-v1.png", 3, 2, 0, 0],
];

const destination = new URL("../client/public/cards/", import.meta.url);
await mkdir(destination, { recursive: true });
const embedded = new Map();
for (const [id, title, image, columns, rows, column, row] of cards) {
  if (!embedded.has(image)) {
    const source = new URL(`../client/public/${image.replace("../", "")}`, import.meta.url);
    embedded.set(image, `data:image/png;base64,${(await readFile(source)).toString("base64")}`);
  }
  const label = title.includes(" ") ? title.replace(" ", "\n") : title;
  const lines = label.split("\n").map((line, index, all) => `<tspan x="300" dy="${index ? 58 : -(all.length - 1) * 29}">${line}</tspan>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" role="img" aria-label="${title}">
  <rect width="600" height="750" rx="34" fill="#102354"/>
  <svg x="14" y="14" width="572" height="722" viewBox="${column * 600} ${row * 750} 600 750" preserveAspectRatio="xMidYMid slice"><image href="${embedded.get(image)}" width="${columns * 600}" height="${rows * 750}"/></svg>
  <rect x="14" y="14" width="572" height="722" rx="26" fill="none" stroke="#fff5d9" stroke-width="8"/>
  <text x="300" y="590" text-anchor="middle" direction="rtl" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#ffd447" stroke="#102354" stroke-width="13" paint-order="stroke" stroke-linejoin="round">${lines}</text>
</svg>`;
  await writeFile(new URL(`${id}.svg`, destination), svg);
}
