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
  mediana:"#26C6DA", p90:"#FF7043", excedente:"#D81B60", carencia:"#FFB300",
};
let FILIAIS = ["FL Betim","FL Correia Pinto","FL Guarulhos","FL Itajaí","FL Jundiaí","FL Lages","FL Otacílio Costa","FL Telêmaco Borba"];
let DADOS_BRUTOS = {
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
//  PERMANÊNCIA — preenchido dinamicamente pelo parser.
//  Valores iniciais servem só para a primeira renderização.
// ============================================================
const CARENCIA_MIN = 300;

let TEMPOS = {};
let TEMPOS_FAIXAS = { labels:['0–1h','1–2h','2–3h','3–4h','4–5h','5–8h','+8h'], estouro:[false,false,false,false,false,true,true], excedenteMedio:[0,0,0,0,0,1.2,5.5], COLETA:[0,0,0,0,0,0,0], ENTREGA:[0,0,0,0,0,0,0] };
let TEMPOS_MENSAL = { medianaColeta:new Array(12).fill(0), medianaEntrega:new Array(12).fill(0), estouros:new Array(12).fill(0) };
let TEMPOS_FILIAL_TIPO = {};
let UNIDADES_KLABIN = [];
let TEMPOS_UNIDADE_KLABIN = {};
let CLIENTES = [];
let TEMPOS_CLIENTE = {};

// Aplica os dados processados pelo parser às variáveis globais
function aplicarDados(d){
  FILIAIS = d.FILIAIS;
  DADOS_BRUTOS = d.DADOS_BRUTOS;
  TEMPOS = d.TEMPOS;
  TEMPOS_FAIXAS = d.TEMPOS_FAIXAS;
  TEMPOS_FILIAL_TIPO = d.TEMPOS_FILIAL_TIPO;
  UNIDADES_KLABIN = d.UNIDADES_KLABIN;
  TEMPOS_UNIDADE_KLABIN = d.TEMPOS_UNIDADE_KLABIN;
  CLIENTES = d.CLIENTES;
  TEMPOS_CLIENTE = d.TEMPOS_CLIENTE;
  CONFIG.totalRegistros = d.totalValidos.toLocaleString('pt-BR');
  // Repopular o dropdown de filiais
  const sf = document.getElementById('sf');
  if (sf){
    const atual = sf.value;
    sf.innerHTML = '<option value="TODAS">Todas as filiais</option>' +
      FILIAIS.map(f => `<option value="${f}">${f}</option>`).join('');
    if ([...sf.options].some(o=>o.value===atual)) sf.value = atual;
  }
}



// ── SEED: dados reais da última planilha processada (prévia) ──
const DADOS_SEED = {"FILIAIS": ["FL Betim", "FL Correia Pinto", "FL Guarulhos", "FL Itajaí", "FL Jundiaí", "FL Lages", "FL Otacílio Costa", "FL Telêmaco Borba", "FL Tijucas"], "TEMPOS": {"FL Betim": {"COLETA": {"media": 304, "mediana": 67, "p90": 997, "amostra": 13, "dentro": 7, "fora": 6}, "ENTREGA": {"media": 310, "mediana": 180, "p90": 793, "amostra": 16, "dentro": 12, "fora": 4}}, "FL Correia Pinto": {"COLETA": {"media": 222, "mediana": 164, "p90": 409, "amostra": 52, "dentro": 44, "fora": 8}, "ENTREGA": {"media": 125, "mediana": 68, "p90": 197, "amostra": 58, "dentro": 54, "fora": 4}}, "FL Guarulhos": {"COLETA": {"media": 906, "mediana": 820, "p90": 1852, "amostra": 369, "dentro": 67, "fora": 302}, "ENTREGA": {"media": 452, "mediana": 245, "p90": 1152, "amostra": 217, "dentro": 116, "fora": 101}}, "FL Itajaí": {"COLETA": {"media": 154, "mediana": 107, "p90": 238, "amostra": 127, "dentro": 123, "fora": 4}, "ENTREGA": {"media": 300, "mediana": 107, "p90": 886, "amostra": 195, "dentro": 140, "fora": 55}}, "FL Jundiaí": {"COLETA": {"media": 119, "mediana": 7, "p90": 376, "amostra": 1473, "dentro": 1298, "fora": 175}, "ENTREGA": {"media": 250, "mediana": 119, "p90": 656, "amostra": 1837, "dentro": 1436, "fora": 401}}, "FL Lages": {"COLETA": {"media": 307, "mediana": 210, "p90": 762, "amostra": 1484, "dentro": 1030, "fora": 454}, "ENTREGA": {"media": 359, "mediana": 142, "p90": 1105, "amostra": 2369, "dentro": 1679, "fora": 690}}, "FL Otacílio Costa": {"COLETA": {"media": 223, "mediana": 200, "p90": 360, "amostra": 1064, "dentro": 870, "fora": 194}, "ENTREGA": {"media": 281, "mediana": 128, "p90": 879, "amostra": 1045, "dentro": 771, "fora": 274}}, "FL Telêmaco Borba": {"COLETA": {"media": 164, "mediana": 144, "p90": 296, "amostra": 1872, "dentro": 1690, "fora": 182}, "ENTREGA": {"media": 329, "mediana": 140, "p90": 983, "amostra": 1797, "dentro": 1243, "fora": 554}}, "FL Tijucas": {"COLETA": {"media": 0, "mediana": 0, "p90": 0, "amostra": 0, "dentro": 0, "fora": 0}, "ENTREGA": {"media": 470, "mediana": 470, "p90": 470, "amostra": 1, "dentro": 0, "fora": 1}}}, "TEMPOS_FAIXAS": {"labels": ["0–1h", "1–2h", "2–3h", "3–4h", "4–5h", "5–8h", "+8h"], "estouro": [false, false, false, false, false, true, true], "excedenteMedio": [0, 0, 0, 0, 0, 1.2, 5.5], "COLETA": [1606, 889, 1169, 930, 525, 605, 733], "ENTREGA": [2047, 1470, 965, 611, 355, 531, 1558]}, "TEMPOS_FILIAL_TIPO": {"FL Betim": {"coleta": {"media": 304, "mediana": 67, "p90": 997, "amostra": 13}, "descarga": {"media": 310, "mediana": 180, "p90": 793, "amostra": 16}}, "FL Correia Pinto": {"coleta": {"media": 222, "mediana": 164, "p90": 409, "amostra": 52}, "descarga": {"media": 125, "mediana": 68, "p90": 197, "amostra": 58}}, "FL Guarulhos": {"coleta": {"media": 906, "mediana": 820, "p90": 1852, "amostra": 369}, "descarga": {"media": 452, "mediana": 245, "p90": 1152, "amostra": 217}}, "FL Itajaí": {"coleta": {"media": 154, "mediana": 107, "p90": 238, "amostra": 127}, "descarga": {"media": 300, "mediana": 107, "p90": 886, "amostra": 195}}, "FL Jundiaí": {"coleta": {"media": 119, "mediana": 7, "p90": 376, "amostra": 1473}, "descarga": {"media": 250, "mediana": 119, "p90": 656, "amostra": 1837}}, "FL Lages": {"coleta": {"media": 307, "mediana": 210, "p90": 762, "amostra": 1484}, "descarga": {"media": 359, "mediana": 142, "p90": 1105, "amostra": 2369}}, "FL Otacílio Costa": {"coleta": {"media": 223, "mediana": 200, "p90": 360, "amostra": 1064}, "descarga": {"media": 281, "mediana": 128, "p90": 879, "amostra": 1045}}, "FL Telêmaco Borba": {"coleta": {"media": 164, "mediana": 144, "p90": 296, "amostra": 1872}, "descarga": {"media": 329, "mediana": 140, "p90": 983, "amostra": 1797}}, "FL Tijucas": {"coleta": {"media": 0, "mediana": 0, "p90": 0, "amostra": 0}, "descarga": {"media": 470, "mediana": 470, "p90": 470, "amostra": 1}}}, "UNIDADES_KLABIN": ["ORTIGUEIRA", "OTACILIO COSTA", "JUNDIAI DI", "LG01", "KLABIN LG02", "TIJUCO PRETO", "MONTE ALEGRE", "FIGUEIRA", "TECADI", "ITAJAI", "CORREIA PINTO", "PIRACICABA 01", "TELEMACO BORBA", "SUZANO"], "TEMPOS_UNIDADE_KLABIN": {"ORTIGUEIRA": {"coleta": {"media": 159, "mediana": 138, "p90": 284, "amostra": 1636}, "descarga": {"media": 336, "mediana": 145, "p90": 985, "amostra": 1572}}, "OTACILIO COSTA": {"coleta": {"media": 201, "mediana": 194, "p90": 330, "amostra": 881}, "descarga": {"media": 307, "mediana": 162, "p90": 906, "amostra": 862}}, "JUNDIAI DI": {"coleta": {"media": 7, "mediana": 2, "p90": 20, "amostra": 712}, "descarga": {"media": 231, "mediana": 120, "p90": 481, "amostra": 906}}, "LG01": {"coleta": {"media": 219, "mediana": 179, "p90": 380, "amostra": 693}, "descarga": {"media": 203, "mediana": 120, "p90": 426, "amostra": 786}}, "KLABIN LG02": {"coleta": {"media": 370, "mediana": 249, "p90": 908, "amostra": 592}, "descarga": {"media": 420, "mediana": 157, "p90": 1205, "amostra": 1181}}, "TIJUCO PRETO": {"coleta": {"media": 120, "mediana": 59, "p90": 262, "amostra": 503}, "descarga": {"media": 205, "mediana": 85, "p90": 539, "amostra": 615}}, "MONTE ALEGRE": {"coleta": {"media": 202, "mediana": 192, "p90": 324, "amostra": 230}, "descarga": {"media": 286, "mediana": 108, "p90": 896, "amostra": 218}}, "FIGUEIRA": {"coleta": {"media": 466, "mediana": 381, "p90": 1018, "amostra": 212}, "descarga": {"media": 440, "mediana": 176, "p90": 1221, "amostra": 244}}, "TECADI": {"coleta": {"media": 432, "mediana": 287, "p90": 933, "amostra": 207}, "descarga": {"media": 478, "mediana": 187, "p90": 1365, "amostra": 402}}, "ITAJAI": {"coleta": {"media": 154, "mediana": 107, "p90": 238, "amostra": 127}, "descarga": {"media": 300, "mediana": 107, "p90": 886, "amostra": 195}}, "CORREIA PINTO": {"coleta": {"media": 251, "mediana": 172, "p90": 434, "amostra": 64}, "descarga": {"media": 131, "mediana": 70, "p90": 239, "amostra": 73}}, "PIRACICABA 01": {"coleta": {"media": 257, "mediana": 216, "p90": 453, "amostra": 38}, "descarga": {"media": 240, "mediana": 174, "p90": 439, "amostra": 58}}, "TELEMACO BORBA": {"coleta": {"media": 96, "mediana": 69, "p90": 216, "amostra": 6}, "descarga": {"media": 122, "mediana": 12, "p90": 328, "amostra": 7}}, "SUZANO": {"coleta": {"media": 155, "mediana": 155, "p90": 170, "amostra": 2}, "descarga": {"media": 129, "mediana": 122, "p90": 180, "amostra": 3}}}, "CLIENTES": ["MILI S/A", "ARMAZEM CORREIA PINTO", "PROCOSA PRODUTOS DE BELEZA LTDA", "FOREST PAPER COMERCIO DE PAPEIS LAGES LTDA", "INDAIAL PAPEL EMBALAGENS LTDA", "BN", "VOTORANTIM CIMENTOS SA", "BINOTTO", "CIA. CANOINHAS DE PAPEL", "CONTLOG LOGISTICA E COMERCIO EXTERI LTDA", "NESTLE BRASIL LTDA", "FM LOGISTIC DO BRASIL OPERACOES DE LOGISTICA LTDA", "NESTLE NORDESTE ALIMENTOS E BEBIDAS", "CELUPA INDUSTRIAL CELULOSE E PAPEL GUAIBA LTDA", "FISCHER SA AGROINDUSTRIA", "VOTORANTIM CIMENTOS BRASIL LTDA", "BUNGE ALIMENTOS SA", "CSN CIMENTOS SA", "SANCHEZ CANO LTDA", "MASTER CARGAS BRASIL LTDA"], "TEMPOS_CLIENTE": {"MILI S/A": {"coleta": {"media": 166, "mediana": 102, "p90": 492, "amostra": 469}, "descarga": {"media": 166, "mediana": 102, "p90": 492, "amostra": 469}}, "ARMAZEM CORREIA PINTO": {"coleta": {"media": 371, "mediana": 249, "p90": 909, "amostra": 591}, "descarga": {"media": 170, "mediana": 130, "p90": 314, "amostra": 383}}, "PROCOSA PRODUTOS DE BELEZA LTDA": {"coleta": {"media": 173, "mediana": 143, "p90": 321, "amostra": 299}, "descarga": {"media": 173, "mediana": 143, "p90": 321, "amostra": 299}}, "FOREST PAPER COMERCIO DE PAPEIS LAGES LTDA": {"coleta": {"media": 303, "mediana": 227, "p90": 592, "amostra": 157}, "descarga": {"media": 296, "mediana": 224, "p90": 603, "amostra": 165}}, "INDAIAL PAPEL EMBALAGENS LTDA": {"coleta": {"media": 558, "mediana": 464, "p90": 1028, "amostra": 162}, "descarga": {"media": 558, "mediana": 464, "p90": 1028, "amostra": 162}}, "BN": {"coleta": {"media": 227, "mediana": 106, "p90": 744, "amostra": 120}, "descarga": {"media": 227, "mediana": 106, "p90": 744, "amostra": 120}}, "VOTORANTIM CIMENTOS SA": {"coleta": {"media": 641, "mediana": 418, "p90": 1458, "amostra": 102}, "descarga": {"media": 641, "mediana": 418, "p90": 1458, "amostra": 102}}, "BINOTTO": {"coleta": {"media": 407, "mediana": 218, "p90": 1175, "amostra": 18}, "descarga": {"media": 430, "mediana": 188, "p90": 928, "amostra": 99}}, "CIA. CANOINHAS DE PAPEL": {"coleta": {"media": 349, "mediana": 81, "p90": 1049, "amostra": 93}, "descarga": {"media": 349, "mediana": 81, "p90": 1049, "amostra": 93}}, "CONTLOG LOGISTICA E COMERCIO EXTERI LTDA": {"coleta": {"media": 686, "mediana": 645, "p90": 1142, "amostra": 4}, "descarga": {"media": 449, "mediana": 231, "p90": 910, "amostra": 82}}, "NESTLE BRASIL LTDA": {"coleta": {"media": 138, "mediana": 58, "p90": 308, "amostra": 74}, "descarga": {"media": 138, "mediana": 58, "p90": 308, "amostra": 74}}, "FM LOGISTIC DO BRASIL OPERACOES DE LOGISTICA LTDA": {"coleta": {"media": 159, "mediana": 2, "p90": 374, "amostra": 64}, "descarga": {"media": 159, "mediana": 2, "p90": 374, "amostra": 64}}, "NESTLE NORDESTE ALIMENTOS E BEBIDAS": {"coleta": {"media": 40, "mediana": 26, "p90": 106, "amostra": 62}, "descarga": {"media": 40, "mediana": 26, "p90": 106, "amostra": 62}}, "CELUPA INDUSTRIAL CELULOSE E PAPEL GUAIBA LTDA": {"coleta": {"media": 436, "mediana": 160, "p90": 1254, "amostra": 57}, "descarga": {"media": 436, "mediana": 160, "p90": 1254, "amostra": 57}}, "FISCHER SA AGROINDUSTRIA": {"coleta": {"media": 224, "mediana": 110, "p90": 722, "amostra": 57}, "descarga": {"media": 224, "mediana": 110, "p90": 722, "amostra": 57}}, "VOTORANTIM CIMENTOS BRASIL LTDA": {"coleta": {"media": 715, "mediana": 337, "p90": 1625, "amostra": 56}, "descarga": {"media": 715, "mediana": 337, "p90": 1625, "amostra": 56}}, "BUNGE ALIMENTOS SA": {"coleta": {"media": 671, "mediana": 358, "p90": 1474, "amostra": 56}, "descarga": {"media": 671, "mediana": 358, "p90": 1474, "amostra": 56}}, "CSN CIMENTOS SA": {"coleta": {"media": 1353, "mediana": 1273, "p90": 2510, "amostra": 56}, "descarga": {"media": 1353, "mediana": 1273, "p90": 2510, "amostra": 56}}, "SANCHEZ CANO LTDA": {"coleta": {"media": 306, "mediana": 141, "p90": 1161, "amostra": 51}, "descarga": {"media": 306, "mediana": 141, "p90": 1161, "amostra": 51}}, "MASTER CARGAS BRASIL LTDA": {"coleta": {"media": 572, "mediana": 442, "p90": 1058, "amostra": 50}, "descarga": {"media": 572, "mediana": 442, "p90": 1058, "amostra": 50}}}, "DADOS_BRUTOS": {"FL Betim": {"COLETA": {"np": 7, "fp": 6, "afp": 0, "pol": 0, "can": 0, "col": 19, "ent": 0}, "ENTREGA": {"np": 12, "fp": 4, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 19}}, "FL Correia Pinto": {"COLETA": {"np": 44, "fp": 8, "afp": 0, "pol": 0, "can": 0, "col": 68, "ent": 0}, "ENTREGA": {"np": 54, "fp": 4, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 68}}, "FL Guarulhos": {"COLETA": {"np": 67, "fp": 302, "afp": 0, "pol": 0, "can": 0, "col": 435, "ent": 0}, "ENTREGA": {"np": 116, "fp": 101, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 478}}, "FL Itajaí": {"COLETA": {"np": 123, "fp": 4, "afp": 0, "pol": 0, "can": 0, "col": 227, "ent": 0}, "ENTREGA": {"np": 140, "fp": 55, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 244}}, "FL Jundiaí": {"COLETA": {"np": 1298, "fp": 175, "afp": 0, "pol": 0, "can": 0, "col": 2207, "ent": 0}, "ENTREGA": {"np": 1436, "fp": 401, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 2313}}, "FL Lages": {"COLETA": {"np": 1030, "fp": 454, "afp": 0, "pol": 0, "can": 0, "col": 2048, "ent": 0}, "ENTREGA": {"np": 1679, "fp": 690, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 3105}}, "FL Otacílio Costa": {"COLETA": {"np": 870, "fp": 194, "afp": 0, "pol": 0, "can": 0, "col": 1376, "ent": 0}, "ENTREGA": {"np": 771, "fp": 274, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 1377}}, "FL Telêmaco Borba": {"COLETA": {"np": 1690, "fp": 182, "afp": 0, "pol": 0, "can": 0, "col": 2274, "ent": 0}, "ENTREGA": {"np": 1243, "fp": 554, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 2274}}, "FL Tijucas": {"COLETA": {"np": 0, "fp": 0, "afp": 0, "pol": 0, "can": 0, "col": 1, "ent": 0}, "ENTREGA": {"np": 0, "fp": 1, "afp": 0, "pol": 0, "can": 0, "col": 0, "ent": 1}}}, "totalValidos": 13994, "totalRegistros": 18544, "coletas": 6457, "entregas": 7537};
