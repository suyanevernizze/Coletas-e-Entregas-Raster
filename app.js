// ============================================================
//  APP.JS — Lógica de render, filtros e gráficos
//  Depende de dados.js (carregado antes no HTML)
// ============================================================

let dark = true;
document.body.classList.add('dark');

// Registros individuais da última planilha lida (para refiltrar por
// vínculo/placa/período sem precisar reler o arquivo).
let REGISTROS_TODOS = [];

// Reaplica vínculo, placa e período sobre REGISTROS_TODOS, reagrega
// e re-renderiza. Filial/Tipo/Ocorrência continuam sendo aplicados
// depois, em cima do agregado, como já funcionava.
function aplicarFiltrosAvancados(){
  if (typeof agregarRegistros !== 'function' || !REGISTROS_TODOS.length) return;

  const vinc  = document.getElementById('svinc')?.value || '';
  const placa = (document.getElementById('iplaca')?.value || '').trim().toUpperCase();
  const ini   = document.getElementById('dt-ini')?.value || '';
  const fim   = document.getElementById('dt-fim')?.value || '';

  let regs = REGISTROS_TODOS;
  if (vinc)  regs = regs.filter(r => r.vinculo === vinc);
  if (placa) regs = regs.filter(r => r.placa.includes(placa));
  if (ini){
    const di = new Date(ini + 'T00:00:00');
    regs = regs.filter(r => r.dataRef && r.dataRef >= di);
  }
  if (fim){
    const dfim = new Date(fim + 'T23:59:59');
    regs = regs.filter(r => r.dataRef && r.dataRef <= dfim);
  }

  aplicarDados(agregarRegistros(regs));
  re();

  const chip = document.getElementById('fchip');
  if (chip) chip.classList.toggle('lit', !!(vinc || placa || ini || fim));
}

function tg(){
  dark=!dark;
  document.body.classList.toggle('dark',dark);
  document.body.classList.toggle('light',!dark);
  const ic=document.getElementById('ticon');
  if(ic)ic.className=dark?'ti ti-sun ti-ico':'ti ti-moon ti-ico';
  re();
}

// ── Navegação ─────────────────────────────────────────────
function showTab(t){
  ['ce','sm','perm'].forEach(id=>{
    document.getElementById('p-'+id).classList.toggle('on',id===t);
    document.getElementById('tp-'+id).classList.toggle('on',id===t);
  });
  setTimeout(() => re(), 50);
}
function subAba(t){
  ['visao-geral','coletas','entregas','por-filial'].forEach(id=>{
    document.getElementById('sp-'+id).classList.toggle('on',id===t);
    document.getElementById('sub-'+id).classList.toggle('on',id===t);
  });
  // Re-render gráficos da sub-aba ativada (canvas invisíveis não renderizam)
  setTimeout(() => re(), 50);
}

// ── Calcular dados ────────────────────────────────────────
const fmt = n => n.toLocaleString('pt-BR');
const pct = (a,b) => Math.round(a/(b||1)*100);

function calc(filial, tipo, occ){
  const fils  = filial==='TODAS' ? FILIAIS : [filial];
  const tipos = tipo==='TODOS'   ? ['COLETA','ENTREGA'] : tipo==='COLETA' ? ['COLETA'] : ['ENTREGA'];
  let np=0,fp=0,afp=0,pol=0,can=0,col=0,ent=0;
  const pf={};
  FILIAIS.forEach(f=>{ pf[f]={np:0,fp:0,afp:0,pol:0,can:0,col:0,ent:0,cnp:0,cfp:0,enp:0,efp:0}; });
  fils.forEach(f=>{
    tipos.forEach(t=>{
      const d=DADOS_BRUTOS[f]?.[t]; if(!d) return;
      // Filtro de ocorrência: se selecionado, zera os outros
      const mult = (key) => (!occ || occ==='TODAS' || occ===key) ? 1 : 0;
      const vnp=d.np*mult('np'), vfp=d.fp*mult('fp'), vafp=d.afp*mult('afp'), vpol=d.pol*mult('pol'), vcan=d.can*mult('can');
      np+=vnp; fp+=vfp; afp+=vafp; pol+=vpol; can+=vcan;
      col+=d.col; ent+=d.ent;
      pf[f].np+=vnp; pf[f].fp+=vfp; pf[f].afp+=vafp;
      pf[f].pol+=vpol; pf[f].can+=vcan;
      pf[f].col+=d.col; pf[f].ent+=d.ent;
      if(t==='COLETA'){ pf[f].cnp+=vnp; pf[f].cfp+=vfp; }
      if(t==='ENTREGA'){ pf[f].enp+=vnp; pf[f].efp+=vfp; }
    });
  });
  return{np,fp,afp,pol,can,col,ent,pf,fils,T:np+fp+afp+pol+can||1};
}

function calcTipo(tipo, filial){
  const fils = filial && filial!=='TODAS' ? [filial] : FILIAIS;
  const tipos=[tipo];
  let np=0,fp=0,afp=0,pol=0,can=0,vol=0;
  const pf={};
  FILIAIS.forEach(f=>{
    pf[f]={np:0,fp:0,afp:0,pol:0,can:0,vol:0};
  });
  fils.forEach(f=>{
    tipos.forEach(t=>{
      const d=DADOS_BRUTOS[f]?.[t]; if(!d) return;
      const v=d.np+d.fp+d.afp+d.pol+d.can;
      np+=d.np; fp+=d.fp; afp+=d.afp; pol+=d.pol; can+=d.can; vol+=v;
      pf[f].np+=d.np; pf[f].fp+=d.fp; pf[f].afp+=d.afp;
      pf[f].pol+=d.pol; pf[f].can+=d.can; pf[f].vol+=v;
    });
  });
  return{np,fp,afp,pol,can,vol,pf,fils,T:np+fp+afp+pol+can||1};
}

// ── Gráficos ──────────────────────────────────────────────
const CH={};
function kill(id){if(CH[id]){CH[id].destroy();delete CH[id];}}
function cs(){return{grid:dark?'rgba(255,255,255,.04)':'rgba(0,0,0,.05)',tick:dark?'#2D6B3E':'#4A6B53',bdr:dark?'#1E3328':'#D8E2DA',ttBg:dark?'#111D15':'#fff',ttBdr:dark?'#1E3328':'#D8E2DA',ttT:dark?'#8DBD9A':'#0F2318',ttB:dark?'#6B9A78':'#4A6B53',dot:dark?'#0D1A11':'#fff'};}
function tt(c){return{backgroundColor:c.ttBg,borderColor:c.ttBdr,borderWidth:1,titleColor:c.ttT,bodyColor:c.ttB};}
function sc(c,st){return{grid:{color:c.grid},ticks:{font:{size:9},color:c.tick},border:{color:c.bdr},...(st?{stacked:true}:{})};}
function donut(id,data,colors){const c=cs();kill(id);CH[id]=new Chart(document.getElementById(id),{type:'doughnut',data:{datasets:[{data,backgroundColor:colors,borderWidth:3,borderColor:c.dot}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false},tooltip:{...tt(c),callbacks:{label:x=>` ${x.label||''}: ${x.parsed.toLocaleString('pt-BR')}`}}}}})}
function hbS(id,labels,ds){const c=cs();kill(id);CH[id]=new Chart(document.getElementById(id),{type:'bar',data:{labels,datasets:ds},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tt(c)},scales:{x:{...sc(c,true),min:0},y:sc(c,true)}}})}
function hb1(id,labels,data,cor){const c=cs();kill(id);CH[id]=new Chart(document.getElementById(id),{type:'bar',data:{labels,datasets:[{data,backgroundColor:cor,borderRadius:4,borderSkipped:false}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tt(c)},scales:{x:{...sc(c),min:0},y:sc(c)}}})}
function bAg(id,labels,ds){const c=cs();kill(id);CH[id]=new Chart(document.getElementById(id),{type:'bar',data:{labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tt(c)},scales:{x:{...sc(c),ticks:{...sc(c).ticks,maxRotation:30,autoSkip:false}},y:sc(c)}}})}
function mkLeg(id,items){document.getElementById(id).innerHTML=items.map(([l,c])=>`<span><span class="ld" style="background:${c}"></span>${l}</span>`).join('');}

