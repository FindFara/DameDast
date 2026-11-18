import { drawPixelDog } from "./desk-dog.js";
// Small voxel models, projected locally into a deliberately low-resolution canvas.
// There are no image assets, GPU contexts, network requests or rendering dependencies.
const colors = {
  fur: [222, 139, 63], light: [244, 175, 88], stripe: [164, 87, 40], cream: [255, 236, 201],
  eye: [40, 48, 45], glint: [255, 255, 239], pink: [224, 138, 133],
  shell: [180, 211, 213], white: [232, 244, 237], screen: [38, 73, 80], mint: [128, 232, 190], metal: [112, 155, 165],
};
const box = (x, y, z, width, height, depth, color) => ({ x, y, z, width, height, depth, color: colors[color] });

export function petModel(style = "cat", phase = 0, walking = false, blink = false) {
  const step = walking ? Math.sin(phase) : 0, bob = walking ? Math.abs(step) * .045 : Math.sin(phase * .25) * .012;
  const cubes = [], add = (x, y, z, w, h, d, c) => cubes.push(box(x, y + bob, z, w, h, d, c));
  if (style === "robot") {
    add(0, 1.1, 0, 1.05, .95, .65, "shell");
    add(0, 1.98, .08, 1.3, .85, .85, "white");
    add(0, 2, .52, 1.08, .56, .06, "screen");
    for (const side of [-1, 1]) {
      add(side * .27, 2.05, .57, .14, blink ? .045 : .2, .06, "mint");
      add(side * .7, 1.1, -side * step * .17, .25, .7, .3, "metal");
      add(side * .3, .35 + Math.max(0, side * step) * .15, side * step * .23, .32, .65, .38, "metal");
      add(side * .3, .12 + Math.max(0, side * step) * .15, .12 + side * step * .23, .4, .2, .55, "white");
    }
    add(0, 1.15, .35, .26, .25, .07, "mint");
    add(0, 1.83, .57, .35, .055, .06, "mint");
    add(0, 2.55, .08, .1, .35, .1, "metal");
    add(0, 2.76, .08, .23, .18, .23, "mint");
    return cubes;
  }
  add(0, 1.03, -.15, .95, .85, 1.55, "fur");
  add(0, 1.45, -.2, .85, .18, 1.35, "light");
  add(0, 1.05, .62, .65, .75, .25, "cream");
  add(0, 1.84, .8, 1.12, .88, .9, "light");
  add(0, 1.55, 1.2, .78, .32, .2, "cream");
  for (const side of [-1, 1]) {
    add(side * .38, 2.34, .77, .32, .38, .35, "fur");
    add(side * .38, 2.39, .95, .16, .19, .035, "pink");
    add(side * .29, 1.99, 1.27, .17, blink ? .045 : .2, .065, "eye");
    if (!blink) add(side * .29 - .025, 2.045, 1.309, .055, .065, .02, "glint");
    add(side * .53, 1.63, 1.24, .32, .055, .05, "cream");
    add(side * .53, 1.73, 1.24, .32, .055, .05, "cream");
    for (const z of [-.68, .49]) {
      const swing = step * side * (z < 0 ? -1 : 1), lift = Math.max(0, swing) * .17;
      add(side * .35, .42 + lift, z + swing * .22, .28, .65, .31, "fur");
      add(side * .35, .13 + lift, z + .055 + swing * .22, .32, .22, .4, "cream");
    }
    for (const z of [-.65, -.13, .35]) add(side * .481, 1.16, z, .045, .36, .13, "stripe");
    add(side * .57, 1.88, .83, .045, .28, .15, "stripe");
  }
  add(0, 1.72, 1.34, .15, .11, .08, "pink");
  add(0, 1.6, 1.32, .07, .07, .055, "stripe");
  add(0, 2.2, 1.26, .12, .21, .04, "stripe");
  for (let i = 0; i < 5; i++) {
    const sway = Math.sin(phase * .55 + i * .35) * .09;
    add(sway, 1.04 + i * .26, -1.01 - i * .045, .23, .32, .25, i % 2 ? "stripe" : "fur");
  }
  return cubes;
}
const faces = [
  [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
  [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],
  [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],
  [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],
  [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],
];
const normals = [[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0]];

export function petFaces(style, yaw, phase, walking, blink) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw), result = [];
  for (const cube of petModel(style, phase, walking, blink)) for (let index = 0; index < faces.length; index++) {
    const [nx, ny, nz] = normals[index], normalX = nx * cos + nz * sin, normalZ = -nx * sin + nz * cos;
    if (ny * .43 + normalZ * .9 <= 0) continue;
    const vertices = faces[index].map(([x,y,z]) => {
      x = cube.x + x * cube.width / 2; y = cube.y + y * cube.height / 2; z = cube.z + z * cube.depth / 2;
      const rx = x * cos + z * sin, rz = -x * sin + z * cos;
      return { x: rx, y: -y * .9 + rz * .43, depth: y * .43 + rz * .9 };
    });
    const shade = .78 + ny * .2 - normalX * .12 + normalZ * .025;
    result.push({ vertices, depth: vertices.reduce((sum, v) => sum + v.depth, 0) / 4,
      color: `rgb(${cube.color.map(channel => Math.round(Math.min(255, channel * shade))).join(",")})` });
  }
  return result.sort((a, b) => a.depth - b.depth);
}
export function drawVoxelPet(canvas, { style = "dog", yaw = .6, phase = 0, walking = false, blink = false } = {}) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  if (style === "dog") { drawPixelDog(context, canvas.width, canvas.height, { yaw, phase, walking, blink }); return; }
  const scale = Math.min(canvas.width / 3.3, canvas.height / 3.3), base = canvas.height * .81;
  context.fillStyle = "#193a3430";
  context.beginPath(); context.ellipse(canvas.width / 2, base + 2, scale * .85, scale * .2, 0, 0, Math.PI * 2); context.fill();
  for (const face of petFaces(style, yaw, phase, walking, blink)) {
    context.beginPath();
    face.vertices.forEach((v, i) => context[i ? "lineTo" : "moveTo"](Math.round(canvas.width / 2 + v.x * scale), Math.round(base + v.y * scale)));
    context.closePath(); context.fillStyle = face.color; context.fill();
  }
}
