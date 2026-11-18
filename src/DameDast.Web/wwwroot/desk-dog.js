// Original black-and-tan dachshund sprite, drawn on a pixel grid from the supplied style reference.
export function drawPixelDog(context, width, height, { yaw = .6, phase = 0, walking = false, blink = false, mood = "happy" } = {}) {
  const scale = Math.max(1, Math.floor(Math.min(width / 44, height / 42)));
  context.save();
  context.translate(Math.round(width / 2), Math.round(height * .87));
  context.scale(Math.sin(yaw) < -.1 ? -scale : scale, scale);
  context.translate(-21, -36);
  const rect = (x,y,w,h,color) => { context.fillStyle=color;context.fillRect(x,y,w,h); };
  const black='#171817', dark='#242525', fur='#373837', light='#414240', tan='#84442e', warm='#b46d4b';
  const gait=walking?Math.sin(phase):0, bounce=walking?Math.round(Math.abs(gait)):mood==="happy"?Math.round(Math.max(0,Math.sin(phase))):0;
  // Contact shadow and far paws.
  rect(5,35,32,1,'#193a342b');rect(8,36,25,1,'#193a3418');
  for(const x of [12,26]){const shift=Math.round(gait*(x===12?1:-1));rect(x+shift,29,3,5,tan);rect(x+shift,33,5,2,black);rect(x+shift,33,3,1,warm);}
  // Long, low body and lifted tail.
  const tail=mood==="sad"?5:mood==="angry"?0:Math.round(Math.sin(phase*.85));
  rect(3,17+tail,2,9,black);rect(4,15+tail,1,4,black);rect(4,23+tail,4,4,black);rect(4,18+tail,1,6,light);
  rect(7,21-bounce,22,11,black);rect(8,20-bounce,19,2,dark);rect(8,22-bounce,20,7,fur);rect(10,21-bounce,15,1,light);rect(8,29-bounce,18,2,dark);
  // Near legs have a diagonal stepping cycle.
  for(const x of [8,22]){const step=Math.round(gait*(x===8?-1:1)*2),lift=walking&&step>0?1:0;rect(x+step,28-bounce,4,7+ bounce-lift,black);rect(x+step+1,29-bounce,3,5+bounce-lift,tan);rect(x+step+1,33-lift,5,2,black);rect(x+step+1,33-lift,4,1,warm);}
  // Oversized head, drooping ears and tan eyebrows / muzzle.
  const headY=-bounce+(mood==="sad"?2:0);
  rect(25,7+headY,9,1,black);rect(23,8+headY,12,3,black);rect(22,11+headY,14,12,black);
  rect(24,10+headY,10,11,dark);rect(25,9+headY,7,1,light);rect(26,11+headY,7,9,fur);rect(26,12+headY,2,2,tan);rect(32,12+headY,2,2,tan);
  rect(27,14+headY,2,4,black);rect(32,14+headY,2,4,black);
  if(!blink){rect(28,15+headY,1,mood==='happy'?2:1,'#fff9ed');rect(33,15+headY,1,mood==='happy'?2:1,'#fff9ed');}
  rect(28,19+headY,7,5,tan);rect(29,18+headY,5,3,warm);rect(31,19+headY,3,2,black);rect(30,22+headY,4,1,black);rect(28,24+headY,5,3,tan);rect(29,24+headY,2,2,warm);
  rect(21,11+headY,3,11,black);rect(20,13+headY,3,7,black);rect(22,12+headY,2,8,dark);rect(21,15+headY,1,4,fur);rect(22,21+headY,3,2,black);
  rect(35,12+headY,2,10,black);rect(35,14+headY,1,6,fur);
  if(mood === "happy") { rect(30,22+headY,4,1,black);rect(31,23+headY,2,2,'#df958e'); }
  if(mood === "sad") { rect(26,12+headY,2,1,warm);rect(27,13+headY,2,1,warm);rect(32,13+headY,2,1,warm);rect(33,12+headY,1,1,warm);rect(27,18+headY,1,2,'#81bed3');rect(30,22+headY,3,1,black);rect(29,23+headY,1,1,black); }
  if(mood === "angry") { rect(26,13+headY,2,1,black);rect(28,14+headY,2,1,black);rect(32,14+headY,2,1,black);rect(34,13+headY,1,1,black);rect(30,22+headY,4,1,'#eee3d1');rect(35,5,1,2,'#b85148');rect(37,5,1,2,'#b85148');rect(34,7,2,1,'#b85148');rect(37,7,2,1,'#b85148'); }
  context.restore();
}
