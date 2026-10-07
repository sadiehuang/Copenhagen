/* Inked scenery with restrained material detail; world positions stay in CityAct. */
(() => {
'use strict';
const P=window.CityAct.prototype,old={};
for(const name of ['sky','station','train','cafe','doorway','villa','stairs','freight','cart','hero','foreground'])old[name]=P[name];
const R=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
const L=(c,x,y,u,v,color='#20262a',w=.8)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();};
function shape(c,pts,color,stroke='#1d2228',width=.9){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function foliage(c,pts,color){const first=pts[0],last=pts[pts.length-1];c.beginPath();c.moveTo((first[0]+last[0])/2,(first[1]+last[1])/2);for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];c.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}c.closePath();c.fillStyle=color;c.fill();}
function oval(c,x,y,rx,ry,color){c.save();c.translate(x,y);c.scale(rx,ry);c.fillStyle=color;c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();c.restore();}
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function stone(c,x,y,w,h,tone,seed=9){R(c,x,y,w,h,tone);const r=rng(seed);for(let i=0;i<w*h/240;i++){const a=x+r()*w,b=y+r()*h;R(c,a,b,Math.min(2+r()*9,x+w-a),.4+r()*1.2,i%3?'#ffffff09':'#05090e19');}L(c,x,y,x+w,y,'#9b979053');L(c,x,y,x,y+h,'#8b837347');L(c,x+w,y,x+w,y+h,'#11192075',2);}
function bricks(c,x,y,w,h,tone,seed=3,bw=21,bh=8){R(c,x,y,w,h,tone);const r=rng(seed);for(let row=0;row<h/bh;row++){const yy=y+row*bh,off=row%2?bw/2:0;for(let col=-1;col<=w/bw;col++){const xx=x+col*bw+off,left=Math.max(x,xx),right=Math.min(x+w,xx+bw-1);if(right<=left)continue;const hh=Math.min(bh-1,y+h-yy);R(c,left+.5,yy+.7,right-left,hh,['#97908013','#171d2420','#b5937311','#0a141118'][Math.floor(r()*4)]);if(r()>.42)L(c,left,yy+hh,right,yy+hh,'#82735f33',.5);if(xx>x&&xx<x+w)L(c,xx,yy+1,xx,yy+hh,'#151b243a',.55);}}}
function sill(c,x,y,w){R(c,x-5,y,w+10,3,'#81796b');R(c,x-3,y+3,w+7,3,'#292c30');L(c,x-4,y,x+w+4,y,'#a298804b',.7);}
function windowDetail(c,x,y,w,h,{shutter=false,stonework=true}={}){
 if(stonework){R(c,x-3,y-4,w+6,h+7,'#514e49');R(c,x-5,y-5,w+10,3,'#686257');}
 R(c,x,y,w,h,'#111b21');R(c,x+2,y+2,w-4,h-4,'#182128');shape(c,[[x+2,y+2],[x+w-3,y+2],[x+w-3,y+h-4],[x+w-7,y+h-4],[x+w-10,y+5],[x+3,y+5]],'#222b2f',null);
 L(c,x+2,y+2,x+2,y+h-2,'#6d78714d',1);L(c,x+w-2,y+2,x+w-2,y+h-2,'#070e16',1.5);L(c,x+w/2,y,x+w/2,y+h,'#414c4c',1.7);L(c,x,y+h*.51,x+w,y+h*.51,'#414a48',1.5);
 for(let k=0;k<2;k++)L(c,x+4+k*w/2,y+5,x+4+k*w/2,y+h*.45,'#62716c24',1);
 sill(c,x,y+h+1,w);
 if(shutter)for(const sx of[x-w*.32-4,x+w+4]){R(c,sx,y,w*.3,h,'#293433');for(let yy=y+4;yy<y+h;yy+=4)L(c,sx+2,yy,sx+w*.3-2,yy,'#566058',.65);}
}
function arch(c,x,y,w,h,color){c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,Math.PI*2);c.lineTo(x+w,y+h);c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#171e23';c.lineWidth=.9;c.stroke();}
function archTrim(c,x,y,w,h){arch(c,x-5,y-5,w+10,h+5,'#686456');arch(c,x,y,w,h,'#152028');const cy=y+w/2,cx=x+w/2;for(let i=0;i<=10;i++){const a=Math.PI+i*Math.PI/10;L(c,cx+Math.cos(a)*w/2,cy+Math.sin(a)*w/2,cx+Math.cos(a)*(w/2+5),cy+Math.sin(a)*(w/2+5),'#262b2d',.7);}sill(c,x,y+h,w);}
function roof(c,x,y,w,h,color='#29323b'){shape(c,[[x-8,y+h],[x+14,y],[x+w-14,y],[x+w+8,y+h]],color,'#151f28',1.4);for(let yy=5;yy<h;yy+=7){const left=x+14-22*yy/h,right=x+w-14+22*yy/h;L(c,left,y+yy,right,y+yy,'#68716c33',.6);for(let xx=left+8+(yy%2)*6;xx<right;xx+=20)L(c,xx,y+yy,xx-2,y+yy+5,'#10192355',.6);}L(c,x-8,y+h,x+w+8,y+h,'#8a817254',1);}
function panelDoor(c,x,y,w,h,color='#303734'){stone(c,x,y,w,h,color,13);for(const yy of[y+8,y+h*.52])for(const xx of[x+5,x+w*.52]){R(c,xx,yy,w*.38,h*.36,'#1b282a');L(c,xx+1,yy+1,xx+w*.37,yy+1,'#78806d66',.8);L(c,xx+1,yy+1,xx+1,yy+h*.35,'#77816e44',.8);}L(c,x+w/2,y,x+w/2,y+h,'#101c22',1.5);oval(c,x+w*.78,y+h*.58,2,2.8,'#a99b76');}
P.paintCached=function(c,key,bounds,paint){
 if(typeof document.createElement!=='function'){paint(c);return;}
 this.artCache??=new Map();let item=this.artCache.get(key);
 if(!item){const [x,y,w,h]=bounds,scale=1.5,canvas=document.createElement('canvas');canvas.width=Math.ceil(w*scale);canvas.height=Math.ceil(h*scale);const ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,-x*scale,-y*scale);paint(ctx);item={canvas,x,y,w,h};this.artCache.set(key,item);if(this.artCache.size>48)this.artCache.delete(this.artCache.keys().next().value);}
 c.drawImage(item.canvas,item.x,item.y,item.w,item.h);
};
P.station=function(c){this.paintCached(c,'station',[-720,150,1440,590],cc=>{
 bricks(cc,-580,365,1160,335,'#423b3c',77,22,8);roof(cc,-565,266,1130,93,'#292d34');
 for(let i=-5;i<=5;i++){const x=i*103;stone(cc,x-6,369,12,330,'#5b514a',i+30);R(cc,x-10,369,20,9,'#746658');archTrim(cc,x-38,445,76,179);arch(cc,x-31,452,62,163,'#1d2a30');L(cc,x,453,x,615,'#687571',2);for(let yy=478;yy<615;yy+=27)L(cc,x-29,yy,x+29,yy,'#424f51',1.6);R(cc,x-30,533,28,81,'#152128');R(cc,x+2,533,28,81,'#1b282d');sill(cc,x-40,626,80);}
 stone(cc,-590,359,1180,13,'#726458',5);L(cc,-590,375,590,375,'#151e27',3);
 bricks(cc,-122,293,244,150,'#524447',23,20,8);shape(cc,[[-143,296],[0,200],[143,296]],'#62524c','#181f28',1.7);shape(cc,[[-124,289],[0,211],[124,289]],'#453b3d','#998274',1);for(let yy=239;yy<285;yy+=9){const half=(yy-211)*124/78;L(cc,-half,yy,half,yy,'#82716644');}
 oval(cc,0,281,26,26,'#302c2e');oval(cc,0,281,23,23,'#ae9c75');oval(cc,0,281,20.5,20.5,'#253039');for(let i=0;i<12;i++){const a=i*Math.PI/6;L(cc,Math.sin(a)*16,281+Math.cos(a)*16,Math.sin(a)*19,281+Math.cos(a)*19,'#b2a888',1);}L(cc,0,281,0,265,'#d0c19a',1.8);L(cc,0,281,12,285,'#d0c19a',1.8);
 stone(cc,-208,390,416,24,'#322f31',7);cc.font='15px Georgia, serif';cc.textAlign='center';cc.fillStyle='#aea18a';cc.fillText('KØBENHAVNS HOVEDBANEGÅRD',0,407);
 for(const x of[-525,525]){bricks(cc,x-30,253,60,165,'#564349',x+1000,16,7);shape(cc,[[x-45,255],[x,185],[x+45,255]],'#28313b','#181e24',1.5);L(cc,x,186,x+28,255,'#74756866');R(cc,x-2,164,4,26,'#718080');archTrim(cc,x-12,291,24,42);for(let yy=345;yy<408;yy+=18)R(cc,x-30,yy,60,2,'#766456');}
 shape(cc,[[-695,590],[-630,550],[630,550],[695,590]],'#29353c','#172128',2);for(let x=-625;x<625;x+=47)L(cc,x,551,x*1.075,589,'#76817c44',1);R(cc,-695,590,1390,9,'#121d25');L(cc,-691,590,691,590,'#89908366',1.4);
 for(let x=-620;x<=620;x+=155){R(cc,x,597,7,122,'#152128');L(cc,x+5,598,x+5,717,'#87918a44',1);L(cc,x+2,609,x+38,582,'#18252c',4);L(cc,x+2,609,x-28,587,'#18252c',3);}
 stone(cc,-640,700,1280,25,'#57564f',5);for(let x=-640;x<640;x+=73)L(cc,x,702,x,722,'#2e3436',.8);this.stationLamp(cc,-435,733);this.stationLamp(cc,430,733);
 });};