function kpiHtml(k){return `<div class="kpi ${k.k}"><i class="ti ${k.ic} ki" aria-hidden="true" style="color:${k.c}"></i><div class="kl">${k.l}</div><div class="kv" style="color:${k.c}">${k.v}</div><div class="ks">${k.s}</div><div class="kb"><div class="kbf" style="width:${k.w}%;background:${k.c}"></div></div></div>`;}

// ── Render principal ───────────────────────────────────────
function re(){
  const fil=document.getElementById('sf').value;
  const tipo=document.getElementById('st').value;

  // ── RESUMO GLOBAL — viagens (por SM), coletas e entregas ──
  // Sempre visível, independente da aba. Respeita o filtro de Filial;
  // ignora Tipo, pois viagem é conceito de rota inteira (coleta+entregas).
  const resumoAtual = (fil === 'TODAS') ? RESUMO : (RESUMO_POR_FILIAL[fil] || {viagens:0,coletas:0,entregas:0,total:0});
  const rg = document.getElementById('resumo-global');
  if (rg) rg.innerHTML = [
    { ic:'ti-route',            c:'#FFB300', val:fmt(resumoAtual.viagens),  lbl:'Total de viagens (SM)' },
    { ic:'ti-package-import',   c:CORES.coletas,  val:fmt(resumoAtual.coletas),  lbl:'Total de coletas' },
    { ic:'ti-package-export',   c:CORES.entregas, val:fmt(resumoAtual.entregas), lbl:'Total de entregas' },
  ].map(r => `<div class="resumo-card"><div class="resumo-icon" style="background:${r.c}22"><i class="ti ${r.ic}" style="color:${r.c};font-size:19px" aria-hidden="true"></i></div><div><div class="resumo-val" style="color:${r.c}">${r.val}</div><div class="resumo-lbl">${r.lbl}</div></div></div>`).join('');
  const occ = document.getElementById('socc')?.value||'TODAS';
  const dtIni = document.getElementById('dt-ini')?.value||'';
  const dtFim = document.getElementById('dt-fim')?.value||'';
  const ativo = fil!=='TODAS'||tipo!=='TODOS'||occ!=='TODAS'||dtIni||dtFim;
  const chip = document.getElementById('fchip');
  if(chip) chip.classList.toggle('lit', ativo);
  let chipParts = [];
  if(fil!=='TODAS') chipParts.push(fil);
  if(tipo!=='TODOS') chipParts.push(tipo==='COLETA'?'Coletas':'Entregas');
  if(occ!=='TODAS') chipParts.push(occ);
  if(dtIni) chipParts.push(dtIni+(dtFim?' → '+dtFim:''));
  document.getElementById('chtxt').textContent = chipParts.length ? chipParts.join(' · ') : 'Todas as filiais · Todos os tipos';

  const d=calc(fil,tipo,occ);
  const T=d.T;
  const P=CORES;
  const CC=[P.foraDoPrazo,P.noPrazo,P.aberturaForaPrazo,P.poligonoIncorreto,P.cancelada];

  // ── VISÃO GERAL ──
  document.getElementById('kce-geral').innerHTML=[
    {k:'np',  ic:'ti-circle-check',  l:'No prazo',    v:fmt(d.np),  s:`${pct(d.np,T)}% do total`,  c:P.noPrazo,     w:pct(d.np,T)},
    {k:'fp',  ic:'ti-alert-circle',  l:'Fora do prazo',v:fmt(d.fp), s:`${pct(d.fp,T)}% do total`,  c:P.foraDoPrazo, w:pct(d.fp,T)},
    {k:'col', ic:'ti-package-import',l:'Coletas',      v:fmt(d.col), s:'registros',                 c:P.coletas,     w:Math.min(100,Math.round(d.col/200))},
    {k:'ent', ic:'ti-package-export',l:'Entregas',     v:fmt(d.ent), s:'registros',                 c:P.entregas,    w:Math.min(100,Math.round(d.ent/200))},
    {k:'alvo',ic:'ti-target',        l:'Dentro do alvo',v:fmt(13694),s:'81,8% das viagens',         c:P.dentroAlvo,  w:82},
    {k:'saida',ic:'ti-logout',       l:'Saída no prazo',v:fmt(8069), s:'46,6% das saídas',          c:'#AB47BC',     w:47},
    {k:'tot', ic:'ti-sum',           l:'Total',         v:fmt(T),    s:'período selecionado',       c:'#FFD600',     w:100},
  ].map(kpiHtml).join('');

  mkLeg('lg-ch',[[`Fora prazo ${pct(d.fp,T)}%`,P.foraDoPrazo],[`No prazo ${pct(d.np,T)}%`,P.noPrazo],[`Abertura SM FP ${pct(d.afp,T)}%`,P.aberturaForaPrazo],[`Polígono ${pct(d.pol,T)}%`,P.poligonoIncorreto]]);
  donut('c-ch',[d.fp,d.np,d.afp,d.pol,d.can],CC);
  donut('c-saida',DONUT_SAIDA.data,[P.noPrazo,P.foraDoPrazo,'#607D8B','#90A4AE']);
  donut('c-alvo',DONUT_ALVO.data,['#2E7D32','#C62828']);
  donut('c-vinc',DONUT_VINCULO.data,[P.agregado,P.terceiro,P.frota]);
  // Linhas do tempo
  renderTimelineCE();
  renderTimelineSM();

  bAg('c-ce',d.fils,[
    {label:'Col',data:d.fils.map(f=>d.pf[f].col),backgroundColor:P.coletas,borderRadius:3,borderSkipped:false},
    {label:'Ent',data:d.fils.map(f=>d.pf[f].ent),backgroundColor:P.entregas,borderRadius:3,borderSkipped:false},
  ]);

  // ── COLETAS ──
  const dc=calcTipo('COLETA', fil);
  document.getElementById('bs-coletas').innerHTML=[
    {c:P.coletas,   ic:'ti-package-import', val:fmt(dc.vol),  lbl:'Total de coletas',      sub:'registros no período'},
    {c:P.noPrazo,   ic:'ti-circle-check',   val:fmt(dc.np),   lbl:'Coletas no prazo',      sub:`${pct(dc.np,dc.T)}% das coletas`},
    {c:P.foraDoPrazo,ic:'ti-alert-circle',  val:fmt(dc.fp),   lbl:'Coletas fora do prazo', sub:`${pct(dc.fp,dc.T)}% das coletas`},
    {c:P.dentroAlvo,ic:'ti-target',         val:`${pct(dc.np,dc.T)}%`,lbl:'Taxa de pontualidade',sub:'coletas no prazo'},
  ].map(b=>`<div class="big-stat"><div class="big-stat-icon" style="background:${b.c}22"><i class="ti ${b.ic}" style="color:${b.c};font-size:20px" aria-hidden="true"></i></div><div><div class="big-stat-val" style="color:${b.c}">${b.val}</div><div class="big-stat-lbl">${b.lbl}</div><div class="big-stat-sub">${b.sub}</div></div></div>`).join('');

  document.getElementById('kce-coletas').innerHTML=[
    {k:'np', ic:'ti-circle-check', l:'No prazo',    v:fmt(dc.np),  s:`${pct(dc.np,dc.T)}%`,  c:P.noPrazo,     w:pct(dc.np,dc.T)},
    {k:'fp', ic:'ti-alert-circle', l:'Fora do prazo',v:fmt(dc.fp), s:`${pct(dc.fp,dc.T)}%`,  c:P.foraDoPrazo, w:pct(dc.fp,dc.T)},
    {k:'afp',ic:'ti-clock-x',      l:'Abertura SM FP',v:fmt(dc.afp),s:`${pct(dc.afp,dc.T)}%`,c:P.aberturaForaPrazo,w:pct(dc.afp,dc.T)},
    {k:'pol',ic:'ti-map-search',   l:'Polígono incor.',v:fmt(dc.pol),s:`${pct(dc.pol,dc.T)}%`,c:P.poligonoIncorreto,w:pct(dc.pol,dc.T)},
    {k:'can',ic:'ti-ban',          l:'Canceladas',  v:fmt(dc.can), s:`${pct(dc.can,dc.T)}%`,  c:P.cancelada,   w:pct(dc.can,dc.T)},
  ].map(kpiHtml).join('');

  mkLeg('lg-col-ch',[[`No prazo ${pct(dc.np,dc.T)}%`,P.noPrazo],[`Fora prazo ${pct(dc.fp,dc.T)}%`,P.foraDoPrazo],[`Abertura SM FP ${pct(dc.afp,dc.T)}%`,P.aberturaForaPrazo],[`Polígono ${pct(dc.pol,dc.T)}%`,P.poligonoIncorreto]]);
  donut('c-col-ch',[dc.np,dc.fp,dc.afp,dc.pol,dc.can],[P.noPrazo,P.foraDoPrazo,P.aberturaForaPrazo,P.poligonoIncorreto,P.cancelada]);
  hbS('c-col-fil',dc.fils||FILIAIS,[
    {label:'NP',data:(dc.fils||FILIAIS).map(f=>dc.pf[f].np),backgroundColor:P.noPrazo,borderRadius:2},
    {label:'FP',data:(dc.fils||FILIAIS).map(f=>dc.pf[f].fp),backgroundColor:P.foraDoPrazo,borderRadius:2},
  ]);

  // ── ENTREGAS ──
  const de=calcTipo('ENTREGA', fil);
  document.getElementById('bs-entregas').innerHTML=[
    {c:P.entregas,  ic:'ti-package-export', val:fmt(de.vol),  lbl:'Total de entregas',      sub:'registros no período'},
    {c:P.noPrazo,   ic:'ti-circle-check',   val:fmt(de.np),   lbl:'Entregas no prazo',      sub:`${pct(de.np,de.T)}% das entregas`},
    {c:P.foraDoPrazo,ic:'ti-alert-circle',  val:fmt(de.fp),   lbl:'Entregas fora do prazo', sub:`${pct(de.fp,de.T)}% das entregas`},
    {c:P.dentroAlvo,ic:'ti-target',         val:`${pct(de.np,de.T)}%`,lbl:'Taxa de pontualidade',sub:'entregas no prazo'},
  ].map(b=>`<div class="big-stat"><div class="big-stat-icon" style="background:${b.c}22"><i class="ti ${b.ic}" style="color:${b.c};font-size:20px" aria-hidden="true"></i></div><div><div class="big-stat-val" style="color:${b.c}">${b.val}</div><div class="big-stat-lbl">${b.lbl}</div><div class="big-stat-sub">${b.sub}</div></div></div>`).join('');

  document.getElementById('kce-entregas').innerHTML=[
    {k:'np', ic:'ti-circle-check', l:'No prazo',    v:fmt(de.np),  s:`${pct(de.np,de.T)}%`,  c:P.noPrazo,     w:pct(de.np,de.T)},
    {k:'fp', ic:'ti-alert-circle', l:'Fora do prazo',v:fmt(de.fp), s:`${pct(de.fp,de.T)}%`,  c:P.foraDoPrazo, w:pct(de.fp,de.T)},
    {k:'afp',ic:'ti-clock-x',      l:'Abertura SM FP',v:fmt(de.afp),s:`${pct(de.afp,de.T)}%`,c:P.aberturaForaPrazo,w:pct(de.afp,de.T)},
    {k:'pol',ic:'ti-map-search',   l:'Polígono incor.',v:fmt(de.pol),s:`${pct(de.pol,de.T)}%`,c:P.poligonoIncorreto,w:pct(de.pol,de.T)},
    {k:'can',ic:'ti-ban',          l:'Canceladas',  v:fmt(de.can), s:`${pct(de.can,de.T)}%`,  c:P.cancelada,   w:pct(de.can,de.T)},
  ].map(kpiHtml).join('');

  mkLeg('lg-ent-ch',[[`No prazo ${pct(de.np,de.T)}%`,P.noPrazo],[`Fora prazo ${pct(de.fp,de.T)}%`,P.foraDoPrazo],[`Abertura SM FP ${pct(de.afp,de.T)}%`,P.aberturaForaPrazo],[`Polígono ${pct(de.pol,de.T)}%`,P.poligonoIncorreto]]);
  donut('c-ent-ch',[de.np,de.fp,de.afp,de.pol,de.can],[P.noPrazo,P.foraDoPrazo,P.aberturaForaPrazo,P.poligonoIncorreto,P.cancelada]);
  hbS('c-ent-fil',de.fils||FILIAIS,[
    {label:'NP',data:(de.fils||FILIAIS).map(f=>de.pf[f].np),backgroundColor:P.noPrazo,borderRadius:2},
    {label:'FP',data:(de.fils||FILIAIS).map(f=>de.pf[f].fp),backgroundColor:P.foraDoPrazo,borderRadius:2},
  ]);

  // ── POR FILIAL ──
  document.getElementById('filial-list').innerHTML=d.fils.map(f=>{
    const pd=d.pf[f];
    const ft=pd.np+pd.fp+pd.afp+pd.pol+pd.can||1;
    const bars=[
      {l:'No prazo',v:pd.np,c:P.noPrazo},
      {l:'Fora prazo',v:pd.fp,c:P.foraDoPrazo},
      {l:'Abertura SM FP',v:pd.afp,c:P.aberturaForaPrazo},
      {l:'Polígono',v:pd.pol,c:P.poligonoIncorreto},
    ];
    return `<div class="filial-row">
      <div class="filial-header"><span class="filial-name">${f}</span><span class="filial-total">${fmt(ft)} registros</span></div>
      <div class="filial-bars">${bars.map(b=>`<div class="fbar-item">
        <span class="fbar-label">${b.l}</span>
        <div class="fbar-track"><div class="fbar-fill" style="width:${pct(b.v,ft)}%;background:${b.c}"></div></div>
        <span class="fbar-pct" style="color:${b.c}">${pct(b.v,ft)}%</span>
      </div>`).join('')}</div>
      <div class="filial-kpis">
        <div class="fkpi" style="border-left-color:${P.coletas}"><div class="fkpi-l">Coletas</div><div class="fkpi-v" style="color:${P.coletas}">${fmt(pd.col)}</div><div class="fkpi-s">registros</div></div>
        <div class="fkpi" style="border-left-color:${P.entregas}"><div class="fkpi-l">Entregas</div><div class="fkpi-v" style="color:${P.entregas}">${fmt(pd.ent)}</div><div class="fkpi-s">registros</div></div>
        <div class="fkpi" style="border-left-color:${P.noPrazo}"><div class="fkpi-l">No prazo</div><div class="fkpi-v" style="color:${P.noPrazo}">${pct(pd.np,ft)}%</div><div class="fkpi-s">${fmt(pd.np)} reg.</div></div>
        <div class="fkpi" style="border-left-color:${P.foraDoPrazo}"><div class="fkpi-l">Fora do prazo</div><div class="fkpi-v" style="color:${P.foraDoPrazo}">${pct(pd.fp,ft)}%</div><div class="fkpi-s">${fmt(pd.fp)} reg.</div></div>
      </div>
    </div>`;
  }).join('');

  // ── ABA SM — inconsistências ──
  const totalAfp = d.fils.reduce((s,f)=>s+d.pf[f].afp,0);
  const totalPol = d.fils.reduce((s,f)=>s+d.pf[f].pol,0);
  const totalCan = d.fils.reduce((s,f)=>s+d.pf[f].can,0);
  const totalIncons = totalAfp + totalPol + totalCan;

  document.getElementById('incons-cards').innerHTML=[
    {c:P.aberturaForaPrazo,ic:'ti-clock-x',       lbl:'Abertura SM Fora do Prazo', val:fmt(totalAfp), sub:`${pct(totalAfp,T)}% do total · SM efetivada tardiamente`,  bw:pct(totalAfp,T)},
    {c:P.poligonoIncorreto,ic:'ti-map-search',    lbl:'Polígono incorreto',        val:fmt(totalPol), sub:`${pct(totalPol,T)}% do total · Veículo fora da área`,         bw:pct(totalPol,T)},
    {c:P.cancelada,        ic:'ti-ban',           lbl:'Canceladas',                val:fmt(totalCan), sub:`${pct(totalCan,T)}% do total · SMs canceladas`,               bw:pct(totalCan,T)},
    {c:'#E91E63',          ic:'ti-alert-triangle',lbl:'Total de inconsistências',  val:fmt(totalIncons),sub:`${pct(totalIncons,T)}% do total de registros`,              bw:pct(totalIncons,T)},
  ].map(c=>`<div class="incons-card" style="--glow-color:${c.c};border-top-color:${c.c}">
    <i class="ti ${c.ic} incons-icon" aria-hidden="true" style="color:${c.c}"></i>
    <div class="incons-lbl">${c.lbl}</div>
    <div class="incons-val" style="color:${c.c}">${c.val}</div>
    <div class="incons-sub">${c.sub}</div>
    <div class="incons-bar"><div class="incons-bar-fill" style="width:${c.bw}%;background:${c.c}"></div></div>
  </div>`).join('');

  document.getElementById('ksm').innerHTML=[
    {k:'afp',ic:'ti-clock-x',    l:'Abertura SM FP',      v:fmt(totalAfp), s:`${pct(totalAfp,T)}%`,    c:P.aberturaForaPrazo, w:pct(totalAfp,T)},
    {k:'pol',ic:'ti-map-search', l:'Polígono incorreto',  v:fmt(totalPol), s:`${pct(totalPol,T)}%`,    c:P.poligonoIncorreto, w:pct(totalPol,T)},
    {k:'can',ic:'ti-ban',        l:'Canceladas',          v:fmt(totalCan), s:`${pct(totalCan,T)}%`,    c:P.cancelada,         w:pct(totalCan,T)},
    {k:'np', ic:'ti-circle-check',l:'SM abertas no prazo',v:fmt(d.np),    s:`${pct(d.np,T)}% do total`,c:P.noPrazo,           w:pct(d.np,T)},
    {k:'fp', ic:'ti-alert-circle',l:'Chegada fora prazo', v:fmt(d.fp),    s:`${pct(d.fp,T)}% do total`,c:P.foraDoPrazo,       w:pct(d.fp,T)},
    {k:'tot',ic:'ti-sum',        l:'Total',               v:fmt(T),       s:'período',                 c:'#FFD600',           w:100},
  ].map(kpiHtml).join('');

  mkLeg('lg-sm',[[`Abertura SM FP ${pct(totalAfp,T)}%`,P.aberturaForaPrazo],[`Polígono incor. ${pct(totalPol,T)}%`,P.poligonoIncorreto],[`Canceladas ${pct(totalCan,T)}%`,P.cancelada],[`No prazo ${pct(d.np,T)}%`,P.noPrazo]]);
  donut('s-dist',[totalAfp,totalPol,totalCan,d.np,d.fp],[P.aberturaForaPrazo,P.poligonoIncorreto,P.cancelada,P.noPrazo,P.foraDoPrazo]);
  hb1('s-pol',FILIAIS,FILIAIS.map(f=>d.pf[f].pol),P.poligonoIncorreto);
  bAg('s-fil',FILIAIS,[
    {label:'Abertura SM FP',data:FILIAIS.map(f=>d.pf[f].afp),backgroundColor:P.aberturaForaPrazo,borderRadius:3,borderSkipped:false},
    {label:'Polígono',      data:FILIAIS.map(f=>d.pf[f].pol),backgroundColor:P.poligonoIncorreto,borderRadius:3,borderSkipped:false},
    {label:'Canceladas',    data:FILIAIS.map(f=>d.pf[f].can),backgroundColor:P.cancelada,borderRadius:3,borderSkipped:false},
  ]);

  document.getElementById('crz').innerHTML=[
    {t:'Abertura SM Fora do Prazo',  v:fmt(totalAfp), p:`${pct(totalAfp,T)}%`, bc:P.aberturaForaPrazo, vc:P.aberturaForaPrazo, bb:dark?'rgba(251,140,0,.12)':'#FEF3E0', bt:dark?'#FB8C00':'#7A3E00'},
    {t:'Polígono incorreto',          v:fmt(totalPol), p:`${pct(totalPol,T)}%`, bc:P.poligonoIncorreto, vc:P.poligonoIncorreto, bb:dark?'rgba(124,131,224,.12)':'#ECEEFE',bt:dark?'#7C83E0':'#2C3483'},
    {t:'Canceladas',                  v:fmt(totalCan), p:`${pct(totalCan,T)}%`, bc:P.cancelada,         vc:P.cancelada,         bb:dark?'rgba(96,125,139,.12)':'#ECEFF1', bt:dark?'#607D8B':'#37474F'},
    {t:'SM abertas no prazo',         v:fmt(d.np),     p:`${pct(d.np,T)}%`,     bc:P.noPrazo,           vc:P.noPrazo,           bb:dark?'rgba(0,191,165,.12)':'#D6F5F0',  bt:dark?'#00BFA5':'#005E52'},
  ].map(c=>`<div class="cc" style="border-top-color:${c.bc}"><div class="cct">${c.t}</div><div class="ccv" style="color:${c.vc}">${c.v}</div><span class="bdg" style="background:${c.bb};color:${c.bt}">${c.p}</span></div>`).join('');

  if (typeof renderPermanencia === 'function') renderPermanencia(fil, tipo);
}

