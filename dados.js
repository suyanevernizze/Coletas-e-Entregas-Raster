// ============================================================
//  DADOS.JS — Configuração e dados do dashboard Binotto
//  Altere aqui sem precisar tocar no index.html
// ============================================================

const CONFIG = {
  empresa: "BINOTTO.",
  subtitulo: "CONTROLE DE MONITORAMENTO",
  arquivo: "Relatório_Coletas_Entregas_Raster.xlsx",
  totalRegistros: "17.888",
};

// ------------------------------------------------------------
//  REGRAS DE CLASSIFICAÇÃO
// ------------------------------------------------------------
const REGRAS = {
  prazoMinHoras: 2,
  descricao: {
    noPrazo:            "SM efetivada ≥ 2h antes + chegada registrada NO PRAZO",
    foraDoPrazo:        "SM efetivada < 2h antes + chegada FORA DO PRAZO ou NO PRAZO",
    aberturaForaPrazo:  "SM fora do prazo + chegada NÃO REGISTRADO (ref: início real da viagem)",
    poligonoIncorreto:  "SM no prazo + chegada NÃO REGISTRADO (ref: início real da viagem)",
  },
};

// ------------------------------------------------------------
//  PALETA — Verde Primavera Intensa
//  Altere aqui para mudar todas as cores do dashboard
// ------------------------------------------------------------
const CORES = {
  // Estrutura
  topbarBg:      "#1D6A37",
  topbarAccent:  "#6E9C36",
  topbarSub:     "#A7BE4B",
  badgeBg:       "#235E46",
  badgeBorder:   "#2D924F",
  badgeText:     "#D9ED88",
  navbarBorder:  "#D9ED88",
  navTabActive:  "#1D6A37",
  navTabInativo: "#6E9C36",
  navTabLine:    "#2D924F",
  fundoGeral:    "#f0f7f2",
  cardBorder:    "#A7BE4B",
  ruleBg:        "#D9ED88",
  ruleBorder:    "#2D924F",
  crossCellBg:   "#f0f7f2",

  // Categorias semânticas
  noPrazo:           "#2D924F",
  foraDoPrazo:       "#F64F35",
  aberturaForaPrazo: "#FEBC3E",
  poligonoIncorreto: "#373FA0",
  cancelada:         "#7F7269",

  // Coletas & Entregas
  coletas:  "#68DDF4",
  entregas: "#58CA7C",

  // Vínculo
  agregado: "#235E46",
  terceiro: "#32A76F",
  frota:    "#A7BE4B",

  // Finalização
  dentroAlvo: "#6E9C36",
  foraAlvo:   "#FD6349",

  // Saída
  saidaNR: "#A7BE4B",
  saidaNI: "#D9ED88",

  // KPI texto
  kpiBlue:   "#4B99A6",
  kpiGreen:  "#2D924F",
  kpiRed:    "#F64F35",
  kpiAmber:  "#C05525",
  kpiPurple: "#373FA0",
  kpiGray:   "#7F7269",
};

// ------------------------------------------------------------
//  KPIs — ABA COLETAS & ENTREGAS
// ------------------------------------------------------------
const KPI_CE = [
  { label: "SMs únicas",         valor: "8.311",  sub: "Solicitações monitoradas",   cor: "blue",   borderColor: "#4B99A6" },
  { label: "Coletas",            valor: "8.324",  sub: "Registros de coleta",        cor: "teal",   borderColor: "#68DDF4" },
  { label: "Entregas",           valor: "9.488",  sub: "Registros de entrega",       cor: "green",  borderColor: "#58CA7C" },
  { label: "No prazo",           valor: "4.386",  sub: "24,6% do total",             cor: "green",  borderColor: "#2D924F" },
  { label: "Fora do prazo",      valor: "7.949",  sub: "44,6% do total",             cor: "red",    borderColor: "#F64F35" },
  { label: "Abertura FP",        valor: "3.638",  sub: "SM efetivada tarde",         cor: "amber",  borderColor: "#FEBC3E" },
  { label: "Polígono incorreto", valor: "912",    sub: "SM NP + chegada NR",         cor: "purple", borderColor: "#373FA0" },
  { label: "Canceladas",         valor: "913",    sub: "SMs canceladas",             cor: "gray",   borderColor: "#7F7269" },
];