P.building=function(c,b){const w=b.w,h=b.h,y=707;this.paintCached(c,`house-${b.x}`,[-w/2-20,y-h-91,w+40,h+111],cc=>{
 const top=y-h;if(b.tone===1)stone(cc,-w/2,top,w,h,'#454747',b.x);else bricks(cc,-w/2,top,w,h,b.tone?'#514343':'#493d3f',b.x);
 if(b.t%2===0){shape(cc,[[-w/2-8,top],[0,top-78],[w/2+8,top]],'#35363d','#131c25',1.6);L(cc,-w/2,top,0,top-68,'#8b7b6a55',2);L(cc,0,top-68,w/2,top,'#8b7b6a55',2);windowDetail(cc,-11,top-40,22,24,{stonework:false});}
 else{roof(cc,-w/2,top-50,w,50);bricks(cc,w*.24,top-72,18,40,'#514146',31,9,6);R(cc,w*.24-3,top-74,24,5,'#787061');}
 R(cc,-w/2-4,top,w+8,5,'#7b6e5e');R(cc,-w/2-2,top+5,w+4,5,'#25262c');for(let xx=-w/2+9;xx<w/2;xx+=17)R(cc,xx,top+7,5,5,'#847561');
 const upperH=h-215,rows=Math.max(1,Math.round(upperH/125)),gap=upperH/rows;for(let row=0;row<rows;row++)for(let col=0;col<3;col++)windowDetail(cc,-w/2+22+col*(w-44)/3,top+gap*(row+.5)-35,28,70,{shutter:b.t===3&&row===0});
 for(let row=1;row<=rows;row++){const yy=top+row*gap;R(cc,-w/2,yy,w,3,'#656058');L(cc,-w/2,yy+3,w/2,yy+3,'#20272d',1);}
 R(cc,-w/2+8,y-211,w-16,6,'#746455');panelDoor(cc,-w/2+17,y-196,66,196);windowDetail(cc,w/2-65,y-176,50,111);
 for(const xx of[-w/2+3,w/2-7]){L(cc,xx,top+14,xx,y,'#1b272c',4);L(cc,xx+1,top+14,xx+1,y,'#6e77745c',1);for(let yy=top+30;yy<y;yy+=62)R(cc,xx-2,yy,6,3,'#41494a');}
 stone(cc,-w/2,704,w,12,'#57544d',3);
 });};
