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
  placa:    'Placa',
  tempoAlvo:'Tempo no alvo',
  dataRef:  'Data/hora inclusão SM',
  dataInclusaoSM:  'Data/hora inclusão SM',
  dataEfetivacaoSM:'Data/hora efetivação SM',
  smCodigo: 'Solicitação Monitoramento - Código',
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

// ── Parser: linhas cruas → array de registros individuais ──
// Cada registro guarda também vínculo, placa e data de referência,
// para permitir refiltrar e reagregar sem reler o arquivo.
function parseLinhas(rows){
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

    // Data de referência para filtro de período: usa inclusão da SM
    // (sempre presente), com fallback na própria chegada.
    let dataRef = parseDataHora(r[COL.dataRef]);
    if (!dataRef || ehPlaceholder(dataRef)) dataRef = (ch && !ehPlaceholder(ch)) ? ch : null;

    // ── Categoria de status da SM (Status chegada no local) ──
    // NO PRAZO / FORA DO PRAZO / CANCELADA / NÃO REGISTRADO.
    // Quando NÃO REGISTRADO:
    //   - na COLETA, a checagem de antecedência da SM decide o motivo
    //     (< 2h → Abertura Fora do Prazo · >= 2h → Polígono Incorreto)
    //   - na ENTREGA, sempre vira Polígono Incorreto (o monitoramento já
    //     está ativo desde a coleta; não registrar é sair da área monitorada)
    const statusChegada = String(r[COL.statusCheg] || '').toUpperCase().trim();
    let smCategoria = null;
    if (statusChegada === 'NO PRAZO')      smCategoria = 'np';
    else if (statusChegada === 'FORA DO PRAZO') smCategoria = 'fp';
    else if (statusChegada === 'CANCELADA')     smCategoria = 'can';
    else if (statusChegada === 'NÃO REGISTRADO'){
      if (tipo === 'ENTREGA'){
        // Na entrega, o monitoramento já vem ativo desde a coleta —
        // "não registrado" só pode significar que saiu da área monitorada.
        smCategoria = 'pol';
      } else {
        // Na coleta, a checagem de antecedência da SM decide o motivo:
        //   < 2h entre inclusão e efetivação → Abertura Fora do Prazo
        //   >= 2h ("efetivada no prazo")     → Polígono Incorreto
        const dInc = parseDataHora(r[COL.dataInclusaoSM]);
        const dEfe = parseDataHora(r[COL.dataEfetivacaoSM]);
        const deltaMin = (dInc && dEfe && !ehPlaceholder(dInc) && !ehPlaceholder(dEfe))
          ? (dEfe - dInc) / 60000 : null;
        smCategoria = (deltaMin != null && deltaMin < 120) ? 'afp' : 'pol';
      }
    }

    registros.push({
      filial:  normFilial(r[COL.filial]),
      filialRaw: r[COL.filial],
      tipo,
      origem:  r[COL.origem],
      destino: r[COL.destino],
      vinculo: String(r[COL.vinculo] || '').toUpperCase().trim(),
      placa:   String(r[COL.placa] || '').toUpperCase().trim(),
      smCodigo: String(r[COL.smCodigo] || '').trim(),
      dataRef,
      statusChegada, smCategoria,
      perm,
      temTempo: perm != null,
      klabinOrigem: ehKlabin(r[COL.origem]) ? nomeUnidade(r[COL.origem]) : null,
      cliente: tipo === 'ENTREGA' ? nomeCurto(r[COL.destino]) : null,
      dentroCarencia: perm != null ? perm <= CARENCIA_MIN : null,
    });
  });

  return registros;
}