function periodoRapido(){
  const v   = document.getElementById('periodo-rapido').value;
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth(); // 0-based
  const pad = n => String(n).padStart(2,'0');
  const fmt = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  let ini='', fim='';

  if(v==='mes-atual'){
    ini = fmt(new Date(y, m, 1));
    fim = fmt(new Date(y, m+1, 0));
  } else if(v==='mes-anterior'){
    ini = fmt(new Date(y, m-1, 1));
    fim = fmt(new Date(y, m, 0));
  } else if(v==='trimestre-atual'){
    const q = Math.floor(m/3);
    ini = fmt(new Date(y, q*3, 1));
    fim = fmt(new Date(y, q*3+3, 0));
  } else if(v==='semestre-atual'){
    const s = m < 6 ? 0 : 1;
    ini = fmt(new Date(y, s*6, 1));
    fim = fmt(new Date(y, s*6+6, 0));
  } else if(v==='ano-atual'){
    ini = y+'-01-01';
    fim = y+'-12-31';
  } else if(v==='ano-anterior'){
    ini = (y-1)+'-01-01';
    fim = (y-1)+'-12-31';
  }

  if(ini){
    document.getElementById('dt-ini').value = ini;
    document.getElementById('dt-fim').value = fim;
    aplicarFiltrosAvancados();
  }
}

