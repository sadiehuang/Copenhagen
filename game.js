'use strict';
(() => {
const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const strings = {
  en: {fullscreen:'Fullscreen',exitFullscreen:'Exit fullscreen',fullscreenUnavailable:'Fullscreen is unavailable in this browser.',restart:'Restart',pause:'Pause',resume:'Resume',settings:'Settings',clue:'Clue',language:'Language',sound:'Sound',mute:'Mute',unmute:'Unmute',controls:'Controls',click:'Click',split:'Split / continue',pauseResume:'Pause / resume',muteSound:'Mute / unmute',menu:'Menu / close',close:'Close',volume:'Volume',canvas:'Click to split the particle',brand:'Copenhagen',first:'Click anywhere in the darkness.',more:'Click again. Each touch doubles the particles.',blast:'Wait for the light to fade.',rewind:'Let time turn back.',end:'Click to continue.',arrival:'Listen. A train is arriving.',act2:'Walk right through the city, past the industrial quarter and gardens. Ring the bell at Bohr’s house with E.',walk:'Walk',interact:'Interact',hiroshima:'Hiroshima',copenhagen:'Copenhagen'},
  zh: {fullscreen:'全屏',exitFullscreen:'退出全屏',fullscreenUnavailable:'当前浏览器无法使用全屏。',restart:'重新开始',pause:'暂停',resume:'继续',settings:'设置',clue:'线索',language:'语言',sound:'声音',mute:'静音',unmute:'取消静音',controls:'键位提示',click:'点击',split:'裂变 / 继续',pauseResume:'暂停 / 继续',muteSound:'静音 / 取消静音',menu:'菜单 / 关闭',close:'关闭',volume:'音量',canvas:'点击使粒子裂变',brand:'哥本哈根',first:'点击黑暗中的任意位置。',more:'再次点击。每次触碰，粒子都会翻倍。',blast:'等待白光消退。',rewind:'等待时间回溯。',end:'点击，继续。',arrival:'听，火车正在进站。',act2:'向右穿过城市、工业区和花园，到玻尔家门前按 E 键或点击门铃按钮。',walk:'行走',interact:'互动',hiroshima:'广岛',copenhagen:'哥本哈根'}
};
let preferences = {language:'en',volume:65,muted:false};
try { const saved = JSON.parse(localStorage.getItem('copenhagen.preferences.v2')); if(saved) preferences = {...preferences,...saved}; } catch {}
if(!strings[preferences.language]) preferences.language = 'en';
preferences.volume = clamp(Number(preferences.volume) || 0,0,100);
const tr = key => strings[preferences.language][key];
const save = () => { try { localStorage.setItem('copenhagen.preferences.v2',JSON.stringify(preferences)); } catch {} };
let phase = 'fission', clicks = 0, sceneAge = 0, simulationTime = 0, paused = false, lastFrame = 0;
let menuPinned = false, dateIndex = 1945 * 12 + 7, placeKey = 'hiroshima';
const CALENDAR_START = 1945 * 12 + 7, CALENDAR_END = 1941 * 12 + 8;
const CALENDAR_STEPS = CALENDAR_START - CALENDAR_END, CALENDAR_DURATION = 7, CALENDAR_FLIP_DURATION = .12, CITY_FADE_DURATION = 3.2;
let calendarLanguage = '', calendarPosition = 0;
let calendarStep = 0, calendarMoveFrom = 0, calendarMoveAt = 0;
const dialogIsOpen=()=>['settings','clue','chapters'].some(id=>$(id).open);
const isBlocked = () => paused || document.hidden || dialogIsOpen();

// One texel is one independent particle. A split reads each parent twice,
// applying opposite impulses. The twentieth split simulates all 1,048,576.
class ParticleField {
  constructor(canvas) {
    this.canvas=canvas; this.count=1; this.front=0;
    try {
      this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,powerPreference:'high-performance'});
      if(!this.gl || !this.gl.getExtension('EXT_color_buffer_float')) throw Error('Float rendering unavailable');
      this.initGL();
    } catch (error) {
      console.warn('Using the lightweight particle renderer.',error.message);
      const replacement=canvas.cloneNode(); canvas.replaceWith(replacement); this.canvas=replacement;this.gl=null;this.ctx=replacement.getContext('2d');this.points=[{x:0,y:0,vx:.03,vy:.015}];
    }
    this.resize();this.reset();
  }
  shader(type,source) {const g=this.gl,s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;}
  program(v,f) {const g=this.gl,p=g.createProgram();g.attachShader(p,this.shader(g.VERTEX_SHADER,v));g.attachShader(p,this.shader(g.FRAGMENT_SHADER,f));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));return p;}
  initGL() {
    const g=this.gl;
    this.sim=this.program(`#version 300 es
    void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`,`#version 300 es
    precision highp float;precision highp int;
    uniform sampler2D source;uniform float dt;uniform float clock;uniform int split;uniform int generation;uniform int count;uniform vec2 aspect;
    out vec4 next;
    float hash(uint n){n^=n>>16;n*=2146121005u;n^=n>>15;n*=2221713035u;n^=n>>16;return float(n)/4294967295.;}
    void main(){ivec2 uv=ivec2(gl_FragCoord.xy);int id=uv.y*1024+uv.x;if(id>=count){next=vec4(0.);return;}int parent=split==1?id/2:id;
    vec4 p=texelFetch(source,ivec2(parent%1024,parent/1024),0);
    if(split==1){float angle=hash(uint(parent+generation*104729))*6.2831853;float side=id%2==0?-1.:1.;p.zw=vec2(cos(angle),sin(angle))*side*.72*aspect;}
    float seed=hash(uint(id+1))*90.;vec2 drift=vec2(sin(clock*1.41+seed)+.55*cos(clock*2.17+seed*1.3),cos(clock*1.13+seed*.7)+.55*sin(clock*1.79+seed*2.));
    p.zw+=drift*dt*.23*aspect;p.zw*=exp(-dt*1.35);p.xy+=p.zw*dt;
    if(abs(p.x)>.985){p.x=clamp(p.x,-.985,.985);p.z=-p.z*.92;}if(abs(p.y)>.985){p.y=clamp(p.y,-.985,.985);p.w=-p.w*.92;}
    next=p;}`);
    this.draw=this.program(`#version 300 es
    precision highp float;precision highp int;
    uniform sampler2D source;uniform float pointSize;uniform int layer;uniform float clock;
    void main(){int id=gl_VertexID;vec2 p=texelFetch(source,ivec2(id%1024,id/1024),0).xy;if(layer>0){float a=float(id)*2.39996+float(layer)*1.7;p+=vec2(cos(a),sin(a))*.028*float(layer);}
    gl_Position=vec4(p,0.,1.);gl_PointSize=pointSize;}`,`#version 300 es
    precision highp float;uniform float opacity;out vec4 color;
    void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;float a=pow(1.-r*2.,.65)*opacity;color=vec4(vec3(.92,.95,1.)*a,1.);}`);
    this.simUniforms={}; for(const n of ['source','dt','clock','split','generation','count','aspect'])this.simUniforms[n]=g.getUniformLocation(this.sim,n);
    this.drawUniforms={};for(const n of ['source','pointSize','layer','clock','opacity'])this.drawUniforms[n]=g.getUniformLocation(this.draw,n);
    this.textures=[];this.buffers=[];
    for(let i=0;i<2;i++){const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA32F,1024,1024,0,g.RGBA,g.FLOAT,null);const fb=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,fb);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Particle framebuffer unavailable');this.textures.push(t);this.buffers.push(fb);}
    g.bindFramebuffer(g.FRAMEBUFFER,null);
  }
  resize(){this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(innerWidth*this.dpr);this.canvas.height=Math.round(innerHeight*this.dpr);}
  reset(){this.count=1;this.generation=0;if(this.gl){const g=this.gl;for(const t of this.textures){g.bindTexture(g.TEXTURE_2D,t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,1,1,g.RGBA,g.FLOAT,new Float32Array([0,0,.02,.035]));}}else this.points=[{x:0,y:0,vx:.02,vy:.035}];}
  split(){this.generation++;this.count=2**this.generation;if(this.gl){this.step(0,simulationTime,true);}else {const next=[];for(const p of this.points){const a=Math.random()*Math.PI*2;for(const s of [-1,1])next.push({x:p.x,y:p.y,vx:Math.cos(a)*s*.7,vy:Math.sin(a)*s*.7});if(next.length>=12000)break;}this.points=next;}}
  step(dt,clock,split=false){
    if(!this.gl){for(let i=0;i<this.points.length;i++){const p=this.points[i];p.vx=(p.vx+Math.sin(clock*1.4+i*4.2)*dt*.23)*Math.exp(-dt*1.35);p.vy=(p.vy+Math.cos(clock*1.1+i*3.7)*dt*.23)*Math.exp(-dt*1.35);p.x+=p.vx*dt;p.y+=p.vy*dt;if(Math.abs(p.x)>.98){p.x=clamp(p.x,-.98,.98);p.vx*=-1;}if(Math.abs(p.y)>.98){p.y=clamp(p.y,-.98,.98);p.vy*=-1;}}return;}
    const g=this.gl,u=this.simUniforms;g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,this.buffers[1-this.front]);g.viewport(0,0,1024,Math.ceil(this.count/1024));g.useProgram(this.sim);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.textures[this.front]);g.uniform1i(u.source,0);g.uniform1f(u.dt,dt);g.uniform1f(u.clock,clock);g.uniform1i(u.split,split?1:0);g.uniform1i(u.generation,this.generation);g.uniform1i(u.count,this.count);const min=Math.min(innerWidth,innerHeight);g.uniform2f(u.aspect,min/innerWidth,min/innerHeight);g.drawArrays(g.TRIANGLES,0,3);this.front=1-this.front;
  }
  render(layers=1,brightness=1){
    if(!this.gl){const c=this.ctx,w=this.canvas.width,h=this.canvas.height;c.fillStyle='#000';c.fillRect(0,0,w,h);c.fillStyle='rgba(226,236,255,.95)';const size=4*this.dpr;for(const p of this.points){c.beginPath();c.arc((p.x*.5+.5)*w,(-p.y*.5+.5)*h,size/2,0,Math.PI*2);c.fill();}return;}
    const g=this.gl,u=this.drawUniforms;g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(0,0,0,1);g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.draw);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.textures[this.front]);g.uniform1i(u.source,0);g.uniform1f(u.pointSize,4*this.dpr);g.uniform1f(u.opacity,brightness);g.uniform1f(u.clock,simulationTime);g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE);for(let l=0;l<layers;l++){g.uniform1i(u.layer,l);g.drawArrays(g.POINTS,0,this.count);}g.disable(g.BLEND);
  }
}
const field=new ParticleField($('world'));
addEventListener('resize',()=>field.resize());