P.cafe=function(c){this.paintCached(c,'cafe-details',[-146,268,292,458],cc=>{
 stone(cc,-130,310,260,401,'#52484a',31);roof(cc,-130,268,260,42);for(let col=0;col<3;col++)windowDetail(cc,-96+col*79,350,32,76);R(cc,-134,471,268,8,'#837360');for(let x=-120;x<130;x+=21)R(cc,x,474,7,9,'#796956');
 R(cc,-142,484,284,27,'#18282c');cc.font='15px Georgia, serif';cc.textAlign='center';cc.fillStyle='#aaa08b';cc.fillText('CAFÉ  ·  ØSTER',0,503);for(const x of[-115,42]){R(cc,x,519,73,181,'#111e25');sill(cc,x-2,701,77);}panelDoor(cc,-31,512,62,199,'#2e3836');L(cc,-129,512,-129,711,'#242b2e',3);L(cc,129,512,129,711,'#242b2e',3);
 });
 const u=this.events.cafe?Math.min(1,(this.clock-this.cafeAt)/1.25):0,lit=1-u*u*(3-2*u);
 for(const x of[-115,42]){if(lit>0){c.save();c.globalAlpha=lit;R(c,x+4,523,65,173,'#b19461');R(c,x+4,636,65,60,'#806d4d');oval(c,x+37,664,26,5,'#504c3d');L(c,x+37,666,x+37,695,'#373d35',3);L(c,x+9,659,x+9,687,'#3e4135',2);L(c,x+59,659,x+59,687,'#3e4135',2);c.restore();}L(c,x+4,523,x+4,696,'#b7a177',1);L(c,x+69,523,x+69,696,'#060f18',2);L(c,x,574,x+73,574,'#403b35',3);L(c,x+37,519,x+37,701,'#3b4141',3);}
 if(lit>0){c.save();c.globalAlpha=lit*.14;shape(c,[[-118,713],[118,713],[200,750],[-200,750]],'#b29d70',null);c.restore();}
};
P.doorway=function(c){this.paintCached(c,'closing-house',[-108,301,216,426],cc=>{
 stone(cc,-96,315,192,399,'#47474a',82);R(cc,-103,306,206,9,'#797266');R(cc,-99,316,198,6,'#272d32');for(let col=0;col<2;col++)windowDetail(cc,-72+col*101,350,43,80);
 for(const x of[-94,81])for(let yy=326;yy<713;yy+=22)stone(cc,x,yy,13,20,'#676259',yy);
 archTrim(cc,-43,512,86,202);arch(cc,-39,518,78,195,'#141e23');R(cc,-49,712,98,6,'#827c6c');R(cc,-52,718,104,4,'#404847');
 });
 const u=this.events.door?Math.min(1,(this.clock-this.doorAt)/1.25):0,close=u*u*(3-2*u);
 if(close<1){arch(c,-38,519,76,194,'#45483f');this.person(c,1+close*8,712,.82,false,0,'#343936');}
 if(close>0){c.save();c.translate(-39,518);c.scale(Math.max(.005,close),1);arch(c,0,0,78,195,'#343c39');panelDoor(c,1,40,76,155,'#343c39');L(c,39,7,39,40,'#152623',1.5);c.restore();}
};
P.industry=function(c,index){const h=300+(index%3)*45,w=285,top=715-h;this.paintCached(c,`factory-${index}`,[-165,185,330,540],cc=>{
 if(index%2===0){bricks(cc,60,205,34,top-205,'#4d4040',91,11,7);R(cc,60,205,5,top-205,'#7b62502b');R(cc,87,205,7,top-205,'#161c2345');stone(cc,56,198,42,12,'#66534b',4);R(cc,60,196,34,4,'#1b2328');for(let yy=226;yy<top;yy+=31)L(cc,59,yy,95,yy,'#1c292c',1.6);}
 bricks(cc,-w/2,top,w,h,index%2?'#414548':'#514144',index+8,22,8);roof(cc,-w/2,top-39,w,39,'#2a3138');
 for(let row=0;row<2;row++)for(let col=0;col<5;col++){const x=-124+col*51,y=top+30+row*107;windowDetail(cc,x,y,39,60,{stonework:false});L(cc,x,y+20,x+39,y+20,'#60675f',1);L(cc,x,y+40,x+39,y+40,'#60675f',1);}
 for(let xx=-140;xx<143;xx+=94){R(cc,xx,top+7,10,h-8,'#61504a');L(cc,xx+8,top+8,xx+8,713,'#23272e',2);}
 panelDoor(cc,-65,490,130,225,'#303c3e');for(let k=-58;k<63;k+=13)L(cc,k,496,k,712,'#78817642',.7);L(cc,-63,493,63,713,'#131e29',2);L(cc,63,493,-63,713,'#131e29',2);R(cc,-69,485,138,7,'#837466');stone(cc,-w/2,708,w,8,'#605b52',32);
 for(let xx=-129;xx<130;xx+=39)oval(cc,xx,top+15,1.1,1.1,'#999281');
 });};
