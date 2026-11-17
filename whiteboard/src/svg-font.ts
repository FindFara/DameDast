import { fileData } from "./runtime";

let font: Promise<string> | undefined;

/** Keep mixed Persian/English text portable when an SVG is opened off-device. */
export async function embedDocumentFont(svg: SVGSVGElement): Promise<void> {
  font ??= fetch("/fonts/vazir.woff2")
    .then(async (response) => {
      if (!response.ok)
        throw Error("Could not embed the document font. Try again.");
      return fileData(await response.blob());
    })
    .catch((error) => {
      font = undefined;
      throw error;
    });
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `@font-face{font-family:Helvetica;src:url('${await font}') format('woff2')}`;
  const defs =
    svg.querySelector("defs") ||
    svg.insertBefore(
      document.createElementNS(svg.namespaceURI, "defs"),
      svg.firstChild,
    );
  defs.append(style);
}