const EXPLOSION_DURATION = 6.3;
const BOMB_IMPACT_OFFSET = 4.95;
const MIX = Object.freeze({music:.60,musicBeforeBlast:[.56,.40,.27,.17,.09,.04],rumble:[.28,.40,.54,.70,.88,1.05],explosion:2.0,train:.18});
class Soundtrack {
  constructor(){
    this.element=$('bgm');this.second=$('bgm2');this.started=false;this.secondStarted=false;
    this.nodes=new Set();this.rumbleLevel=0;this.musicLevel=MIX.music;this.buffers={};this.trainStarted=false;
    for(const e of [this.element,this.second])e.addEventListener('error',()=>{this.failed=true;});
    this.files={};
    for(const name of ['bomb','train','rumble'])this.files[name]=fetch($('asset-'+name).href).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).catch(()=>{this.failed=true;return null;});
  }
  async unlock(){
    if(!this.context){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      this.context=new AC();const c=this.context;this.master=c.createGain();this.master.gain.value=preferences.muted?0:preferences.volume/100;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-9;limiter.knee.value=6;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.16;this.master.connect(limiter).connect(c.destination);
      this.music=c.createGain();this.music.gain.value=MIX.music;
      c.createMediaElementSource(this.element).connect(this.music).connect(this.master);
      this.music2=c.createGain();this.music2.gain.value=0;c.createMediaElementSource(this.second).connect(this.music2).connect(this.master);
      this.rumbleGain=c.createGain();this.rumbleGain.gain.value=0;this.rumbleFilter=c.createBiquadFilter();this.rumbleFilter.type='lowpass';this.rumbleFilter.frequency.value=1100;this.rumbleFilter.Q.value=.55;this.rumbleFilter.connect(this.rumbleGain).connect(this.master);
      for(const name of ['bomb','train','rumble'])this.files[name].then(async data=>{
        if(!data)return;try{this.buffers[name]=await c.decodeAudioData(data);
          if(name==='rumble'){this.rumbleBuffer=this.buffers.rumble;if(phase==='fission'&&clicks>=14)this.rumble();}
          else if(name==='bomb'&&phase==='blast')this.blast();
          else if(name==='train'&&((phase==='arrival'&&sceneAge>=1.5)||phase==='act2'))this.train();
        }catch{this.failed=true;}
      });
    }
    if(!isBlocked())await this.context.resume().catch(()=>{});
    if(phase==='fission'&&!isBlocked()){this.started=true;this.element.play().catch(()=>{});this.intensity();}
  }
  intensity(){
    if(!this.context||phase!=='fission')return;const t=this.context.currentTime;
    this.musicLevel=clicks<14?MIX.music:MIX.musicBeforeBlast[Math.min(clicks-14,5)];
    this.music.gain.setTargetAtTime(this.musicLevel,t,.24);
  }
  volume(){if(this.context)this.master.gain.setTargetAtTime(preferences.muted?0:preferences.volume/100,this.context.currentTime,.06);}
  sync(){
    if(!this.context)return;
    if(isBlocked()){this.element.pause();this.second.pause();this.context.suspend().catch(()=>{});}
    else{this.context.resume().catch(()=>{});if(this.started&&phase==='fission')this.element.play().catch(()=>{});if(this.secondStarted&&['arrival','act2'].includes(phase))this.second.play().catch(()=>{});}
  }
  track(source,connected=[]){this.nodes.add(source);source.onended=()=>{source.disconnect();for(const node of connected)node.disconnect();this.nodes.delete(source);};return source;}
  rumble(){
    if(!this.context||clicks<14||phase!=='fission')return;
    this.rumbleLevel=MIX.rumble[Math.min(clicks-14,5)];
    if(!this.rumbleBuffer)return;
    const c=this.context,t=c.currentTime,starting=!this.rumbleSource,gain=this.rumbleGain.gain;
    const current=starting?0:gain.value;gain.cancelScheduledValues(t);gain.setValueAtTime(current,t);
    // A short, finite fade makes the first rumble swell out of silence.
    gain.linearRampToValueAtTime(this.rumbleLevel,t+(starting?.2:.1));
    if(starting){const source=c.createBufferSource();source.buffer=this.rumbleBuffer;source.loop=true;source.loopStart=1.95;source.loopEnd=3.7;source.connect(this.rumbleFilter);source.start(t);this.rumbleSource=this.track(source);}
    this.rumbleFilter.frequency.setTargetAtTime(1100+(clicks-14)*140,t,.06);
  }
  split(){this.intensity();if(clicks>=14&&clicks<20)this.rumble();}
  blast(){
    if(!this.context)return;const c=this.context,t=c.currentTime;
    this.element.pause();this.music.gain.cancelScheduledValues(t);this.music.gain.setValueAtTime(0,t);this.musicLevel=0;
    this.rumbleGain.gain.cancelScheduledValues(t);this.rumbleGain.gain.setValueAtTime(0,t);this.rumbleLevel=0;
    if(this.rumbleSource){try{this.rumbleSource.stop();}catch{}this.rumbleSource=null;}
    if(!this.buffers.bomb||this.explosionSource||sceneAge>=EXPLOSION_DURATION)return;
    const elapsed=sceneAge,remaining=EXPLOSION_DURATION-elapsed,source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffers.bomb;
    gain.gain.setValueAtTime(elapsed<4.5?MIX.explosion:MIX.explosion*(EXPLOSION_DURATION-elapsed)/1.8,t);
    if(elapsed<4.5)gain.gain.setValueAtTime(MIX.explosion,t+4.5-elapsed);
    gain.gain.exponentialRampToValueAtTime(.00009,t+remaining);
    source.connect(gain).connect(this.master);source.start(t,BOMB_IMPACT_OFFSET+elapsed,remaining);this.explosionSource=this.track(source,[gain]);
  }
  train(){
    if(!this.context||!this.buffers.train||this.trainStarted)return;
    this.trainStarted=true;const c=this.context,source=c.createBufferSource(),gain=c.createGain(),t=c.currentTime;
    source.buffer=this.buffers.train;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(MIX.train,t+.8);gain.gain.setValueAtTime(MIX.train,t+9);gain.gain.exponentialRampToValueAtTime(.00001,t+17.2);
    const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2200;filter.Q.value=.5;
    source.connect(filter).connect(gain).connect(this.master);source.start(t,0,17.2);this.trainSource=this.track(source,[filter,gain]);
  }
  secondAct(){
    if(!this.context||this.secondStarted)return;this.secondStarted=true;
    const c=this.context;this.music2.gain.setValueAtTime(0,c.currentTime);this.music2.gain.linearRampToValueAtTime(MIX.music,c.currentTime+3.5);
    if(!isBlocked())this.second.play().catch(()=>{});
  }
  reset(){
    for(const e of [this.element,this.second]){e.pause();e.currentTime=0;}
    for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();
    this.rumbleSource=null;this.explosionSource=null;this.trainSource=null;this.rumbleLevel=0;this.trainStarted=false;
    if(this.context){const t=this.context.currentTime;for(const gain of [this.music,this.music2,this.rumbleGain])gain.gain.cancelScheduledValues(t);this.music.gain.setValueAtTime(MIX.music,t);this.musicLevel=MIX.music;this.music2.gain.setValueAtTime(0,t);this.rumbleGain.gain.setValueAtTime(0,t);}
    this.started=false;this.secondStarted=false;
  }
}
const sound=new Soundtrack();
const ambience=new CitySoundscape(sound);
const city=new CityAct($('city-world'),{sound:ambience,language:()=>preferences.language,onZone:()=>updateClue(),onBell:()=>{
  if(sound.context){const t=sound.context.currentTime;const gain=sound.music2.gain;gain.cancelScheduledValues(t);gain.setValueAtTime(gain.value,t);gain.linearRampToValueAtTime(0,t+1.8);}
  $('act2-status').textContent=preferences.language==='zh'?'门铃响起。':'The doorbell rings.';updateClue();
}});
function beginCity(){phase='act2';sceneAge=0;field.canvas.style.opacity='0';$('date').style.opacity=0;$('date').setAttribute('aria-hidden','true');sound.secondAct();city.start();updateClue();}
function interact(){if(phase!=='act2'||isBlocked())return;sound.unlock();city.interact();updateClue();}
$('bell-prompt').onclick=interact;
for(const [id,code] of [['walk-left','ArrowLeft'],['walk-right','ArrowRight']]){
 const b=$(id);b.onpointerdown=e=>{if(isBlocked()||phase!=='act2')return;e.preventDefault();b.setPointerCapture(e.pointerId);sound.unlock();city.input(code,true);};
 const release=()=>city.input(code,false);b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
}

