// =====================================================================
// ical.js: lê o texto de uma agenda iCal (.ics) e devolve os eventos de um
// período, já com as repetições (todo dia, toda semana...) e no horário de
// Brasília. JavaScript puro pra dar pra testar no navegador também.
// Uma data é guardada como { y, m, d, hh, mm, diaInteiro }.
// =====================================================================

const FUSO_BR = -3; // Brasília (sem horário de verão desde 2019)
const DIAS_SEMANA = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DIA_MS = 86400000;

// Só aceita link do próprio Google Agenda (nada de buscar endereço qualquer).
export function linkValido(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "calendar.google.com" || u.hostname.endsWith(".calendar.google.com"));
  } catch { return false; }
}

// "Desdobra" as linhas (no iCal, linha que começa com espaço continua a de cima).
const linhas = (ics) => ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);

// Conta com a data "local" usando UTC (assim não sofre com o fuso do servidor).
const paraMs = (q) => Date.UTC(q.y, q.m - 1, q.d, q.hh, q.mm);
function deMs(ms, diaInteiro) {
  const x = new Date(ms);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), hh: x.getUTCHours(), mm: x.getUTCMinutes(), diaInteiro };
}
const dataIso = (q) => `${q.y}-${String(q.m).padStart(2, "0")}-${String(q.d).padStart(2, "0")}`;

// DTSTART;TZID=America/Sao_Paulo:20261028T140000 / DTSTART:20261028T170000Z / DTSTART;VALUE=DATE:20261028
function lerQuando(params, valor) {
  const m = valor.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{0,2}(Z)?)?/);
  if (!m) return null;
  const q = { y: +m[1], m: +m[2], d: +m[3], hh: m[4] ? +m[4] : 0, mm: m[5] ? +m[5] : 0, diaInteiro: !m[4] || /VALUE=DATE(?!-)/.test(params) };
  return m[6] ? deMs(paraMs(q) + FUSO_BR * 3600000, false) : q; // UTC -> Brasília
}

// N-ésimo dia da semana do mês (n negativo = contando do fim). Ex: 2º domingo, última sexta.
function enesimoDia(y, m, diaSemana, n) {
  const ultimoDia = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (n > 0) {
    const primeiro = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const d = 1 + ((diaSemana - primeiro + 7) % 7) + (n - 1) * 7;
    return d <= ultimoDia ? d : null;
  }
  const ultimo = new Date(Date.UTC(y, m - 1, ultimoDia)).getUTCDay();
  const d = ultimoDia - ((ultimo - diaSemana + 7) % 7) + (n + 1) * 7;
  return d >= 1 ? d : null;
}

// Gera as datas de um evento que se repete (RRULE) entre o começo da série e o fim do período.
function repeticoes(inicio, regra, deMsP, ateMsP) {
  const r = Object.fromEntries(regra.split(";").map((p) => p.split("=")));
  const freq = r.FREQ, intervalo = Math.max(1, Number(r.INTERVAL || 1));
  const limite = r.COUNT ? Number(r.COUNT) : Infinity;
  const fimSerie = r.UNTIL ? paraMs(lerQuando("", r.UNTIL) || inicio) + DIA_MS - 1 : Infinity;
  const ate = Math.min(ateMsP, fimSerie);
  const porDia = r.BYDAY ? String(r.BYDAY).split(",") : [];
  const saida = [];
  let contadas = 0;
  const pega = (q) => {
    if (paraMs(q) < paraMs(inicio) || paraMs(q) > ate || contadas >= limite) return;
    contadas++;
    saida.push(q);
  };

  // Série antiga sem COUNT: pula direto pra perto do período (não precisa contar desde o começo).
  const passoMs = freq === "DAILY" ? intervalo * DIA_MS : freq === "WEEKLY" ? intervalo * 7 * DIA_MS : 0;
  const pular = passoMs && limite === Infinity ? Math.max(0, Math.floor((deMsP - paraMs(inicio)) / passoMs) - 1) : 0;

  for (let i = pular; i < pular + 3000 && contadas < limite; i++) {
    let base;
    if (freq === "DAILY" || freq === "WEEKLY") base = deMs(paraMs(inicio) + i * passoMs, inicio.diaInteiro);
    else if (freq === "MONTHLY") { const t = (inicio.m - 1) + i * intervalo; base = { ...inicio, y: inicio.y + Math.floor(t / 12), m: (t % 12) + 1 }; }
    else if (freq === "YEARLY") base = { ...inicio, y: inicio.y + i * intervalo };
    else { pega(inicio); break; }
    if (Date.UTC(base.y, base.m - 1, 1) > ate) break;

    if (freq === "WEEKLY" && porDia.length) {
      const domingo = paraMs(base) - new Date(paraMs(base)).getUTCDay() * DIA_MS; // semana começando no domingo
      const dias = porDia.map((dia) => DIAS_SEMANA.indexOf(dia.slice(-2))).sort((a, b) => a - b);
      for (const ds of dias) pega(deMs(domingo + ds * DIA_MS, base.diaInteiro));
    } else if (freq === "MONTHLY" && porDia.length) {
      for (const dia of porDia) {
        const d = enesimoDia(base.y, base.m, DIAS_SEMANA.indexOf(dia.slice(-2)), Number(dia.slice(0, -2) || 1));
        if (d) pega({ ...base, d });
      }
    } else if (freq === "MONTHLY" || freq === "YEARLY") {
      // Dia 31 num mês que não tem 31: o Google pula esse mês
      if (base.d <= new Date(Date.UTC(base.y, base.m, 0)).getUTCDate()) pega(base);
    } else pega(base);
  }
  return saida;
}

