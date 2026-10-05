/* BU's articulated SVG controller. No libraries, network calls or visitor storage. */
(() => {
  const defaults={lift:0,squash:1,stretch:1,tilt:0,'head-y':0,'head-x':0,'head-sx':1,'face-x':0,'ear-l':0,'ear-r':0,'leg-fl':0,'leg-fr':0,'leg-bl':0,'leg-br':0,tuck:0,lid:0,closed:0,happy:0,mouth:0,smile:1,'mouth-y':1,cheek:0,grass:0,'grass-x':0,'grass-r':0,sleep:0,heart:0,shadow:1,'gaze-x':0,'gaze-y':0};
  class BUSheep {
    constructor(svg,data,onFrame=()=>{}){
      this.svg=svg;this.data=data;this.onFrame=onFrame;this.values={...defaults};
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.follow=true;
      this.disposed=false;this.scripted=false;this.playbackRate=1;this.raf=0;this.run=0;this.gaze={x:0,y:0};this.gazeTarget={x:0,y:0};this.lookTilt=0;
      this.pointer=e=>this.lookAt(e.clientX,e.clientY);
      this.hidden=()=>{if(document.hidden){this.stop();this.resetGaze();}};
      this.reduce=()=>{this.stop();this.resetGaze();};
      document.addEventListener('pointermove',this.pointer,{passive:true});
      document.addEventListener('visibilitychange',this.hidden);this.motion.addEventListener('change',this.reduce);
      this.render();this.resetGaze();
    }
    poseValues(p){const v={...defaults,...p.values};v.lid=Math.max(v.lid,v.closed,v.happy);return v;}
    render(){for(const [key,value] of Object.entries(this.values))this.svg.style.setProperty('--'+key,value+(this.data.units[key]||''));}
    resetGaze(){
      cancelAnimationFrame(this.gazeRaf);this.gazeRaf=0;this.gaze={x:0,y:0};this.gazeTarget={x:0,y:0};this.lookTilt=0;this.applyGaze(this.gaze);
    }
    stop(){this.run++;cancelAnimationFrame(this.raf);this.raf=0;this.scripted=false;if(this.resolve){this.resolve(false);this.resolve=null;}}
    frame(id){
      const p=this.data.poses.find(p=>p.id===id);if(!p)return false;
      this.stop();this.resetGaze();this.values=this.poseValues(p);this.render();this.onFrame(id);return true;
    }
    actionTarget(p,context){
      const target=this.poseValues(p);if(!context)return target;
      if(context.name==='blink'){
        // A blink changes only eyelid closure; preserve the current pose and gaze.
        return {...context.base,lid:p.id==='idle'?context.base.lid:target.lid,
          closed:p.id==='idle'?context.base.closed:target.closed};
      }
      for(const [key,axis] of [['gaze-x','x'],['gaze-y','y']]){
        target[key]=Object.hasOwn(p.values,key)?target[key]-context.pointer[axis]:context.base[key];
      }
      return target;
    }
    releaseGaze(){
      // Transfer authored gaze back to pointer tracking without changing its
      // rendered sum. Head follow has a separate eased angle, so it cannot jump.
      if(!this.follow)return;
      this.gaze={x:this.gaze.x+this.values['gaze-x'],y:this.gaze.y+this.values['gaze-y']};
      this.gazeTarget={...this.gaze};this.values['gaze-x']=0;this.values['gaze-y']=0;
      this.render();this.applyGaze(this.gaze);
      if(this.lastPointer)this.lookAt(...this.lastPointer);
    }
    transition(id,duration,context){
      const p=this.data.poses.find(p=>p.id===id);if(!p)return Promise.resolve(false);
      const start={...this.values},target=this.actionTarget(p,context);this.onFrame(id);
      return new Promise(resolve=>{
        this.resolve=resolve;let begin=null;
        const tick=time=>{
          if(begin===null)begin=time;
          const t=Math.min(1,(time-begin)/duration),ease=t*t*(3-2*t);
          for(const key of Object.keys(defaults))this.values[key]=start[key]+(target[key]-start[key])*ease;
          this.render();
          if(t<1)this.raf=requestAnimationFrame(tick);
          else{this.raf=0;this.resolve=null;resolve(true);}
        };
        this.raf=requestAnimationFrame(tick);
      });
    }
    async play(name){
      const seq=this.data.sequences[name];if(!seq||this.disposed)return;
      this.stop();const run=this.run;this.scripted=true;
      cancelAnimationFrame(this.gazeRaf);this.gazeRaf=0;
      const context={name,base:{...this.values},pointer:{...this.gaze}};
      if(this.motion.matches){
        const id=({turn:'turn-left',idle:'idle',blink:'blink-closed',talk:'talk-small',pat:'happy',eat:'chew-a',sleep:'sleep-out',wake:'wake',hop:'air',walk:'walk-a'})[name]||seq.frames.at(-1)[0];
        this.values=this.actionTarget(this.data.poses.find(p=>p.id===id),context);this.render();this.onFrame(id);
        this.scripted=false;this.releaseGaze();return;
      }
      try{for(const [id,ms] of seq.frames){if(run!==this.run||!(await this.transition(id,ms/this.playbackRate,context)))return;}}
      finally{
        if(run===this.run){this.scripted=false;this.releaseGaze();}
      }
    }
    lookAt(x,y){
      this.lastPointer=[x,y];
      if(!this.follow||this.scripted||this.disposed||document.hidden||this.values.sleep>.5)return;
      const matrix=this.svg.querySelector('.bu-head').getScreenCTM();if(!matrix)return;
      const point=new DOMPoint(x,y).matrixTransform(matrix.inverse());
      const dx=point.x-165,dy=point.y-106,length=Math.hypot(dx,dy)||1,amount=Math.min(1,length/100);
      this.gazeTarget={x:dx/length*2.7*amount,y:dy/length*2.6*amount};
      if(this.motion.matches){this.gaze={...this.gazeTarget};this.lookTilt=0;this.applyGaze(this.gaze);return;}
      if(!this.gazeRaf)this.gazeRaf=requestAnimationFrame(()=>this.easeGaze());
    }
    applyGaze(point){
      // Pointer input never overwrites authored pupil transforms or gaze poses.
      this.svg.style.setProperty('--pointer-x',point.x+'px');this.svg.style.setProperty('--pointer-y',point.y+'px');
      this.svg.style.setProperty('--look-tilt',this.motion.matches?'0deg':`${this.lookTilt}deg`);
    }
    easeGaze(){
      this.gazeRaf=0;if(this.scripted||this.disposed||document.hidden)return;
      this.gaze.x+=(this.gazeTarget.x-this.gaze.x)*.18;this.gaze.y+=(this.gazeTarget.y-this.gaze.y)*.18;this.lookTilt+=(this.gazeTarget.x*.22-this.lookTilt)*.18;this.applyGaze(this.gaze);
      if(Math.abs(this.gaze.x-this.gazeTarget.x)+Math.abs(this.gaze.y-this.gazeTarget.y)+Math.abs(this.lookTilt-this.gazeTarget.x*.22)>.02)this.gazeRaf=requestAnimationFrame(()=>this.easeGaze());
    }
    setFollow(value){this.follow=value;this.resetGaze();}
    destroy(){
      this.stop();this.setFollow(false);this.disposed=true;
      document.removeEventListener('pointermove',this.pointer);document.removeEventListener('visibilitychange',this.hidden);this.motion.removeEventListener('change',this.reduce);
    }
  }
  window.BUSheep=BUSheep;
})();