P.tree=function(c,x,y,s,kind=0){c.save();c.translate(x,y);c.scale(s,s);const seed=kind*139+Math.round(s*130);this.paintCached(c,`tree-${seed}`,[-141,-307,282,314],cc=>{
 const r=rng(seed),tones=kind?['#2e3733','#354034','#3c4435','#474a38','#50503a']:['#263731','#2c3b33','#334237','#3b4638','#45503b'];
 shape(cc,[[-10,0],[-5,-121],[-13,-184],[-4,-242],[5,-230],[6,-161],[10,-95],[8,0]],'#29302e','#131f25',1.1);L(cc,-4,-6,-2,-213,'#73736555',1.5);L(cc,4,-18,3,-170,'#080f1855',2);
 for(let k=0;k<9;k++){const yy=-112-k*12,dir=k%2?1:-1,tx=dir*(20+r()*63),ty=yy-23-r()*40;cc.beginPath();cc.moveTo(0,yy+7);cc.bezierCurveTo(tx*.25,yy-6,tx*.7,ty+15,tx,ty);cc.lineTo(tx+dir*5,ty-9);cc.bezierCurveTo(tx*.65,ty+10,tx*.25,yy-16,-1,yy);cc.closePath();cc.fillStyle='#2c3730';cc.fill();cc.strokeStyle='#14232a';cc.lineWidth=.7;cc.stroke();L(cc,tx*.75,ty+8,tx+dir*8,ty-13,'#435047',.8);}
 for(let k=0;k<62;k++){const a=r()*Math.PI*2,rad=Math.sqrt(r()),cx=Math.cos(a)*100*rad,cy=-205+Math.sin(a)*59*rad,size=14+r()*22,pts=[];for(let j=0;j<17;j++){const t=j*Math.PI*2/17,rr=size*(.67+r()*.4);pts.push([cx+Math.cos(t)*rr,cy+Math.sin(t)*rr*.76]);}foliage(cc,pts,tones[k%tones.length]);}
 for(let k=0;k<440;k++){const a=r()*Math.PI*2,rad=Math.sqrt(r()),xx=Math.cos(a)*120*rad,yy=-205+Math.sin(a)*76*rad;const size=1+r()*3;shape(cc,[[xx-size,yy],[xx+size*.2,yy-size],[xx+size,yy+.5],[xx,yy+size*.6]],tones[2+Math.floor(r()*3)],null);if(k%6===0)L(cc,xx-size,yy,xx+size,yy,'#89907733',.5);}
 for(let k=0;k<11;k++){const xx=-8+r()*16;L(cc,xx,0,xx+(r()-.5)*27,5,'#313c30',1);}
 });c.restore();};
