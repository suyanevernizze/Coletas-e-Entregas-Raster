// ============================================================
//  APP.JS — Lógica de render, filtros e gráficos
//  Depende de dados.js (carregado antes no HTML)
// ============================================================

let dark = true;
document.body.classList.add('dark');

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

  // ── ABA PERMANÊNCIA ──
  renderPermanencia(fil, tipo);
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
    re();
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
  document.querySelectorAll('.fsel').forEach(s=>{ if(s.tagName==='SELECT' && !['sf','st','socc','periodo-rapido'].includes(s.id)) s.selectedIndex=0; });
  document.querySelectorAll('.finput').forEach(i=>i.value='');
  document.getElementById('fchip').classList.remove('lit');
  re();
}

// ─── Upload / Drag & Drop ─────────────────────────────────
function handleFile(file) {
  if (!file) return;
  const badge = document.getElementById('fn');
  if (badge) badge.textContent = file.name + '  ·  ' + (CONFIG.totalRegistros||'') + ' registros';
  launchApp();
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

// ═══════════════════════════════════════════════════════════
//  PERMANÊNCIA
// ═══════════════════════════════════════════════════════════

// 90 → "1h30" · 45 → "45min"
function hhmm(min){
  const m = Math.round(min);
  if (m < 60) return m + 'min';
  const h = Math.floor(m/60), r = m%60;
  return r === 0 ? h + 'h' : h + 'h' + String(r).padStart(2,'0');
}

// Limites das faixas em minutos (o topo da última é um teto assumido de 12h)
const FAIXA_LIM = [0, 60, 120, 180, 240, 300, 480, 720];

// Percentil interpolado a partir do histograma — mais fiel que média de medianas
function percentilFaixa(counts, p){
  const total = counts.reduce((a,b)=>a+b, 0);
  if (!total) return 0;
  const alvo = total * p;
  let acc = 0;
  for (let i = 0; i < counts.length; i++){
    if (acc + counts[i] >= alvo){
      const dentroFaixa = (alvo - acc) / (counts[i] || 1);
      return FAIXA_LIM[i] + dentroFaixa * (FAIXA_LIM[i+1] - FAIXA_LIM[i]);
    }
    acc += counts[i];
  }
  return FAIXA_LIM[FAIXA_LIM.length-1];
}

function calcPerm(filial, tipo){
  const fils  = filial === 'TODAS' ? FILIAIS : [filial];
  const tipos = tipo === 'TODOS' ? ['COLETA','ENTREGA'] : [tipo];

  let dentro = 0, fora = 0, amostra = 0, somaMedia = 0;
  const pf = {};
  fils.forEach(f => {
    pf[f] = { dentro:0, fora:0, amostra:0, mediana:0, p90:0 };
    let pesoMed = 0;
    tipos.forEach(t => {
      const d = TEMPOS[f]?.[t]; if (!d) return;
      dentro += d.dentro; fora += d.fora; amostra += d.amostra;
      somaMedia += d.media * d.amostra;
      pf[f].dentro += d.dentro; pf[f].fora += d.fora; pf[f].amostra += d.amostra;
      pf[f].mediana += d.mediana * d.amostra;
      pf[f].p90     += d.p90 * d.amostra;
      pesoMed += d.amostra;
    });
    pf[f].mediana = pesoMed ? Math.round(pf[f].mediana / pesoMed) : 0;
    pf[f].p90     = pesoMed ? Math.round(pf[f].p90 / pesoMed) : 0;
  });

  // Histograma consolidado do(s) tipo(s) selecionado(s)
  const faixas = TEMPOS_FAIXAS.labels.map((_, i) =>
    tipos.reduce((s, t) => s + TEMPOS_FAIXAS[t][i], 0)
  );

  // Horas além da carência — proporcional à fatia de estouros da seleção
  const foraGlobal = FILIAIS.reduce((s,f) =>
    s + tipos.reduce((x,t) => x + (TEMPOS[f]?.[t]?.fora || 0), 0), 0);
  const excGlobal = faixas.reduce((s, c, i) => s + c * TEMPOS_FAIXAS.excedenteMedio[i], 0);
  const excedente = foraGlobal ? excGlobal * (fora / foraGlobal) : 0;

  return {
    dentro, fora, amostra, pf, fils, faixas, excedente,
    media:   amostra ? Math.round(somaMedia / amostra) : 0,
    mediana: filial === 'TODAS' ? percentilFaixa(faixas, 0.50)
                                : pf[filial].mediana,
    p90:     filial === 'TODAS' ? percentilFaixa(faixas, 0.90)
                                : pf[filial].p90,
  };
}

function subAbaPerm(t){
  ['perm-geral','perm-coleta','perm-entrega','perm-filial'].forEach(id=>{
    const sp = document.getElementById('sp-'+id);
    const sb = document.getElementById('sub-'+id);
    if(sp) sp.classList.toggle('on', id===t);
    if(sb) sb.classList.toggle('on', id===t);
  });
  setTimeout(() => {
    const fil = document.getElementById('sf').value;
    const tipo = document.getElementById('st').value;
    renderPermanencia(fil, tipo);
  }, 50);
}

function bigStatHtml(b){
  return `<div class="big-stat"><div class="big-stat-icon" style="background:${b.c}22"><i class="ti ${b.ic}" style="color:${b.c};font-size:20px" aria-hidden="true"></i></div><div><div class="big-stat-val" style="color:${b.c}">${b.val}</div><div class="big-stat-lbl">${b.lbl}</div><div class="big-stat-sub">${b.sub}</div></div></div>`;
}

function renderPermTipo(prefix, tipoKey, filial){
  const P = CORES;
  const c = cs();
  const d = calcPerm(filial, tipoKey);
  const T = d.amostra || 1;
  const label = tipoKey === 'COLETA' ? 'coleta' : 'descarga';

  // Big stats — tempos puros
  const bs = document.getElementById('bs-perm-'+prefix);
  if(bs) bs.innerHTML = [
    { c:P.mediana,  ic:'ti-clock-hour-4',   val:hhmm(d.mediana),
      lbl:'Mediana de '+label, sub:'metade resolve antes desse tempo' },
    { c:P.p90,      ic:'ti-clock-exclamation', val:hhmm(d.p90),
      lbl:'Piores 10% (p90)', sub:'10% das operações passam disso' },
    { c:'#AB47BC',  ic:'ti-calculator',     val:hhmm(d.media),
      lbl:'Média de '+label, sub:'puxada pelas operações mais longas' },
    { c:P.excedente,ic:'ti-alarm',          val:fmt(d.fora),
      lbl:'Estouros de carência', sub:`${pct(d.fora,T)}% passaram de 5h` },
  ].map(bigStatHtml).join('');

  // KPIs
  const kp = document.getElementById('kperm-'+prefix);
  if(kp) kp.innerHTML = [
    { k:'med',  ic:'ti-clock-hour-4',      l:'Mediana',   v:hhmm(d.mediana), s:'tempo do caminhão do meio', c:P.mediana, w:Math.min(100,Math.round(d.mediana/CARENCIA_MIN*100)) },
    { k:'p90',  ic:'ti-clock-exclamation', l:'Piores 10%',v:hhmm(d.p90),     s:'limite dos 10% piores',     c:P.p90,     w:Math.min(100,Math.round(d.p90/CARENCIA_MIN*100)) },
    { k:'alvo', ic:'ti-target',            l:'Carência',  v:hhmm(CARENCIA_MIN), s:'5h contrato',             c:P.carencia,w:100 },
    { k:'exc',  ic:'ti-alarm',             l:'Estouros',  v:fmt(d.fora),     s:`${pct(d.fora,T)}%`,         c:P.excedente, w:pct(d.fora,T) },
    { k:'tot',  ic:'ti-sum',               l:'Registros', v:fmt(T),          s:label+'s apuradas',           c:'#FFD600', w:100 },
  ].map(kpiHtml).join('');

  // Histograma por faixa
  const faixas = TEMPOS_FAIXAS.labels.map((_,i) => TEMPOS_FAIXAS[tipoKey][i]);
  const coresFaixa = TEMPOS_FAIXAS.estouro.map(e => e ? P.excedente : P.mediana);
  const lgId = 'lg-perm-'+prefix+'-faixa';
  const lgEl = document.getElementById(lgId);
  if(lgEl) mkLeg(lgId, [['Dentro da carência', P.mediana],['Acima de 5h', P.excedente]]);
  const chFaixa = 'c-perm-'+prefix+'-faixa';
  kill(chFaixa);
  const cvF = document.getElementById(chFaixa);
  if(cvF) CH[chFaixa] = new Chart(cvF, {
    type:'bar',
    data:{ labels:TEMPOS_FAIXAS.labels, datasets:[{ data:faixas, backgroundColor:coresFaixa, borderRadius:4, borderSkipped:false }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ ...tt(c), callbacks:{
        label: x => ` ${x.parsed.y.toLocaleString('pt-BR')} registros (${pct(x.parsed.y, faixas.reduce((a,b)=>a+b,0))}%)` }}},
      scales:{ x:sc(c), y:{...sc(c), min:0} } }
  });

  // Mediana vs p90 por filial
  const lgFil = 'lg-perm-'+prefix+'-fil';
  const lgFE = document.getElementById(lgFil);
  if(lgFE) mkLeg(lgFil, [['Mediana',P.mediana],['Piores 10% (p90)',P.p90],['Carência 5h',P.carencia]]);
  const chFil = 'c-perm-'+prefix+'-fil';
  kill(chFil);
  const cvFi = document.getElementById(chFil);
  if(cvFi) CH[chFil] = new Chart(cvFi, {
    type:'bar',
    data:{ labels:FILIAIS.map(f=>f.replace('FL ','')), datasets:[
      { label:'Mediana', data:FILIAIS.map(f => TEMPOS[f]?.[tipoKey]?.mediana || 0), backgroundColor:P.mediana, borderRadius:3, borderSkipped:false },
      { label:'p90',     data:FILIAIS.map(f => TEMPOS[f]?.[tipoKey]?.p90 || 0),     backgroundColor:P.p90,     borderRadius:3, borderSkipped:false },
      { label:'Carência',type:'line', data:FILIAIS.map(()=>CARENCIA_MIN), borderColor:P.carencia, borderWidth:2, borderDash:[6,4], pointRadius:0, fill:false },
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{...tt(c), callbacks:{ label:x=>` ${x.dataset.label}: ${hhmm(x.parsed.y)}` }}},
      scales:{ x:{...sc(c), ticks:{...sc(c).ticks, maxRotation:30, autoSkip:false}},
               y:{...sc(c), min:0, ticks:{...sc(c).ticks, callback:v=>hhmm(v)}} } }
  });
}

