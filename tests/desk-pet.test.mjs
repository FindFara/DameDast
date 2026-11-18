import test from 'node:test';
import assert from 'node:assert/strict';
import { nextPetMood } from '../src/DameDast.Web/wwwroot/desk-pet.js';
import { drawPixelDog } from '../src/DameDast.Web/wwwroot/desk-dog.js';
import { petModel, petFaces } from '../src/DameDast.Web/wwwroot/desk-pet-renderer.js';
import { petSceneMarkup } from '../src/DameDast.Web/wwwroot/desk-pet-ui.js';

test('the dog cycles happy, sad and angry with distinct pixel expressions and keeps its original colors',()=>{
  let mood='happy';const pictures=[];
  for(let index=0;index<3;index++){
    const commands=[],context={save(){},restore(){},translate(){},scale(){},fillRect(...args){commands.push([this.fillStyle,...args]);}};
    drawPixelDog(context,88,96,{mood,phase:0});pictures.push(commands);
    assert.ok(commands.some(command=>command[0]==='#171817'));assert.ok(commands.some(command=>command[0]==='#84442e'));
    mood=nextPetMood(mood);
  }
  assert.equal(mood,'happy');assert.notDeepEqual(pictures[0],pictures[1]);assert.notDeepEqual(pictures[1],pictures[2]);assert.notDeepEqual(pictures[0],pictures[2]);
});
test('the pet and kennel share a single scene with accessible controls and no visible labels',()=>{
  const html=petSceneMarkup({id:'pet-id',options:{petStyle:'dog'},title:'<script>bad</script>'});
  assert.match(html,/data-pet-scene="pet-id"/);assert.match(html,/desk-pet-house/);assert.match(html,/desk-pet-character/);assert.match(html,/aria-label=/);
  assert.doesNotMatch(html,/roaming-pet-name|data-roaming-pet|<script>|<h[12]|<span/);
});
test('existing cat and robot models retain their animated shaded geometry',()=>{
  for(const style of ['cat','robot']){
    assert.notDeepEqual(petModel(style,0,true),petModel(style,1.5,true));
    for(let yaw=0;yaw<6.3;yaw+=.4){const faces=petFaces(style,yaw,1,true,false);assert.ok(faces.length>20);for(const face of faces)for(const v of face.vertices)assert.ok([v.x,v.y,v.depth].every(Number.isFinite));}
  }
});