P.villa=function(c){this.paintCached(c,'villa',[-544,65,1088,600],cc=>{
 old.villa.call(this,cc);cc.save();cc.translate(0,650);cc.scale(1.65,1.65);cc.translate(0,-650);
 stone(cc,-291,399,202,111,'#666a62',8);stone(cc,89,399,202,111,'#63675f',11);
 for(const x of[-290,276])for(let yy=402;yy<640;yy+=23){stone(cc,x,yy,15,21,'#888578',yy);}
 for(let side of[-1,1]){for(let k=0;k<2;k++){const x=side*(101+k*101);windowDetail(cc,x-22,422,44,62);archTrim(cc,x-22,551,44,79);L(cc,x,560,x,629,'#667363',1.7);L(cc,x-21,594,x+21,594,'#667363',1.7);}}
 stone(cc,-75,398,150,26,'#7d7f6f',6);for(let x=-279;x<285;x+=16)R(cc,x,386,5,7,'#9c9987');L(cc,-305,370,305,370,'#b2aa9466');L(cc,-281,515,281,515,'#303d3455',1.5);
 for(const x of[-70,60]){R(cc,x,412,3,216,'#b1a990');R(cc,x+8,412,4,216,'#546055');for(let j=2;j<10;j+=3)L(cc,x+j,414,x+j,625,'#d0c29e50',.6);}
 R(cc,-53,496,106,145,'#787d70');archTrim(cc,-42,498,84,145);arch(cc,-36,503,72,138,'#34463e');panelDoor(cc,-33,544,66,97,'#34463e');L(cc,0,506,0,642,'#142d27',1.4);arch(cc,-26,513,52,32,'#293c34');L(cc,0,513,0,545,'#82917b',.8);
 for(let xx=-280;xx<289;xx+=41){L(cc,xx,645,xx,654,'#263b3355',.6);}windowDetail(cc,-23,435,46,56);R(cc,51,583,9,15,'#a69775');oval(cc,55,590,2,2,'#d0bb8b');
 roof(cc,-274,326,548,38,'#354341');shape(cc,[[-100,380],[0,304],[100,380]],'#95917e','#25362f',.8);shape(cc,[[-73,371],[0,322],[73,371]],'#5b665b','#c1b49766',1);for(let x=-77;x<78;x+=12)R(cc,x,388,4,6,'#b1a98e');
 cc.restore();
 });};
