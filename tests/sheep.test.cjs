// Deterministic interaction-state checks; browser layout and native controls are checked separately.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup(reduced = false, withGuide = false) {
  let time = 100000, sequence = 0, animationCount = 0, observer;
  const jobs = new Map(), elements = new Map();
  class Element {
    constructor() { this.dataset = {}; this.style = {setProperty:(k,v) => { this.style[k]=v; }}; this.listeners = {}; this.textContent=''; this.open=false; const classes=new Set();this.classList={contains:k=>classes.has(k),toggle:(k,on)=>{if(on)classes.add(k);else classes.delete(k);}}; }
    querySelector(q) { return get(q); }
    querySelectorAll(q) { return q === '[data-sheep-action]' ? actions : []; }
    addEventListener(k,fn) { (this.listeners[k] ||= []).push(fn); }
    removeEventListener(k,fn) { this.listeners[k]=(this.listeners[k]||[]).filter(f=>f!==fn); }
    emit(k,event={}) { for(const fn of this.listeners[k]||[]) fn({target:this,preventDefault(){},...event}); }
    toggleAttribute(k,on) { const key=k.replace(/^data-/, ''); if(on)this.dataset[key]='';else delete this.dataset[key]; }
    contains(el) { return [...elements.values()].includes(el); }
    setAttribute(k,v) { this[k]=v; }
    focus() { this.emit('focus'); }
    getBoundingClientRect() { return this.rect || {left:0,top:0,bottom:76,width:96,height:76}; }
    setPointerCapture(id) { this.capture=id; }
    hasPointerCapture(id) { return this.capture===id; }
    releasePointerCapture() { delete this.capture; }
    animate() { animationCount++; return {cancel(){},onfinish:null}; }
  }
  const get=q=>{if(!elements.has(q)) elements.set(q,new Element());return elements.get(q);};
  const actions=['pat','feed','nap'].map(kind=>{const e=get(`[data-sheep-action="${kind}"]`);e.dataset.sheepAction=kind;return e;});
  const doc = new Element(); doc.hidden=false; doc.getElementById=id=>get('#'+id);
  if(withGuide){
    get('#sheep-guide-data').textContent=JSON.stringify(['alpha','beta'].map(id=>({id,title:id+' project',notes:[id+' overview',id+' method',id+' result']})));
    get('.header-shell').rect={bottom:70};get('.hero').rect={bottom:500};
    get('#alpha').rect={top:700,bottom:1100};get('#beta').rect={top:1200,bottom:1600};
    get('.sheep-guide-card').hidden=true;
  }
  const window = new Element();
  const motion = new Element(); motion.matches=reduced;
  const fine = new Element(); fine.matches=true;
  const timeout=(fn,ms=0)=>{const id=++sequence;jobs.set(id,{fn,at:time+ms});return id;};
  const calls=[];
  get('#sheep-motion-data').textContent=fs.readFileSync(path.join(__dirname,'../assets/sheep-poses.json'),'utf8');
  window.BUSheep=class {
    constructor(svg,data){this.data=data;this.follow=true;this.pointer=()=>{};}
    stop(){clearTimeoutMock(this.pending);this.scripted=false;}
    frame(id){this.stop();calls.push(['frame',id]);}
    lookAt(x,y){calls.push(['look',x,y]);}
    play(name){this.stop();calls.push(['play',name]);this.scripted=true;return {then:fn=>{this.pending=timeout(()=>{this.scripted=false;fn();},this.data.sequences[name].frames.reduce((n,f)=>n+f[1],0));}};}
  };
  const clearTimeoutMock=id=>jobs.delete(id);
  const ctx={innerHeight:800,document:doc,performance:{now:()=>time},matchMedia:q=>q.includes('reduced-motion')?motion:fine,
    setTimeout:timeout,clearTimeout:id=>jobs.delete(id),requestAnimationFrame:fn=>timeout(fn,0),cancelAnimationFrame:id=>jobs.delete(id),
    addEventListener:window.addEventListener.bind(window),IntersectionObserver:class{constructor(fn){observer=fn;}observe(){}},console};
  ctx.window=window; window.IntersectionObserver=ctx.IntersectionObserver;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sheep.js'),'utf8'),ctx);
  function tick(ms) {const end=time+ms; let safety=0; while(true){const due=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;if(++safety>1000)throw Error('Runaway timer');time=due[1].at;jobs.delete(due[0]);due[1].fn();}time=end;}
  const b=get('.sheep-button');
  function project(id) {
    get('.hero').rect={bottom:-100};
    get('#alpha').rect=id==='alpha'?{top:100,bottom:650}:{top:-800,bottom:-100};
    get('#beta').rect=id==='beta'?{top:100,bottom:650}:{top:900,bottom:1300};
    window.emit('scroll');tick(0);
  }
  return {calls,project,get,b,doc,window,motion,tick,jobs,actions,state:()=>b.dataset.state,
    say:()=>get('.sheep-status').textContent,animations:()=>animationCount,
    hidden:()=>{doc.hidden=true;doc.emit('visibilitychange');},offscreen:()=>observer([{isIntersecting:false}]),
    click:()=>b.emit('click',{detail:0}),
    down:()=>b.emit('pointerdown',{isPrimary:true,button:0,pointerId:1}),
    up:()=>b.emit('pointerup',{pointerId:1}),
    move:(x,y)=>doc.emit('pointermove',{pointerType:'mouse',buttons:0,clientX:x,clientY:y})};
}
test('clicks count once; third hello unlocks the count-a-sheep line',()=>{
 const s=setup();for(let i=0;i<3;i++){s.down();s.tick(50);s.up();s.b.emit('click',{detail:1});s.tick(700);}assert.match(s.say(),/three times/);
});
test('holding bounces once; cancel releases without a greeting or count',()=>{
 const s=setup();s.down();assert.equal(s.state(),'pressed');s.tick(450);s.up();assert.match(s.say(),/Springy/);s.b.emit('click',{detail:1});assert.match(s.say(),/Springy/);
 s.tick(700);s.down();s.tick(450);s.b.emit('pointercancel');assert.equal(s.state(),'awake');s.tick(20000);assert.notEqual(s.state(),'pressed');
});
test('head stroking needs reversals and duration; ordinary passing does not pet',()=>{
 const s=setup();s.move(60,20);s.tick(200);s.move(75,20);s.tick(200);assert.equal(s.state(),'awake');s.move(60,20);s.tick(200);s.move(75,20);assert.equal(s.state(),'petting');assert.match(s.get('.sheep-bubble').textContent,/spot/);s.tick(2800);assert.equal(s.state(),'awake');
});
test('idle progresses through drowsy, yawn, sleep; focus preserves sleep until click',()=>{
 const s=setup();s.click();s.tick(12000);assert.equal(s.state(),'drowsy');s.tick(4000);assert.equal(s.state(),'yawning');s.tick(6400);assert.equal(s.state(),'sleeping');s.b.emit('focus');assert.equal(s.state(),'sleeping');s.click();assert.equal(s.state(),'waking');assert.match(s.say(),/thinking/);s.tick(2800);assert.equal(s.state(),'awake');
});
test('feeding completes without normal clicks or a second feed resetting it',()=>{
 const s=setup();s.actions[1].emit('click');assert.equal(s.state(),'feeding');assert.equal(s.actions[1].disabled,true);s.tick(1000);s.click();s.actions[1].emit('click');s.tick(1900);assert.equal(s.state(),'awake');assert.equal(s.actions[1].disabled,false);assert.match(s.say(),/Five baas/);
});
test('explicit head pat and nap work without a pointer',()=>{
 const s=setup();s.actions[0].emit('click');assert.equal(s.state(),'petting');s.tick(2000);s.actions[2].emit('click');assert.equal(s.state(),'yawning');s.tick(6400);assert.equal(s.state(),'sleeping');
});
test('offscreen and hidden page cancel all timers, queued movement and press',()=>{
 for(const mode of ['offscreen','hidden']){const s=setup();s.click();s.move(75,20);s.down();s[mode]();assert.equal(s.jobs.size,0);assert.equal(s.state(),'awake');assert.equal(s.say(),'');s.tick(30000);assert.equal(s.jobs.size,0);}
});
test('reduced motion preserves all accessible state feedback with no WAAPI animations',()=>{
 const s=setup(true);s.click();s.actions[0].emit('click');s.tick(2000);s.down();s.tick(450);s.up();s.actions[1].emit('click');s.tick(2500);s.actions[2].emit('click');s.tick(6400);assert.equal(s.state(),'sleeping');s.click();assert.equal(s.state(),'waking');assert.equal(s.animations(),0);
});
test('changing motion preference cancels in-flight feeding and pending callbacks',()=>{
 const s=setup();s.actions[1].emit('click');s.motion.matches=true;s.motion.emit('change');assert.equal(s.state(),'awake');assert.equal(s.actions[1].disabled,false);assert.equal(s.jobs.size,0);
});

