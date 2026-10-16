/* Licitações · prazos da amostra. */
(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

/* ---- prazos da amostra: contagem regressiva ao vivo + régua de 30 dias ---- */
function prazos(){
 const now=Date.now();
 $$('.cd').forEach(el=>{
  const ms=new Date(el.dataset.end)-now, d=ms/864e5;
  el.className='pill cd '+(ms<=0?'n':d<3?'r':d<=7?'a':'n');
  if(ms<=0){el.textContent='Encerrado';return}
  const dd=Math.floor(d),hh=Math.floor((ms%864e5)/36e5);
  el.textContent=dd>0?`${dd}d ${hh}h`:`${hh}h ${Math.floor((ms%36e5)/6e4)}min`;
 });
 $$('.ruler').forEach(el=>{
  const d=(new Date(el.dataset.end)-now)/864e5, on=Math.max(0,Math.min(10,Math.ceil(d/3)));
  el.className='ruler '+(d<3?'r':d<=7?'a':'n');
  [...el.children].forEach((i,k)=>i.classList.toggle('on',k<on));
 });
}
prazos(); setInterval(prazos,60000);
})();