function renderPermanencia(filial, tipo){
  if (typeof TEMPOS === 'undefined') return;
  const P = CORES;
  const c = cs();

  // ── VISÃO GERAL ──
  const dc = calcPerm(filial, 'COLETA');
  const de = calcPerm(filial, 'ENTREGA');
  const dAll = calcPerm(filial, tipo);
  const T = dAll.amostra || 1;
  const taxa = pct(dAll.dentro, T);

  // Cards de tempo operacional (SEM carência)
  const bsTempos = document.getElementById('bs-perm-tempos');
  if(bsTempos) bsTempos.innerHTML = [
    { c:P.coletas,  ic:'ti-package-import',    val:hhmm(dc.mediana),
      lbl:'Tempo de coleta (mediana)', sub:`p90 ${hhmm(dc.p90)} · média ${hhmm(dc.media)} · ${fmt(dc.amostra)} registros` },
    { c:P.entregas, ic:'ti-package-export',     val:hhmm(de.mediana),
      lbl:'Tempo de descarga (mediana)', sub:`p90 ${hhmm(de.p90)} · média ${hhmm(de.media)} · ${fmt(de.amostra)} registros` },
    { c:P.p90,      ic:'ti-clock-exclamation',  val:hhmm(dc.p90),
      lbl:'p90 coleta (piores 10%)', sub:'10% das coletas passam disso' },
    { c:P.p90,      ic:'ti-clock-exclamation',  val:hhmm(de.p90),
      lbl:'p90 descarga (piores 10%)', sub:'10% das descargas passam disso' },
  ].map(bigStatHtml).join('');

  // Exposição contratual
  const bs = document.getElementById('bs-perm');
  if (bs) bs.innerHTML = [
    { c:P.noPrazo,   ic:'ti-circle-check',   val:`${taxa}%`,
      lbl:'Dentro da carência', sub:`${fmt(dAll.dentro)} de ${fmt(T)} registros até 5h00` },
    { c:P.excedente, ic:'ti-alarm',          val:fmt(dAll.fora),
      lbl:'Estouros de carência', sub:`${pct(dAll.fora,T)}% passaram de 5h00` },
    { c:P.foraAlvo,  ic:'ti-hourglass-high', val:fmt(Math.round(dAll.excedente)),
      lbl:'Horas excedentes', sub:'estimativa acumulada além das 5h' },
    { c:P.p90,       ic:'ti-arrow-bar-to-up', val:hhmm(dAll.p90),
      lbl:'p90 geral (piores 10%)', sub:'10% das operações passam disso' },
  ].map(bigStatHtml).join('');

  // KPIs
  const kp = document.getElementById('kperm');
  if (kp) kp.innerHTML = [
    { k:'med', ic:'ti-clock-hour-4',      l:'Mediana geral',  v:hhmm(dAll.mediana), s:'tempo do caminhão do meio',  c:P.mediana,   w:Math.min(100, Math.round(dAll.mediana/CARENCIA_MIN*100)) },
    { k:'p90', ic:'ti-clock-exclamation', l:'Piores 10% (p90)',v:hhmm(dAll.p90),    s:'limite dos 10% piores',      c:P.p90,       w:Math.min(100, Math.round(dAll.p90/CARENCIA_MIN*100)) },
    { k:'saida',ic:'ti-calculator',       l:'Média',          v:hhmm(dAll.media),   s:'puxada pelas mais longas',   c:'#AB47BC',   w:Math.min(100, Math.round(dAll.media/CARENCIA_MIN*100)) },
    { k:'alvo',ic:'ti-target',            l:'Carência',       v:hhmm(CARENCIA_MIN), s:'5h previsto em contrato',    c:P.carencia,  w:100 },
    { k:'exc', ic:'ti-alarm',             l:'Estouros',       v:fmt(dAll.fora),     s:`${pct(dAll.fora,T)}% dos registros`, c:P.excedente, w:pct(dAll.fora,T) },
    { k:'tot', ic:'ti-sum',               l:'Registros',      v:fmt(T),             s:'com tempo apurado',          c:'#FFD600',   w:100 },
  ].map(kpiHtml).join('');

  // Histograma de faixas
  const coresFaixa = TEMPOS_FAIXAS.estouro.map(e => e ? P.excedente : P.mediana);
  mkLeg('lg-perm-faixa', [['Dentro da carência', P.mediana],['Acima de 5h00', P.excedente]]);
  kill('c-perm-faixa');
  const cvFaixa = document.getElementById('c-perm-faixa');
  if (cvFaixa) CH['c-perm-faixa'] = new Chart(cvFaixa, {
    type:'bar',
    data:{ labels:TEMPOS_FAIXAS.labels, datasets:[{ data:dAll.faixas, backgroundColor:coresFaixa, borderRadius:4, borderSkipped:false }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ ...tt(c), callbacks:{
        label: x => ` ${x.parsed.y.toLocaleString('pt-BR')} registros (${pct(x.parsed.y, dAll.faixas.reduce((a,b)=>a+b,0))}%)` } } },
      scales:{ x:sc(c), y:{ ...sc(c), min:0 } } }
  });

  // Estouros por filial
  hb1('c-perm-estouro', FILIAIS, FILIAIS.map(f => {
    const t = tipo === 'TODOS' ? ['COLETA','ENTREGA'] : [tipo];
    return t.reduce((s, x) => s + (TEMPOS[f]?.[x]?.fora || 0), 0);
  }), P.excedente);

  // Mediana vs p90 por filial — coleta e entrega lado a lado
  mkLeg('lg-perm-fil', [['Mediana coleta', P.coletas],['Mediana descarga', P.entregas],['p90 coleta', P.coletas+'88'],['p90 descarga', P.entregas+'88'],['Carência 5h', P.carencia]]);
  kill('c-perm-fil');
  const cvFil = document.getElementById('c-perm-fil');
  if (cvFil) CH['c-perm-fil'] = new Chart(cvFil, {
    type:'bar',
    data:{ labels:FILIAIS.map(f => f.replace('FL ','')), datasets:[
      { label:'Mediana coleta',   data:FILIAIS.map(f => TEMPOS[f]?.COLETA?.mediana || 0),  backgroundColor:P.coletas,  borderRadius:3, borderSkipped:false },
      { label:'Mediana descarga', data:FILIAIS.map(f => TEMPOS[f]?.ENTREGA?.mediana || 0), backgroundColor:P.entregas, borderRadius:3, borderSkipped:false },
      { label:'p90 coleta',       data:FILIAIS.map(f => TEMPOS[f]?.COLETA?.p90 || 0),      backgroundColor:P.coletas+'55',  borderRadius:3, borderSkipped:false },
      { label:'p90 descarga',     data:FILIAIS.map(f => TEMPOS[f]?.ENTREGA?.p90 || 0),     backgroundColor:P.entregas+'55', borderRadius:3, borderSkipped:false },
      { label:'Carência',type:'line', data:FILIAIS.map(()=>CARENCIA_MIN), borderColor:P.carencia, borderWidth:2, borderDash:[6,4], pointRadius:0, fill:false },
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ ...tt(c), callbacks:{ label: x => ` ${x.dataset.label}: ${hhmm(x.parsed.y)}` } } },
      scales:{ x:{ ...sc(c), ticks:{ ...sc(c).ticks, maxRotation:30, autoSkip:false } },
               y:{ ...sc(c), min:0, ticks:{ ...sc(c).ticks, callback: v => hhmm(v) } } } }
  });

  renderTimelinePerm();

  // ── SUB-ABAS: Coleta / Entrega ──
  renderPermTipo('col', 'COLETA', filial);
  renderPermTipo('ent', 'ENTREGA', filial);

  // ── POR FILIAL ──
  const lista = document.getElementById('perm-list');
  if (lista) lista.innerHTML = FILIAIS.map(f => {
    const tc = TEMPOS[f]?.COLETA || {};
    const te = TEMPOS[f]?.ENTREGA || {};
    const total = (tc.amostra||0) + (te.amostra||0);
    const dentroT = (tc.dentro||0) + (te.dentro||0);
    const foraT = (tc.fora||0) + (te.fora||0);
    const tt2 = total || 1;
    const bars = [
      { l:'Dentro 5h',  v:dentroT, c:P.noPrazo },
      { l:'Acima 5h',   v:foraT,   c:P.excedente },
    ];
    return `<div class="filial-row">
      <div class="filial-header"><span class="filial-name">${f}</span><span class="filial-total">${fmt(total)} registros</span></div>
      <div class="filial-bars">${bars.map(b => `<div class="fbar-item">
        <span class="fbar-label">${b.l}</span>
        <div class="fbar-track"><div class="fbar-fill" style="width:${pct(b.v,tt2)}%;background:${b.c}"></div></div>
        <span class="fbar-pct" style="color:${b.c}">${pct(b.v,tt2)}%</span>
      </div>`).join('')}</div>
      <div class="filial-kpis" style="grid-template-columns:repeat(6,1fr)">
        <div class="fkpi" style="border-left-color:${P.coletas}"><div class="fkpi-l">Coleta med.</div><div class="fkpi-v" style="color:${P.coletas}">${hhmm(tc.mediana||0)}</div><div class="fkpi-s">mediana</div></div>
        <div class="fkpi" style="border-left-color:${P.coletas}"><div class="fkpi-l">Coleta p90</div><div class="fkpi-v" style="color:${P.p90}">${hhmm(tc.p90||0)}</div><div class="fkpi-s">piores 10%</div></div>
        <div class="fkpi" style="border-left-color:${P.entregas}"><div class="fkpi-l">Descarga med.</div><div class="fkpi-v" style="color:${P.entregas}">${hhmm(te.mediana||0)}</div><div class="fkpi-s">mediana</div></div>
        <div class="fkpi" style="border-left-color:${P.entregas}"><div class="fkpi-l">Descarga p90</div><div class="fkpi-v" style="color:${P.p90}">${hhmm(te.p90||0)}</div><div class="fkpi-s">piores 10%</div></div>
        <div class="fkpi" style="border-left-color:${P.excedente}"><div class="fkpi-l">Estouros</div><div class="fkpi-v" style="color:${P.excedente}">${fmt(foraT)}</div><div class="fkpi-s">acima de 5h</div></div>
        <div class="fkpi" style="border-left-color:${P.noPrazo}"><div class="fkpi-l">Cumprimento</div><div class="fkpi-v" style="color:${P.noPrazo}">${pct(dentroT,tt2)}%</div><div class="fkpi-s">carência</div></div>
      </div>
    </div>`;
  }).join('');
}

