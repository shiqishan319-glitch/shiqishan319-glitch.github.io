const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(width=1200,height=800){
 const frames=new Map(),classes=new Set(),listeners={},style={};let seq=0,allowed=true,walks=0,rests=0;
 const root={offsetWidth:82,offsetHeight:92,dataset:{},style:{setProperty:(k,v)=>style[k]=v},
  classList:{add:k=>classes.add(k),toggle:(k,on)=>on?classes.add(k):classes.delete(k)},contains:()=>false,
  getBoundingClientRect:()=>({left:600,top:130,width:82,height:92})};
 let obstacles=[],controls=[];
 const context={window:{},innerWidth:width,innerHeight:height,document:{querySelector:()=>({getBoundingClientRect:()=>({bottom:70})}),querySelectorAll:selector=>selector.startsWith('main ')?obstacles:controls},
  addEventListener:(k,fn)=>listeners[k]=fn,removeEventListener:k=>delete listeners[k],
  requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq},cancelAnimationFrame:id=>frames.delete(id)};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../sheep-roam.js','utf8'),context);
 const pet=new context.window.SheepRoam(root,{canMove:()=>allowed,walk:()=>walks++,rest:()=>rests++});
 return {pet,root,style,frames,listeners,context,allow:v=>allowed=v,
  obstacle:r=>obstacles=[{getClientRects:()=>[r]}],counts:()=>({walks,rests}),
  tick:t=>{const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(t));}};
}
test('free placement stays within viewport and re-clamps after resize',()=>{
 const s=setup();s.pet.place(-200,10000);assert.equal(s.pet.x,8);assert.equal(s.pet.y,696);
 s.context.innerWidth=390;s.context.innerHeight=600;s.pet.place(1000,900);assert.equal(s.pet.x,300);assert.equal(s.pet.y,496);
});
test('walking changes position gradually and stops at target',()=>{
 const s=setup();s.pet.moveTo(950,500);s.tick(0);const start=s.pet.x;s.tick(1000);assert.ok(s.pet.x<start&&s.pet.x>950);s.tick(10000);assert.equal(s.pet.x,950);assert.equal(s.pet.y,500);assert.equal(s.pet.moving,false);assert.deepEqual(s.counts(),{walks:1,rests:1});
});
test('scroll and loss of permission stop immediately at current position',()=>{
 const s=setup();s.pet.moveTo(950,500);s.tick(0);s.tick(600);s.listeners.scroll();const x=s.pet.x;s.tick(10000);assert.equal(s.pet.x,x);assert.equal(s.frames.size,0);
 s.pet.moveTo(900,450);s.allow(false);s.tick(0);assert.equal(s.pet.moving,false);
});
test('route checking rejects crossing text, not just blocked destinations',()=>{
 const s=setup();s.pet.place(8,300);assert.equal(s.pet.clearRoute(400,300,[{left:200,right:240,top:200,bottom:450}]),false);
 assert.equal(s.pet.clearRoute(8,500,[{left:200,right:240,top:200,bottom:450}]),true);
});
test('reduced motion or an open guide prevents wandering',()=>{
 const s=setup();s.allow(false);assert.equal(s.pet.wander(),false);assert.equal(s.frames.size,0);
});

test('a medium-width panel can use the lower edge when text blocks the gutter',()=>{
 const s=setup(850,700);s.obstacle({left:0,right:850,top:100,bottom:700,width:850,height:600});assert.equal(s.pet.wander(),true);assert.equal(s.pet.moving,true);
});

test('a sheep initially overlapping content can move out instead of being trapped',()=>{
 const s=setup();s.pet.place(100,300);const obstacle={left:100,right:200,top:290,bottom:330};assert.equal(s.pet.clearRoute(100,450,[obstacle]),true);assert.equal(s.pet.clearRoute(100,301,[obstacle]),false);
});