function limparFiltros(){
  document.getElementById('sf').value='TODAS';
  document.getElementById('st').value='TODOS';
  document.getElementById('socc').value='TODAS';
  document.getElementById('dt-ini').value='';
  document.getElementById('dt-fim').value='';
  document.getElementById('periodo-rapido').value='';
  document.getElementById('socc').value='TODAS';
  const vinc = document.getElementById('svinc'); if (vinc) vinc.value='';
  document.querySelectorAll('.fsel').forEach(s=>{ if(s.tagName==='SELECT' && !['sf','st','socc','periodo-rapido','svinc'].includes(s.id)) s.selectedIndex=0; });
  document.querySelectorAll('.finput').forEach(i=>i.value='');
  document.getElementById('fchip').classList.remove('lit');
  aplicarFiltrosAvancados();
}

// ─── Upload / Drag & Drop ─────────────────────────────────
function handleFile(file) {
  if (!file) return;
  const dz = document.getElementById('dropZone');
  if (dz) dz.classList.add('loading');
  mostrarStatusUpload('Lendo ' + file.name + '…', false);

  lerPlanilha(file, function(dados){
    REGISTROS_TODOS = dados._registros || [];
    aplicarDados(dados);
    const badge = document.getElementById('fn');
    if (badge) badge.textContent = file.name + '  ·  ' + dados.totalValidos.toLocaleString('pt-BR') + ' reg.';
    if (dz) dz.classList.remove('loading');
    launchApp();
  }, function(err){
    if (dz) dz.classList.remove('loading');
    mostrarStatusUpload('Não consegui ler essa planilha. Verifique se é o relatório Raster (.xlsx) com as colunas de chegada e saída.', true);
  });
}