// Lista de { data: "2026-10-28", hora: "14:00" ou null (dia inteiro), titulo } entre "de" e "ate".
export function eventosDoIcs(ics, de, ate) {
  const deMsP = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const ateMsP = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10), 23, 59);
  const brutos = [];
  let atual = null;

  for (const linha of linhas(ics)) {
    if (linha === "BEGIN:VEVENT") { atual = { uid: "", titulo: "", excecoes: new Set(), cancelado: false }; continue; }
    if (linha === "END:VEVENT") { if (atual) brutos.push(atual); atual = null; continue; }
    if (!atual) continue;
    const sep = linha.indexOf(":");
    if (sep < 0) continue;
    const [nome, ...params] = linha.slice(0, sep).split(";");
    const parametros = params.join(";"), valor = linha.slice(sep + 1);
    if (nome === "UID") atual.uid = valor;
    else if (nome === "SUMMARY") atual.titulo = valor.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
    else if (nome === "DTSTART") atual.inicio = lerQuando(parametros, valor);
    else if (nome === "DTEND") atual.fim = lerQuando(parametros, valor);
    else if (nome === "RRULE") atual.regra = valor;
    else if (nome === "EXDATE") for (const v of valor.split(",")) { const q = lerQuando(parametros, v); if (q) atual.excecoes.add(dataIso(q)); }
    else if (nome === "RECURRENCE-ID") { const q = lerQuando(parametros, valor); if (q) atual.recId = dataIso(q); }
    else if (nome === "STATUS" && valor === "CANCELLED") atual.cancelado = true;
  }

  // Ocorrência editada ou cancelada de um evento que se repete: tira a original da série.
  for (const b of brutos) {
    if (b.recId) brutos.find((x) => x.uid === b.uid && !x.recId)?.excecoes.add(b.recId);
  }

  const saida = [];
  for (const b of brutos) {
    if (!b.inicio || b.cancelado) continue;
    const ocorrencias = b.regra && !b.recId ? repeticoes(b.inicio, b.regra, deMsP, ateMsP) : [b.inicio];
    // Dia inteiro com vários dias (ex: viagem de 3 dias): aparece em cada dia.
    const duracao = b.inicio.diaInteiro && b.fim ? Math.max(1, Math.round((paraMs(b.fim) - paraMs(b.inicio)) / DIA_MS)) : 1;
    for (const o of ocorrencias) {
      if (b.excecoes.has(dataIso(o))) continue;
      for (let k = 0; k < Math.min(duracao, 62); k++) {
        const dia = deMs(paraMs(o) + k * DIA_MS, o.diaInteiro);
        const ms = Date.UTC(dia.y, dia.m - 1, dia.d);
        if (ms < deMsP || ms > ateMsP) continue;
        saida.push({
          data: dataIso(dia),
          hora: o.diaInteiro ? null : `${String(o.hh).padStart(2, "0")}:${String(o.mm).padStart(2, "0")}`,
          titulo: b.titulo || "(sem título)",
        });
      }
    }
  }
  return saida.sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
}
