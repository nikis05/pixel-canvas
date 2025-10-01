import { saveAs } from "file-saver";

async function download() {
  const codec = await import("wasm");
  await codec.default();
  const upscale = location.hash.substring(1, 2) == "u";
  const dna = location.hash.substring(2);
  const data = codec.decode_dna(dna);
  if (!data) throw new Error("Failed to decode DNA");
  const file = new Blob([codec.render_image(data, upscale)], {
    type: "image/png",
  });
  saveAs(file, "pixel-canvas.png");
}

function setResult(result: string) {
  document.getElementById("root")!.innerText = result;
}

download()
  .then(() => setResult("Your download has started"))
  .catch((e: Error) =>
    setResult(`An unexpected error has occurred: ${e.message}`)
  );
