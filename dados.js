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
