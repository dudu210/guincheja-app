const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const JSZip = require("jszip");

const root = path.resolve(__dirname, "..");
const inputApk = path.join(root, "dist", "app.apk");
const iconPath = path.join(root, "assets", "guincheja-app-icon-v2.png");
const workDir = path.join(root, "dist", ".icon-fix");
const unsignedApk = path.join(workDir, "guincheja-icon-unsigned.apk");
const signedDir = path.join(workDir, "signed");
const finalApk = path.join(root, "dist", "app-icon-fixed.apk");
const signer = path.join(root, "node_modules", "nitron", "vendor", "uber-apk-signer.jar");

function align4(buffer) {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding)]) : buffer;
}

function encodeLength8(length) {
  return length < 0x80
    ? Buffer.from([length])
    : Buffer.from([((length >> 8) & 0x7f) | 0x80, length & 0xff]);
}

function stringPool(strings) {
  const encoded = strings.map((value) => {
    const utf8 = Buffer.from(value, "utf8");
    return Buffer.concat([
      encodeLength8([...value].length),
      encodeLength8(utf8.length),
      utf8,
      Buffer.from([0]),
    ]);
  });
  const offsets = Buffer.alloc(strings.length * 4);
  let cursor = 0;
  encoded.forEach((value, index) => {
    offsets.writeUInt32LE(cursor, index * 4);
    cursor += value.length;
  });
  const data = align4(Buffer.concat(encoded));
  const headerSize = 28;
  const size = headerSize + offsets.length + data.length;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0x0001, 0);
  header.writeUInt16LE(headerSize, 2);
  header.writeUInt32LE(size, 4);
  header.writeUInt32LE(strings.length, 8);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(0x00000100, 16);
  header.writeUInt32LE(headerSize + offsets.length, 20);
  header.writeUInt32LE(0, 24);
  return Buffer.concat([header, offsets, data]);
}

function resourcesTable() {
  const globalPool = stringPool(["res/drawable/app_icon.png"]);
  const typeNames = Array.from({ length: 12 }, (_, i) =>
    i === 11 ? "drawable" : `unused${i + 1}`,
  );
  const typePool = stringPool(typeNames);
  const keyPool = stringPool(["app_icon"]);

  const typeSpec = Buffer.alloc(28);
  typeSpec.writeUInt16LE(0x0202, 0);
  typeSpec.writeUInt16LE(16, 2);
  typeSpec.writeUInt32LE(28, 4);
  typeSpec.writeUInt8(12, 8);
  typeSpec.writeUInt32LE(3, 12);
  typeSpec.writeUInt32LE(0, 16);
  typeSpec.writeUInt32LE(0, 20);
  typeSpec.writeUInt32LE(0x40000000, 24);

  const configSize = 64;
  const typeHeaderSize = 20 + configSize;
  const entryOffsetsSize = 12;
  const entrySize = 16;
  const entriesStart = typeHeaderSize + entryOffsetsSize;
  const typeSize = entriesStart + entrySize;
  const type = Buffer.alloc(typeSize, 0);
  type.writeUInt16LE(0x0201, 0);
  type.writeUInt16LE(typeHeaderSize, 2);
  type.writeUInt32LE(typeSize, 4);
  type.writeUInt8(12, 8);
  type.writeUInt32LE(3, 12);
  type.writeUInt32LE(entriesStart, 16);
  type.writeUInt32LE(configSize, 20);
  type.writeUInt32LE(0xffffffff, typeHeaderSize);
  type.writeUInt32LE(0xffffffff, typeHeaderSize + 4);
  type.writeUInt32LE(0, typeHeaderSize + 8);
  type.writeUInt16LE(8, entriesStart);
  type.writeUInt16LE(0, entriesStart + 2);
  type.writeUInt32LE(0, entriesStart + 4);
  type.writeUInt16LE(8, entriesStart + 8);
  type.writeUInt8(0, entriesStart + 10);
  type.writeUInt8(0x03, entriesStart + 11);
  type.writeUInt32LE(0, entriesStart + 12);

  const packageHeaderSize = 288;
  const typeStringsOffset = packageHeaderSize;
  const keyStringsOffset = typeStringsOffset + typePool.length;
  const packageSize =
    packageHeaderSize + typePool.length + keyPool.length + typeSpec.length + type.length;
  const pkg = Buffer.alloc(packageHeaderSize, 0);
  pkg.writeUInt16LE(0x0200, 0);
  pkg.writeUInt16LE(packageHeaderSize, 2);
  pkg.writeUInt32LE(packageSize, 4);
  pkg.writeUInt32LE(0x7f, 8);
  Buffer.from("br.com.guincheja.app", "utf16le").copy(pkg, 12);
  pkg.writeUInt32LE(typeStringsOffset, 268);
  pkg.writeUInt32LE(12, 272);
  pkg.writeUInt32LE(keyStringsOffset, 276);
  pkg.writeUInt32LE(1, 280);
  pkg.writeUInt32LE(0, 284);
  const packageChunk = Buffer.concat([pkg, typePool, keyPool, typeSpec, type]);

  const tableSize = 12 + globalPool.length + packageChunk.length;
  const tableHeader = Buffer.alloc(12);
  tableHeader.writeUInt16LE(0x0002, 0);
  tableHeader.writeUInt16LE(12, 2);
  tableHeader.writeUInt32LE(tableSize, 4);
  tableHeader.writeUInt32LE(1, 8);
  return Buffer.concat([tableHeader, globalPool, packageChunk]);
}

async function main() {
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(signedDir, { recursive: true });
  const zip = await JSZip.loadAsync(fs.readFileSync(inputApk));
  Object.keys(zip.files)
    .filter((name) => name.startsWith("META-INF/"))
    .forEach((name) => zip.remove(name));
  const manifest = await zip.file("AndroidManifest.xml").async("nodebuffer");
  let iconReferenceMatches = 0;
  for (let i = 0; i <= manifest.length - 4; i++) {
    if (
      manifest[i] === 0x02 &&
      manifest[i + 1] === 0x00 &&
      manifest[i + 2] === 0x0c &&
      manifest[i + 3] === 0x7f
    ) {
      iconReferenceMatches++;
    }
  }
  if (iconReferenceMatches !== 1) {
    throw new Error(`Referência do ícone inesperada: ${iconReferenceMatches}`);
  }
  zip.file("AndroidManifest.xml", manifest, { compression: "STORE" });
  zip.file("resources.arsc", resourcesTable(), { compression: "STORE" });
  zip.file("res/drawable/app_icon.png", fs.readFileSync(iconPath), {
    compression: "STORE",
  });
  fs.writeFileSync(
    unsignedApk,
    await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
  );
  execFileSync(
    "java",
    ["-jar", signer, "--apks", unsignedApk, "--out", signedDir, "--allowResign"],
    { stdio: "inherit" },
  );
  const signed = fs
    .readdirSync(signedDir)
    .find((name) => name.endsWith("-aligned-debugSigned.apk"));
  if (!signed) throw new Error("APK assinado não encontrado");
  fs.copyFileSync(path.join(signedDir, signed), finalApk);
  console.log(finalApk);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