P.person=function(c,x,y,s,soldier=false,walk=0,color='#30393c',face=1){c.save();c.translate(x,y);c.scale(s*face,s);const a=Math.sin(walk)*11,coat=soldier?'#444b43':color;
 oval(c,0,-1,25,3,'#10192066');shape(c,[[-15,-65],[-1,-63],[-4+a,-9],[-15+a,-6],[-17,-30]],'#273038');shape(c,[[0,-63],[16,-62],[11-a,-7],[0-a,-6],[2,-35]],'#333b3c');
 shape(c,[[-16+a,-12],[-3+a,-11],[5+a,-4],[4+a,0],[-20+a,0]],'#161e23');shape(c,[[-1-a,-10],[11-a,-10],[20-a,-4],[20-a,0],[-3-a,0]],'#1a2226');L(c,-11+a,-56,-10+a,-13,'#66706955',.8);L(c,7-a,-54,5-a,-13,'#89918333',.8);
 shape(c,[[-7,-155],[9,-154],[18,-145],[22,-113],[20,-88],[25,-57],[8,-53],[-2,-58],[-19,-54],[-25,-64],[-22,-114],[-25,-140]],coat,'#151d24',1.1);
 shape(c,[[-22,-138],[-13,-138],[-18,-111],[-17-a*.18,-88],[-27-a*.2,-86],[-31,-104]],soldier?'#353f38':'#2a3337');L(c,-24,-134,-25,-111,'#7c827244',1);
 shape(c,[[14,-140],[22,-137],[29,-106],[26+a*.2,-87],[18+a*.2,-87],[19,-108]],coat);shape(c,[[18+a*.2,-88],[26+a*.2,-88],[26+a*.2,-78],[20+a*.2,-77]],'#827c69');
 shape(c,[[-5,-157],[5,-158],[13,-149],[3,-137]],'#777c70');shape(c,[[-7,-153],[-15,-141],[-6,-129],[0,-138]],'#252e30');shape(c,[[7,-154],[17,-142],[8,-130],[3,-138]],'#596057');L(c,3,-136,4,-60,'#182226',1);L(c,-15,-121,-16,-69,'#747a6e44',1);L(c,12,-91,16,-64,'#111c2655',1.2);
 for(let yy=-124;yy<-70;yy+=13)oval(c,6,yy,1,1.2,'#a1a08b');L(c,-15,-97,-5,-98,'#182327',1.2);L(c,9,-97,18,-96,'#182327',1.2);
 shape(c,[[-5,-176],[5,-179],[13,-174],[13,-170],[17,-165],[13,-163],[12,-153],[6,-149],[-2,-153],[-6,-161]],'#a49982','#20272a',.65);shape(c,[[-6,-173],[0,-178],[8,-177],[5,-169],[-3,-169],[-3,-159],[-7,-163]],'#4e5149',null);L(c,9,-169,13,-168,'#3f4641',.7);L(c,9,-158,13,-158,'#6a675b',.7);oval(c,-1,-165,2.2,3.6,'#8e8774');
 if(soldier){shape(c,[[-12,-171],[-12,-180],[-7,-188],[5,-191],[15,-186],[19,-176],[19,-171]],'#475449');shape(c,[[-16,-172],[21,-172],[22,-168],[8,-169],[-11,-167]],'#303f36');L(c,-7,-185,8,-188,'#85917a66',1);R(c,-23,-86,45,5,'#202d27');R(c,0,-87,5,7,'#6d7663');L(c,24,-134,30,-47,'#222b29',4);R(c,24,-93,4,21,'#514b3e');}
 else{shape(c,[[-12,-180],[-10,-188],[1,-192],[13,-188],[15,-179]],'#263237');shape(c,[[-17,-177],[-11,-182],[15,-181],[23,-177],[20,-174],[-16,-173]],'#1b292f');L(c,-10,-183,12,-183,'#747b6e66',1);}
 c.restore();};