function showMenu(value){if(!value&&(dialogIsOpen()||menuPinned))return;$('toolbar').classList.toggle('visible',value);$('toolbar').inert=!value;}
addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;if(e.clientY<44)showMenu(true);else if(e.clientY>$('toolbar').getBoundingClientRect().bottom+25&&!$('toolbar').contains(document.activeElement))showMenu(false);});
$('top-edge').addEventListener('pointerdown',()=>{menuPinned=!menuPinned;showMenu(true);});
function updateClue(){if(phase==='act2'&&city?.events.bell){$('clue-text').textContent=preferences.language==='zh'?'门铃已经响起。':'The bell has been rung.';return;}$('clue-text').textContent=tr(phase==='fission'?(clicks?'more':'first'):phase==='blast'?'blast':['end','arrival','act2'].includes(phase)?phase:'rewind');}
function localize(){document.documentElement.lang=preferences.language==='en'?'en':'zh-CN';document.title=tr('brand');$('brand').textContent=tr('brand');document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=tr(el.dataset.i18n));document.querySelectorAll('[data-close]').forEach(el=>el.setAttribute('aria-label',tr('close')));$('toolbar').setAttribute('aria-label',tr('menu'));field.canvas.setAttribute('aria-label',tr('canvas'));$('volume').setAttribute('aria-label',tr('volume'));$('language').value=preferences.language;$('volume').value=preferences.volume;$('pause').textContent=tr(paused?'resume':'pause');$('pause').setAttribute('aria-pressed',String(paused));$('mute').textContent=tr(preferences.muted?'unmute':'mute');$('mute').setAttribute('aria-pressed',String(preferences.muted));if(phase==='rewind')animateCalendar(sceneAge);else setDate(dateIndex);$('place').textContent=tr(placeKey);$('place').dataset.location=placeKey;city.refreshUI();updateClue();refreshFullscreen();refreshChapters();}
function setPaused(value){city.release();paused=value;localize();sound.sync();}
function openDialog(id){city.release();showMenu(true);updateClue();refreshChapters();$(id).showModal();sound.sync();}
$('settings-open').addEventListener('click',()=>openDialog('settings'));
$('clue-open').addEventListener('click',()=>openDialog('clue'));
$('chapter-open').addEventListener('click',()=>openDialog('chapters'));
for(const dialog of [$('settings'),$('clue'),$('chapters')]){dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{sound.sync();lastFrame=performance.now();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
$('language').onchange=e=>{preferences.language=e.target.value;save();localize();};
$('volume').oninput=e=>{preferences.volume=Number(e.target.value);save();sound.volume();};
function mute(){preferences.muted=!preferences.muted;save();sound.volume();localize();}
$('mute').onclick=mute;$('pause').onclick=()=>{sound.unlock();setPaused(!paused);};
function resetGame(startSound=true){city.stop();sound.reset();$('act2-status').textContent='';phase='fission';clicks=0;sceneAge=0;simulationTime=0;paused=false;field.reset();field.canvas.style.opacity='1';$('whiteout').style.opacity=0;$('date').style.opacity=0;$('date').setAttribute('aria-hidden','true');dateIndex=1945*12+7;placeKey='hiroshima';$('place').style.opacity=1;menuPinned=false;localize();if(startSound)sound.unlock();$('restart').blur();showMenu(false);}
function restart(){resetGame();}
$('restart').onclick=restart;
function refreshChapters(){$('chapter-act1').textContent=preferences.language==='zh'?'第一幕':'Act I';const firstAct=['arrival','act2'].includes(phase);$('chapter-prologue').setAttribute('aria-current',String(!firstAct));$('chapter-act1').setAttribute('aria-current',String(firstAct));}
function chooseChapter(firstAct){
  for(const id of ['settings','clue','chapters'])if($(id).open)$(id).close();
  resetGame(false);
  if(firstAct){phase='arrival';sceneAge=0;field.canvas.style.opacity='0';dateIndex=CALENDAR_END;placeKey='copenhagen';setDate(CALENDAR_END);$('date').style.opacity=1;$('date').setAttribute('aria-hidden','false');$('place').textContent=tr('copenhagen');$('place').dataset.location='copenhagen';}
  sound.unlock();refreshChapters();updateClue();document.activeElement?.blur();showMenu(false);lastFrame=performance.now();
}
$('chapter-prologue').onclick=()=>chooseChapter(false);
$('chapter-act1').onclick=()=>chooseChapter(true);
function isFullscreen(){return !!(document.fullscreenElement||document.webkitFullscreenElement);}
function refreshFullscreen(){const b=$('fullscreen'),root=document.documentElement;const supported=!!(root.requestFullscreen||root.webkitRequestFullscreen);b.textContent=tr(isFullscreen()?'exitFullscreen':'fullscreen');b.setAttribute('aria-pressed',String(isFullscreen()));b.disabled=!supported;b.title=supported?'':tr('fullscreenUnavailable');}
async function toggleFullscreen(){
  city.release();const root=document.documentElement;
  try{
    if(isFullscreen()){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)await exit.call(document);}
    else{const enter=root.requestFullscreen||root.webkitRequestFullscreen;if(!enter)throw Error('Unavailable');await enter.call(root);}
    $('menu-status').textContent='';refreshFullscreen();
  }catch{$('menu-status').textContent=tr('fullscreenUnavailable');$('fullscreen').title=tr('fullscreenUnavailable');}
}
$('fullscreen').onclick=toggleFullscreen;
for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,()=>{city.release();refreshFullscreen();field.resize();city.resize();});
function split(){if(isBlocked())return;menuPinned=false;if(phase==='end'&&sceneAge>=CITY_FADE_DURATION){phase='arrival';sceneAge=0;sound.unlock();updateClue();showMenu(false);return;}if(phase!=='fission')return;sound.unlock();clicks++;field.split();sound.split();if(clicks===20){phase='blast';sceneAge=0;sound.blast();}updateClue();showMenu(false);}
field.canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;split();});
addEventListener('keydown',e=>{
  const editing=e.target.matches('input,select,textarea');
  if(e.key==='Tab'&&!dialogIsOpen()){menuPinned=true;showMenu(true);}
  if(e.key==='Escape'){if(isFullscreen()||dialogIsOpen())return;menuPinned=!$('toolbar').classList.contains('visible');if(!menuPinned)document.activeElement?.blur();showMenu(menuPinned);e.preventDefault();return;}
  if(editing||dialogIsOpen()||e.ctrlKey||e.metaKey||e.altKey)return;
  if(phase==='act2'&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();if(!paused)city.input(e.code,true);return;}
  if(e.repeat)return;
  if(phase==='act2'&&e.code==='KeyE'){e.preventDefault();interact();return;}
  if(e.code==='Space'&&!e.target.closest('button')){e.preventDefault();split();}
  if(e.key.toLowerCase()==='p'){e.preventDefault();sound.unlock();setPaused(!paused);}
  if(e.key.toLowerCase()==='r'){e.preventDefault();restart();}
  if(e.key.toLowerCase()==='m'){e.preventDefault();mute();}
});
addEventListener('keyup',e=>{city.input(e.code,false);});
addEventListener('blur',()=>city.release());
document.addEventListener('visibilitychange',()=>{city.release();sound.sync();lastFrame=0;});

