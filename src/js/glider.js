/* Original two-room paper-plane game, inspired by the classic Glider.
   All scenery is drawn here on a 400 × 250 pixel canvas. No external assets. */
(() => {
  'use strict';
  const mount = document.createElement('div');
  mount.innerHTML = `<section class="glider-win" id="glider-win" hidden aria-label="Glider · Jazz After Hours" tabindex="-1">
    <header class="glider-header"><button class="glider-close" aria-label="Close game">×</button><span class="glider-title">Glider · Jazz After Hours</span></header>
    <div class="glider-hud"><span id="glider-room">01 / TOKYO</span><span id="glider-score">NOTES 0/3 · ♥♥♥</span></div>
    <div class="glider-stage"><canvas width="400" height="250" aria-label="Paper plane game: use left and right to glide, hold Lift for a short updraft boost."></canvas>
      <div class="glider-overlay"><small>AN AFTER-HOURS PAPER FLIGHT</small><h2>Jazz After Hours</h2><p>도쿄에서 파리까지, 종이비행기 여행.<br>바람을 타고 음표 3개를 모아 오른쪽 문으로!</p><button class="glider-start">LET'S FLY →</button></div>
    </div>
    <div class="glider-footer"><div class="glider-controls"><button data-key="left" aria-label="Fly left">←</button><button data-key="right" aria-label="Fly right">→</button><button data-key="lift" aria-label="Hold to boost upward">↑ LIFT</button></div><div class="glider-actions"><button class="glider-pause" aria-label="Pause game">Ⅱ</button><button class="glider-reset" aria-label="Restart game">↻</button></div></div>
    <p class="glider-help">← → / A D 이동 · Space 상승 · P 일시정지 · 바닥과 가구를 조심!</p>
  </section>`;
  const win = mount.firstElementChild;
  document.body.append(win);
  const canvas = win.querySelector('canvas'), ctx = canvas.getContext('2d');
  const overlay = win.querySelector('.glider-overlay');
  const heading = overlay.querySelector('h2'), copy = overlay.querySelector('p');
  const start = win.querySelector('.glider-start'), pause = win.querySelector('.glider-pause');
  const score = win.querySelector('#glider-score'), roomLabel = win.querySelector('#glider-room');
  const rooms = [
    { name:'01 / TOKYO · BLUE NOTE', color:'#6dcce3', vents:[{x:40,w:45},{x:172,w:48},{x:300,w:44}],
      blocks:[{x:101,y:190,w:45,h:40},{x:242,y:179,w:38,h:51}], notes:[{x:72,y:123},{x:193,y:73},{x:325,y:125}] },
    { name:'02 / PARIS · MINUIT', color:'#eabf7c', vents:[{x:33,w:48},{x:171,w:46},{x:306,w:44}],
      blocks:[{x:107,y:182,w:37,h:48},{x:241,y:174,w:39,h:56}], notes:[{x:64,y:93},{x:195,y:135},{x:327,y:68}] }
  ];
  let room=0, lives=3, mode='intro', collected=[new Set(),new Set()], plane;
  let frame=0, last=0, elapsed=0, invincible=0, hint=0;
  const keys={left:false,right:false,lift:false};
  function resetPlane() { plane={x:22,y:124,vx:0,vy:0,fuel:1,facing:1}; invincible=1.5; }
  function reset() { room=0;lives=3;collected=[new Set(),new Set()];elapsed=0;hint=0;resetPlane(); }
  reset();
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  function line(x,y,xx,yy,c,width=1) {ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
  function text(t,x,y,c='#ecddb4',size=8) {ctx.fillStyle=c;ctx.font=`${size}px monospace`;ctx.textAlign='left';ctx.fillText(t,x,y);}
  function ellipse(x,y,rx,ry,c) {ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function note(x,y,c) {rect(x+3,y-7,2,9,c);rect(x+5,y-7,4,2,c);rect(x-1,y,5,3,c);}
  function lamp(x,c) {line(x,0,x,45,'#0c0e18');rect(x-11,45,22,4,c);rect(x-8,39,16,6,c);rect(x-2,49,4,3,'#fff0bf');}
  function scenery() {
    const tokyo=room===0;
    rect(0,0,400,250,tokyo?'#a8afb8':'#c7b99f');
    // Ordered stippling gives the wall a deliberately limited-palette texture.
    for(let y=16;y<225;y+=3) for(let x=(y%6?2:0);x<400;x+=4) rect(x,y,1,1,tokyo?'#929aa6':'#b1a48f');
    rect(0,0,400,12,tokyo?'#d8d9d4':'#e0d5be');line(0,12,400,12,'#24272d');
    line(0,0,12,12,'#24272d');line(400,0,388,12,'#24272d');
    rect(0,13,6,217,'#535962');rect(394,13,6,217,'#535962');
    rect(6,217,388,13,tokyo?'#717985':'#836c64');line(6,217,394,217,'#22232d');line(6,221,394,221,'#e1d4ba');
    if(tokyo) {
      rect(82,42,229,157,'#142849');
      for(let x=84;x<311;x+=12){rect(x,42,5,153,'#203c65');rect(x+5,42,2,153,'#0c1b32');}
      rect(119,55,154,34,'#081b32');rect(122,58,148,28,'#193958');
      text('BLUE NOTE',136,77,'#b3e6ee',18);text('T O K Y O   /   2 3 : 4 8',129,101,'#87a6c1',7);
      // Grand piano, keys, pianist and a tiny rhythm section.
      rect(87,164,88,12,'#080e1c');rect(91,153,78,12,'#101727');
      line(92,153,116,113,'#090f1c',3);line(116,113,169,153,'#090f1c',3);
      rect(86,162,29,4,'#e5decd');for(let x=88;x<113;x+=5)rect(x,162,2,3,'#121322');
      rect(95,176,4,23,'#0a0f1a');rect(161,176,4,23,'#0a0f1a');rect(73,178,15,4,'#262d39');rect(75,182,2,17,'#262d39');rect(83,182,2,17,'#262d39');
      ellipse(229,180,17,17,'#a07853');ellipse(229,180,14,14,'#223447');ellipse(229,180,3,3,'#d8c79a');
      rect(211,152,14,13,'#aa7350');rect(238,153,15,14,'#aa7350');
      line(207,147,207,195,'#b9a378');line(255,143,255,195,'#b9a378');
      ellipse(207,147,16,2,'#d6be79');ellipse(255,143,14,2,'#d6be79');
      rect(66,199,252,9,'#283b50');
      for(const x of [13,351]) {rect(x,113,30,66,'#0b1422');ellipse(x+15,154,10,10,'#283345');ellipse(x+15,129,5,5,'#37485a');}
      lamp(57,'#739cae');lamp(343,'#739cae');
    } else {
      // Brick cellar, two arched windows and a Paris skyline.
      for(let y=170;y<217;y+=12){line(6,y,394,y,'#958578');for(let x=(y%24?6:19);x<394;x+=27)line(x,y,x,y+12,'#958578');}
      for(const x of [42,280]) {
        ctx.fillStyle='#0e192b';ctx.beginPath();ctx.arc(x+34,79,34,Math.PI,0);ctx.lineTo(x+68,156);ctx.lineTo(x,156);ctx.fill();
        rect(x+6,91,56,59,'#101c2c');line(x+34,48,x+34,155,'#a06b62',3);line(x,100,x+68,100,'#a06b62',3);
        for(let i=0;i<5;i++){rect(x+7+i*10,126-i%2*7,8,23+i%2*7,'#273449');rect(x+9+i*10,132,2,3,'#c4a06c');}
        ellipse(x+51,68,5,5,'#eee0b6');
      }
      line(317,91,306,145,'#a68879',2);line(317,91,328,145,'#a68879',2);line(309,129,325,129,'#a68879',2);
      rect(137,49,126,36,'#251b2b');text('LE MINUIT',152,70,'#ebbc7a',15);text('JAZZ  /  PARIS',164,81,'#c19182',7);
      // Upright bass and sax player on a wine-red rug.
      rect(151,192,95,14,'#793d4c');ellipse(166,171,12,20,'#a86940');ellipse(166,156,8,12,'#a86940');
      rect(164,125,4,50,'#c4945b');line(166,129,166,190,'#eed19a');
      line(225,151,225,195,'#191626');line(216,195,234,195,'#191626');
      line(229,157,238,174,'#d9ae59',3);ellipse(238,176,5,3,'#dbb66b');line(215,144,215,194,'#191626');
      // Bar shelf, glasses and bottles.
      rect(11,173,78,8,'#a57760');rect(15,181,72,39,'#583848');
      for(let x=19;x<85;x+=13){rect(x,156,5,16,'#69877a');rect(x+1,152,3,5,'#b1a27c');}
      lamp(121,'#b28759');lamp(276,'#b28759');
    }
    rect(0,230,400,20,tokyo?'#3a3542':'#563944');line(0,230,400,230,'#ba9070');
    for(let x=-20;x<400;x+=40)line(x,250,x+25,231,tokyo?'#65505b':'#835763');
    rooms[room].blocks.forEach((b)=>{
      rect(b.x,b.y,b.w,5,'#c49b72');rect(b.x+3,b.y+5,b.w-6,5,'#6f4850');
      rect(b.x+6,b.y+10,3,b.h-10,'#201d2d');rect(b.x+b.w-9,b.y+10,3,b.h-10,'#201d2d');
      rect(b.x+12,b.y-9,3,9,'#edda9c');rect(b.x+12,b.y-12,3,3,'#fcb775');
      ellipse(b.x+b.w-10,b.y-4,3,2,'#e3cab0');
    });
    rooms[room].vents.forEach((v)=>{
      rect(v.x,225,v.w,5,'#151e2a');for(let x=v.x+3;x<v.x+v.w;x+=5)rect(x,226,2,3,'#83a6a7');
      for(let i=0;i<9;i++){const yy=222-((elapsed*34+i*21)%165);const xx=v.x+8+(i*13)%(v.w-12);rect(xx,yy,1,5,'#6b9fa080');rect(xx-1,yy,3,1,'#8bc5bd80');}
    });
    const unlocked=collected[room].size===3;
    rect(374,84,26,88,'#35313a');rect(375,85,25,2,'#ece3cd');
    rect(379,88,21,79,'#080d1a');rect(377,86,3,83,unlocked?'#a7d6ba':'#686879');
    text(unlocked?'GO →':'3 ♪',377,80,unlocked?'#c5e8b6':'#bdb6a8',7);
    if(unlocked){rect(387,117,8,2,'#bfe6b0');rect(392,114,2,8,'#bfe6b0');}
    if(room===1){rect(0,86,13,83,'#35313a');rect(0,89,10,77,'#121622');text('←',2,128,'#ddcba0',8);}
  }
  function draw() {
    ctx.imageSmoothingEnabled=false;scenery();
    rooms[room].notes.forEach((n,i)=>{if(!collected[room].has(i)){const y=n.y+Math.sin(elapsed*3+i)*2;rect(n.x-6,y-12,17,19,'#171b3080');note(n.x,y,rooms[room].color);}});
    if(invincible<=0 || Math.floor(elapsed*12)%2===0) {
      ctx.save();ctx.translate(Math.round(plane.x),Math.round(plane.y));ctx.scale(plane.facing,1);
      ctx.fillStyle='#f4edd9';ctx.beginPath();ctx.moveTo(-10,-5);ctx.lineTo(12,0);ctx.lineTo(-8,6);ctx.lineTo(-4,0);ctx.closePath();ctx.fill();line(-4,0,10,0,'#858ea0');line(-10,-5,-4,0,'#b2bbc5');ctx.restore();
    }
    rect(9,10,45,4,'#060f23');rect(10,11,Math.round(43*plane.fuel),2,rooms[room].color);text('LIFT',9,24,'#b8b8c5',6);
    if(hint>0) {rect(75,8,256,17,'#111a2e');text('COLLECT ALL 3 NOTES, THEN EXIT →',84,19,'#eee0bb',8);}
    score.textContent=`NOTES ${collected[room].size}/3 · ${'♥'.repeat(lives)}${'♡'.repeat(3-lives)}`;roomLabel.textContent=rooms[room].name;
  }
  function show(title,body,button) {heading.textContent=title;copy.textContent=body;start.textContent=button;overlay.hidden=false;}
  function clearKeys(){Object.keys(keys).forEach(k=>keys[k]=false);win.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));}
  function loseLife(){lives--;clearKeys();if(lives===0){mode='over';show('A little turbulence…','종이비행기가 잠시 쉬어갑니다. 다시 도쿄에서 출발해볼까요?','TRY AGAIN →');}else resetPlane();}
  function update(dt) {
    elapsed+=dt;invincible=Math.max(0,invincible-dt);hint=Math.max(0,hint-dt);
    const direction=Number(keys.right)-Number(keys.left);
    plane.vx+=(direction*80-plane.vx)*Math.min(1,dt*8);if(direction)plane.facing=direction;
    const onVent=rooms[room].vents.some((v,i)=>plane.x>v.x && plane.x<v.x+v.w && plane.y>rooms[room].notes[i].y-10);
    const boost=keys.lift&&plane.fuel>0;
    plane.vy+= (onVent?-140:boost?-150:49)*dt;
    plane.vy=Math.max(-67,Math.min(44,plane.vy));
    plane.fuel=Math.max(0,Math.min(1,plane.fuel+((boost&&!onVent)?-.46:.24)*dt));
    plane.x+=plane.vx*dt;plane.y+=plane.vy*dt;
    if(plane.y<19){plane.y=19;plane.vy=7;}
    if(plane.x<12){if(room===1 && plane.y>89 && plane.y<166){room=0;plane.x=369;}else plane.x=12;}
    rooms[room].notes.forEach((n,i)=>{if(Math.hypot(plane.x-n.x,plane.y-n.y)<18)collected[room].add(i);});
    if(plane.x>387){
      if(plane.y>94 && plane.y<161 && collected[room].size===3){
        clearKeys();if(room===0){room=1;resetPlane();mode='between';show('Next stop: Paris','東京 → PARIS · 세 음표를 챙겼어요. 이번에는 한밤의 작은 재즈바로.','ENTER PARIS →');}
        else {mode='won';show('One lovely night.','도쿄에서 파리까지, 여섯 음표를 모두 모았어요. Thanks for staying a little longer.','FLY AGAIN ↻');}
      }else{plane.x=387;hint=2;}
    }
    const collision=plane.y>223 || rooms[room].blocks.some(b=>plane.x+7>b.x&&plane.x-7<b.x+b.w&&plane.y+4>b.y-12&&plane.y-4<b.y+b.h);
    if(collision&&invincible===0)loseLife();
  }
  function tick(time){if(win.hidden){frame=0;return;}const dt=Math.min((time-last)/1000||0,1/30);last=time;if(mode==='playing')update(dt);draw();frame=requestAnimationFrame(tick);}
  function animate(){if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
  function setPaused(){if(mode==='playing'){mode='paused';clearKeys();show('Intermission','잠깐 쉬어가도 좋아요. 준비되면 다시 날아가요.','RESUME →');}else if(mode==='paused'){mode='playing';overlay.hidden=true;}pause.textContent=mode==='paused'?'▶':'Ⅱ';}
  function open(){win.hidden=false;window.__centerPopupForMobile?.(win);if(matchMedia('(max-width:768px)').matches){delete win.dataset.dragged;win.style.left='50vw';win.style.top='calc(50dvh + 14px)';win.style.transform='translate(-50%, -50%)';}window.__bringToFront?.(win);win.focus({preventScroll:true});animate();}
  document.getElementById('icon-glider').addEventListener('click',open);
  win.querySelector('.glider-close').addEventListener('click',()=>{if(mode==='playing')setPaused();win.hidden=true;clearKeys();cancelAnimationFrame(frame);frame=0;});
  start.addEventListener('click',()=>{if(['intro','over','won'].includes(mode))reset();mode='playing';overlay.hidden=true;pause.textContent='Ⅱ';win.focus({preventScroll:true});});
  pause.addEventListener('click',setPaused);
  win.querySelector('.glider-reset').addEventListener('click',()=>{reset();mode='playing';overlay.hidden=true;pause.textContent='Ⅱ';clearKeys();win.focus({preventScroll:true});});
  const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',' ':'lift',ArrowUp:'lift'};
  win.addEventListener('keydown',e=>{if(keyMap[e.key]){e.preventDefault();keys[keyMap[e.key]]=true;}if((e.key==='p'||e.key==='P')&&!e.repeat){e.preventDefault();setPaused();}});
  window.addEventListener('keyup',e=>{if(keyMap[e.key])keys[keyMap[e.key]]=false;});
  window.addEventListener('blur',()=>{clearKeys();if(!win.hidden&&mode==='playing')setPaused();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();if(!win.hidden&&mode==='playing')setPaused();}});
  win.querySelectorAll('[data-key]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys[button.dataset.key]=true;button.classList.add('pressed');win.focus({preventScroll:true});});
    const release=()=>{keys[button.dataset.key]=false;button.classList.remove('pressed');};
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  win.addEventListener('pointerdown',()=>window.__bringToFront?.(win));
  // Reuse the desktop's title-bar drag behavior, including touch support.
  makeCenteredWinDraggable(win,win.querySelector('.glider-header'),'.glider-close');
  draw();
})();