function mostrarStatusUpload(msg, erro){
  let el = document.getElementById('upload-status');
  if (!el){
    el = document.createElement('div');
    el.id = 'upload-status';
    el.style.cssText = 'margin-top:14px;font-size:12px;text-align:center;max-width:400px;line-height:1.6';
    const dz = document.getElementById('dropZone');
    if (dz && dz.parentNode) dz.parentNode.insertBefore(el, dz.nextSibling);
  }
  el.style.color = erro ? '#EF5350' : 'var(--txt2)';
  el.textContent = msg;
}

function launchApp() {
  const up  = document.getElementById('upload-screen');
  const app = document.getElementById('app-screen');
  if (up)  up.style.display  = 'none';
  if (app) {
    app.style.display = 'flex';
    app.style.flexDirection = 'column';
    app.style.minHeight = '100vh';
  }

  // Preencher nome/sub no upload screen
  const upName = document.getElementById('up-name');
  const upSub  = document.getElementById('up-sub');
  if (upName) upName.textContent = CONFIG.empresa;
  if (upSub)  upSub.textContent  = CONFIG.subtitulo;

  // Filiais já populadas no HTML
  // Chamar re() diretamente — DOM já está pronto quando launchApp é chamado
  re();
}

function trocarArquivo() {
  const up  = document.getElementById('upload-screen');
  const app = document.getElementById('app-screen');
  if (up)  up.style.display  = 'flex';
  if (app) app.style.display = 'none';
  const fi = document.getElementById('fileInput');
  if (fi) fi.value = '';
}

// Init upload events

// ═══════════════════════════════════════════════════════════
//  LINHAS DO TEMPO
// ═══════════════════════════════════════════════════════════

function renderTimelineCE() {
  const c = cs();
  const id = 'ch-timeline-ce';
  kill(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;

  CH[id] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: MESES,
      datasets: [
        {
          label: 'Coletas',
          data: MENSAL_CE.coletas,
          borderColor: CORES.coletas,
          backgroundColor: CORES.coletas + '18',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: CORES.coletas,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Entregas',
          data: MENSAL_CE.entregas,
          borderColor: CORES.entregas,
          backgroundColor: CORES.entregas + '18',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: CORES.entregas,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'No prazo',
          data: MENSAL_CE.noPrazo,
          borderColor: CORES.noPrazo,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: CORES.noPrazo,
          borderDash: [],
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Fora do prazo',
          data: MENSAL_CE.foraPrazo,
          borderColor: CORES.foraDoPrazo,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: CORES.foraDoPrazo,
          borderDash: [5, 3],
          tension: 0.4,
          fill: false,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: c.tick,
            font: { size: 10, family: 'Inter,system-ui' },
            boxWidth: 12,
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          ...tt(c),
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('pt-BR')}`,
          }
        }
      },
      scales: {
        x: {
          ...sc(c),
          grid: { color: c.grid },
        },
        y: {
          ...sc(c),
          grid: { color: c.grid },
          ticks: {
            ...sc(c).ticks,
            callback: v => v >= 1000 ? (v/1000).toFixed(1)+'k' : v,
          }
        }
      }
    }
  });
}

function renderTimelineSM() {
  const c = cs();
  const id = 'ch-timeline-sm';
  kill(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;

  // Cores para cada filial no ranking
  const filColors = [
    CORES.foraDoPrazo,       // Lages — vermelho (maior)
    CORES.aberturaForaPrazo, // Telêmaco — laranja
    '#AB47BC',               // Jundiaí — roxo
    CORES.noPrazo,           // Otacílio — teal
    CORES.coletas,           // Guarulhos — azul
    CORES.entregas,          // Itajaí — verde
    '#78909C',               // Correia Pinto — cinza
    '#FFD600',               // Betim — amarelo
  ];

  const datasets = Object.entries(MENSAL_SM).map(([filial, data], i) => ({
    label: filial.replace('FL ', ''),
    data,
    borderColor: filColors[i],
    backgroundColor: 'transparent',
    borderWidth: i < 4 ? 2.5 : 1.5,
    pointRadius: i < 4 ? 4 : 3,
    pointHoverRadius: 7,
    pointBackgroundColor: filColors[i],
    tension: 0.4,
    fill: false,
    hidden: i > 4, // mostrar top 5 por padrão
  }));

  CH[id] = new Chart(canvas, {
    type: 'line',
    data: { labels: MESES, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: c.tick,
            font: { size: 10, family: 'Inter,system-ui' },
            boxWidth: 12,
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          ...tt(c),
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('pt-BR')}`,
            afterBody: items => {
              const total = items.reduce((s,i) => s + i.parsed.y, 0);
              return [`Total: ${total.toLocaleString('pt-BR')}`];
            }
          }
        }
      },
      scales: {
        x: { ...sc(c), grid: { color: c.grid } },
        y: {
          ...sc(c),
          grid: { color: c.grid },
          title: {
            display: true,
            text: 'Inconsistências',
            color: c.tick,
            font: { size: 10 },
          }
        }
      }
    }
  });
}

