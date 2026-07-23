// ============================================================
//  DADOS.JS — Dashboard Binotto · Painel de Monitoramento
//  Altere aqui. Nunca mexa no index.html para trocar dados.
// ============================================================

const CONFIG = { empresa:"BINOTTO.", subtitulo:"PAINEL DE MONITORAMENTO", arquivo:"Relatório_Coletas_Entregas_Raster.xlsx", totalRegistros:"17.888" };
const CORES = {
  noPrazo:"#00BFA5", foraDoPrazo:"#EF5350", aberturaForaPrazo:"#FB8C00",
  poligonoIncorreto:"#7C83E0", cancelada:"#607D8B",
  coletas:"#29B6F6", entregas:"#66BB6A",
  agregado:"#1565C0", terceiro:"#00838F", frota:"#F57F17",
  dentroAlvo:"#FF8C00", foraAlvo:"#C62828",
  topbarBg:"#004B24",
  // Permanência
  mediana:"#26C6DA", p90:"#FF7043", excedente:"#D81B60", carencia:"#FFB300",
};
const FILIAIS = ["FL Betim","FL Correia Pinto","FL Guarulhos","FL Itajaí","FL Jundiaí","FL Lages","FL Otacílio Costa","FL Telêmaco Borba"];
const DADOS_BRUTOS = {
  "FL Betim":         { COLETA:{np:3,fp:7,afp:5,pol:0,can:0,col:14,ent:0},   ENTREGA:{np:2,fp:6,afp:5,pol:0,can:0,col:0,ent:14}},
  "FL Correia Pinto": { COLETA:{np:15,fp:30,afp:19,pol:7,can:0,col:70,ent:0}, ENTREGA:{np:15,fp:29,afp:18,pol:7,can:0,col:0,ent:70}},
  "FL Guarulhos":     { COLETA:{np:170,fp:125,afp:104,pol:20,can:15,col:411,ent:0}, ENTREGA:{np:169,fp:124,afp:103,pol:20,can:14,col:0,ent:455}},
  "FL Itajaí":        { COLETA:{np:47,fp:57,afp:87,pol:6,can:34,col:223,ent:0}, ENTREGA:{np:46,fp:56,afp:87,pol:5,can:34,col:0,ent:238}},
  "FL Jundiaí":       { COLETA:{np:439,fp:877,afp:585,pol:211,can:60,col:2119,ent:0}, ENTREGA:{np:439,fp:877,afp:585,pol:211,can:60,col:0,ent:2229}},
  "FL Lages":         { COLETA:{np:357,fp:845,afp:330,pol:64,can:84,col:2023,ent:0}, ENTREGA:{np:714,fp:1689,afp:659,pol:127,can:169,col:0,ent:3017}},
  "FL Otacílio Costa":{ COLETA:{np:405,fp:512,afp:317,pol:61,can:33,col:1328,ent:0}, ENTREGA:{np:404,fp:512,afp:317,pol:60,can:32,col:0,ent:1329}},
  "FL Telêmaco Borba":{ COLETA:{np:580,fp:1101,afp:209,pol:56,can:188,col:2134,ent:0}, ENTREGA:{np:580,fp:1102,afp:208,pol:56,can:188,col:0,ent:2134}},
};
const DONUT_SAIDA   = { data:[8069,5273,3543,14], pcts:["46,6%","30,5%","20,5%","0,1%"] };
const DONUT_ALVO    = { data:[13694,3051], pcts:["81,8%","18,2%"] };
const DONUT_VINCULO = { data:[6853,5872,5087], pcts:["38,6%","33,1%","28,7%"] };

// ------------------------------------------------------------
//  DADOS MENSAIS — Linha do tempo
// ------------------------------------------------------------
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Coletas & Entregas — evolução mensal
const MENSAL_CE = {
  coletas:    [510, 587, 792, 808, 711, 663, 557, 628, 797, 848, 769, 670],
  entregas:   [561, 667, 881, 931, 829, 751, 612, 705, 933, 955, 842, 771],
  noPrazo:    [258, 321, 401, 435, 392, 343, 276, 339, 422, 461, 387, 341],
  foraPrazo:  [465, 537, 748, 780, 654, 610, 501, 609, 777, 812, 704, 629],
};