test('project guide docks, waits for reading, and returns home without moving focus to a note',()=>{
 const s=setup(false,true);const root=s.get('.sheep-companion'),card=s.get('.sheep-guide-card');
 assert.equal(root.classList.contains('is-docked'),false);s.project('alpha');assert.equal(root.classList.contains('is-docked'),true);assert.equal(card.hidden,true);
 s.tick(1000);assert.equal(card.hidden,false);assert.equal(s.get('.sheep-guide-text').textContent,'alpha overview');assert.equal(s.say(),'');
 s.get('.hero').rect={bottom:500};s.window.emit('scroll');s.tick(0);assert.equal(root.classList.contains('is-docked'),false);assert.equal(card.hidden,true);
});
test('fast scrolling cancels stale project commentary; every note matches current project',()=>{
 const s=setup(false,true);s.project('alpha');s.tick(500);s.project('beta');s.tick(1000);
 assert.equal(s.get('.sheep-guide-text').textContent,'beta overview');
 s.get('.sheep-guide-more').emit('click');assert.equal(s.get('.sheep-guide-text').textContent,'beta method');
 s.project('alpha');assert.equal(s.get('.sheep-guide-card').hidden,true);s.tick(1000);assert.equal(s.get('.sheep-guide-card').hidden,true);
 s.tick(9000);assert.equal(s.get('.sheep-guide-text').textContent,'alpha overview');
});
test('automatic notes dismiss once per project, while manual replay remains available',()=>{
 const s=setup(false,true);s.project('alpha');s.tick(1000);s.tick(8500);assert.equal(s.get('.sheep-guide-card').hidden,true);
 s.window.emit('scroll');s.tick(12000);assert.equal(s.get('.sheep-guide-card').hidden,true);
 s.get('.sheep-project-prompt').emit('click');assert.equal(s.get('.sheep-guide-card').hidden,false);s.tick(9000);assert.equal(s.get('.sheep-guide-card').hidden,false);
});
test('muting suppresses automatic notes but preserves manual explanations and further detail',()=>{
 const s=setup(false,true);s.get('.sheep-auto').emit('click');s.project('alpha');s.tick(15000);assert.equal(s.get('.sheep-guide-card').hidden,true);
 s.get('.sheep-project-prompt').emit('click');s.get('.sheep-guide-more').emit('click');assert.equal(s.get('.sheep-guide-text').textContent,'alpha method');
 s.get('.sheep-guide-more').emit('click');assert.equal(s.get('.sheep-guide-text').textContent,'alpha result');
 s.get('.sheep-guide-more').emit('click');assert.equal(s.get('.sheep-guide-text').textContent,'alpha overview');
});
test('pet interaction delays commentary and hiding the page cancels a pending guide',()=>{
 const s=setup(false,true);s.project('alpha');s.actions[1].emit('click');s.tick(1200);assert.equal(s.get('.sheep-guide-card').hidden,true);
 s.window.emit('scroll');s.tick(0);s.hidden();assert.equal(s.jobs.size,0);assert.equal(s.get('.sheep-guide-card').hidden,true);
});

test('automatic blink uses BU without resetting its current gaze',()=>{
 const s=setup();s.move(70,25);s.tick(0);s.click();s.tick(5500);
 assert.ok(s.calls.some(c=>c[0]==='play'&&c[1]==='blink'));
 assert.ok(s.calls.some(c=>c[0]==='look'));
 assert.ok(!s.calls.some(c=>c[0]==='frame'));
});
test('a new action cancels completion of the previous action',()=>{
 const s=setup();s.actions[0].emit('click');s.tick(1000);s.actions[2].emit('click');
 s.tick(2000);assert.equal(s.state(),'yawning');s.tick(4400);assert.equal(s.state(),'sleeping');
});
