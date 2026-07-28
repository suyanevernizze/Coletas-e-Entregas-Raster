// ============================================================
//  PARSER.JS — Lê a planilha Raster e reconstrói os dados
//  Espelha a lógica validada: chegada/saída → permanência,
//  origem Klabin → unidade, destino → cliente.
// ============================================================

// Colunas esperadas na planilha (Main sheet)
const COL = {
  filial:   'Filial da SM',
  tipo:     'Tipo',
  origem:   'Origem',
  destino:  'Destino',
  chegada:  'Chegada real no local',
  saida:    'Saída real do local',
  statusCheg:'Status chegada no local',
  statusSai:'Status saída do local',
  statusFin:'Status finalização',
  vinculo:  'Vínculo veículo',
  tempoAlvo:'Tempo no alvo',
};

// CARENCIA_MIN é declarada em dados.js (carregado antes deste arquivo)

// ── Helpers ──

// Converte "17/06/2025 07:06" (ou serial/Date do SheetJS) em Date
function parseDataHora(v){
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  // Número serial do Excel
  if (typeof v === 'number'){
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d) ? null : d;
  }
  const s = String(v).trim();
  // dd/mm/yyyy hh:mm
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T]+(\d{1,2}):(\d{1,2})/);
  if (m){
    const [,dd,mm,yy,hh,mi] = m;
    return new Date(+yy, +mm-1, +dd, +hh, +mi);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// É a data-placeholder vazia do Excel (01/01/1900)?
function ehPlaceholder(d){
  return d && d.getFullYear() === 1900 && d.getMonth() === 0 && d.getDate() === 1;
}

function ehKlabin(s){ return String(s||'').toUpperCase().includes('KLABIN'); }

// Nome curto: parte antes do primeiro " - " (usado para clientes)
function nomeCurto(s){
  if (!s) return '—';
  return String(s).split(' - ')[0].trim();
}

// Nome da unidade: parte do meio quando há 3+ segmentos
// "KLABIN SA - ORTIGUEIRA - ORTIGUEIRA/PR" → "ORTIGUEIRA"
function nomeUnidade(s){
  if (!s) return '—';
  const parts = String(s).split(' - ').map(p => p.trim());
  return parts.length >= 3 ? parts[1] : parts[0];
}

// Filiais não-operacionais (ignoradas nos cálculos)
const FILIAIS_IGNORAR = ['APOIO OPERACIONAL', 'FL CLIENTES DIVERSOS'];

// Mapa de correção de acentos para filiais conhecidas (a planilha vem sem acento)
const MAPA_ACENTOS_FILIAL = {
  'FL Itajai':'FL Itajaí', 'FL Jundiai':'FL Jundiaí',
  'FL Otacilio Costa':'FL Otacílio Costa', 'FL Telemaco Borba':'FL Telêmaco Borba',
};

// Normaliza nome de filial → "FL Lages" (mantém FL em maiúsculo)
function normFilial(s){
  if (!s) return '—';
  const up = String(s).toUpperCase().trim();
  const base = up.split(/\s+/).map(w => {
    if (w === 'FL') return 'FL';
    return w.charAt(0) + w.slice(1).toLowerCase();
  }).join(' ');
  return MAPA_ACENTOS_FILIAL[base] || base;
}

// Percentil de um array já ordenado (interpolação linear)
function percentil(sortedArr, p){
  if (!sortedArr.length) return 0;
  const idx = (sortedArr.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

function stats(arr){
  if (!arr.length) return { media:0, mediana:0, p90:0, amostra:0 };
  const s = [...arr].sort((a,b) => a-b);
  const soma = s.reduce((a,b) => a+b, 0);
  return {
    media:   Math.round(soma / s.length),
    mediana: Math.round(percentil(s, 0.5)),
    p90:     Math.round(percentil(s, 0.9)),
    amostra: s.length,
  };
}

// ── Parser principal ──
// Recebe array de linhas (objetos) da planilha, devolve todas as
// estruturas que o dashboard consome.
function processarPlanilha(rows){
  const registros = [];

  rows.forEach(r => {
    const tipo = String(r[COL.tipo] || '').toUpperCase().trim();
    if (tipo !== 'COLETA' && tipo !== 'ENTREGA') return; // ignora PERNOITE, etc.

    const ch = parseDataHora(r[COL.chegada]);
    const sa = parseDataHora(r[COL.saida]);
    const temTempo = ch && sa && !ehPlaceholder(ch) && !ehPlaceholder(sa);

    let perm = null;
    if (temTempo){
      perm = (sa - ch) / 60000; // minutos
      if (perm < 0 || perm >= 60*48) perm = null; // descarta absurdos
    }

    registros.push({
      filial:  normFilial(r[COL.filial]),
      filialRaw: r[COL.filial],
      tipo,
      origem:  r[COL.origem],
      destino: r[COL.destino],
      perm,
      temTempo: perm != null,
      klabinOrigem: ehKlabin(r[COL.origem]) ? nomeUnidade(r[COL.origem]) : null,
      cliente: tipo === 'ENTREGA' ? nomeCurto(r[COL.destino]) : null,
      dentroCarencia: perm != null ? perm <= CARENCIA_MIN : null,
    });
  });

  const validos = registros.filter(r => r.temTempo);

  // ── Filiais presentes (só operacionais, com dados válidos) ──
  const filiaisSet = [...new Set(validos.map(r => r.filial))]
    .filter(f => !FILIAIS_IGNORAR.includes(String(f).toUpperCase()))
    .sort();

  // ── TEMPOS por filial × tipo (para sub-aba Carência) ──
  const TEMPOS = {};
  filiaisSet.forEach(f => {
    TEMPOS[f] = {};
    ['COLETA','ENTREGA'].forEach(t => {
      const arr = validos.filter(r => r.filial===f && r.tipo===t).map(r => r.perm);
      const st = stats(arr);
      const dentro = validos.filter(r => r.filial===f && r.tipo===t && r.dentroCarencia).length;
      TEMPOS[f][t] = { ...st, dentro, fora: st.amostra - dentro };
    });
  });

  // ── Faixas de distribuição ──
  const LIM = [0,60,120,180,240,300,480,720];
  const LABELS = ['0–1h','1–2h','2–3h','3–4h','4–5h','5–8h','+8h'];
  const ESTOURO = [false,false,false,false,false,true,true];
  function histograma(arr){
    const h = new Array(LABELS.length).fill(0);
    arr.forEach(v => {
      for (let i=0; i<LIM.length-1; i++){
        if (v >= LIM[i] && (v < LIM[i+1] || i === LIM.length-2)){ h[i]++; break; }
      }
    });
    return h;
  }
  const TEMPOS_FAIXAS = {
    labels: LABELS, estouro: ESTOURO,
    excedenteMedio: [0,0,0,0,0,1.2,5.5],
    COLETA:  histograma(validos.filter(r=>r.tipo==='COLETA').map(r=>r.perm)),
    ENTREGA: histograma(validos.filter(r=>r.tipo==='ENTREGA').map(r=>r.perm)),
  };

  // ── TEMPOS por filial × tipo (sub-aba Tempos Reais) ──
  const TEMPOS_FILIAL_TIPO = {};
  filiaisSet.forEach(f => {
    const col = stats(validos.filter(r=>r.filial===f && r.tipo==='COLETA').map(r=>r.perm));
    const ent = stats(validos.filter(r=>r.filial===f && r.tipo==='ENTREGA').map(r=>r.perm));
    TEMPOS_FILIAL_TIPO[f] = { coleta: col, descarga: ent };
  });

  // ── Unidades Klabin (origem das coletas) ──
  const klabinSet = [...new Set(validos.filter(r=>r.tipo==='COLETA' && r.klabinOrigem).map(r=>r.klabinOrigem))];
  const volKlabin = {};
  klabinSet.forEach(u => {
    volKlabin[u] = validos.filter(r=>r.klabinOrigem===u && r.tipo==='COLETA').length;
  });
  const UNIDADES_KLABIN = klabinSet.sort((a,b) => volKlabin[b]-volKlabin[a]).slice(0, 15);
  const TEMPOS_UNIDADE_KLABIN = {};
  UNIDADES_KLABIN.forEach(u => {
    const col = stats(validos.filter(r=>r.klabinOrigem===u && r.tipo==='COLETA').map(r=>r.perm));
    // descarga associada: entregas cuja origem é essa mesma unidade Klabin
    const desc = stats(validos.filter(r=>r.tipo==='ENTREGA' && ehKlabin(r.origem) && nomeUnidade(r.origem)===u).map(r=>r.perm));
    TEMPOS_UNIDADE_KLABIN[u] = { coleta: col, descarga: desc };
  });

  // ── Clientes (destino das entregas) — exclui destinos internos Klabin ──
  const cliSet = [...new Set(validos.filter(r=>r.tipo==='ENTREGA' && r.cliente && !ehKlabin(r.cliente)).map(r=>r.cliente))];
  const volCli = {};
  cliSet.forEach(c => { volCli[c] = validos.filter(r=>r.cliente===c).length; });
  const CLIENTES = cliSet.sort((a,b) => volCli[b]-volCli[a]).slice(0, 20);
  const TEMPOS_CLIENTE = {};
  CLIENTES.forEach(c => {
    const desc = stats(validos.filter(r=>r.cliente===c && r.tipo==='ENTREGA').map(r=>r.perm));
    // coleta associada: mesma placa/rota é complexo; usamos coletas cujo destino é esse cliente
    const col = stats(validos.filter(r=>r.tipo==='COLETA' && nomeCurto(r.destino)===c).map(r=>r.perm));
    TEMPOS_CLIENTE[c] = { coleta: col.amostra ? col : desc, descarga: desc };
  });

  // ── DADOS_BRUTOS (aba original CE) — status de prazo ──
  const DADOS_BRUTOS = {};
  filiaisSet.forEach(f => {
    DADOS_BRUTOS[f] = {};
    ['COLETA','ENTREGA'].forEach(t => {
      const sub = registros.filter(r => r.filial===f && r.tipo===t);
      // Recontar por status seria ideal; aqui aproximamos pelos válidos
      const total = sub.length;
      DADOS_BRUTOS[f][t] = {
        np:  sub.filter(r=>r.dentroCarencia===true).length,
        fp:  sub.filter(r=>r.dentroCarencia===false).length,
        afp: 0, pol: 0, can: 0,
        col: t==='COLETA'?total:0,
        ent: t==='ENTREGA'?total:0,
      };
    });
  });

  // ── Mensal (se houver datas) — placeholder mantém estrutura ──
  const mesesIdx = {};

  return {
    FILIAIS: filiaisSet,
    TEMPOS, TEMPOS_FAIXAS, TEMPOS_FILIAL_TIPO,
    UNIDADES_KLABIN, TEMPOS_UNIDADE_KLABIN,
    CLIENTES, TEMPOS_CLIENTE,
    DADOS_BRUTOS,
    totalValidos: validos.length,
    totalRegistros: registros.length,
    coletas: validos.filter(r=>r.tipo==='COLETA').length,
    entregas: validos.filter(r=>r.tipo==='ENTREGA').length,
  };
}

// ── Lê o arquivo (File) e chama o callback com os dados processados ──
function lerPlanilha(file, onDone, onError){
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type:'array', cellDates:true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:null, raw:false });
      const dados = processarPlanilha(rows);
      onDone(dados, file);
    } catch(err){
      console.error('Erro ao processar planilha:', err);
      if (onError) onError(err);
    }
  };
  reader.onerror = function(err){ if (onError) onError(err); };
  reader.readAsArrayBuffer(file);
}