function renderTimelinePerm(){
  const c = cs();
  const id = 'ch-timeline-perm';
  kill(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;

  CH[id] = new Chart(canvas, {
    type:'line',
    data:{ labels:MESES, datasets:[
      { label:'Mediana coleta',  data:TEMPOS_MENSAL.medianaColeta,  borderColor:CORES.coletas,  backgroundColor:CORES.coletas+'18',
        borderWidth:2.5, pointRadius:4, pointHoverRadius:7, pointBackgroundColor:CORES.coletas,  tension:.4, fill:true,  yAxisID:'y' },
      { label:'Mediana descarga', data:TEMPOS_MENSAL.medianaEntrega, borderColor:CORES.entregas, backgroundColor:CORES.entregas+'18',
        borderWidth:2.5, pointRadius:4, pointHoverRadius:7, pointBackgroundColor:CORES.entregas, tension:.4, fill:true,  yAxisID:'y' },
      { label:'Estouros de carência', data:TEMPOS_MENSAL.estouros,  borderColor:CORES.excedente, backgroundColor:'transparent',
        borderWidth:2, pointRadius:3, pointHoverRadius:6, pointBackgroundColor:CORES.excedente, borderDash:[5,3], tension:.4, fill:false, yAxisID:'y1' },
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:true, position:'top', labels:{ color:c.tick, font:{size:10,family:'Inter,system-ui'}, boxWidth:12, padding:16, usePointStyle:true, pointStyleWidth:10 } },
        tooltip:{ ...tt(c), callbacks:{ label: x => x.dataset.yAxisID === 'y1'
          ? ` ${x.dataset.label}: ${x.parsed.y.toLocaleString('pt-BR')}`
          : ` ${x.dataset.label}: ${hhmm(x.parsed.y)}` } }
      },
      scales:{
        x:{ ...sc(c), grid:{ color:c.grid } },
        y:{ ...sc(c), position:'left', grid:{ color:c.grid },
            title:{ display:true, text:'Mediana (min)', color:c.tick, font:{size:10} },
            ticks:{ ...sc(c).ticks, callback: v => hhmm(v) } },
        y1:{ ...sc(c), position:'right', grid:{ drawOnChartArea:false },
            title:{ display:true, text:'Estouros', color:c.tick, font:{size:10} } },
      }
    }
  });
}

// Inicializar tudo quando o DOM estiver pronto
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

  // ── Auto-render: se app-screen já visível, renderiza direto ──
  const appVis = document.getElementById('app-screen');
  if (appVis && appVis.style.display !== 'none') {
    re();
  }

  // btn-trocar usa onclick direto no HTML
});