// SM — inconsistências mensais por filial (ranking)
const MENSAL_SM = {
  "FL Lages":          [220,195,260,280,240,210,180,200,265,290,255,235],
  "FL Telêmaco Borba": [185,170,230,245,210,185,155,175,235,250,225,205],
  "FL Jundiaí":        [158,142,192,202,175,152,128,148,195,205,188,168],
  "FL Otacílio Costa": [102, 90,120,128,110, 98, 82, 95,122,130,118,106],
  "FL Guarulhos":      [ 27, 24, 32, 34, 29, 26, 22, 25, 33, 35, 31, 28],
  "FL Itajaí":         [ 10,  9, 12, 13, 11, 10,  8,  9, 12, 14, 12, 11],
  "FL Correia Pinto":  [  6,  5,  7,  8,  6,  5,  5,  6,  7,  8,  7,  6],
  "FL Betim":          [  1,  1,  2,  2,  1,  1,  1,  1,  2,  2,  1,  1],
};

// ============================================================
//  PERMANÊNCIA — tempo do veículo no ponto (coleta / entrega)
//  Todos os tempos em MINUTOS.
//  Base: SAÍDA − CHEGADA de cada registro.
//  CARENCIA = tempo previsto em contrato; acima disso o tempo
//  vira excedente e sustenta cobrança de estadia.
// ============================================================

const CARENCIA_MIN = 300;                 // 5h00 contratuais

const TEMPOS = {
  "FL Betim":          { COLETA:{ media:125, mediana:88,  p90:233, dentro:13,   fora:1,   amostra:14 },
                         ENTREGA:{ media:108, mediana:76,  p90:201, dentro:13,   fora:1,   amostra:14 } },
  "FL Correia Pinto":  { COLETA:{ media:138, mediana:97,  p90:257, dentro:63,   fora:7,   amostra:70 },
                         ENTREGA:{ media:118, mediana:83,  p90:220, dentro:65,   fora:5,   amostra:70 } },
  "FL Guarulhos":      { COLETA:{ media:176, mediana:124, p90:329, dentro:353,  fora:58,  amostra:411 },
                         ENTREGA:{ media:152, mediana:107, p90:284, dentro:405,  fora:50,  amostra:455 } },
  "FL Itajaí":         { COLETA:{ media:156, mediana:110, p90:292, dentro:196,  fora:27,  amostra:223 },
                         ENTREGA:{ media:135, mediana:95,  p90:252, dentro:217,  fora:21,  amostra:238 } },
  "FL Jundiaí":        { COLETA:{ media:224, mediana:158, p90:419, dentro:1674, fora:445, amostra:2119 },
                         ENTREGA:{ media:193, mediana:136, p90:360, dentro:1828, fora:401, amostra:2229 } },
  "FL Lages":          { COLETA:{ media:237, mediana:167, p90:443, dentro:1558, fora:465, amostra:2023 },
                         ENTREGA:{ media:204, mediana:144, p90:382, dentro:2414, fora:603, amostra:3017 } },
  "FL Otacílio Costa": { COLETA:{ media:192, mediana:135, p90:358, dentro:1116, fora:212, amostra:1328 },
                         ENTREGA:{ media:165, mediana:116, p90:307, dentro:1156, fora:173, amostra:1329 } },
  "FL Telêmaco Borba": { COLETA:{ media:207, mediana:146, p90:387, dentro:1750, fora:384, amostra:2134 },
                         ENTREGA:{ media:179, mediana:126, p90:334, dentro:1814, fora:320, amostra:2134 } },
};

// Distribuição por faixa. As duas últimas faixas estouram a carência.
// excedenteMedio = horas médias ALÉM das 5h em cada faixa (usado para
// estimar o total de horas excedentes; ajuste com seus dados reais).
const TEMPOS_FAIXAS = {
  labels:        ['0–1h','1–2h','2–3h','3–4h','4–5h','5–8h','+8h'],
  estouro:       [false, false, false, false, false, true,  true ],
  excedenteMedio:[0,     0,     0,     0,     0,     1.2,   5.5  ],
  COLETA:        [1210,  2015,  1680,  1090,  728,   1080,  519  ],
  ENTREGA:       [1740,  2540,  1905,  1080,  647,   1090,  484  ],
};

// Evolução mensal — mediana em minutos e nº de estouros de carência
const TEMPOS_MENSAL = {
  medianaColeta:  [138,144,152,156,149,141,133,140,155,162,151,144],
  medianaEntrega: [119,124,131,135,129,122,115,121,134,140,130,124],
  estouros:       [245,258,285,296,272,251,222,241,289,302,278,234],
};