P.freight=function(c){old.freight.call(this,c);for(const[x,y,w,h]of[[-111,691,63,44],[-42,684,74,51],[39,699,58,36],[-71,649,57,34]]){for(let yy=y+6;yy<y+h-3;yy+=7)L(c,x+4,yy,x+w-4,yy,'#8c80634d',.5);for(const xx of[x+3,x+w-4])for(const yy of[y+3,y+h-4])oval(c,xx,yy,1,1,'#c0a783');}for(const x of[-128,105])for(let y=485;y<730;y+=21){oval(c,x+5,y,1.2,1.2,'#829088');}L(c,-138,468,130,468,'#7b878064',1);};
P.cart=function(c){c.save();c.translate(0,746);c.scale(1.35,1.35);c.translate(0,-746);old.cart.call(this,c);for(let i=0;i<5;i++){const y=682+i*7;L(c,-95,y,59,y,'#94816466',.8);for(const x of[-86,53])oval(c,x,y+3,1,1,'#beb08b');}for(const x of[-65,48]){oval(c,x,737,5,5,'#928874');L(c,x-16,721,x+15,752,'#8d897b',.6);}L(c,158,679,204,675,'#77715e',1.2);L(c,169,704,207,706,'#1a2524',1.5);L(c,232,645,244,644,'#151f24',1);oval(c,242,648,1.3,1.3,'#111c21');shape(c,[[237,635],[238,625],[243,635]],'#353a34');L(c,230,650,222,680,'#1a2524',3);L(c,229,654,248,660,'#877e68',1);L(c,247,659,219,694,'#877e68',.8);c.restore();};
P.train=function(c){old.train.call(this,c);for(let xx=-638;xx<378;xx+=22){oval(c,xx,477,1,1,'#68756c');oval(c,xx,639,1,1,'#697267');}for(let x=-620;x<340;x+=101){L(c,x+5,493,x+59,493,'#a4aaa16e',1);L(c,x+5,521,x+61,521,'#59676a',2);L(c,x+36,493,x+36,551,'#576366',1.4);L(c,x+4,570,x+61,570,'#95978366',.7);R(c,x+21,596,29,8,'#283536');}for(let x=-565;x<350;x+=220){oval(c,x,670,20,20,'#242d31');for(let k=0;k<12;k++){const a=k*Math.PI/6;L(c,x,670,x+Math.cos(a)*19,670+Math.sin(a)*19,'#64716a',1.2);}oval(c,x,670,5,5,'#899284');}L(c,-633,650,380,650,'#5b6b6655',1.3);c.save();for(let i=0;i<8;i++){const drift=(this.clock*13+i*23)%174;c.globalAlpha=(1-drift/200)*.11;oval(c,283-drift*.35,456-drift,17+drift*.17,8+drift*.09,'#7c8b8b');}c.restore();};
P.sky=function(){old.sky.call(this);const c=this.c;for(let i=-2;i<30;i++){this.at(i*180,.18,cc=>{const h=80+(i*73%120+120)%120;for(let j=-60;j<70;j+=31){L(cc,j,570-h,j,565,'#15252c33',1);for(let y=590-h;y<550;y+=29)R(cc,j+5,y,9,16,'#13232a66');}},230);} };
P.hero=function(){oval(this.c,this.width/2+2,this.ground(this.x)+3,26,3.5,'#11192370');old.hero.call(this);};
P.groundDetails=function(){
 const c=this.c;const tile=360,phase=((this.x%tile)+tile)%tile;
 for(let i=-1;i<Math.ceil(this.width/tile)+1;i++){const sx=i*tile-phase;c.save();c.translate(sx,0);this.paintCached(c,'pavement',[0,744,360,156],cc=>{
 const r=rng(78);for(let row=0;row<9;row++){const yy=758+row*16,off=row%2?14:0;for(let x=-28+off;x<361;x+=28){const left=Math.max(0,x),right=Math.min(360,x+25);if(right<=left)continue;const h=10+r()*3;shape(cc,[[left,yy+2],[left+2,yy],[right-2,yy],[right,yy+2],[right-1,yy+h],[left+1,yy+h+1]],['#354044','#303a40','#394246','#333d42'][Math.floor(r()*4)],'#17252d45',.6);L(cc,left+3,yy+1,right-2,yy+1,'#8e938340',.5);}}
 });c.restore();}
};
// Ground stays behind the actor; trees, furniture and the near handrail can cross him.
P.stairs=function(c){
 for(let i=0;i<8;i++)this.at(8050+i*55,1,cc=>{const yy=746-(i+1)*12;stone(cc,0,yy,55,900-yy,'#49534d',80+i);R(cc,0,yy,55,3,'#818172');R(cc,0,yy+3,3,9,'#2e4039');},100);
 this.at(8490,1,cc=>{stone(cc,0,650,900,250,'#4a554d',94);R(cc,0,650,900,4,'#7d8271');for(let x=0;x<900;x+=104){L(cc,x,655,x+44,900,'#293e3330',.8);L(cc,x,687,x+104,687,'#a1a18a19',.7);}},1000);
};
P.stairRail=function(c){
 this.at(8015,1,cc=>{stone(cc,-23,662,39,89,'#58645b',4);R(cc,-27,656,47,10,'#7c8373');},90);
 this.at(8500,1,cc=>{stone(cc,-17,563,34,92,'#626d60',5);R(cc,-23,557,46,10,'#969680');},90);
 for(let i=0;i<6;i++){const x=8080+i*67,y=660-(x-8040)*97/450;this.at(x,1,cc=>{L(cc,0,y+4,0,this.ground(x)+8,'#536351',3);L(cc,1,y+4,1,this.ground(x)+8,'#a4a18455',.7);},20);}
 L(c,this.width/2+8040-this.x,660,this.width/2+8490-this.x,563,'#303e35',8);L(c,this.width/2+8040-this.x,659,this.width/2+8490-this.x,562,'#8e977f',4);
};
P.lamp=function(c){this.paintCached(c,'street-lamp',[-32,414,64,331],cc=>{
 stone(cc,-9,725,18,14,'#252f32',42);R(cc,-5,485,10,242,'#16262c');L(cc,-2,488,-2,725,'#8c978069',1.2);R(cc,-9,698,18,5,'#384840');R(cc,-7,493,14,6,'#546154');
 shape(cc,[[-17,483],[-12,438],[12,438],[17,483]],'#526057');shape(cc,[[-12,478],[-9,442],[9,442],[12,478]],'#777662');L(cc,0,439,0,481,'#253b39',2);R(cc,-20,481,40,6,'#1f3035');shape(cc,[[-24,438],[0,421],[24,438]],'#273a3c');oval(cc,0,419,3,4,'#64735f');
 });};