// ------------------------------------------------------------
//  KPIs — ABA SM
// ------------------------------------------------------------
const KPI_SM = [
  { label: "Total válido",        valor: "17.812", sub: "Coletas + Entregas",          cor: "blue",   borderColor: "#4B99A6" },
  { label: "No prazo",            valor: "4.386",  sub: "24,6%",                       cor: "green",  borderColor: "#2D924F" },
  { label: "Fora do prazo",       valor: "7.949",  sub: "44,6%",                       cor: "red",    borderColor: "#F64F35" },
  { label: "Abertura FP",         valor: "3.638",  sub: "20,4% — SM efetivada tarde",  cor: "amber",  borderColor: "#FEBC3E" },
  { label: "Polígono incorreto",  valor: "912",    sub: "5,1% — SM NP + chegada NR",   cor: "purple", borderColor: "#373FA0" },
  { label: "Canceladas",          valor: "913",    sub: "5,1%",                        cor: "gray",   borderColor: "#7F7269" },
];

// ------------------------------------------------------------
//  CARDS DE CRUZAMENTO — Aba SM
// ------------------------------------------------------------
const CARDS_CRUZAMENTO = [
  {
    titulo: "No prazo (SM efetivada + chegada NP)",
    valor: "4.386", pct: "24,6%",
    borderColor: "#2D924F",
    corValor: "#2D924F", corBadgeBg: "#D9ED88", corBadgeText: "#235E46",
  },
  {
    titulo: "Fora do prazo (chegada FP ou SM FP + NP)",
    valor: "7.949", pct: "44,6%",
    borderColor: "#F64F35",
    corValor: "#F64F35", corBadgeBg: "#FDBDB9", corBadgeText: "#C05525",
  },
  {
    titulo: "Abertura fora do prazo (SM FP + chegada NR)",
    valor: "3.638", pct: "20,4%",
    borderColor: "#FEBC3E",
    corValor: "#C05525", corBadgeBg: "#FEF26E", corBadgeText: "#9D3124",
  },
  {
    titulo: "Polígono incorreto (SM NP + chegada NR)",
    valor: "912", pct: "5,1%",
    borderColor: "#373FA0",
    corValor: "#373FA0", corBadgeBg: "#CEC6F7", corBadgeText: "#32347E",
  },
];

// ------------------------------------------------------------
//  FILIAIS E DADOS POR FILIAL
// ------------------------------------------------------------
const FILIAIS = [
  "FL Betim",
  "FL Correia Pinto",
  "FL Guarulhos",
  "FL Itajaí",
  "FL Jundiaí",
  "FL Lages",
  "FL Otacílio Costa",
  "FL Telêmaco Borba",
];

const FILIAL_DADOS = {
  noPrazo:           [5,   30,  339,  93,  878, 1071,  809, 1160],
  foraDoPrazo:       [13,  59,  249, 113, 1754, 2534, 1024, 2203],
  aberturaForaPrazo: [10,  37,  207, 174, 1170,  989,  634,  417],
  poligonoIncorreto: [0,   14,   40,  11,  422,  191,  121,  112],
  cancelada:         [0,    0,   29,  68,  120,  253,   65,  376],
  coletas:           [14,  70,  411, 223, 2119, 2023, 1328, 2134],
  entregas:          [14,  70,  455, 238, 2229, 3017, 1329, 2134],
};

// ------------------------------------------------------------
//  DONUTS
// ------------------------------------------------------------
const DONUT_CLASSIFICACAO = {
  labels: ["Fora do prazo", "No prazo", "Abertura FP", "Polígono incorreto", "Cancelada"],
  data:   [7949, 4386, 3638, 912, 913],
  pcts:   ["44,6%", "24,6%", "20,4%", "5,1%", "5,1%"],
};

const DONUT_SAIDA = {
  labels: ["No prazo", "Fora do prazo", "Não registrado", "Não iniciada"],
  data:   [8069, 5273, 3543, 14],
  pcts:   ["46,6%", "30,5%", "20,5%", "0,1%"],
};

const DONUT_ALVO = {
  labels: ["Dentro do alvo", "Fora do alvo"],
  data:   [13694, 3051],
  pcts:   ["81,8%", "18,2%"],
};

const DONUT_VINCULO = {
  labels: ["Agregado", "Terceiro", "Frota"],
  data:   [6853, 5872, 5087],
  pcts:   ["38,6%", "33,1%", "28,7%"],
};
