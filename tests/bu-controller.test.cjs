const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync(__dirname+'/../assets/sheep-poses.json','utf8'));
function setup(reduced=false){
 const callbacks=new Map(),listeners=new Map();let next=0,time=0;
 const style=()=>({values:{},set transform(v){this.values.transform=v},get transform(){return this.values.transform},setProperty(k,v){this.values[k]=v},removeProperty(k){delete this.values[k]}});
 const pupils=[{style:style()},{style:style()}];
 const svg={style:style(),querySelectorAll:()=>pupils,querySelector:()=>({getScreenCTM:()=>({inverse:()=>({})})})};
 const document={hidden:false,addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
 const context={window:{},document,matchMedia:()=>({matches:reduced,addEventListener(){},removeEventListener(){}}),requestAnimationFrame:fn=>{callbacks.set(++next,fn);return next},cancelAnimationFrame:id=>callbacks.delete(id),DOMPoint:class{constructor(x,y){this.x=x;this.y=y}matrixTransform(){return this}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../bu-controller.js','utf8'),context);
 const pet=new context.window.BUSheep(svg,data);
 function tick(ms=100){time+=ms;const queued=[...callbacks];callbacks.clear();queued.forEach(([,fn])=>fn(time));}
 return {pet,svg,pupils,callbacks,document,listeners,tick};
}
test('switching poses clears prior sleep, grass and eye states',()=>{
 const {pet}=setup();pet.frame('sleep-out');assert.equal(pet.values.sleep,1);pet.frame('chew-a');assert.equal(pet.values.sleep,0);assert.equal(pet.values.closed,0);assert.equal(pet.values.grass,1);pet.frame('idle');assert.equal(pet.values.grass,0);
});
test('cancelled sequence cannot overwrite a newly selected pose',async()=>{
 const {pet,tick,callbacks}=setup();const running=pet.play('sleep');tick();tick(400);pet.frame('happy');await running;assert.equal(pet.values.happy,1);assert.equal(callbacks.size,0);
});
test('pointer gaze is bounded and can return to authored eye directions',()=>{
 const {pet,tick,svg,pupils}=setup();pet.lookAt(99999,-99999);for(let i=0;i<60;i++)tick(16);assert.ok(Math.abs(pet.gaze.x)<=2.7);assert.ok(Math.abs(pet.gaze.y)<=2.6);assert.notEqual(svg.style.values['--pointer-x'],'0px');assert.equal(pupils[0].style.values.transform,undefined);pet.setFollow(false);assert.equal(svg.style.values['--pointer-x'],'0px');
});
test('hidden page cancels animation and gaze work',async()=>{
 const {pet,document,listeners,callbacks}=setup();const running=pet.play('eat');pet.lookAt(500,500);document.hidden=true;listeners.get('visibilitychange')();await running;assert.equal(callbacks.size,0);
});
test('reduced motion gives a meaningful static reaction without animation',async()=>{
 const {pet,callbacks}=setup(true);await pet.play('pat');assert.equal(pet.values.happy,1);assert.equal(callbacks.size,0);await pet.play('sleep');assert.equal(pet.values.sleep,1);
});
test('all sequence keyframes exist and the master SVG has no embedded bitmaps',()=>{
 const ids=new Set(data.poses.map(p=>p.id));for(const seq of Object.values(data.sequences))for(const [id,ms]of seq.frames){assert.ok(ids.has(id));assert.ok(ms>0);}
 const svg=fs.readFileSync(__dirname+'/../assets/sheep.svg','utf8');assert.ok(svg.includes('bu-pupil'));assert.ok(!svg.includes('<image')); 
});

test('eye closure is monotonic from half blink to fully closed',async()=>{
 const {pet,tick}=setup();pet.frame('blink-half');const pending=pet.transition('blink-closed',100);let previous=pet.values.lid;
 for(let i=0;i<12;i++){tick(10);assert.ok(pet.values.lid>=previous);previous=pet.values.lid;}
 await pending;assert.equal(pet.values.lid,1);
});
test('scripted turns own the gaze even while the pointer moves',async()=>{
 const {pet,tick,svg}=setup();pet.lookAt(10000,50);tick(16);const frozen=svg.style.values['--pointer-x'];const running=pet.play('turn');
 for(let i=0;i<5;i++){pet.lookAt(-10000,5000);tick(30);assert.equal(svg.style.values['--pointer-x'],frozen);}
 pet.frame('turn-left');await running;assert.ok(pet.values['gaze-x']<0);assert.ok(pet.values['face-x']<0);assert.ok(Math.abs(pet.values.tilt)<=2);
});
test('happy and sleeping poses close through the same aperture',()=>{
 const {pet}=setup();for(const id of ['happy','pat-down','swallow','sleep-out','land']){pet.frame(id);assert.equal(pet.values.lid,1,id);}
});

function renderedGaze(svg){return ['x','y'].map(a=>parseFloat(svg.style.values['--gaze-'+a]||'0')+parseFloat(svg.style.values['--pointer-'+a]||'0'));}
test('every action starts at the existing gaze and head follow angle',async()=>{
 for(const name of Object.keys(data.sequences)){
  const {pet,svg,tick}=setup();pet.lookAt(2000,400);for(let i=0;i<50;i++)tick(16);
  const before=renderedGaze(svg),angle=svg.style.values['--look-tilt'];const playing=pet.play(name);
  assert.deepEqual(renderedGaze(svg),before,name);assert.equal(svg.style.values['--look-tilt'],angle,name);
  tick(0);assert.deepEqual(renderedGaze(svg),before,name+' first frame');
  pet.frame('idle');await playing;
 }
});
test('blink preserves gaze and pose, including when interrupting a turn',async()=>{
 const {pet,svg,tick}=setup();pet.lookAt(2000,400);for(let i=0;i<50;i++)tick(16);
 const turning=pet.play('turn');for(let i=0;i<45;i++){tick(16);await Promise.resolve();}
 const before=renderedGaze(svg),angle=svg.style.values['--look-tilt'],pose={tilt:pet.values.tilt,x:pet.values['head-x'],face:pet.values['face-x']};
 const blinking=pet.play('blink');let fullyClosed=false;
 for(let i=0;i<100&&pet.scripted;i++){
  pet.lookAt(-2000,-400);tick(16);await Promise.resolve();
  for(let a=0;a<2;a++)assert.ok(Math.abs(renderedGaze(svg)[a]-before[a])<1e-10);
  assert.equal(svg.style.values['--look-tilt'],angle);assert.equal(pet.values.tilt,pose.tilt);assert.equal(pet.values['head-x'],pose.x);assert.equal(pet.values['face-x'],pose.face);
  fullyClosed ||=pet.values.lid===1;
 }
 await blinking;await turning;assert.ok(fullyClosed);assert.equal(pet.scripted,false);
 const start=renderedGaze(svg);tick(16);const moved=renderedGaze(svg);assert.ok(Math.abs(moved[0]-start[0])<1);assert.ok(Math.abs(moved[1]-start[1])<1);
});
test('turns ease from cursor gaze to authored directions without adding both',async()=>{
 const {pet,svg,tick}=setup();pet.lookAt(2000,106);for(let i=0;i<50;i++)tick(16);
 const playing=pet.play('turn');let sawLeft=false,sawRight=false;
 for(let i=0;i<300&&pet.scripted;i++){
  tick(16);await Promise.resolve();const [x]=renderedGaze(svg);assert.ok(Math.abs(x)<=2.701);
  sawLeft ||=x < -2.6;sawRight ||=x>2.6;
 }
 await playing;assert.ok(sawLeft);assert.ok(sawRight);assert.equal(pet.scripted,false);
});