// Keep one strip while restoring the first version's discrete, accelerating calendar flips.
for(let i=0;i<4;i++){const w=document.createElement('div');w.className='digit-window';const track=document.createElement('div');track.className='digit-track';track.innerHTML='<span></span><span></span>';w.append(track);$('year').append(w);}
function monthName(month){return preferences.language==='zh'?`${month+1} 月`:['January','February','March','April','May','June','July','August','September','October','November','December'][month];}
function renderYear(fromIndex,toIndex=fromIndex,fraction=0){
  const from=String(Math.floor(fromIndex/12)),to=String(Math.floor(toIndex/12));$('year').setAttribute('aria-label',from);
  document.querySelectorAll('.digit-track').forEach((track,i)=>{
    const changing=from[i]!==to[i];
    if(track.firstElementChild.textContent!==to[i])track.firstElementChild.textContent=to[i];
    if(track.lastElementChild.textContent!==from[i])track.lastElementChild.textContent=from[i];
    track.style.transition='none';track.style.transform=changing?`translateY(${(fraction-1)*50}%)`:'translateY(0)';
  });
}
function setDate(index){
  dateIndex=index;calendarLanguage='';renderYear(index);
  const row=document.createElement('span');row.textContent=monthName(index%12);
  $('month-track').replaceChildren(row);$('month-track').style.transition='none';$('month-track').style.transform='translateY(0)';
  $('month-window').setAttribute('aria-label',monthName(index%12));
}
function renderCalendar(position){
  calendarPosition=clamp(position,0,CALENDAR_STEPS);
  const track=$('month-track');
  if(calendarLanguage!==preferences.language){
    const rows=[];for(let i=CALENDAR_END;i<=CALENDAR_START;i++){const row=document.createElement('span');row.textContent=monthName(i%12);rows.push(row);}
    track.replaceChildren(...rows);track.style.transition='none';calendarLanguage=preferences.language;
  }
  const completed=Math.floor(calendarPosition),fraction=calendarPosition-completed;
  dateIndex=CALENDAR_START-completed;
  track.style.transform=`translateY(${-(CALENDAR_STEPS-calendarPosition)*$('month-window').clientHeight}px)`;
  $('month-window').setAttribute('aria-label',monthName(dateIndex%12));
  renderYear(dateIndex,Math.max(CALENDAR_END,dateIndex-1),fraction);
}
function calendarFlipEase(progress){
  const p=clamp(progress);if(p===0||p===1)return p;
  // Original month transition: cubic-bezier(.2,.6,.3,1).
  let low=0,high=1,u=.5;
  for(let i=0;i<16;i++){u=(low+high)/2;const v=1-u,x=3*v*v*u*.2+3*v*u*u*.3+u*u*u;if(x<p)low=u;else high=u;}
  const v=1-u;return 3*v*v*u*.6+3*v*u*u+u*u*u;
}
function animateCalendar(t){
  // Run the original 2–5 second middle section 30% faster, retaining both slow ends.
  const middleSpeed=1.3,clock=t+clamp(t-2,0,3/middleSpeed)*(middleSpeed-1);
  const target=Math.floor(smooth(clock/CALENDAR_DURATION)*CALENDAR_STEPS);
  if(target!==calendarStep){calendarMoveFrom=calendarPosition;calendarMoveAt=clock;calendarStep=target;}
  const fraction=calendarFlipEase((clock-calendarMoveAt)/CALENDAR_FLIP_DURATION);
  renderCalendar(calendarMoveFrom+(calendarStep-calendarMoveFrom)*fraction);
  return calendarStep===CALENDAR_STEPS&&fraction===1;
}
function timeline(){
  const t=sceneAge;
  if(phase==='blast'){
    // Keep the whiteout through the shortened recording, then a faster fade.
    const exposure=smooth((t-.08)/1.1);$('whiteout').style.opacity=t<EXPLOSION_DURATION?exposure:1-smooth((t-EXPLOSION_DURATION)/1.6);
    if(t>=EXPLOSION_DURATION)field.canvas.style.opacity=0;
    if(t>=EXPLOSION_DURATION+2.1){phase='date';sceneAge=0;field.canvas.style.opacity=0;$('whiteout').style.opacity=0;setDate(CALENDAR_START);$('place').textContent=tr('hiroshima');$('date').setAttribute('aria-hidden','false');}
  }else if(phase==='date'){
    $('date').style.opacity=smooth(t/1.5);
    if(t>=2.6){phase='rewind';sceneAge=0;calendarStep=0;calendarMoveFrom=0;calendarMoveAt=0;renderCalendar(0);}
  }else if(phase==='rewind'){
    const settled=animateCalendar(t);
    $('place').style.opacity=1-smooth(t/.8);
    if(settled){phase='end';sceneAge=0;placeKey='copenhagen';$('place').textContent=tr(placeKey);$('place').dataset.location=placeKey;$('place').style.opacity=0;updateClue();}
  }else if(phase==='end'){
    // The place name appears only after the calendar reaches September 1941.
    $('place').style.opacity=smooth(t/CITY_FADE_DURATION);
  }else if(phase==='arrival'){
    $('date').style.opacity=1-smooth(t/1.5);
    if(t>=1.5){$('date').setAttribute('aria-hidden','true');sound.train();}
    if(t>=4.5)beginCity();
  }
}
function frame(now){const dt=lastFrame?clamp((now-lastFrame)/1000,0,.08):0;lastFrame=now;if(!isBlocked()){simulationTime+=dt;sceneAge+=dt;if(phase==='fission'||(phase==='blast'&&sceneAge<1.2))field.step(dt,simulationTime);timeline();if(phase==='act2')city.update(dt);}
  if(phase==='fission')field.render();else if(phase==='blast'&&sceneAge<1.2){const layers=sceneAge<.35?1:sceneAge<.7?2:4;field.render(layers,1+sceneAge*1.8);}
  if(phase==='act2')city.draw();
  requestAnimationFrame(frame);
}
localize();field.render();requestAnimationFrame(frame);
// A direct entrance is useful for rehearsing Act II without replaying the prologue.
if(window.START_ACT_TWO||new URLSearchParams(location.search).get('act')==='2'){phase='end';sceneAge=CITY_FADE_DURATION;field.canvas.style.opacity='0';dateIndex=CALENDAR_END;placeKey='copenhagen';setDate(CALENDAR_END);$('date').style.opacity=1;$('date').setAttribute('aria-hidden','false');$('place').textContent=tr('copenhagen');$('place').dataset.location='copenhagen';updateClue();}
// Read-only diagnostics keep the million-particle count and timeline verifiable.
Object.defineProperty(window,'copenhagen',{get:()=>Object.freeze({phase,clicks,particleCount:field.count,renderedParticles:field.count*(phase==='blast'&&sceneAge<1.2?(sceneAge<.35?1:sceneAge<.7?2:4):1),renderer:field.gl?'webgl2':'canvas2d',paused,sceneAge,date:dateIndex,particleSize:4,rumbleLevel:sound.rumbleLevel,musicLevel:sound.musicLevel,calendarPosition,rumblePlaying:!!sound.rumbleSource,explosionPlaying:!!sound.explosionSource&&sound.nodes.has(sound.explosionSource),trainPlaying:!!sound.trainSource&&sound.nodes.has(sound.trainSource),secondActBgmPlaying:!sound.second.paused,bgmPlaying:!sound.element.paused,bgmError:!!sound.failed,city:city.snapshot})});
})();