// ── Agregação: array de registros (já filtrado ou não) → todas as
// estruturas que o dashboard consome. Reaproveitada tanto na carga
// inicial quanto sempre que um filtro de vínculo/placa/período muda. ──
function agregarRegistros(registros){
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
    // Coleta só existe de fato se houver linhas de COLETA reais com destino = esse cliente
    // (caso raro: o "cliente" na prática é um ponto de transbordo/unidade Klabin, ex: Forest Paper).
    // Sem fallback: se não houver coleta real, fica com amostra:0 (tratado na exibição).
    const col = stats(validos.filter(r=>r.tipo==='COLETA' && nomeCurto(r.destino)===c).map(r=>r.perm));
    TEMPOS_CLIENTE[c] = { coleta: col, descarga: desc };
  });

  // ── DADOS_BRUTOS (aba CE e SM) — status real da SM por filial ──
  // np/fp/afp/pol/can vêm de 'Status chegada no local' (ver smCategoria),
  // não da carência de 5h (que é exclusiva da aba Permanência).
  const DADOS_BRUTOS = {};
  filiaisSet.forEach(f => {
    DADOS_BRUTOS[f] = {};
    ['COLETA','ENTREGA'].forEach(t => {
      const sub = registros.filter(r => r.filial===f && r.tipo===t);
      const total = sub.length;
      DADOS_BRUTOS[f][t] = {
        np:  sub.filter(r=>r.smCategoria==='np').length,
        fp:  sub.filter(r=>r.smCategoria==='fp').length,
        afp: sub.filter(r=>r.smCategoria==='afp').length,
        pol: sub.filter(r=>r.smCategoria==='pol').length,
        can: sub.filter(r=>r.smCategoria==='can').length,
        col: t==='COLETA'?total:0,
        ent: t==='ENTREGA'?total:0,
      };
    });
  });

  // ── Mensal (se houver datas) — placeholder mantém estrutura ──
  const mesesIdx = {};

  // ── RESUMO — total de viagens (por código de SM, não por linha),
  // coletas e entregas. Serve de referência estável para todas as abas:
  // uma viagem = 1 código de SM, que pode ter várias entregas (multi-drop).
  function calcResumoSet(regs){
    const viagens  = new Set(regs.map(r => r.smCodigo).filter(Boolean)).size;
    const coletas  = regs.filter(r => r.tipo === 'COLETA').length;
    const entregas = regs.filter(r => r.tipo === 'ENTREGA').length;
    return { viagens, coletas, entregas, total: regs.length };
  }
  const RESUMO = calcResumoSet(registros);
  const RESUMO_POR_FILIAL = {};
  filiaisSet.forEach(f => {
    RESUMO_POR_FILIAL[f] = calcResumoSet(registros.filter(r => r.filial === f));
  });

  // ── Viagens com mais de 1 coleta (caso raro/exceção operacional) ──
  // Agrupa por código de SM e lista as que têm 2+ linhas do tipo COLETA.
  const porSM = {};
  registros.forEach(r => {
    if (!r.smCodigo) return;
    if (!porSM[r.smCodigo]) porSM[r.smCodigo] = [];
    porSM[r.smCodigo].push(r);
  });
  const VIAGENS_MULTI_COLETA = Object.entries(porSM)
    .map(([sm, regs]) => {
      const coletas = regs.filter(r => r.tipo === 'COLETA');
      const entregas = regs.filter(r => r.tipo === 'ENTREGA');
      if (coletas.length < 2) return null;
      return {
        smCodigo: sm,
        filial: regs[0].filial,
        placa: [...new Set(regs.map(r=>r.placa).filter(Boolean))].join(', ') || '—',
        numColetas: coletas.length,
        numEntregas: entregas.length,
        origens: [...new Set(coletas.map(r => nomeUnidade(r.origem)))],
        destinos: [...new Set(entregas.map(r => nomeCurto(r.destino)))],
      };
    })
    .filter(Boolean)
    .sort((a,b) => b.numColetas - a.numColetas);

  return {
    FILIAIS: filiaisSet,
    TEMPOS, TEMPOS_FAIXAS, TEMPOS_FILIAL_TIPO,
    UNIDADES_KLABIN, TEMPOS_UNIDADE_KLABIN,
    CLIENTES, TEMPOS_CLIENTE,
    DADOS_BRUTOS,
    RESUMO, RESUMO_POR_FILIAL,
    VIAGENS_MULTI_COLETA,
    totalValidos: validos.length,
    totalRegistros: registros.length,
    coletas: validos.filter(r=>r.tipo==='COLETA').length,
    entregas: validos.filter(r=>r.tipo==='ENTREGA').length,
  };
}

// ── Wrapper usado na primeira leitura do arquivo: parseia e agrega,
// mas guarda os registros crus em `_registros` para permitir que os
// filtros de vínculo/placa/período reagreguem depois sem reler o Excel. ──
function processarPlanilha(rows){
  const registros = parseLinhas(rows);
  const agregado = agregarRegistros(registros);
  agregado._registros = registros;
  return agregado;
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
