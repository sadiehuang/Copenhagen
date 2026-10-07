'use strict';
(() => {
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const ink={sky:'#101923',haze:'#17232c',far:'#223039',brick:'#3b3538',brick2:'#433b3d',stone:'#39444a',window:'#121c24',edge:'#555154',road:'#293137',dark:'#0d171d',leaf:'#293a36',warm:'#d4b476'};
function rand(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();}
function line(c,x,y,x2,y2,color,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function arch(c,x,y,w,h,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,0);c.lineTo(x+w,y+h);c.closePath();c.fill();}
function text(c,s,x,y,size=12,color='#77858b',align='center'){c.fillStyle=color;c.font=`${size}px Georgia, serif`;c.textAlign=align;c.fillText(s,x,y);}
function windows(c,x,y,cols,rows,w=20,h=35,gapx=48,gapy=62,color=ink.window){for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){rect(c,x+k*gapx-2,y+r*gapy-2,w+4,h+4,'#4b4545');rect(c,x+k*gapx,y+r*gapy,w,h,color);line(c,x+k*gapx,y+r*gapy+h*.55,x+k*gapx+w,y+r*gapy+h*.55,'#263037',2);}}
class CityAct {
 constructor(canvas,options={}){
  this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.options=options;this.keys=new Set();this.images=[];this.ready=0;this.failures=0;
  for(let i=0;i<36;i++){const im=new Image();im.onload=()=>this.ready++;im.onerror=()=>this.failures++;const file=`heisenberg/walk-${String(i).padStart(2,'0')}.png`;im.src=window.COPENHAGEN_ASSETS?.[file]||`assets/${file}`;this.images.push(im);}
  this.idle=new Image();this.idle.onload=()=>this.ready++;this.idle.onerror=()=>this.failures++;this.idle.src=window.COPENHAGEN_ASSETS?.['heisenberg/idle.png']||'assets/heisenberg/idle.png';
  const r=rand(194109);this.stars=Array.from({length:160},()=>({x:r()*2200,y:45+r()*370,r:r()<.82?.8:1.5,a:.25+r()*.55}));
  this.buildings=Array.from({length:15},(_,i)=>({x:1520+i*195,w:178+r()*42,h:370+r()*170,t:i%4,tone:i%3}));
  this.crowd=Array.from({length:28},(_,i)=>({x:80+i*46+(r()-.5)*30,y:728-(i%3)*13,scale:.77+r()*.18,soldier:i%2===0,direction:i%3===0?-1:1,offset:r()*6,walking:i%4===0}));
  this.leaves=Array.from({length:64},()=>({x:r()*1500,y:r()*450,t:r()*6,size:2+r()*4}));
  this.resize();this.reset();
  addEventListener('resize',()=>this.resize());addEventListener('blur',()=>this.keys.clear());
 }
 resize(){this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(innerWidth*this.dpr);this.canvas.height=Math.round(innerHeight*this.dpr);this.scale=innerHeight/900;this.width=innerWidth/this.scale;this.height=900;}
 reset(){this.active=false;this.state='waiting';this.x=450;this.speed=0;this.face=1;this.clock=0;this.age=0;this.walkFrame=11;this.walking=false;this.stopAge=0;this.zone='station';this.keys.clear();this.events={cafe:false,door:false,bell:false};this.cafeAt=0;this.doorAt=0;this.bellAge=0;this.canvas.hidden=true;this.refreshUI();}
 start(){this.reset();this.active=true;this.state='entering';this.canvas.hidden=false;this.options.sound?.start();this.refreshUI();}
 stop(){this.options.sound?.stop();this.reset();}
 release(){this.keys.clear();}
 input(code,down){if(!['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(code))return false;if(down)this.keys.add(code);else this.keys.delete(code);return true;}
 ground(x){let rise=0;for(let i=0;i<8;i++)rise+=12*ease((x-(8050+i*55-22))/44);return 746-rise;}
 canRing(){return this.active&&this.state==='walking'&&this.x>=8560;}
 interact(){if(!this.canRing())return false;this.state='ringing';this.bellAge=0;this.speed=0;this.walking=false;this.keys.clear();this.options.sound?.fadeOut?.(1.2);this.refreshUI();return true;}
 doorVisible(){const sx=this.width/2+(3220-this.x)*.95;return sx-43<=this.width&&sx+43>=0;}
 getZone(){return this.x<1550?'station':this.x<4300?'city':this.x<6300?'industrial':this.x<8000?'garden':'house';}
 refreshUI(){const zh=this.options.language?.()==='zh',controls=document.getElementById('walk-controls'),prompt=document.getElementById('bell-prompt');if(!controls)return;
  controls.hidden=!this.active||this.state==='ringing'||this.state==='ended';controls.style.opacity=this.age>10?'.32':'1';
  document.getElementById('bell-action').textContent=zh?'按门铃':'Ring the bell';prompt.hidden=!this.canRing();
  this.canvas.setAttribute('aria-label',zh?'第一幕：用方向键或 A、D 穿过哥本哈根，到玻尔家按门铃。':'Act I: use the arrow keys or A and D to walk across Copenhagen and ring Bohr’s doorbell.');
 }
 update(dt){if(!this.active)return;this.clock+=dt;this.age+=dt;
  if(this.state==='entering'&&this.age>=2)this.state='walking';
  if(this.state==='ringing'||this.state==='ended'){
   this.bellAge+=dt;if(this.bellAge>=.9&&!this.events.bell){this.events.bell=true;this.options.onBell?.();this.options.sound?.trigger('bell');}
   if(this.bellAge>=1.1)this.state='ended';this.refreshUI();return;
  }
  const input=this.state==='walking'?Number(this.keys.has('ArrowRight')||this.keys.has('KeyD'))-Number(this.keys.has('ArrowLeft')||this.keys.has('KeyA')):0;
  const target=input*125;this.speed=mix(this.speed,target,1-Math.exp(-dt*10));if(Math.abs(this.speed)<.6)this.speed=0;
  if(input)this.face=input;
  const oldx=this.x;this.x=clamp(this.x+this.speed*dt,450,8620);if(this.x===oldx&&!input)this.speed=0;if((this.x===450&&this.speed<0)||(this.x===8620&&this.speed>0))this.speed=0;
  this.walking=Math.abs(this.speed)>2;
  if(this.walking){this.walkFrame=(this.walkFrame+dt*30*Math.abs(this.speed)/125)%36;this.stopAge=0;}else this.stopAge+=dt;
  const z=this.getZone();if(z!==this.zone){this.zone=z;this.options.onZone?.(z);}
  if(this.x>2360&&!this.events.cafe){this.events.cafe=true;this.cafeAt=this.clock;this.options.sound?.trigger('cafe');}
  if(this.doorVisible()&&!this.events.door){this.events.door=true;this.doorAt=this.clock;this.options.sound?.trigger('door',clamp((this.width/2+(3220-this.x)*.95)/(this.width/2)-1,-1,1));}
  this.options.sound?.update(dt,{x:this.x,speed:this.speed,zone:this.zone});this.refreshUI();
 }
 at(x,p,draw,padding=500){const sx=this.width/2+(x-this.x)*p;if(sx<-padding||sx>this.width+padding)return;this.c.save();this.c.translate(sx,0);draw(this.c);this.c.restore();}
 sky(){const c=this.c;rect(c,0,0,this.width,900,ink.sky);rect(c,0,420,this.width,250,'#14212a');rect(c,0,570,this.width,200,'#1c2a31');for(const s of this.stars){const x=((s.x-this.x*.035)%2200+2200)%2200;c.globalAlpha=s.a;rect(c,x,s.y,s.r,s.r,'#b8c5ca');}c.globalAlpha=1;const mx=this.width*.8-this.x*.008;circle(c,mx,150,22,'#aab6b5');circle(c,mx-8,143,21,ink.sky);
  for(let i=-2;i<30;i++){const x=i*180;this.at(x,.18,cc=>{const h=80+(i*73%120+120)%120;poly(cc,[[-90,560],[-90,560-h],[-35,534-h],[15,557-h],[15,570-h],[85,570-h],[85,570]],'#202e36');},220);}
  this.at(3020,.30,cc=>this.tower(cc,0,520,.78,'#2b383f'),350);this.at(5960,.38,cc=>this.church(cc),350);
 }
 tower(c,x,y,s=1,color=ink.stone){c.save();c.translate(x,y);c.scale(s,s);rect(c,-38,-275,76,275,color);rect(c,-45,-295,90,24,color);rect(c,-30,-342,60,51,color);poly(c,[[-39,-342],[0,-402],[39,-342]],'#18262e');rect(c,-3,-433,6,36,'#34434a');circle(c,0,-253,23,'#89918b');circle(c,0,-253,20,'#26343d');for(let i=0;i<12;i++){const a=i*Math.PI/6;line(c,Math.sin(a)*16,-253+Math.cos(a)*16,Math.sin(a)*19,-253+Math.cos(a)*19,'#9da298',1.5);}line(c,0,-253,0,-267,'#b3b7a7',2);line(c,0,-253,11,-249,'#b3b7a7',2);arch(c,-11,-207,22,64,'#17252e');rect(c,-46,-8,92,8,'#35434b');c.restore();}
 church(c){rect(c,-140,450,280,178,'#2c373b');poly(c,[[-161,450],[0,362],[159,450]],'#1e2b33');rect(c,40,345,65,235,'#303d42');poly(c,[[30,345],[72,193],[115,345]],'#223139');line(c,72,176,72,216,'#44525a',3);line(c,61,189,83,189,'#44525a',2);arch(c,57,390,29,60,'#17262e');for(let i=0;i<5;i++)arch(c,-115+i*48,492,22,62,'#1a2930');}
 station(c){const base=700;rect(c,-580,365,1160,base-365,'#3c3639');rect(c,-590,359,1180,18,'#55454a');poly(c,[[-610,359],[-565,266],[565,266],[610,359]],'#252731');rect(c,-567,263,1134,8,'#535052');for(let i=-5;i<=5;i++){rect(c,i*103-4,370,8,320,'#514246');arch(c,i*103-38,445,76,179,'#17232a');arch(c,i*103-31,452,62,163,'#263239');rect(c,i*103-31,530,62,85,'#121e25');line(c,i*103,461,i*103,615,'#52606a',3);}
  rect(c,-122,293,244,152,'#483d40');poly(c,[[-143,296],[0,200],[143,296]],'#28313b');poly(c,[[-120,295],[0,218],[120,295]],'#514346');circle(c,0,281,24,'#a3997c');circle(c,0,281,21,'#273039');line(c,0,281,0,265,'#cabf9d',2);line(c,0,281,12,285,'#cabf9d',2);text(c,'KØBENHAVNS HOVEDBANEGÅRD',0,404,17,'#9b8d7a');
  for(const x of [-525,525]){rect(c,x-30,253,60,165,'#514047');poly(c,[[x-45,255],[x,185],[x+45,255]],'#28303a');rect(c,x-3,165,6,30,'#4a555b');arch(c,x-12,291,24,42,'#1c2931');}
  rect(c,-665,592,1330,9,'#121f26');poly(c,[[-695,590],[-630,550],[630,550],[695,590]],'#27343b');for(let x=-620;x<=620;x+=155){rect(c,x,595,7,125,'#152229');line(c,x,604,x+36,578,'#152229',5);}
  rect(c,-640,699,1280,26,'#4b4b4a');for(let x=-600;x<650;x+=100)rect(c,x,703,66,2,'#73716a');
  this.stationLamp(c,-435,733);this.stationLamp(c,430,733);
 }
 stationLamp(c,x,y){rect(c,x-3,y-188,6,188,'#16222a');rect(c,x-20,y-192,40,8,'#152027');rect(c,x-11,y-185,22,32,'#746854');rect(c,x-8,y-183,16,27,'#ae996f');poly(c,[[x-25,y-192],[x,y-207],[x+25,y-192]],'#142128');}
 train(c){rect(c,-650,464,1040,203,'#1c292f');rect(c,-655,454,1050,22,'#162129');for(let x=-620;x<340;x+=101){rect(c,x,489,68,68,'#3a4546');rect(c,x+4,493,60,59,'#19262c');rect(c,x+5,571,58,2,'#56615d');}for(let x=-565;x<350;x+=220){circle(c,x,670,27,'#101b22');circle(c,x,670,12,'#344048');}line(c,-650,702,440,702,'#626460',3);rect(c,-560,390,105,50,'#27363d');text(c,'KØBENHAVN H',-508,421,15,'#b1b5ab');}
 building(c,b){const y=707,h=b.h,w=b.w;const colors=['#3d363b','#343c41','#443b3c'];rect(c,-w/2,y-h,w,h,colors[b.tone]);rect(c,-w/2-4,y-h, w+8,9,'#5c5050');if(b.t%2===0)poly(c,[[-w/2-9,y-h],[0,y-h-78],[w/2+9,y-h]],'#252b34');else{poly(c,[[-w/2-8,y-h],[-w/2+14,y-h-50],[w/2-14,y-h-50],[w/2+8,y-h]],'#232d36');rect(c,w*.24,y-h-71,18,41,'#423c41');}const cols=3,rows=Math.max(2,Math.floor((h-70)/69));windows(c,-w/2+23,y-h+29,cols,rows,23,38,(w-52)/3,64);rect(c,-w/2+8,y-72,w-16,7,'#53474a');rect(c,-w/2+17,y-59,45,59,'#192329');rect(c,w/2-58,y-61,39,61,'#1a242b');rect(c,w/2-54,y-56,31,47,'#263139');line(c,w/2-35,y-56,w/2-35,y-8,'#41474a',2);rect(c,-w/2,704,w,12,'#4e4b4b');
  for(let i=0;i<6;i++)line(c,-w/2+4,y-h+13+i*46,w/2-4,y-h+13+i*46,'#4b4145',1);
 }
 cafe(c){rect(c,-125,435,250,276,'#484044');poly(c,[[-138,435],[-106,392],[106,392],[138,435]],'#232f38');windows(c,-86,466,3,1,26,43,76,64);rect(c,-136,561,272,28,'#18282c');text(c,'CAFÉ  ·  ØSTER',0,581,15,'#999386');const lit=this.events.cafe?1-ease((this.clock-this.cafeAt)/1.25):1;
  for(const x of [-105,23]){rect(c,x,600,83,100,'#111e25');if(lit>0){c.globalAlpha=lit;rect(c,x+5,605,73,89,'#b19461');rect(c,x+5,655,73,39,'#806d4d');poly(c,[[x+12,693],[x+38,663],[x+59,694]],'#4f4c40');c.globalAlpha=1;}rect(c,x+39,600,4,100,'#3b4141');}rect(c,-16,595,31,115,'#17242a');circle(c,8,659,2,'#827563');if(lit>0){c.globalAlpha=lit*.18;poly(c,[[-100,713],[99,713],[189,750],[-189,750]],'#b29d70');c.globalAlpha=1;}}
 doorway(c){rect(c,-96,435,192,279,'#3c3c41');windows(c,-70,465,2,2,31,40,103,65);arch(c,-35,603,70,111,'#18232b');const u=this.events.door?ease((this.clock-this.doorAt)/1):0;if(u<1){rect(c,-27,636,53,77,'#555a51');this.person(c,3+u*8,712,.42,false,0,'#293136');}rect(c,-29,635,58*u,78,'#27333b');rect(c,-32,632,64,4,'#565657');if(u>.9)circle(c,19,678,2,'#8e876e');}
 lamp(c){rect(c,-3,564,6,175,'#131f27');poly(c,[[-14,563],[-10,538],[10,538],[14,563]],'#26343c');rect(c,-10,539,20,23,'#45504c');poly(c,[[-18,538],[0,527],[18,538]],'#19262c');}
 industry(c,index){const x=0;const h=175+(index%3)*38,w=285;rect(c,-w/2,715-h,w,h,index%2?'#35393d':'#41373a');poly(c,[[-w/2-12,715-h],[-w/2+10,676-h],[w/2-10,676-h],[w/2+12,715-h]],'#202c34');for(let row=0;row<2;row++)for(let k=0;k<6;k++){rect(c,-116+k*42,745-h+row*55,28,34,'#202d33');line(c,-102+k*42,745-h+row*55,-102+k*42,779-h+row*55,'#4b5051',2);line(c,-116+k*42,763-h+row*55,-88+k*42,763-h+row*55,'#4b5051',2);}rect(c,-44,642,89,73,'#17262e');for(let k=-37;k<42;k+=9)line(c,k,646,k,712,'#303e44',2);rect(c,-w/2,708,w,8,'#555055');if(index%2===0){rect(c,60,286,34,715-h-286,'#493d40');rect(c,56,280,42,12,'#5a484a');for(let y=300;y<490;y+=19)rect(c,60,y,34,2,'#574649');}}
 freight(c){
  rect(c,-128,478,11,261,'#213138');rect(c,105,478,11,261,'#213138');rect(c,-143,465,278,16,'#364349');line(c,-124,481,-85,520,'#53605d',4);line(c,110,481,70,520,'#53605d',4);line(c,12,481,12,607,'#7b7c70',2);line(c,12,607,1,619,'#7b7c70',3);line(c,1,619,-4,607,'#7b7c70',3);
  for(const[x,y,w,h]of[[-111,691,63,44],[-42,684,74,51],[39,699,58,36],[-71,649,57,34]]){rect(c,x,y,w,h,'#4d4b41');rect(c,x+4,y+4,w-8,h-8,'#353b35');line(c,x+4,y+4,x+w-4,y+h-4,'#6b6654',3);line(c,x+w-4,y+4,x+4,y+h-4,'#6b6654',3);}
  line(c,-184,738,178,738,'#797a6b',2);line(c,-184,754,178,754,'#535e59',2);for(let x=-175;x<180;x+=24)rect(c,x,740,8,12,'#42483f');
 }
 cart(c){circle(c,-65,737,25,'#101d24');circle(c,48,737,25,'#101d24');for(const x of [-65,48]){circle(c,x,737,20,'#394248');for(let i=0;i<6;i++){const a=i*Math.PI/3;line(c,x,737,x+Math.cos(a)*19,737+Math.sin(a)*19,'#14232b',2);}}rect(c,-100,678,166,42,'#3b3836');for(let i=0;i<5;i++)rect(c,-97,681+i*7,159,3,'#514743');line(c,64,704,151,710,'#615347',4);poly(c,[[156,676],[206,671],[239,690],[221,710],[166,706]],'#3e3c38');poly(c,[[215,683],[229,648],[243,632],[251,647],[244,681],[231,696]],'#3e3c38');line(c,170,702,162,746,'#373633',7);line(c,213,702,215,746,'#373633',7);line(c,163,679,145,709,'#292a2a',5);line(c,225,672,167,686,'#747064',2);}
 tree(c,x,y,s,kind=0){c.save();c.translate(x,y);c.scale(s,s);rect(c,-7,-185,14,185,'#182a2d');line(c,0,-135,-61,-203,'#203032',8);line(c,0,-97,66,-177,'#203032',8);line(c,1,-160,24,-241,'#203032',6);const tones=kind?['#2f3b38','#35403a','#414238']:['#243934','#2b3c35','#354238'];for(let i=0;i<7;i++){const a=i*2.3;const tx=Math.sin(a)*66,ty=-198+Math.cos(a)*38;poly(c,[[tx-44,ty-6],[tx-31,ty-41],[tx+2,ty-62],[tx+39,ty-43],[tx+58,ty-13],[tx+34,ty+25],[tx-14,ty+38]],tones[i%3]);}c.restore();}
 gardens(){for(let i=0;i<22;i++){const x=6410+i*91;this.at(x,.62,c=>this.tree(c,0,694,.8+(i%4)*.17,i%2),220);}for(let i=0;i<14;i++){const x=6580+i*117;this.at(x,1,c=>{rect(c,-58,711,117,21,'#424c46');rect(c,-58,706,117,6,'#656b5b');for(let j=-48;j<60;j+=20){rect(c,j,645,3,63,'#24332f');circle(c,j+1,644,3,'#536054');}line(c,-58,656,59,656,'#3c4b42',3);},130);}for(const x of [6490,6920,7300,7770])this.at(x,.97,c=>this.tree(c,0,734,1.05,1),250);}
 villa(c){c.save();c.translate(0,650);c.scale(1.65,1.65);c.translate(0,-650);const y=650;rect(c,-295,380,590,270,'#636965');rect(c,-308,368,616,17,'#8b8c7c');poly(c,[[-321,369],[-274,325],[274,325],[321,369]],'#384849');rect(c,-283,391,566,7,'#7a8073');rect(c,-285,515,570,10,'#7c8175');rect(c,-301,642,602,14,'#878778');for(let i=-2;i<=2;i++){if(i===0)continue;const x=i*101;rect(c,x-27,416,54,72,'#858679');rect(c,x-22,422,44,62,'#263937');line(c,x,422,x,484,'#556259',3);line(c,x-22,453,x+22,453,'#556259',3);arch(c,x-27,547,54,86,'#89897a');arch(c,x-22,551,44,79,'#253735');}
  rect(c,-76,380,152,262,'#787d70');poly(c,[[-100,380],[0,304],[100,380]],'#929080');poly(c,[[-72,370],[0,322],[72,370]],'#535f59');rect(c,-83,385,166,12,'#939382');for(const x of [-70,60]){rect(c,x,405,12,231,'#999785');rect(c,x-4,402,20,10,'#aaa18a');rect(c,x-3,630,19,12,'#aaa18a');}arch(c,-38,518,76,124,'#1d302e');arch(c,-31,525,62,118,'#35433c');rect(c,-26,562,52,77,'#293b34');line(c,0,564,0,640,'#5a6657',2);circle(c,16,605,3,'#b2a279');rect(c,51,583,9,15,'#a69775');circle(c,55,590,2,'#d0bb8b');windows(c,-23,435,1,1,46,56,40,60,'#283a37');
  for(const x of [-235,235]){rect(c,x-16,623,32,20,'#8a8c79');poly(c,[[x-23,603],[x+23,603],[x+14,625],[x-14,625]],'#727f6d');this.shrub(c,x,600,32);}
  c.restore();
 }
 shrub(c,x,y,s){poly(c,[[x-s,y],[x-s*.8,y-s],[x,y-s*1.55],[x+s*.8,y-s],[x+s,y]],'#2e453a');}
 stairs(c){for(let i=0;i<8;i++){const xx=8050+i*55;this.at(xx,1,cc=>{const yy=746-(i+1)*12;rect(cc,0,yy,55,900-yy,'#49534d');rect(cc,0,yy,55,3,'#818172');rect(cc,0,yy+3,3,9,'#2e4039');},100);}this.at(8490,1,cc=>{rect(cc,0,650,900,250,'#4a554d');rect(cc,0,650,900,4,'#7d8271');},1000);this.at(8015,1,cc=>{rect(cc,-23,662,39,89,'#58645b');rect(cc,-27,656,47,10,'#7c8373');},90);this.at(8500,1,cc=>{rect(cc,-17,563,34,92,'#626d60');rect(cc,-23,557,46,10,'#969680');},90);line(c,this.width/2+8040-this.x,660,this.width/2+8490-this.x,563,'#737f6e',6);}
 person(c,x,y,s,soldier=false,walk=0,color='#26343a',face=1){c.save();c.translate(x,y);c.scale(s*face,s);const a=Math.sin(walk)*15;line(c,-7,-54,-9+a,0,'#151f26',13);line(c,9,-54,8-a,0,'#1b272d',13);poly(c,[[-23,-145],[14,-148],[27,-68],[17,-51],[-25,-51]],soldier?'#45514c':color);line(c,-20,-135,-26-a*.3,-79,soldier?'#394842':color,12);line(c,16,-131,24+a*.4,-83,soldier?'#45534c':color,12);circle(c,4,-162,14,'#8e897a');if(soldier){arch(c,-13,-187,35,27,'#405149');rect(c,-17,-166,43,5,'#283a35');rect(c,-24,-88,47,6,'#1b2926');line(c,23,-137,31,-49,'#182925',5);}else{rect(c,-15,-177,37,5,'#14232b');poly(c,[[-11,-179],[-8,-192],[15,-192],[18,-177]],'#1c2c33');}c.restore();}
 hero(){const c=this.c,x=this.width/2,y=this.ground(this.x);let im=this.walking?this.images[Math.floor(this.walkFrame)%36]:this.idle;c.save();c.translate(x,y);c.scale(this.face*.84,.84);if(im.complete&&im.naturalWidth){c.filter='brightness(0.78) saturate(0.65)';c.drawImage(im,-75,-235,150,250);c.filter='none';}else this.person(c,0,0,1.18,false,this.walking?this.clock*8:0,'#303b41');c.restore();}
 foreground(){const c=this.c;const garden=this.x>6100;for(const l of this.leaves){let xx=((l.x+this.clock*(garden?24:12)-this.x*1.1)%1500+1500)%1500;let yy= garden?470+(l.y+this.clock*11)%420:785+(l.y%93);if(xx>this.width)continue;poly(c,[[xx,yy],[xx+l.size,yy-2],[xx+l.size*1.6,yy+2],[xx+2,yy+3]],garden?'#797152':'#655e4a');}}
 draw(){if(!this.active)return;const c=this.c;c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,0);c.globalAlpha=1;this.sky();
  this.at(435,.78,cc=>this.station(cc),1150);this.at(-400,.9,cc=>this.train(cc),850);
  for(const b of this.buildings)if(Math.abs(b.x-2410)>150&&Math.abs(b.x-3220)>120)this.at(b.x,.95,cc=>this.building(cc,b),250);
  this.at(2410,.95,cc=>this.cafe(cc),230);this.at(3220,.95,cc=>this.doorway(cc),220);
  for(let i=0;i<7;i++)this.at(4520+i*265,.9,cc=>this.industry(cc,i),330);
  this.gardens();for(const x of [9080,9220,9370])this.at(x,.75,cc=>this.tree(cc,0,686,1.5,1),300);this.at(8580,.98,cc=>this.villa(cc),720);
  rect(c,0,739,this.width,161,ink.road);rect(c,0,739,this.width,8,'#505454');rect(c,0,753,this.width,3,'#1e2b31');rect(c,0,786,this.width,6,'#343c3f');for(let i=-2;i<32;i++){const x=i*90;const sx=((x-this.x*.95)%1800+1800)%1800;line(c,sx,750,sx+38,750,'#6a6960',2);}
  this.groundDetails?.();if(this.x>7600)this.stairs(c);
  this.roadside?.();
  for(const person of this.crowd)this.at(person.x+(person.walking?Math.sin(this.clock*.14+person.offset)*55:0),1,cc=>this.person(cc,0,person.y,person.scale,person.soldier,person.walking?this.clock*4+person.offset:0,'#354149',person.direction),120);
  this.at(5330,1,cc=>this.freight(cc),240);this.at(5780,1,cc=>this.cart(cc),400);
  for(const x of [1760,2870,3880,4720,6100])this.at(x,1,cc=>this.lamp(cc),100);
  this.hero();this.foreground();
  const blackout=this.state==='ringing'||this.state==='ended'?ease(this.bellAge/.85):1-ease(this.age/2);if(blackout>0){c.globalAlpha=blackout;rect(c,0,0,this.width,900,'#000');c.globalAlpha=1;}
 }
 get snapshot(){return {active:this.active,state:this.state,x:this.x,speed:this.speed,direction:this.face,zone:this.zone,cameraX:this.x,screenX:this.width/2,walkFrame:Math.floor(this.walkFrame),ground:this.ground(this.x),ready:this.ready,failures:this.failures,canRing:this.canRing(),events:{...this.events},blackout:this.state==='ended'?1:this.state==='ringing'?ease(this.bellAge/.85):1-ease(this.age/2)};}
}
window.CityAct=CityAct;
})();