// Inicializar tudo quando o DOM estiver pronto
// ═══════════════════════════════════════════════════════════
//  PERMANÊNCIA — render
// ═══════════════════════════════════════════════════════════

function hhmm(min){
  const m = Math.round(min);
  if (m < 60) return m + 'min';
  const h = Math.floor(m/60), r = m%60;
  return r === 0 ? h + 'h' : h + 'h' + String(r).padStart(2,'0');
}

const FAIXA_LIM = [0,60,120,180,240,300,480,720];
function percentilFaixa(counts, p){
  const total = counts.reduce((a,b)=>a+b,0);
  if (!total) return 0;
  const alvo = total*p; let acc=0;
  for (let i=0;i<counts.length;i++){
    if (acc+counts[i] >= alvo){
      const df=(alvo-acc)/(counts[i]||1);
      return FAIXA_LIM[i]+df*(FAIXA_LIM[i+1]-FAIXA_LIM[i]);
    }
    acc+=counts[i];
  }
  return FAIXA_LIM[FAIXA_LIM.length-1];
}

function calcPerm(filial, tipo){
  const fils = filial==='TODAS' ? FILIAIS : [filial];
  const tipos = tipo==='TODOS' ? ['COLETA','ENTREGA'] : [tipo];
  let dentro=0, fora=0, amostra=0, somaMedia=0;
  const pf={};
  fils.forEach(f=>{
    pf[f]={dentro:0,fora:0,amostra:0,mediana:0,p90:0};
    let peso=0;
    tipos.forEach(t=>{
      const d=TEMPOS[f]?.[t]; if(!d) return;
      dentro+=d.dentro; fora+=d.fora; amostra+=d.amostra; somaMedia+=d.media*d.amostra;
      pf[f].dentro+=d.dentro; pf[f].fora+=d.fora; pf[f].amostra+=d.amostra;
      pf[f].mediana+=d.mediana*d.amostra; pf[f].p90+=d.p90*d.amostra; peso+=d.amostra;
    });
    pf[f].mediana=peso?Math.round(pf[f].mediana/peso):0;
    pf[f].p90=peso?Math.round(pf[f].p90/peso):0;
  });
  const faixas=TEMPOS_FAIXAS.labels.map((_,i)=>tipos.reduce((s,t)=>s+(TEMPOS_FAIXAS[t][i]||0),0));
  const foraGlobal=FILIAIS.reduce((s,f)=>s+tipos.reduce((x,t)=>x+(TEMPOS[f]?.[t]?.fora||0),0),0);
  const excGlobal=faixas.reduce((s,c,i)=>s+c*TEMPOS_FAIXAS.excedenteMedio[i],0);
  const excedente=foraGlobal?excGlobal*(fora/foraGlobal):0;
  return { dentro,fora,amostra,pf,fils,faixas,excedente,
    media: amostra?Math.round(somaMedia/amostra):0,
    mediana: filial==='TODAS'?percentilFaixa(faixas,0.5):pf[filial].mediana,
    p90: filial==='TODAS'?percentilFaixa(faixas,0.9):pf[filial].p90 };
}

function subAbaPerm(t){
  ['carencia','tempos-reais'].forEach(id=>{
    const sp=document.getElementById('sp-'+id), sb=document.getElementById('sub-'+id);
    if(sp) sp.classList.toggle('on', id===t);
    if(sb) sb.classList.toggle('on', id===t);
  });
  setTimeout(()=>{ re(); }, 50);
}

function bigStatHtml(b){
  return `<div class="big-stat"><div class="big-stat-icon" style="background:${b.c}22"><i class="ti ${b.ic}" style="color:${b.c};font-size:20px" aria-hidden="true"></i></div><div><div class="big-stat-val" style="color:${b.c}">${b.val}</div><div class="big-stat-lbl">${b.lbl}</div><div class="big-stat-sub">${b.sub}</div></div></div>`;
}

