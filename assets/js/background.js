(() => {
  'use strict';
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection && connection.saveData);
  const modes = {
    high:    { desktop: [64, 155, .20, 1], tablet: [42, 125, .16, 1], mobile: [24, 100, .12, 1], fps: 60, dpr: 2 },
    balanced:{ desktop: [48, 145, .18, 1], tablet: [30, 120, .14, 1], mobile: [16, 95, .10, 1], fps: 45, dpr: 1.75 },
    battery: { desktop: [30, 125, .14, 1], tablet: [20, 105, .11, 1], mobile: [10, 80, .08, 1], fps: 30, dpr: 1.25 },
    reduced: { desktop: [12, 90, .06, 1], tablet: [8, 70, .05, 1], mobile: [0, 0, 0, 1], fps: 20, dpr: 1 },
    disabled:{ desktop: [0, 0, 0, 0], tablet: [0, 0, 0, 0], mobile: [0, 0, 0, 0], fps: 0, dpr: 1 }
  };

  let mode = 'balanced';
  try { const saved = localStorage.getItem('canvasPerformance'); if (modes[saved]) mode = saved; } catch (_) {}
  const getDevice = () => coarsePointer.matches || innerWidth < 700 ? 'mobile' : innerWidth < 1100 ? 'tablet' : 'desktop';
  const getSettings = () => {
    const requested = modes[mode][getDevice()];
    if (reduceMotion.matches || saveData) return modes.reduced[getDevice()];
    return { count: requested[0], linkDistance: requested[1], speed: requested[2], fps: modes[mode].fps, dpr: modes[mode].dpr };
  };

  let width=0, height=0, dpr=1, rafId=0, running=false, lastTime=0, lastDraw=0, particles=[];
  let mouseX=0, mouseY=0, targetMouseX=0, targetMouseY=0;

  function createParticles(count) { particles = Array.from({length: count}, () => ({ x:Math.random()*width, y:Math.random()*height, vx:(Math.random()-.5)*.22, vy:(Math.random()-.5)*.22, radius:.7+Math.random()*1.5, alpha:.25+Math.random()*.55, hue:190+Math.random()*55 })); }
  function resize() {
    const rect=canvas.getBoundingClientRect(); width=Math.max(1,rect.width||innerWidth); height=Math.max(1,rect.height||innerHeight);
    const s=getSettings(); dpr=Math.min(devicePixelRatio||1, s.dpr); canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    if (particles.length!==s.count) createParticles(s.count);
  }
  function update(delta,s) {
    if (!s.count) return; const factor=Math.min(delta/16.67,2)*(s.speed/.16); mouseX+=(targetMouseX-mouseX)*.025; mouseY+=(targetMouseY-mouseY)*.025;
    particles.forEach(p=>{ p.x+=p.vx*factor; p.y+=p.vy*factor; p.x+=(mouseX-width/2)*.00002*factor; p.y+=(mouseY-height/2)*.00002*factor; if(p.x<-10)p.x=width+10;if(p.x>width+10)p.x=-10;if(p.y<-10)p.y=height+10;if(p.y>height+10)p.y=-10; });
  }
  function draw(s) {
    ctx.clearRect(0,0,width,height); if(!s.count)return; ctx.lineWidth=.6;
    for(let i=0;i<particles.length;i++){const a=particles[i];for(let j=i+1;j<particles.length;j++){const b=particles[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d>=s.linkDistance)continue;ctx.globalAlpha=(1-d/s.linkDistance)*.22;ctx.strokeStyle='rgba(68,181,253,1)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
    particles.forEach(p=>{ctx.globalAlpha=p.alpha;ctx.fillStyle=`hsl(${p.hue} 80% 65%)`;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();}); ctx.globalAlpha=1;
  }
  function frame(time) {
    if(!running)return; const s=getSettings(); const interval=s.fps?1000/s.fps:Infinity; if(time-lastDraw>=interval){const delta=lastTime?time-lastTime:16.67;lastTime=time;lastDraw=time;update(delta,s);draw(s);} rafId=requestAnimationFrame(frame);
  }
  function start(){if(running||document.hidden)return;const s=getSettings();if(!s.count||!s.fps)return;running=true;lastTime=0;lastDraw=0;rafId=requestAnimationFrame(frame);}
  function stop(){running=false;cancelAnimationFrame(rafId);rafId=0;}
  function sync(){resize();stop();if(!document.hidden&&getSettings().count)start();}
  function handlePointer(e){if(coarsePointer.matches)return;targetMouseX=e.clientX;targetMouseY=e.clientY;}
  window.setCanvasPerformance=function(next){if(!modes[next])return false;mode=next;try{localStorage.setItem('canvasPerformance',next);}catch(_){}sync();return true;};
  window.addEventListener('resize',sync,{passive:true}); window.addEventListener('pointermove',handlePointer,{passive:true}); document.addEventListener('visibilitychange',sync); reduceMotion.addEventListener?.('change',sync); coarsePointer.addEventListener?.('change',sync); connection?.addEventListener?.('change',sync);
  resize();sync();
})();
