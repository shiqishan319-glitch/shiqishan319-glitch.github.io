/* Viewport movement is separate from BU's internal pose and eye animation. */
(() => {
  class SheepRoam {
    constructor(root, options) {
      this.root = root; this.options = options; this.moving = false; this.raf = 0;
      const rect = root.getBoundingClientRect();
      this.x = innerWidth - rect.width - 16; this.y = innerHeight - rect.height - 18;
      root.classList.add('is-free');
      this.resize = () => { this.stop(); this.place(this.x, innerWidth < 640 ? innerHeight - this.bounds().height - 12 : this.y); };
      this.scroll = () => this.stop();
      addEventListener('resize', this.resize);
      addEventListener('scroll', this.scroll, {passive:true});
      this.place(this.x, this.y);
    }
    bounds() {
      return {width:this.root.offsetWidth || 82, height:this.root.offsetHeight || 92,
        top:document.querySelector('.header-shell').getBoundingClientRect().bottom + 42};
    }
    place(x,y) {
      const b = this.bounds();
      this.x = Math.max(8,Math.min(innerWidth-b.width-8,x));
      this.y = Math.max(b.top,Math.min(innerHeight-b.height-12,y));
      this.root.style.setProperty('--pet-x',this.x+'px');
      this.root.style.setProperty('--pet-y',this.y+'px');
      this.root.classList.toggle('faces-left',this.direction < 0);
      // Keep speech and reading notes inside the viewport wherever the sheep stops.
      this.root.style.setProperty('--note-x',Math.max(12-this.x,Math.min(0,innerWidth-this.x-294))+'px');
      this.root.classList.toggle('note-below',this.y < Math.min(340,innerHeight*.48));
      const speechWidth = innerWidth < 1000 ? 180 : 184;
      const speechX = this.x < 220 ? b.width+10 : -speechWidth-10;
      this.root.style.setProperty('--speech-x',Math.max(8-this.x,Math.min(speechX,innerWidth-this.x-speechWidth-8))+'px');
      this.root.classList.toggle('speech-right',this.x < 220);
    }
    obstacles() {
      return [...document.querySelectorAll('main h1,main h2,main h3,main h4,main p,main a,main button,main summary,footer')]
        .filter(el=>!this.root.contains(el))
        .flatMap(el=>[...el.getClientRects()])
        .filter(r=>r.width && r.height && r.bottom>0 && r.top<innerHeight);
    }
    clearRoute(x,y,obstacles) {
      const b=this.bounds(),distance=Math.hypot(x-this.x,y-this.y);
      // Feet/body occupy most of the SVG; allow its transparent outer padding.
      const overlap=(left,top,r)=>Math.max(0,Math.min(left+b.width-16,r.right+4)-Math.max(left,r.left-4))
        *Math.max(0,Math.min(top+b.height-18,r.bottom+4)-Math.max(top,r.top-4));
      // If a resize/scroll left it over content, allow a route that exits that overlap.
      const initial=obstacles.map(r=>overlap(this.x+8,this.y+6,r));
      const steps=Math.max(1,Math.ceil(distance/16));
      for(let step=0;step<=steps;step++) {
        const t=step/steps,left=this.x+(x-this.x)*t+8,top=this.y+(y-this.y)*t+6;
        if(obstacles.some((r,i)=>{
          const area=overlap(left,top,r);
          return area>0 && (!initial[i] || area>initial[i]+.01 || step===steps);
        }))return false;
      }
      return true;
    }
    wander() {
      if(this.moving || !this.options.canMove())return false;
      const b=this.bounds(),obstacles=this.obstacles(),candidates=[];
      // Try nearby open spaces as well as both page margins, with no fixed dock.
      for(const dx of [-240,-150,-80,0,80,150,240])for(const dy of [-180,-90,0,90,180]) {
        const x=Math.max(8,Math.min(innerWidth-b.width-8,this.x+dx));
        const y=Math.max(b.top,Math.min(innerHeight-b.height-12,this.y+dy));
        if(Math.hypot(x-this.x,y-this.y)>45 && this.clearRoute(x,y,obstacles))candidates.push({x,y});
      }
      // A narrow browser panel can have no usable gutter at any breakpoint.
      // Fall back to the lower edge, still avoiding interactive controls.
      if(!candidates.length) {
        const bottom=innerHeight-b.height-12;
        const controls=[...document.querySelectorAll('a,button,input,summary')].filter(el=>!this.root.contains(el))
          .flatMap(el=>[...el.getClientRects()]);
        for(const x of [12,innerWidth*.35,this.x,innerWidth-b.width-12]) {
          for(const y of [bottom,Math.max(b.top,bottom-100),Math.max(b.top,bottom-190)]) {
            if(Math.hypot(x-this.x,y-this.y)>45 && this.clearRoute(x,y,controls))candidates.push({x,y});
          }
        }
      }
      if(!candidates.length)return false;
      const target=candidates[Math.floor(Math.random()*candidates.length)];
      this.moveTo(target.x,target.y);return true;
    }
    moveTo(x,y) {
      this.stop();
      const startX=this.x,startY=this.y,distance=Math.hypot(x-startX,y-startY);
      this.direction=x<startX?-1:1;this.moving=true;this.root.dataset.moving='true';
      const duration=Math.max(1200,distance/45*1000);let start=null;
      this.options.walk();
      const tick=time=>{
        if(!this.moving)return;
        if(!this.options.canMove()){this.stop();return;}
        if(start===null)start=time;
        const t=Math.min(1,(time-start)/duration),e=t*t*(3-2*t);
        this.place(startX+(x-startX)*e,startY+(y-startY)*e);
        if(t<1)this.raf=requestAnimationFrame(tick);else this.stop();
      };
      this.raf=requestAnimationFrame(tick);
    }
    stop() {
      cancelAnimationFrame(this.raf);this.raf=0;
      const wasMoving=this.moving;this.moving=false;delete this.root.dataset.moving;
      if(wasMoving)this.options.rest();
    }
    destroy() {this.stop();removeEventListener('resize',this.resize);removeEventListener('scroll',this.scroll);}
  }
  window.SheepRoam=SheepRoam;
})();