function renderCarencia(filial, tipo){
  const P=CORES, c=cs();
  const d=calcPerm(filial, tipo);
  const T=d.amostra||1;
  const bs=document.getElementById('bs-perm');
  if(bs) bs.innerHTML=[
    {c:P.noPrazo,ic:'ti-circle-check',val:`${pct(d.dentro,T)}%`,lbl:'Dentro da carência',sub:`${fmt(d.dentro)} de ${fmt(T)} até 5h00`},
    {c:P.excedente,ic:'ti-alarm',val:fmt(d.fora),lbl:'Estouros de carência',sub:`${pct(d.fora,T)}% passaram de 5h00`},
    {c:P.foraAlvo,ic:'ti-hourglass-high',val:fmt(Math.round(d.excedente)),lbl:'Horas excedentes',sub:'estimativa além das 5h'},
    {c:P.p90,ic:'ti-arrow-bar-to-up',val:hhmm(d.p90),lbl:'p90 (piores 10%)',sub:'10% passam disso'},
  ].map(bigStatHtml).join('');
  const kp=document.getElementById('kperm');
  if(kp) kp.innerHTML=[
    {k:'med',ic:'ti-clock-hour-4',l:'Mediana',v:hhmm(d.mediana),s:'caminhão do meio',c:P.mediana,w:Math.min(100,Math.round(d.mediana/CARENCIA_MIN*100))},
    {k:'p90',ic:'ti-clock-exclamation',l:'Piores 10% (p90)',v:hhmm(d.p90),s:'limite dos piores',c:P.p90,w:Math.min(100,Math.round(d.p90/CARENCIA_MIN*100))},
    {k:'saida',ic:'ti-calculator',l:'Média',v:hhmm(d.media),s:'puxada pela cauda',c:'#AB47BC',w:Math.min(100,Math.round(d.media/CARENCIA_MIN*100))},
    {k:'alvo',ic:'ti-target',l:'Carência',v:hhmm(CARENCIA_MIN),s:'5h contrato',c:P.carencia,w:100},
    {k:'exc',ic:'ti-alarm',l:'Estouros',v:fmt(d.fora),s:`${pct(d.fora,T)}%`,c:P.excedente,w:pct(d.fora,T)},
    {k:'tot',ic:'ti-sum',l:'Registros',v:fmt(T),s:'com tempo apurado',c:'#FFD600',w:100},
  ].map(kpiHtml).join('');
  const coresFaixa=TEMPOS_FAIXAS.estouro.map(e=>e?P.excedente:P.mediana);
  mkLeg('lg-perm-faixa',[['Dentro da carência',P.mediana],['Acima de 5h00',P.excedente]]);
  kill('c-perm-faixa');
  const cvF=document.getElementById('c-perm-faixa');
  if(cvF) CH['c-perm-faixa']=new Chart(cvF,{type:'bar',
    data:{labels:TEMPOS_FAIXAS.labels,datasets:[{data:d.faixas,backgroundColor:coresFaixa,borderRadius:4,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...tt(c),callbacks:{label:x=>` ${x.parsed.y.toLocaleString('pt-BR')} reg. (${pct(x.parsed.y,d.faixas.reduce((a,b)=>a+b,0))}%)`}}},scales:{x:sc(c),y:{...sc(c),min:0}}}});
  hb1('c-perm-estouro',FILIAIS,FILIAIS.map(f=>{const t=tipo==='TODOS'?['COLETA','ENTREGA']:[tipo];return t.reduce((s,x)=>s+(TEMPOS[f]?.[x]?.fora||0),0);}),P.excedente);
  mkLeg('lg-perm-fil',[['Mediana',P.mediana],['p90 (piores 10%)',P.p90],['Carência 5h',P.carencia]]);
  kill('c-perm-fil');
  const cvFil=document.getElementById('c-perm-fil');
  if(cvFil) CH['c-perm-fil']=new Chart(cvFil,{type:'bar',
    data:{labels:FILIAIS.map(f=>f.replace('FL ','')),datasets:[
      {label:'Mediana',data:FILIAIS.map(f=>calcPerm(f,tipo).pf[f].mediana),backgroundColor:P.mediana,borderRadius:3,borderSkipped:false},
      {label:'p90',data:FILIAIS.map(f=>calcPerm(f,tipo).pf[f].p90),backgroundColor:P.p90,borderRadius:3,borderSkipped:false},
      {label:'Carência',type:'line',data:FILIAIS.map(()=>CARENCIA_MIN),borderColor:P.carencia,borderWidth:2,borderDash:[6,4],pointRadius:0,fill:false},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...tt(c),callbacks:{label:x=>` ${x.dataset.label}: ${hhmm(x.parsed.y)}`}}},scales:{x:{...sc(c),ticks:{...sc(c).ticks,maxRotation:30,autoSkip:false}},y:{...sc(c),min:0,ticks:{...sc(c).ticks,callback:v=>hhmm(v)}}}}});
  const lista=document.getElementById('perm-list');
  if(lista) lista.innerHTML=d.fils.map(f=>{
    const pd=d.pf[f]; const tt2=pd.amostra||1;
    const bars=[{l:'Dentro 5h',v:pd.dentro,c:P.noPrazo},{l:'Acima 5h',v:pd.fora,c:P.excedente}];
    return `<div class="filial-row"><div class="filial-header"><span class="filial-name">${f}</span><span class="filial-total">${fmt(pd.amostra)} reg. · mediana ${hhmm(pd.mediana)}</span></div>
      <div class="filial-bars">${bars.map(b=>`<div class="fbar-item"><span class="fbar-label">${b.l}</span><div class="fbar-track"><div class="fbar-fill" style="width:${pct(b.v,tt2)}%;background:${b.c}"></div></div><span class="fbar-pct" style="color:${b.c}">${pct(b.v,tt2)}%</span></div>`).join('')}</div>
      <div class="filial-kpis">
        <div class="fkpi" style="border-left-color:${P.mediana}"><div class="fkpi-l">Mediana</div><div class="fkpi-v" style="color:${P.mediana}">${hhmm(pd.mediana)}</div><div class="fkpi-s">caminhão do meio</div></div>
        <div class="fkpi" style="border-left-color:${P.p90}"><div class="fkpi-l">Piores 10%</div><div class="fkpi-v" style="color:${P.p90}">${hhmm(pd.p90)}</div><div class="fkpi-s">p90</div></div>
        <div class="fkpi" style="border-left-color:${P.excedente}"><div class="fkpi-l">Estouros</div><div class="fkpi-v" style="color:${P.excedente}">${fmt(pd.fora)}</div><div class="fkpi-s">acima de 5h</div></div>
        <div class="fkpi" style="border-left-color:${P.noPrazo}"><div class="fkpi-l">Cumprimento</div><div class="fkpi-v" style="color:${P.noPrazo}">${pct(pd.dentro,tt2)}%</div><div class="fkpi-s">na carência</div></div>
      </div></div>`;
  }).join('');
}

