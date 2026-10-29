/* Simulador de caldera – "la planta".  Node 18+, sin dependencias.
   Envía lecturas de sensores por HTTP POST al servidor IIoT.

   Uso:
     SERVER_URL=https://tu-servidor.onrender.com API_KEY=tu-clave node simulator.js
     node simulator.js --scenario=exceso_aire        (escenario fijo)
     node simulator.js --scenario=demo --speed=3     (historia guiada, 3x más rápida)
   Variables: SERVER_URL, API_KEY, PLANT, FUEL, INTERVAL (ms, por defecto 1500)         */
const arg=(n,d)=>{const a=process.argv.find(x=>x.startsWith('--'+n+'='));return a?a.split('=')[1]:d;};
const SERVER_URL=(process.env.SERVER_URL||'http://localhost:3000').replace(/\/$/,'');
const API_KEY=process.env.API_KEY||'demo-key';
const PLANT=process.env.PLANT||'Planta Demo – Caldera 1';
const FUEL=process.env.FUEL||'Carbón';
const INTERVAL=+(process.env.INTERVAL||1500);
const SPEED=+arg('speed',1);
const MODE=arg('scenario','demo');

/* Valores objetivo por escenario (lo que "pasa" en la caldera) */
const BASE={flow:1000,hum:7.61,tg:200,o2:6,co:0.05,tb:70,area:30,ta:28,rh:70,wind:1};
const SCEN={
 normal:        {desc:'Operación normal',                           t:{}},
 exceso_aire:   {desc:'Exceso de aire (ventilador mal regulado)',   t:{o2:11.5,tg:215}},
 ensuciamiento: {desc:'Ensuciamiento de tubos (hollín)',            t:{tg:262,tb:76}},
 comb_incompleta:{desc:'Combustión incompleta (poco aire)',         t:{o2:2.2,co:0.45,tg:195}},
 humedad_comb:  {desc:'Combustible húmedo',                         t:{hum:22,tg:190}},
 falla_o2:      {desc:'Falla del analizador de O₂ (sin señal)',     t:{}, o2Fail:true}
};
/* Historia guiada de ~4 min: [escenario, duración s] */
const DEMO=[['normal',30],['exceso_aire',40],['normal',25],['ensuciamiento',50],['normal',25],['comb_incompleta',30],['falla_o2',15],['normal',25]];

const state={...BASE};
const smooth={flow:.05,hum:.04,tg:.06,o2:.15,co:.15,tb:.03,area:1,ta:.02,rh:.02,wind:.1};
const noise={flow:8,hum:.08,tg:.8,o2:.06,co:.004,tb:.3,area:0,ta:.15,rh:.8,wind:.15};
const rnd=()=>(Math.random()+Math.random()+Math.random()-1.5)/1.5;   // ruido ~gaussiano

function scenarioAt(elapsedS){
 if(MODE!=='demo') return MODE;
 const total=DEMO.reduce((a,[,s])=>a+s,0); let t=(elapsedS*SPEED)%total;
 for(const [n,s] of DEMO){ if(t<s) return n; t-=s; } return 'normal';
}

const t0=Date.now(); let lastScen=null, ok=0, fail=0;
async function tick(){
 const name=scenarioAt((Date.now()-t0)/1000), sc=SCEN[name]||SCEN.normal;
 if(name!==lastScen){console.log(`\n▶ Escenario: ${sc.desc}`);lastScen=name;}
 const target={...BASE,...sc.t};
 /* ciclo diario suave de temperatura ambiente */
 target.ta=BASE.ta+3*Math.sin((Date.now()-t0)/60000);
 for(const k in state){ state[k]+= (target[k]-state[k])*Math.min(1,smooth[k]*SPEED) + rnd()*noise[k]; }
 const r=v=>+v.toFixed(2);
 const payload={
  plant:PLANT, fuel:FUEL, scenario:name, ts:new Date().toISOString(),
  flow:r(state.flow), hum:r(Math.max(0,state.hum)), tg:r(state.tg), o2:sc.o2Fail?null:r(Math.max(.5,state.o2)),
  co:r(Math.max(0,state.co)), tb:r(state.tb), area:state.area, ta:r(state.ta),
  rh:r(Math.min(100,Math.max(10,state.rh))), wind:r(Math.max(0,state.wind))
 };
 try{
  const res=await fetch(SERVER_URL+'/api/ingest',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':API_KEY},body:JSON.stringify(payload)});
  const j=await res.json().catch(()=>({}));
  if(res.ok){ok++;console.log(`#${ok} Tg ${payload.tg} °C | O₂ ${payload.o2??'—'} % | CO ${payload.co} % → η ${j.eff!=null?j.eff.toFixed(2)+' %':'sin cálculo'}`);}
  else{fail++;console.error('Servidor respondió',res.status);}
 }catch(e){fail++;console.error('No se pudo conectar a',SERVER_URL,'-',e.message);}
}
console.log(`Simulador de caldera → ${SERVER_URL}  (planta: ${PLANT}, combustible: ${FUEL}, modo: ${MODE}, ${INTERVAL} ms)`);
tick(); setInterval(tick,INTERVAL);
