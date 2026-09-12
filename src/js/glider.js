/* Original two-room paper-plane game, inspired by the classic Glider.
   Physics use 400 × 250 units; room art renders at 800 × 500 for fine detail.
   Title artwork is a 2026 homage based on the owner's supplied reference. */
(() => {
  'use strict';
  const mount = document.createElement('div');
  mount.innerHTML = `<section class="glider-win is-splash" id="glider-win" hidden aria-label="Glider 2026" tabindex="-1">
    <header class="glider-header mac-window-header"><div class="mac-window-header-side"><button class="glider-close mac-window-close" aria-label="Close game"></button><span class="mac-window-header-pinstripe" aria-hidden="true"></span></div><span class="glider-title mac-window-header-title">Glider 2026</span><div class="mac-window-header-side mac-window-header-side-right"><span class="mac-window-header-pinstripe" aria-hidden="true"></span></div></header>
    <div class="glider-stage">
      <div class="glider-splash"><img src="src/images/glider/title-2026-final.png" alt="Glider 2026 paper airplane against Paris wallpaper"><button class="glider-enter" disabled aria-label="Start game"><span class="glider-load-status" role="status">LOADING…</span></button></div>
      <canvas width="800" height="500" aria-label="Paper plane game: use left and right to glide, hold Lift for a short updraft boost."></canvas>
      <div class="glider-hud" aria-label="Game status"><span id="glider-room" class="glider-hud-box">Tokyo Blue Note</span><span class="glider-cards"><b id="glider-room-number" title="Room">1</b><b id="glider-note-number" title="Notes collected in this room">0</b></span><span id="glider-score" class="glider-hud-box" title="Score">000000</span><span class="glider-hud-box glider-supplies"><span class="glider-fuel" title="Lift energy"><span id="glider-fuel">100</span><i class="glider-battery" aria-hidden="true"></i></span><span class="glider-notes" title="Total notes"><span id="glider-notes">0</span> ♪</span><span id="glider-lives" aria-label="3 lives"></span></span></div>
      <div class="glider-overlay" hidden><small>JAZZ AFTER HOURS</small><h2>Jazz After Hours</h2><p>A paper flight from Tokyo to Paris.</p><button class="glider-start">LET'S FLY →</button></div>
    </div>
    <div class="glider-footer"><div class="glider-controls"><button data-key="left" aria-label="Fly left">←</button><button data-key="right" aria-label="Fly right">→</button><button data-key="lift" aria-label="Hold to boost upward">↑ LIFT</button></div><div class="glider-actions"><button class="glider-pause" aria-label="Pause game">Ⅱ</button><button class="glider-reset" aria-label="Restart game">↻</button></div></div>
  </section>`;
  const win = mount.firstElementChild;
  document.body.append(win);
  const canvas = win.querySelector('canvas'), ctx = canvas.getContext('2d');
  win.querySelector('.glider-stage').append(win.querySelector('.glider-footer'));
  ctx.scale(2,2);
  const roomArt = ['tokyo-room-v2.png','paris-room-v2.png'].map(name=>{const img=new Image();img.src=`src/images/glider/${name}`;return img;});
  const enter=win.querySelector('.glider-enter'),loadStatus=win.querySelector('.glider-load-status');
  function loadArt(){
    enter.disabled=true;
    Promise.all(roomArt.map(img=>img.decode())).then(()=>{
      loadStatus.textContent='';enter.disabled=false;
    }).catch(()=>{loadStatus.textContent='COULD NOT LOAD ROOMS · CLICK TO RETRY';enter.disabled=false;});
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
  const lifeDisplay=win.querySelector('#glider-lives');
  const planeIcon='<svg viewBox="0 0 30 14" aria-hidden="true"><path d="M1 2h6l4 2 17 1-9 8-6-7-5 5-2-7H2z" fill="#eaf5f4" stroke="#839193"/><path d="m11 4 8 9-1-7 10-1M7 2 6 4l2 7 3-7" fill="#b5c6c9" stroke="#67757a" stroke-width=".5"/></svg>';
  lifeDisplay.innerHTML=planeIcon.repeat(3);
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
    if(hint>0) {rect(75,30,256,17,'#111a2e');text('COLLECT ALL 3 NOTES, THEN EXIT →',84,41,'#eee0bb',8);}
    const total=collected.reduce((sum,notes)=>sum+notes.size,0);
    score.textContent=String(total*1000).padStart(6,'0');roomLabel.textContent=room===0?'Tokyo Blue Note':'Le Minuit, Paris';
    win.querySelector('#glider-room-number').textContent=room+1;
    win.querySelector('#glider-note-number').textContent=collected[room].size;
    win.querySelector('#glider-fuel').textContent=Math.round(plane.fuel*100);
    win.querySelector('#glider-notes').textContent=total;
    lifeDisplay.setAttribute('aria-label',`${lives} lives`);
    [...lifeDisplay.children].forEach((icon,i)=>icon.style.opacity=i<lives?'1':'.18');
  }
  function show(title,body,button) {heading.textContent=title;copy.textContent=body;start.textContent=button;overlay.hidden=false;}
  function clearKeys(){Object.keys(keys).forEach(k=>keys[k]=false);win.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));}
  function loseLife(){lives--;clearKeys();if(lives===0){mode='over';show('A little turbulence…','Out of paper planes. Take another flight from Tokyo.','TRY AGAIN →');}else resetPlane();}
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
        clearKeys();if(room===0){room=1;resetPlane();mode='between';show('Next stop: Paris','Three notes collected. A little jazz bar awaits.','ENTER PARIS →');}
        else {mode='won';show('One lovely night.','Six notes, two cities. Thanks for staying a little longer.','FLY AGAIN ↻');}
      }else{plane.x=387;hint=2;}
    }
    const collision=plane.y>rooms[room].floor-5 || rooms[room].blocks.some(b=>plane.x+7>b.x&&plane.x-7<b.x+b.w&&plane.y+4>b.y&&plane.y-4<b.y+b.h);
    if(collision&&invincible===0)loseLife();
  }
  function tick(time){if(win.hidden){frame=0;return;}const dt=Math.min((time-last)/1000||0,1/30);last=time;if(mode==='playing')update(dt);draw();frame=requestAnimationFrame(tick);}
  function animate(){if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
  function setPaused(){if(mode==='playing'){mode='paused';clearKeys();show('Intermission','Arrow keys / A D: glide. Space: lift. Collect three notes, then find the exit.','RESUME →');}else if(mode==='paused'){mode='playing';overlay.hidden=true;}pause.textContent=mode==='paused'?'▶':'Ⅱ';}
  function open(){win.hidden=false;if(mode==='intro')loadArt();window.__centerPopupForMobile?.(win);if(matchMedia('(max-width:768px)').matches){delete win.dataset.dragged;win.style.left='50vw';win.style.top='calc(50dvh + 14px)';win.style.transform='translate(-50%, -50%)';}window.__bringToFront?.(win);win.focus({preventScroll:true});animate();}
  document.getElementById('icon-glider').addEventListener('click',open);
  win.querySelector('.glider-close').addEventListener('click',()=>{if(mode==='playing')setPaused();win.hidden=true;clearKeys();cancelAnimationFrame(frame);frame=0;});
  start.addEventListener('click',()=>{if(['intro','over','won'].includes(mode))reset();mode='playing';overlay.hidden=true;pause.textContent='Ⅱ';win.focus({preventScroll:true});});
  pause.addEventListener('click',setPaused);
  win.querySelector('.glider-reset').addEventListener('click',()=>{reset();mode='playing';overlay.hidden=true;pause.textContent='Ⅱ';clearKeys();win.focus({preventScroll:true});});
  const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',' ':'lift',ArrowUp:'lift'};
  win.addEventListener('keydown',e=>{if(mode==='intro'&&e.key==='Enter'){e.preventDefault();enter.click();return;}if(keyMap[e.key]){e.preventDefault();keys[keyMap[e.key]]=true;}if((e.key==='p'||e.key==='P'||e.key==='Tab')&&!e.repeat){e.preventDefault();setPaused();}});
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