function renderTemposReais(filial){
  const P=CORES, c=cs();
  const medAgg=(key)=>{ const a=FILIAIS.map(f=>TEMPOS_FILIAL_TIPO[f]?.[key]).filter(Boolean); return {med:Math.round(a.reduce((s,x)=>s+x.mediana,0)/(a.length||1)),p90:Math.round(a.reduce((s,x)=>s+x.p90,0)/(a.length||1))}; };
  const col=medAgg('coleta'), ent=medAgg('descarga');
  const bsG=document.getElementById('bs-tr-geral');
  if(bsG) bsG.innerHTML=[
    {c:P.coletas,ic:'ti-package-import',val:hhmm(col.med),lbl:'Mediana de coleta',sub:`p90 ${hhmm(col.p90)} · tempo no ponto de carga`},
    {c:P.entregas,ic:'ti-package-export',val:hhmm(ent.med),lbl:'Mediana de descarga',sub:`p90 ${hhmm(ent.p90)} · tempo no ponto de entrega`},
    {c:P.p90,ic:'ti-clock-exclamation',val:hhmm(col.p90),lbl:'p90 coleta (piores 10%)',sub:'10% das coletas passam disso'},
    {c:P.p90,ic:'ti-clock-exclamation',val:hhmm(ent.p90),lbl:'p90 descarga (piores 10%)',sub:'10% das descargas passam disso'},
  ].map(bigStatHtml).join('');
  mkLeg('lg-tr-filial',[['Mediana coleta',P.coletas],['Mediana descarga',P.entregas],['p90 coleta',P.coletas+'77'],['p90 descarga',P.entregas+'77']]);
  kill('c-tr-filial');
  const cvF=document.getElementById('c-tr-filial');
  if(cvF) CH['c-tr-filial']=new Chart(cvF,{type:'bar',
    data:{labels:FILIAIS.map(f=>f.replace('FL ','')),datasets:[
      {label:'Mediana coleta',data:FILIAIS.map(f=>TEMPOS_FILIAL_TIPO[f]?.coleta?.mediana||0),backgroundColor:P.coletas,borderRadius:3,borderSkipped:false},
      {label:'Mediana descarga',data:FILIAIS.map(f=>TEMPOS_FILIAL_TIPO[f]?.descarga?.mediana||0),backgroundColor:P.entregas,borderRadius:3,borderSkipped:false},
      {label:'p90 coleta',data:FILIAIS.map(f=>TEMPOS_FILIAL_TIPO[f]?.coleta?.p90||0),backgroundColor:P.coletas+'55',borderRadius:3,borderSkipped:false},
      {label:'p90 descarga',data:FILIAIS.map(f=>TEMPOS_FILIAL_TIPO[f]?.descarga?.p90||0),backgroundColor:P.entregas+'55',borderRadius:3,borderSkipped:false},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...tt(c),callbacks:{label:x=>` ${x.dataset.label}: ${hhmm(x.parsed.y)}`}}},scales:{x:{...sc(c),ticks:{...sc(c).ticks,maxRotation:30,autoSkip:false}},y:{...sc(c),min:0,ticks:{...sc(c).ticks,callback:v=>hhmm(v)}}}}});
  // Klabin
  const bsK=document.getElementById('bs-tr-klabin');
  if(bsK && UNIDADES_KLABIN.length){
    const top=UNIDADES_KLABIN[0], topD=TEMPOS_UNIDADE_KLABIN[top];
    const worst=UNIDADES_KLABIN.reduce((w,u)=>(TEMPOS_UNIDADE_KLABIN[u]?.coleta?.mediana||0)>(TEMPOS_UNIDADE_KLABIN[w]?.coleta?.mediana||0)?u:w,UNIDADES_KLABIN[0]);
    const worstD=TEMPOS_UNIDADE_KLABIN[worst];
    bsK.innerHTML=[
      {c:P.coletas,ic:'ti-building-factory-2',val:hhmm(topD.coleta.mediana),lbl:top+' (maior volume)',sub:`${fmt(topD.coleta.amostra)} coletas · p90 ${hhmm(topD.coleta.p90)}`},
      {c:P.excedente,ic:'ti-alert-triangle',val:hhmm(worstD.coleta.mediana),lbl:worst+' (maior tempo)',sub:`p90 ${hhmm(worstD.coleta.p90)}`},
    ].map(bigStatHtml).join('');
  }
  mkLeg('lg-tr-klabin',[['Mediana coleta',P.coletas],['Mediana descarga',P.entregas],['p90 coleta',P.coletas+'77'],['p90 descarga',P.entregas+'77']]);
  kill('c-tr-klabin');
  const cvK=document.getElementById('c-tr-klabin');
  if(cvK) CH['c-tr-klabin']=new Chart(cvK,{type:'bar',
    data:{labels:UNIDADES_KLABIN.map(u=>u.replace('KLABIN ','').replace('Klabin ','')),datasets:[
      {label:'Mediana coleta',data:UNIDADES_KLABIN.map(u=>TEMPOS_UNIDADE_KLABIN[u]?.coleta?.mediana||0),backgroundColor:P.coletas,borderRadius:3,borderSkipped:false},
      {label:'Mediana descarga',data:UNIDADES_KLABIN.map(u=>TEMPOS_UNIDADE_KLABIN[u]?.descarga?.mediana||0),backgroundColor:P.entregas,borderRadius:3,borderSkipped:false},
      {label:'p90 coleta',data:UNIDADES_KLABIN.map(u=>TEMPOS_UNIDADE_KLABIN[u]?.coleta?.p90||0),backgroundColor:P.coletas+'55',borderRadius:3,borderSkipped:false},
      {label:'p90 descarga',data:UNIDADES_KLABIN.map(u=>TEMPOS_UNIDADE_KLABIN[u]?.descarga?.p90||0),backgroundColor:P.entregas+'55',borderRadius:3,borderSkipped:false},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...tt(c),callbacks:{label:x=>` ${x.dataset.label}: ${hhmm(x.parsed.y)}`}}},scales:{x:{...sc(c),ticks:{...sc(c).ticks,maxRotation:35,autoSkip:false,font:{size:9}}},y:{...sc(c),min:0,ticks:{...sc(c).ticks,callback:v=>hhmm(v)}}}}});
  // Clientes
  const cliSort=[...CLIENTES].sort((a,b)=>(TEMPOS_CLIENTE[b]?.descarga?.mediana||0)-(TEMPOS_CLIENTE[a]?.descarga?.mediana||0));
  mkLeg('lg-tr-cliente',[['Mediana coleta',P.coletas],['Mediana descarga',P.entregas]]);
  kill('c-tr-cliente');
  const cvC=document.getElementById('c-tr-cliente');
  if(cvC) CH['c-tr-cliente']=new Chart(cvC,{type:'bar',
    data:{labels:cliSort,datasets:[
      {label:'Mediana coleta',data:cliSort.map(cl=>TEMPOS_CLIENTE[cl]?.coleta?.mediana||0),backgroundColor:P.coletas,borderRadius:3,borderSkipped:false},
      {label:'Mediana descarga',data:cliSort.map(cl=>TEMPOS_CLIENTE[cl]?.descarga?.mediana||0),backgroundColor:P.entregas,borderRadius:3,borderSkipped:false},
    ]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...tt(c),callbacks:{label:x=>` ${x.dataset.label}: ${hhmm(x.parsed.x)}`}}},scales:{x:{...sc(c),min:0,ticks:{...sc(c).ticks,callback:v=>hhmm(v)}},y:{...sc(c),ticks:{...sc(c).ticks,font:{size:9}}}}}});
  // Listas detalhadas
  const detalhe=(u,d)=>`<div class="filial-row"><div class="filial-header"><span class="filial-name">${u}</span><span class="filial-total">${fmt(d.coleta.amostra)} coletas · ${fmt(d.descarga.amostra)} descargas</span></div>
    <div class="filial-kpis" style="grid-template-columns:repeat(6,1fr)">
      <div class="fkpi" style="border-left-color:${P.coletas}"><div class="fkpi-l">Coleta med.</div><div class="fkpi-v" style="color:${P.coletas}">${hhmm(d.coleta.mediana)}</div><div class="fkpi-s">mediana</div></div>
      <div class="fkpi" style="border-left-color:${P.coletas}"><div class="fkpi-l">Coleta p90</div><div class="fkpi-v" style="color:${P.p90}">${hhmm(d.coleta.p90)}</div><div class="fkpi-s">piores 10%</div></div>
      <div class="fkpi" style="border-left-color:${P.coletas}"><div class="fkpi-l">Coleta média</div><div class="fkpi-v" style="color:var(--txt)">${hhmm(d.coleta.media)}</div><div class="fkpi-s">${fmt(d.coleta.amostra)} reg.</div></div>
      <div class="fkpi" style="border-left-color:${P.entregas}"><div class="fkpi-l">Descarga med.</div><div class="fkpi-v" style="color:${P.entregas}">${hhmm(d.descarga.mediana)}</div><div class="fkpi-s">mediana</div></div>
      <div class="fkpi" style="border-left-color:${P.entregas}"><div class="fkpi-l">Descarga p90</div><div class="fkpi-v" style="color:${P.p90}">${hhmm(d.descarga.p90)}</div><div class="fkpi-s">piores 10%</div></div>
      <div class="fkpi" style="border-left-color:${P.entregas}"><div class="fkpi-l">Descarga média</div><div class="fkpi-v" style="color:var(--txt)">${hhmm(d.descarga.media)}</div><div class="fkpi-s">${fmt(d.descarga.amostra)} reg.</div></div>
    </div></div>`;
  const lK=document.getElementById('tr-klabin-list');
  if(lK) lK.innerHTML=UNIDADES_KLABIN.map(u=>detalhe(u,TEMPOS_UNIDADE_KLABIN[u])).join('');
  const lC=document.getElementById('tr-cliente-list');
  if(lC) lC.innerHTML=cliSort.map(cl=>detalhe(cl,TEMPOS_CLIENTE[cl])).join('');
}

function renderPermanencia(filial, tipo){
  if (typeof TEMPOS==='undefined' || !FILIAIS.length) return;
  renderCarencia(filial, tipo);
  renderTemposReais(filial);
}

document.addEventListener('DOMContentLoaded', function () {

  // ── Eventos de upload / drag-drop ────────────────────────
  const dz = document.getElementById('dropZone');
  const fi = document.getElementById('fileInput');

  if (dz && fi) {
    dz.addEventListener('dragover', e => {
      e.preventDefault();
      dz.classList.add('over');
      dz.style.borderColor = '#004B24';
      dz.style.background  = 'var(--surf2)';
    });
    dz.addEventListener('dragleave', () => {
      dz.classList.remove('over');
      dz.style.borderColor = '';
      dz.style.background  = '';
    });
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('over');
      dz.style.borderColor = '';
      dz.style.background  = '';
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fi.addEventListener('change', e => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });
  }

  // ── Preencher brand na tela de upload ────────────────────
  const upName = document.getElementById('up-name');
  const upSub  = document.getElementById('up-sub');
  if (upName) upName.textContent = CONFIG.empresa;
  if (upSub)  upSub.textContent  = CONFIG.subtitulo;

  // Site sempre abre na tela de upload — usuário arrasta a planilha atualizada.
  // (DADOS_SEED continua disponível em dados.js, mas não é aplicado automaticamente.)
});
