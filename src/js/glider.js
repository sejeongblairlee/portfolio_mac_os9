/* Original two-room paper-plane game, inspired by the classic Glider.
   Physics use 400 × 250 units; room art renders at 800 × 500 for fine detail.
   The original title GIF was supplied by the site owner. */
(() => {
  'use strict';
  const mount = document.createElement('div');
  mount.innerHTML = `<section class="glider-win is-splash" id="glider-win" hidden aria-label="Glider · Jazz After Hours" tabindex="-1">
    <header class="glider-header"><button class="glider-close" aria-label="Close game">×</button><span class="glider-title">Glider · Jazz After Hours</span></header>
    <div class="glider-hud"><span id="glider-room">01 / TOKYO</span><span id="glider-score">NOTES 0/3 · ♥♥♥</span></div>
    <div class="glider-stage">
      <div class="glider-splash"><img src="src/images/glider/title-original.gif" alt="Original Glider 4.0 title screen by John Calhoun"><div class="glider-splash-bottom"><span class="glider-load-status" role="status">도쿄 · 파리의 방을 불러오는 중…</span><button class="glider-enter" disabled>START GAME →</button></div></div>
      <canvas width="800" height="500" aria-label="Paper plane game: use left and right to glide, hold Lift for a short updraft boost."></canvas>
      <div class="glider-overlay" hidden><small>JAZZ AFTER HOURS</small><h2>Jazz After Hours</h2><p>도쿄에서 파리까지, 종이비행기 여행.</p><button class="glider-start">LET'S FLY →</button></div>
    </div>
    <div class="glider-footer"><div class="glider-controls"><button data-key="left" aria-label="Fly left">←</button><button data-key="right" aria-label="Fly right">→</button><button data-key="lift" aria-label="Hold to boost upward">↑ LIFT</button></div><div class="glider-actions"><button class="glider-pause" aria-label="Pause game">Ⅱ</button><button class="glider-reset" aria-label="Restart game">↻</button></div></div>
    <p class="glider-help">← → / A D 이동 · Space 상승 · P 일시정지 · 바닥과 가구를 조심!</p>
  </section>`;
  const win = mount.firstElementChild;
  document.body.append(win);
  const canvas = win.querySelector('canvas'), ctx = canvas.getContext('2d');
  ctx.scale(2,2);
  const roomArt = ['tokyo-room-v2.png','paris-room-v2.png'].map(name=>{const img=new Image();img.src=`src/images/glider/${name}`;return img;});
  const enter=win.querySelector('.glider-enter'),loadStatus=win.querySelector('.glider-load-status');
  function loadArt(){
    enter.disabled=true;
    Promise.all(roomArt.map(img=>img.decode())).then(()=>{
      loadStatus.textContent='TOKYO → PARIS · 음표를 모아 다음 방으로';enter.textContent='START GAME →';enter.disabled=false;
    }).catch(()=>{loadStatus.textContent='배경을 불러오지 못했어요. 다시 시도해주세요.';enter.textContent='RETRY ↻';enter.disabled=false;});
  }
  enter.addEventListener('click',()=>{
    if(!roomArt.every(img=>img.complete&&img.naturalWidth)){roomArt.forEach(img=>{img.src=img.src.split('?')[0]+'?retry='+Date.now();});loadArt();return;}
    win.classList.remove('is-splash');win.querySelector('.glider-splash').hidden=true;
    reset();mode='playing';overlay.hidden=true;win.focus({preventScroll:true});
  });
  const overlay = win.querySelector('.glider-overlay');
  const heading = overlay.querySelector('h2'), copy = overlay.querySelector('p');
  const start = win.querySelector('.glider-start'), pause = win.querySelector('.glider-pause');
  const score = win.querySelector('#glider-score'), roomLabel = win.querySelector('#glider-room');
  const rooms = [
    { name:'01 / TOKYO · BLUE NOTE', color:'#6dcce3', floor:230, door:[154,210], vents:[{x:43,w:40},{x:179,w:42},{x:307,w:38}],
      blocks:[{x:87,y:191,w:73,h:33},{x:108,y:170,w:49,h:21},{x:174,y:186,w:54,h:35},{x:280,y:202,w:25,h:21},{x:320,y:202,w:25,h:21},{x:353,y:182,w:12,h:39}], notes:[{x:72,y:123},{x:193,y:73},{x:325,y:125}] },
    { name:'02 / PARIS · MINUIT', color:'#eabf7c', floor:209, door:[109,192], vents:[{x:47,w:40},{x:179,w:42},{x:309,w:40}],
      blocks:[{x:77,y:166,w:38,h:36},{x:148,y:139,w:26,h:63},{x:161,y:116,w:5,h:23},{x:203,y:155,w:79,h:47},{x:314,y:166,w:29,h:36}], notes:[{x:64,y:93},{x:195,y:135},{x:327,y:68}] }
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
  function note(x,y,c) {rect(x+3,y-7,2,9,c);rect(x+5,y-7,4,2,c);rect(x-1,y,5,3,c);}
  function scenery() {
    rect(0,0,400,250,'#111');
    const art=roomArt[room];
    if(art.complete && art.naturalWidth) ctx.drawImage(art,0,0,400,250);
    rooms[room].vents.forEach((v,idx)=>{
      const bottom=rooms[room].floor-4,height=bottom-(rooms[room].notes[idx].y-10);
      for(let i=0;i<6;i++){
        const y=bottom-((elapsed*28+i*height/6)%height),x=v.x+v.w/2+(i%3-1)*4;
        rect(x,y,.5,2,'#eff0c060');
      }
    });
    const unlocked=collected[room].size===3;
    const doorY=rooms[room].door[0]-9;
    rect(374,doorY,25,10,'#111a2e');
    text(unlocked?'GO →':'3 ♪',377,doorY+7,unlocked?'#c5e8b6':'#bdb6a8',6);
    if(room===1) text('←',3,174,'#ddcba0',8);
  }
  function draw() {
    ctx.imageSmoothingEnabled=false;scenery();
    rooms[room].notes.forEach((n,i)=>{if(!collected[room].has(i)){const y=n.y+Math.sin(elapsed*3+i)*2;rect(n.x-6,y-12,17,19,'#171b3080');note(n.x,y,rooms[room].color);}});
    if(invincible<=0 || Math.floor(elapsed*12)%2===0) {
      ctx.save();ctx.translate(Math.round(plane.x),Math.round(plane.y));ctx.scale(plane.facing,1);
      ctx.fillStyle='#f4edd9';ctx.beginPath();ctx.moveTo(-10,-5);ctx.lineTo(12,0);ctx.lineTo(-8,6);ctx.lineTo(-4,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#202431';ctx.lineWidth=.5;ctx.stroke();line(-4,0,10,0,'#858ea0',.5);line(-10,-5,-4,0,'#b2bbc5',.5);ctx.restore();
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
    if(plane.x<12){if(room===1 && plane.y>rooms[room].door[0] && plane.y<rooms[room].door[1]){room=0;plane.x=379;plane.y=168;}else plane.x=12;}
    rooms[room].notes.forEach((n,i)=>{if(Math.hypot(plane.x-n.x,plane.y-n.y)<18)collected[room].add(i);});
    if(plane.x>387){
      if(plane.y>rooms[room].door[0] && plane.y<rooms[room].door[1] && collected[room].size===3){
        clearKeys();if(room===0){room=1;resetPlane();mode='between';show('Next stop: Paris','東京 → PARIS · 세 음표를 챙겼어요. 이번에는 한밤의 작은 재즈바로.','ENTER PARIS →');}
        else {mode='won';show('One lovely night.','도쿄에서 파리까지, 여섯 음표를 모두 모았어요. Thanks for staying a little longer.','FLY AGAIN ↻');}
      }else{plane.x=387;hint=2;}
    }
    const collision=plane.y>rooms[room].floor-5 || rooms[room].blocks.some(b=>plane.x+7>b.x&&plane.x-7<b.x+b.w&&plane.y+4>b.y&&plane.y-4<b.y+b.h);
    if(collision&&invincible===0)loseLife();
  }
  function tick(time){if(win.hidden){frame=0;return;}const dt=Math.min((time-last)/1000||0,1/30);last=time;if(mode==='playing')update(dt);draw();frame=requestAnimationFrame(tick);}
  function animate(){if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
  function setPaused(){if(mode==='playing'){mode='paused';clearKeys();show('Intermission','잠깐 쉬어가도 좋아요. 준비되면 다시 날아가요.','RESUME →');}else if(mode==='paused'){mode='playing';overlay.hidden=true;}pause.textContent=mode==='paused'?'▶':'Ⅱ';}
  function open(){win.hidden=false;if(mode==='intro')loadArt();window.__centerPopupForMobile?.(win);if(matchMedia('(max-width:768px)').matches){delete win.dataset.dragged;win.style.left='50vw';win.style.top='calc(50dvh + 14px)';win.style.transform='translate(-50%, -50%)';}window.__bringToFront?.(win);win.focus({preventScroll:true});animate();}
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