P.parkedBicycle=function(c,variant=0){this.paintCached(c,`parked-cycle-${variant}`,[-104,687,208,134],cc=>{
 cc.save();cc.translate(0,810);oval(cc,0,3,99,5,'#101b226b');
 for(const x of[-60,61]){oval(cc,x,-36,36,36,'#101a20');oval(cc,x,-36,32,32,'#53615d');oval(cc,x,-36,29,29,'#28373d');for(let i=0;i<18;i++){const a=i*Math.PI/9;L(cc,x,-36,x+Math.cos(a)*30,-36+Math.sin(a)*30,'#87908468',.65);}oval(cc,x,-36,3,3,'#b8ab86');
 cc.beginPath();cc.arc(x,-36,38,Math.PI*1.05,Math.PI*1.98);cc.strokeStyle='#657266';cc.lineWidth=2;cc.stroke();}
 const frame=variant?'#677469':'#4b615f';for(const [a,b,x,y]of[[-60,-36,-23,-85],[-60,-36,-5,-35],[-23,-85,-5,-35],[-23,-85,41,-83],[41,-83,-5,-35],[41,-83,61,-36],[-23,-85,-29,-106],[41,-83,46,-109]]){L(cc,a,b,x,y,'#111e25',5);L(cc,a,b,x,y,frame,2.5);}
 L(cc,-28,-101,-28,-108,'#abb099',2);shape(cc,[[-44,-113],[-17,-111],[-15,-107],[-38,-106]],'#27292a','#0e1c24',1.5);L(cc,46,-109,55,-117,'#9ca38a',2.2);L(cc,55,-117,67,-114,'#596963',3);L(cc,61,-114,69,-114,'#202c30',4);
 oval(cc,-5,-35,10,10,'#202e34');oval(cc,-5,-35,7,7,'#6c7768');L(cc,-5,-35,8,-28,'#adb095',2);L(cc,3,-26,17,-26,'#182c31',3);L(cc,-9,-44,-21,-48,'#89977e',1.5);L(cc,-26,-48,-17,-48,'#192b31',3);L(cc,-8,-33,-61,-40,'#b6b39a60',.7);L(cc,-7,-28,-61,-30,'#b6b39a60',.7);
 L(cc,-78,-81,-41,-81,'#758172',2.3);L(cc,-76,-81,-60,-36,'#657366',1.2);L(cc,-43,-81,-60,-36,'#657366',1.2);L(cc,-6,-29,10,1,'#7d8a75',2);oval(cc,-85,-70,3,2,'#897d5b');cc.restore();
 });};
P.bench=function(c){this.paintCached(c,'street-bench',[-106,714,212,113],cc=>{
 oval(cc,0,820,104,5,'#12202855');for(const x of[-77,71]){L(cc,x,759,x-4,819,'#172930',5);L(cc,x,778,x+13,817,'#21363a',5);L(cc,x,723,x+5,783,'#22383b',4);}
 for(let i=0;i<4;i++){const yy=721+i*12;stone(cc,-91,yy,182,9,'#555443',30+i);L(cc,-86,yy+2,86,yy+2,'#b39c6859',.8);for(const x of[-76,74])oval(cc,x,yy+4,1.3,1.3,'#a49b7b');}
 for(let i=0;i<3;i++)stone(cc,-99,775+i*5,198,4,'#575442',i+42);for(const x of[-94,92]){L(cc,x,762,x,787,'#1c3035',4);L(cc,x,763,x+18,763,'#506357',3);}
 });};
P.roadside=function(){for(const [x,s,k]of[[1680,1.16,1],[2580,1.26,0],[3500,1.17,1],[4270,1.3,0]])this.at(x,.99,c=>{this.tree(c,0,738,s,k);oval(c,0,738,39,4,'#0d202838');},210);};
P.foreground=function(){
 for(const [x,v]of[[2150,0],[2680,1],[3720,0],[4080,1]])this.at(x,1.15,c=>this.parkedBicycle(c,v),120);
 for(const x of[1850,3420,6990])this.at(x,1.16,c=>this.bench(c),130);
 for(const [x,s,k]of[[2000,1.65,1],[2970,1.73,0],[3990,1.61,1],[4830,1.66,0],[7450,1.76,1]])this.at(x,1.16,c=>{oval(c,2,816,53,7,'#101d2455');this.tree(c,0,812,s,k);R(c,-22,815,44,4,'#233631');},260);
 if(this.x>7600)this.stairRail(this.c);
 old.foreground.call(this);
};

})();
