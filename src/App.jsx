import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Home, ArrowDownCircle, ArrowUpCircle, RefreshCw, TrendingUp, Target,
  Calculator, Users, LogOut, Menu, X, Plus, ChevronRight, User,
  DollarSign, PiggyBank, AlertCircle, Check, Search, Gift, Share2, Clock, BarChart2, Eye, EyeOff, Copy, Download
} from "lucide-react";

/* ============================================================
   PALETA DA MARCA — Sundown Gestão de Risco
   ============================================================ */
const BRAND = {
  orange: "#E8722C",
  orangeDark: "#C25A1C",
  orangeLight: "#FCE8DA",
  ink: "#1A1D23",
  slate: "#4A5160",
  mist: "#F6F5F3",
  line: "#E7E4DE",
  white: "#FFFFFF",
  green: "#2E7D5B",
  red: "#C24141",
};

const fmt = (v) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ============================================================
   CATEGORIZAÇÃO AUTOMÁTICA — sugere categoria a partir da descrição,
   com regras diferentes para cada tipo de lançamento
   ============================================================ */
const REGRAS_CATEGORIA_SAIDA = [
  { categoria: "Transporte", palavras: ["gasolina", "combustivel", "combustível", "posto", "uber", "99", "taxi", "táxi", "estacionamento", "pedagio", "pedágio", "onibus", "ônibus", "metro", "metrô"] },
  { categoria: "Alimentação", palavras: ["mercado", "supermercado", "restaurante", "lanche", "ifood", "padaria", "acougue", "açougue", "feira", "hortifruti"] },
  { categoria: "Moradia", palavras: ["aluguel", "condominio", "condomínio", "iptu", "luz", "energia", "agua", "água", "gas", "gás", "internet"] },
  { categoria: "Saúde", palavras: ["farmacia", "farmácia", "academia", "plano de saude", "plano de saúde", "medico", "médico", "consulta", "exame", "dentista"] },
  { categoria: "Assinaturas", palavras: ["netflix", "spotify", "amazon prime", "disney", "streaming", "assinatura", "hbo", "youtube premium"] },
  { categoria: "Educação", palavras: ["curso", "faculdade", "escola", "livro", "mensalidade"] },
  { categoria: "Lazer", palavras: ["cinema", "show", "viagem", "passeio", "bar", "festa"] },
];

const REGRAS_CATEGORIA_ENTRADA = [
  { categoria: "Salário", palavras: ["salario", "salário", "pagamento", "pro-labore", "holerite", "contracheque"] },
  { categoria: "Freelance", palavras: ["freela", "freelance", "bico", "consultoria", "projeto"] },
  { categoria: "Renda extra", palavras: ["renda extra", "extra", "comissao", "comissão", "bonus", "bônus", "13", "décimo terceiro", "ferias", "férias"] },
  { categoria: "Presente/Reembolso", palavras: ["presente", "reembolso", "devolucao", "devolução", "restituicao", "restituição"] },
];

const REGRAS_CATEGORIA_INVESTIMENTO = [
  { categoria: "Renda fixa", palavras: ["cdb", "tesouro", "lci", "lca", "selic", "poupanca", "poupança", "cdi"] },
  { categoria: "Renda variável", palavras: ["acao", "ação", "acoes", "ações", "bolsa", "b3", "etf"] },
  { categoria: "Fundo imobiliário", palavras: ["fii", "fundo imobiliario", "fundo imobiliário"] },
  { categoria: "Previdência", palavras: ["previdencia", "previdência", "vgbl", "pgbl"] },
];

const PLACEHOLDERS_DESCRICAO = {
  saida: "Ex: Gasolina, Mercado, Netflix...",
  entrada: "Ex: Salário, Freelance, Comissão...",
  investimento: "Ex: CDB Banco X, Tesouro Selic...",
};

function sugerirCategoria(descricao, tipo) {
  if (!descricao) return "";
  const texto = descricao.toLowerCase();
  const regras =
    tipo === "entrada" ? REGRAS_CATEGORIA_ENTRADA :
    tipo === "investimento" ? REGRAS_CATEGORIA_INVESTIMENTO :
    REGRAS_CATEGORIA_SAIDA;
  for (const regra of regras) {
    if (regra.palavras.some((p) => texto.includes(p))) return regra.categoria;
  }
  return "";
}

const fmtCompact = (v) => {
  if (Math.abs(v) >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(0)}mil`;
  return fmt(v);
};

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/* ============================================================
   DADOS DE EXEMPLO (serão substituídos pelo Supabase depois)
   ============================================================ */
const CLIENTE_EXEMPLO = {
  id: 1,
  nome: "Ana Beatriz Ferreira",
  nascimento: "1993-04-30",
  email: "ana.ferreira@email.com",
  categoria: "Médica",
  saldoAtual: 18420.5,
};

const idade = (nascISO) => {
  const nasc = new Date(nascISO);
  const hoje = new Date();
  let a = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) a--;
  return a;
};

// Idade fracionada (com casas decimais), no mesmo padrão da planilha original:
// INT(dias entre hoje e nascimento) / 365.25
const idadeFracionada = (nascISO) => {
  const nasc = new Date(nascISO);
  const hoje = new Date();
  const dias = Math.floor((hoje - nasc) / (1000 * 60 * 60 * 24));
  return dias / 365.25;
};

const CLIENTES_ADMIN = [
  { id: 1, nome: "Ana Beatriz Ferreira", categoria: "Médica", idade: 33, saldo: 18420.5, investeMes: 1500, semSeguro: true, semPrevidencia: true, score: 92 },
  { id: 2, nome: "Rodrigo Cavalcante", categoria: "Empresário", idade: 41, saldo: 82300, investeMes: 4200, semSeguro: false, semPrevidencia: true, score: 78 },
  { id: 3, nome: "Fernanda Lopes", categoria: "Advogada", idade: 29, saldo: 6120, investeMes: 300, semSeguro: true, semPrevidencia: true, score: 64 },
  { id: 4, nome: "Carlos Eduardo Silva", categoria: "Dentista", idade: 52, saldo: 145000, investeMes: 3000, semSeguro: false, semPrevidencia: false, score: 55 },
  { id: 5, nome: "Juliana Prado", categoria: "Autônoma", idade: 37, saldo: 3200, investeMes: 150, semSeguro: true, semPrevidencia: true, score: 88 },
];

/* ============================================================
   PROGRAMA "INDIQUE E GANHE"
   ============================================================ */
const INDICACOES_EXEMPLO = [
  { id: 1, nome: "Carla Menezes", contato: "(21) 99888-1122", profissao: "Fisioterapeuta", status: "fechado", valorSeguro: 180, data: "2026-06-02" },
  { id: 2, nome: "Bruno Aquino", contato: "(21) 99666-3344", profissao: "Engenheiro", status: "fechado", valorSeguro: 150, data: "2026-06-20" },
  { id: 3, nome: "Patrícia Nunes", contato: "(21) 99777-4433", profissao: "Professora", status: "contatado", valorSeguro: null, data: "2026-07-10" },
];

const META_INDICACOES = 3;
const VALOR_RECOMPENSA = 200;
const VALOR_MINIMO_SEGURO = 100;

/* ============================================================
   LÓGICA FINANCEIRA — baseada na planilha de aposentadoria
   ============================================================ */
/* ============================================================
   TETO DE GASTO — divide o mês em semanas e calcula o consumo
   ============================================================ */

// Retorna as semanas do mês de uma transação (ISO "YYYY-MM"), cada uma com data de início/fim
function semanasDoMes(mesISO) {
  const [ano, mes] = mesISO.split("-").map(Number);
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);
  const semanas = [];
  let inicio = new Date(primeiroDia);
  let numero = 1;
  while (inicio <= ultimoDia) {
    let fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
    if (fim > ultimoDia) fim = new Date(ultimoDia);
    semanas.push({ numero, inicio: new Date(inicio), fim: new Date(fim) });
    inicio = new Date(fim);
    inicio.setDate(inicio.getDate() + 1);
    numero++;
  }
  return semanas;
}

const formatarDataCurta = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

// Calcula o resumo semanal do mês atual: quanto foi gasto em cada semana,
// o teto proporcional de cada uma, e o teto recalculado da semana em curso
// considerando o que já foi gasto (ou economizado) nas semanas anteriores.
function calcularResumoSemanal(transacoes, mesISO, tetoMensal) {
  const semanas = semanasDoMes(mesISO);
  const tetoPorSemana = tetoMensal / semanas.length;
  const hoje = new Date();

  let acumuladoGastoAteAgora = 0;
  let acumuladoTetoAteAgora = 0;

  const resultado = semanas.map((s) => {
    const gastoSemana = transacoes
      .filter((t) => t.tipo === "saida")
      .filter((t) => {
        const d = new Date(t.data + "T00:00:00");
        return d >= s.inicio && d <= s.fim;
      })
      .reduce((sum, t) => sum + t.valor, 0);

    const semanaJaPassou = s.fim < hoje;
    const semanaAtual = hoje >= s.inicio && hoje <= s.fim;

    if (semanaJaPassou || semanaAtual) {
      acumuladoGastoAteAgora += gastoSemana;
      acumuladoTetoAteAgora += tetoPorSemana;
    }

    return { ...s, gasto: gastoSemana, teto: tetoPorSemana, passou: semanaJaPassou, atual: semanaAtual };
  });

  // Semanas restantes (incluindo a atual) para recalcular o teto ajustado
  const semanasRestantes = resultado.filter((s) => !s.passou);
  const saldoDisponivel = tetoMensal - (acumuladoGastoAteAgora - (resultado.find((s) => s.atual)?.gasto || 0));
  const tetoAjustadoRestante = semanasRestantes.length > 0 ? saldoDisponivel / semanasRestantes.length : 0;

  return { semanas: resultado, tetoPorSemana, tetoAjustadoRestante, mesISO };
}

// Monta um relatório mensal em HTML e abre em nova aba para o cliente
// imprimir ou salvar como PDF pelo próprio navegador (Ctrl+P / Cmd+P).
function gerarRelatorioMensalPDF(cliente, transacoes, mesISO) {
  const transacoesDoMes = transacoes.filter((t) => t.data.slice(0, 7) === mesISO);
  const entradas = transacoesDoMes.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
  const saidas = transacoesDoMes.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);
  const investido = transacoesDoMes.filter((t) => t.tipo === "investimento").reduce((s, t) => s + t.valor, 0);
  const sobra = entradas - saidas - investido;

  const porCategoria = {};
  transacoesDoMes.filter((t) => t.tipo === "saida").forEach((t) => {
    porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + t.valor;
  });
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);

  const [ano, mes] = mesISO.split("-").map(Number);
  const nomeMes = `${NOMES_MES[mes - 1]} de ${ano}`;

  const linhasTransacoes = [...transacoesDoMes]
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .map(
      (t) => `
      <tr>
        <td>${new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
        <td>${t.desc}</td>
        <td>${t.categoria}</td>
        <td style="text-align:right; color:${t.tipo === "entrada" ? "#2E7D5B" : "#C24141"};">
          ${t.tipo === "entrada" ? "+" : "−"} ${fmt(t.valor)}
        </td>
      </tr>`
    )
    .join("");

  const linhasCategorias = categoriasOrdenadas
    .map(([cat, valor]) => `<tr><td>${cat}</td><td style="text-align:right;">${fmt(valor)}</td></tr>`)
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Relatório financeiro — ${nomeMes}</title>
      <style>
        body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #1A1D23; padding: 40px; max-width: 720px; margin: 0 auto; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .sub { color: #4A5160; font-size: 13px; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        .card { border: 1px solid #E7E4DE; border-radius: 10px; padding: 12px; }
        .card .label { font-size: 11px; color: #4A5160; margin-bottom: 4px; }
        .card .valor { font-size: 16px; font-weight: 700; }
        h2 { font-size: 15px; margin: 24px 0 10px; border-bottom: 2px solid #E8722C; padding-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        th { text-align: left; color: #4A5160; font-weight: 600; padding: 6px 4px; border-bottom: 1px solid #E7E4DE; }
        td { padding: 6px 4px; border-bottom: 1px solid #F6F5F3; }
        footer { margin-top: 32px; font-size: 11px; color: #4A5160; text-align: center; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>Relatório financeiro — ${cliente.nome}</h1>
      <p class="sub">${nomeMes}</p>

      <div class="grid">
        <div class="card"><div class="label">Entradas</div><div class="valor" style="color:#2E7D5B;">${fmt(entradas)}</div></div>
        <div class="card"><div class="label">Saídas</div><div class="valor" style="color:#C24141;">${fmt(saidas)}</div></div>
        <div class="card"><div class="label">Investido</div><div class="valor" style="color:#3E6B8F;">${fmt(investido)}</div></div>
        <div class="card"><div class="label">Sobra do mês</div><div class="valor">${fmt(sobra)}</div></div>
      </div>

      <h2>Gastos por categoria</h2>
      <table>
        <thead><tr><th>Categoria</th><th style="text-align:right;">Valor</th></tr></thead>
        <tbody>${linhasCategorias || '<tr><td colspan="2" style="color:#4A5160;">Nenhum gasto registrado neste mês.</td></tr>'}</tbody>
      </table>

      <h2>Todos os lançamentos do mês</h2>
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right;">Valor</th></tr></thead>
        <tbody>${linhasTransacoes || '<tr><td colspan="4" style="color:#4A5160;">Nenhum lançamento neste mês.</td></tr>'}</tbody>
      </table>

      <footer>Gerado por Sundown Finanças em ${new Date().toLocaleDateString("pt-BR")}</footer>
    </body>
    </html>
  `;

  const janela = window.open("", "_blank");
  if (janela) {
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 400);
  }
}


function calcularAposentadoria({
  idadeAtualFracionada, idadeAposentadoria, aporteInicial, aporteMensal,
  rentabilidadeAnual, ipcaAnual,
}) {
  const rentMensal = Math.pow(1 + rentabilidadeAnual, 1 / 12) - 1;
  // ROUNDUP, igual à planilha: =ROUNDUP(((idade_aposentadoria - idade_atual)*12),0)
  const meses = Math.max(1, Math.ceil((idadeAposentadoria - idadeAtualFracionada) * 12));

  let saldo = aporteInicial;
  const serie = [];
  for (let m = 1; m <= meses; m++) {
    // O aporte é reajustado pelo IPCA ANUAL (não mensal) a cada 12 meses completos,
    // exatamente como na planilha: $C$13*(1+$B$3)^ROUNDDOWN(F_anterior/12,0)
    const aporteCorrigido = aporteMensal * Math.pow(1 + ipcaAnual, Math.floor((m - 1) / 12));
    const juros = saldo * rentMensal;
    saldo = saldo + juros + aporteCorrigido;
    if (m % 12 === 0 || m === meses) {
      serie.push({ ano: Math.ceil(m / 12), saldo: Math.round(saldo) });
    }
  }

  const patrimonioFinal = saldo;
  const rendaPerpetua = patrimonioFinal * rentMensal;

  return {
    patrimonioFinal,
    rendaPerpetua,
    serie,
    meses,
  };
}

/* ============================================================
   COMPONENTES DE UI
   ============================================================ */
function Card({ children, style = {}, ...props }) {
  return (
    <div
      style={{
        background: BRAND.white,
        border: `1px solid ${BRAND.line}`,
        borderRadius: 16,
        padding: 20,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: accent || BRAND.orangeLight,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={17} color={accent ? BRAND.white : BRAND.orangeDark} />
        </div>
        <span style={{ fontSize: 13, color: BRAND.slate, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: BRAND.ink, letterSpacing: -0.5 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12.5, color: BRAND.slate }}>{sub}</div>}
    </Card>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: BRAND.slate, fontWeight: 500 }}>
      {label}
      {children}
    </label>
  );
}

// Campo de senha com botão de olho para mostrar/ocultar o texto digitado
function CampoSenha({ value, onChange, placeholder }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        style={{ ...inputStyle, width: "100%", paddingRight: 40, boxSizing: "border-box" }}
        type={visivel ? "text" : "password"}
        placeholder={placeholder || "••••••••"}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setVisivel(!visivel)}
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", padding: 4,
          display: "flex", alignItems: "center", color: BRAND.slate,
        }}
        tabIndex={-1}
      >
        {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

const inputStyle = {
  border: `1px solid ${BRAND.line}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  color: BRAND.ink,
  background: BRAND.mist,
  outline: "none",
};

/* ============================================================
   DICA EDUCATIVA — botão "?" reutilizável que abre uma explicação
   didática sobre o tema da tela em que está inserido
   ============================================================ */
function DicaEducativa({ titulo, texto }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button
        onClick={() => setAberta(true)}
        title="Entenda esse assunto"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: BRAND.orangeLight, border: "none", cursor: "pointer",
          color: BRAND.orangeDark, fontSize: 13, fontWeight: 700,
        }}
      >
        ?
      </button>
      {aberta && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }} onClick={() => setAberta(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: BRAND.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 15 }}>💡</span>
                </div>
                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: BRAND.ink, margin: 0 }}>{titulo}</h3>
              </div>
              <button onClick={() => setAberta(false)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
                <X size={18} color={BRAND.slate} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: BRAND.slate, margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{texto}</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   TELA: LOGIN / CADASTRO
   ============================================================ */
/* ============================================================
   TELA: ONBOARDING (só aparece logo após o cadastro)
   Pede pro cliente já cadastrar entradas fixas recorrentes,
   como salário, pra não precisar lançar isso todo mês.
   ============================================================ */
function TelaOnboarding({ cliente, onConcluir }) {
  const [entradas, setEntradas] = useState([{ desc: "Salário", valor: "" }]);
  const [salvando, setSalvando] = useState(false);

  const atualizarEntrada = (idx, campo, valor) => {
    setEntradas((prev) => prev.map((e, i) => (i === idx ? { ...e, [campo]: valor } : e)));
  };

  const adicionarLinha = () => {
    setEntradas((prev) => [...prev, { desc: "", valor: "" }]);
  };

  const removerLinha = (idx) => {
    setEntradas((prev) => prev.filter((_, i) => i !== idx));
  };

  const salvarEComecar = async () => {
    setSalvando(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const validas = entradas.filter((e) => e.desc.trim() && parseFloat(e.valor) > 0);
    for (const e of validas) {
      await supabase.from("transacoes").insert({
        usuario_id: cliente.id,
        tipo: "entrada",
        descricao: e.desc.trim(),
        categoria: sugerirCategoria(e.desc, "entrada") || "Salário",
        valor: parseFloat(e.valor),
        data: hoje,
        recorrente: true,
      });
    }
    setSalvando(false);
    onConcluir();
  };

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(circle at 20% 20%, ${BRAND.orangeLight} 0%, ${BRAND.mist} 55%)`, padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: BRAND.orange, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 8px 24px ${BRAND.orange}55` }}>
            <PiggyBank size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: BRAND.ink, margin: 0 }}>
            Bem-vindo(a), {cliente.nome.split(" ")[0]}!
          </h1>
          <p style={{ fontSize: 13.5, color: BRAND.slate, marginTop: 6, lineHeight: 1.5 }}>
            Vamos começar cadastrando suas entradas fixas — como salário — que se repetem todo mês. Assim você não precisa lançar de novo mês a mês.
          </p>
        </div>

        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {entradas.map((e, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <Field label="Descrição">
                <input style={inputStyle} placeholder="Ex: Salário" value={e.desc} onChange={(ev) => atualizarEntrada(idx, "desc", ev.target.value)} />
              </Field>
              <Field label="Valor mensal">
                <input style={inputStyle} type="number" placeholder="0,00" value={e.valor} onChange={(ev) => atualizarEntrada(idx, "valor", ev.target.value)} />
              </Field>
              {entradas.length > 1 && (
                <button onClick={() => removerLinha(idx)} style={{ background: BRAND.mist, border: "none", borderRadius: 10, width: 38, height: 38, flexShrink: 0, cursor: "pointer", color: BRAND.red }}>
                  <X size={16} />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={adicionarLinha}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BRAND.line}`, borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, color: BRAND.slate, cursor: "pointer", justifyContent: "center" }}
          >
            <Plus size={15} /> Adicionar outra entrada fixa
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            <button
              onClick={salvarEComecar}
              disabled={salvando}
              style={{ background: salvando ? BRAND.line : BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14.5, fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer" }}
            >
              {salvando ? "Salvando..." : "Salvar e começar"}
            </button>
            <button
              type="button"
              onClick={onConcluir}
              style={{ background: "none", border: "none", color: BRAND.slate, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              Pular por enquanto
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TelaLogin({ onLogin, onAdminLogin }) {
  const [modo, setModo] = useState("login"); // login | cadastro | recuperar
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [profissao, setProfissao] = useState("");
  const [temSeguro, setTemSeguro] = useState(false);
  const [temPrevidencia, setTemPrevidencia] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [recuperacaoEnviada, setRecuperacaoEnviada] = useState(false);

  const enviarRecuperacaoSenha = async () => {
    setErro("");
    if (!email.trim()) { setErro("Digite seu e-mail."); return; }
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setCarregando(false);
    if (error) {
      setErro("Não foi possível enviar o link. Tente novamente em alguns minutos.");
      return;
    }
    setRecuperacaoEnviada(true);
  };

  const fazerLogin = async () => {
    setErro("");
    if (!email.trim() || !senha) { setErro("Preencha e-mail e senha."); return; }
    setCarregando(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setErro(error.status === 429 ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo." : "E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }
    const { data: perfil, error: erroPerfil } = await supabase
      .from("perfis")
      .select("*")
      .eq("id", data.user.id)
      .single();
    setCarregando(false);
    if (erroPerfil || !perfil) {
      setErro("Não encontramos seu cadastro. Fale com seu consultor.");
      return;
    }
    if (perfil.eh_admin) {
      onAdminLogin();
    } else {
      onLogin({
        id: perfil.id,
        nome: perfil.nome,
        nascimento: perfil.data_nascimento,
        email: perfil.email,
        categoria: perfil.categoria,
        temSeguro: perfil.tem_seguro_vida,
        temPrevidencia: perfil.tem_previdencia,
        saldoAtual: 0,
      });
    }
  };

  const fazerCadastro = async () => {
    setErro("");
    if (!nome.trim() || !email.trim() || !senha || !nascimento) {
      setErro("Preencha nome, e-mail, senha e data de nascimento.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
    if (error) {
      let mensagem = "Não foi possível criar sua conta. Tente novamente.";
      if (error.message.includes("already registered") || error.status === 422) {
        mensagem = "Esse e-mail já está cadastrado.";
      } else if (error.status === 429 || error.message.toLowerCase().includes("rate limit")) {
        mensagem = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
      }
      setErro(mensagem);
      setCarregando(false);
      return;
    }
    const { error: erroPerfil } = await supabase.from("perfis").insert({
      id: data.user.id,
      nome: nome.trim(),
      email: email.trim(),
      data_nascimento: nascimento,
      categoria: profissao.trim() || null,
      eh_admin: false,
      tem_seguro_vida: temSeguro,
      tem_previdencia: temPrevidencia,
    });
    setCarregando(false);
    if (erroPerfil) {
      setErro("Sua conta foi criada, mas houve um problema ao salvar seus dados. Fale com seu consultor.");
      return;
    }
    onLogin({
      id: data.user.id,
      nome: nome.trim(),
      nascimento,
      email: email.trim(),
      categoria: profissao.trim(),
      temSeguro,
      temPrevidencia,
      saldoAtual: 0,
    }, true); // true = conta recém-criada, mostrar onboarding
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(circle at 20% 20%, ${BRAND.orangeLight} 0%, ${BRAND.mist} 55%)`,
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 16, background: BRAND.orange,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", boxShadow: `0 8px 24px ${BRAND.orange}55`,
            }}
          >
            <PiggyBank size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: 0 }}>
            Sundown Finanças
          </h1>
          <p style={{ fontSize: 13.5, color: BRAND.slate, marginTop: 6 }}>
            Sua vida financeira, organizada num só lugar.
          </p>
        </div>

        {modo !== "recuperar" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => { setModo("login"); setErro(""); }}
            style={{
              flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${modo === "login" ? BRAND.orange : BRAND.line}`,
              background: modo === "login" ? BRAND.orangeLight : "#fff",
              color: modo === "login" ? BRAND.orangeDark : BRAND.slate,
            }}
          >
            Já tenho conta
          </button>
          <button
            onClick={() => { setModo("cadastro"); setErro(""); }}
            style={{
              flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${modo === "cadastro" ? BRAND.orange : BRAND.line}`,
              background: modo === "cadastro" ? BRAND.orangeLight : "#fff",
              color: modo === "cadastro" ? BRAND.orangeDark : BRAND.slate,
            }}
          >
            Criar minha conta
          </button>
        </div>
        )}

        {modo === "recuperar" ? (
          <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recuperacaoEnviada ? (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#EEF7F1", borderRadius: 10, padding: 12 }}>
                  <Check size={16} color={BRAND.green} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12.5, color: BRAND.green, margin: 0, lineHeight: 1.5 }}>
                    Se esse e-mail estiver cadastrado, enviamos um link para você redefinir sua senha. Confira sua caixa de entrada.
                  </p>
                </div>
                <button
                  onClick={() => { setModo("login"); setErro(""); }}
                  style={{ background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Voltar para o login
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: BRAND.slate, margin: "0 0 4px" }}>
                  Digite seu e-mail cadastrado e enviaremos um link para você criar uma nova senha.
                </p>
                <Field label="E-mail">
                  <input style={inputStyle} placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                {erro && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FCEEEE", borderRadius: 10, padding: 10 }}>
                    <AlertCircle size={15} color={BRAND.red} style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: BRAND.red, margin: 0, lineHeight: 1.4 }}>{erro}</p>
                  </div>
                )}
                <button
                  onClick={enviarRecuperacaoSenha}
                  disabled={carregando}
                  style={{
                    background: carregando ? BRAND.line : BRAND.orange, color: "#fff", border: "none",
                    borderRadius: 10, padding: "12px 16px", fontSize: 14.5, fontWeight: 600,
                    cursor: carregando ? "not-allowed" : "pointer",
                  }}
                >
                  {carregando ? "Enviando..." : "Enviar link de recuperação"}
                </button>
                <button
                  type="button"
                  onClick={() => { setModo("login"); setErro(""); }}
                  style={{ background: "none", border: "none", color: BRAND.slate, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  ← Voltar para o login
                </button>
              </>
            )}
          </Card>
        ) : (
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {modo === "cadastro" && (
            <>
              <Field label="Nome completo">
                <input style={inputStyle} placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Field label="Data de nascimento">
                <input style={inputStyle} type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
              </Field>
              <Field label="Profissão (opcional)">
                <input style={inputStyle} placeholder="Ex: Médica, Advogado..." value={profissao} onChange={(e) => setProfissao(e.target.value)} />
              </Field>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: BRAND.mist, borderRadius: 10, padding: 12 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: BRAND.slate }}>Pra te conhecer melhor:</span>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: BRAND.ink, cursor: "pointer" }}>
                  <input type="checkbox" checked={temSeguro} onChange={(e) => setTemSeguro(e.target.checked)} />
                  Já tenho seguro de vida
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: BRAND.ink, cursor: "pointer" }}>
                  <input type="checkbox" checked={temPrevidencia} onChange={(e) => setTemPrevidencia(e.target.checked)} />
                  Já tenho previdência privada
                </label>
              </div>
            </>
          )}
          <Field label="E-mail">
            <input style={inputStyle} placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha">
            <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} />
          </Field>
          {modo === "login" && (
            <button
              type="button"
              onClick={() => { setModo("recuperar"); setErro(""); setRecuperacaoEnviada(false); }}
              style={{ alignSelf: "flex-start", background: "none", border: "none", color: BRAND.orangeDark, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, marginTop: -6 }}
            >
              Esqueci minha senha
            </button>
          )}

          {erro && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FCEEEE", borderRadius: 10, padding: 10 }}>
              <AlertCircle size={15} color={BRAND.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: BRAND.red, margin: 0, lineHeight: 1.4 }}>{erro}</p>
            </div>
          )}

          <button
            onClick={modo === "login" ? fazerLogin : fazerCadastro}
            disabled={carregando}
            style={{
              marginTop: 6, background: carregando ? BRAND.line : BRAND.orange, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px 16px", fontSize: 14.5, fontWeight: 600,
              cursor: carregando ? "not-allowed" : "pointer",
            }}
          >
            {carregando ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar minha conta"}
          </button>
        </Card>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TELA — CRIAR NOVA SENHA (fluxo de "esqueci minha senha")
   Aparece quando o usuário clica no link de recuperação do e-mail.
   ============================================================ */
function TelaNovaSenha({ onConcluido }) {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const salvarNovaSenha = async () => {
    setErro("");
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      setErro(`Não foi possível salvar a nova senha: ${error.message}`);
      return;
    }
    setSucesso(true);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(circle at 20% 20%, ${BRAND.orangeLight} 0%, ${BRAND.mist} 55%)`,
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 16, background: BRAND.orange,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", boxShadow: `0 8px 24px ${BRAND.orange}55`,
            }}
          >
            <PiggyBank size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: 0 }}>
            Criar nova senha
          </h1>
          <p style={{ fontSize: 13.5, color: BRAND.slate, marginTop: 6 }}>
            Digite sua nova senha de acesso.
          </p>
        </div>

        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sucesso ? (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#EEF7F1", borderRadius: 10, padding: 12 }}>
                <Check size={16} color={BRAND.green} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12.5, color: BRAND.green, margin: 0, lineHeight: 1.5 }}>
                  Senha alterada com sucesso! Já pode entrar com a nova senha.
                </p>
              </div>
              <button
                onClick={onConcluido}
                style={{ background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
              >
                Ir para o login
              </button>
            </>
          ) : (
            <>
              <Field label="Nova senha">
                <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} />
              </Field>
              <Field label="Confirmar nova senha">
                <CampoSenha value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
              </Field>
              {erro && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FCEEEE", borderRadius: 10, padding: 10 }}>
                  <AlertCircle size={15} color={BRAND.red} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: BRAND.red, margin: 0, lineHeight: 1.4 }}>{erro}</p>
                </div>
              )}
              <button
                onClick={salvarNovaSenha}
                disabled={carregando}
                style={{
                  background: carregando ? BRAND.line : BRAND.orange, color: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 16px", fontSize: 14.5, fontWeight: 600,
                  cursor: carregando ? "not-allowed" : "pointer",
                }}
              >
                {carregando ? "Salvando..." : "Salvar nova senha"}
              </button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   LAYOUT COM MENU LATERAL (cliente)
   ============================================================ */
function Shell({ aba, setAba, onLogout, children, nome, onLancamentoRapido }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [lancamentoRapidoAberto, setLancamentoRapidoAberto] = useState(false);
  const itens = [
    { id: "dashboard", label: "Início", icon: Home },
    { id: "lancamentos", label: "Lançamentos", icon: ArrowDownCircle },
    { id: "recorrentes", label: "Custo Fixo", icon: RefreshCw },
    { id: "investimentos", label: "Investimentos", icon: TrendingUp },
    { id: "metas", label: "Metas", icon: Target },
    { id: "resumos", label: "Resumos", icon: BarChart2 },
    { id: "aposentadoria", label: "Aposentadoria", icon: Calculator },
    { id: "indicacoes", label: "Indique e Ganhe", icon: Gift },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BRAND.mist, display: "flex" }}>
      {/* Sidebar desktop */}
      <div
        className="sidebar-desktop"
        style={{
          width: 232, background: BRAND.white, borderRight: `1px solid ${BRAND.line}`,
          padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4,
          position: "sticky", top: 0, height: "100vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: BRAND.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PiggyBank size={17} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: BRAND.ink }}>Sundown</span>
        </div>
        {itens.map((it) => (
          <button
            key={it.id}
            onClick={() => setAba(it.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
              background: aba === it.id ? BRAND.orangeLight : "transparent",
              color: aba === it.id ? BRAND.orangeDark : BRAND.slate,
              fontWeight: aba === it.id ? 600 : 500, fontSize: 13.5,
            }}
          >
            <it.icon size={17} />
            {it.label}
          </button>
        ))}
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${BRAND.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", fontSize: 12.5, color: BRAND.slate }}>
            <User size={15} /> {nome}
          </div>
          <button
            onClick={onLogout}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 8px",
              background: "transparent", border: "none", color: BRAND.slate,
              fontSize: 13, cursor: "pointer", width: "100%", borderRadius: 8,
            }}
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </div>

      {/* Header mobile */}
      <div
        className="header-mobile"
        style={{
          display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
          background: BRAND.white, borderBottom: `1px solid ${BRAND.line}`,
          padding: "14px 16px", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: BRAND.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PiggyBank size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14.5, color: BRAND.ink }}>Sundown</span>
        </div>
        <button onClick={() => setMenuAberto(!menuAberto)} style={{ background: "none", border: "none" }}>
          {menuAberto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menuAberto && (
        <div
          className="menu-mobile-drawer"
          style={{
            display: "none", position: "fixed", top: 53, left: 0, right: 0, zIndex: 19,
            background: BRAND.white, borderBottom: `1px solid ${BRAND.line}`, padding: 12,
            flexDirection: "column", gap: 4,
          }}
        >
          {itens.map((it) => (
            <button
              key={it.id}
              onClick={() => { setAba(it.id); setMenuAberto(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px",
                borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
                background: aba === it.id ? BRAND.orangeLight : "transparent",
                color: aba === it.id ? BRAND.orangeDark : BRAND.slate,
                fontWeight: aba === it.id ? 600 : 500, fontSize: 14,
              }}
            >
              <it.icon size={17} /> {it.label}
            </button>
          ))}
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "none", border: "none", color: BRAND.slate, fontSize: 14 }}>
            <LogOut size={17} /> Sair
          </button>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="content-pad" style={{ padding: "28px 32px", maxWidth: 1000 }}>
          {children}
        </div>
      </div>

      {/* Botão flutuante de lançamento rápido */}
      <button
        onClick={() => setLancamentoRapidoAberto(true)}
        title="Lançamento rápido"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 30,
          width: 56, height: 56, borderRadius: "50%",
          background: BRAND.orange, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 6px 20px ${BRAND.orange}66`,
        }}
      >
        <Plus size={26} color="#fff" />
      </button>
      {lancamentoRapidoAberto && (
        <ModalLancamentoRapido
          onClose={() => setLancamentoRapidoAberto(false)}
          onSalvar={onLancamentoRapido}
        />
      )}

      <style>{`
        @media (max-width: 860px) {
          .sidebar-desktop { display: none !important; }
          .header-mobile { display: flex !important; }
          .menu-mobile-drawer { display: flex !important; }
          .content-pad { padding: 84px 16px 32px !important; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   TELA: DASHBOARD
   ============================================================ */
function TelaDashboard({ cliente, transacoes, indicacoes, onIrParaIndicacoes, tetoMensal, onIrParaResumos }) {
  const mesAtual = new Date().toISOString().slice(0, 7);
  const transacoesDoMes = useMemo(
    () => transacoes.filter((t) => t.data && t.data.slice(0, 7) === mesAtual),
    [transacoes, mesAtual]
  );

  const entradas = transacoesDoMes.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
  const saidas = transacoesDoMes.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);
  const investido = transacoesDoMes.filter((t) => t.tipo === "investimento").reduce((s, t) => s + t.valor, 0);
  const saldoMes = entradas - saidas - investido;

  const resumoSemanal = useMemo(() => calcularResumoSemanal(transacoes, mesAtual, tetoMensal), [transacoes, mesAtual, tetoMensal]);
  const semanaAtual = resumoSemanal.semanas.find((s) => s.atual);

  const porCategoria = useMemo(() => {
    const map = {};
    transacoesDoMes.filter((t) => t.tipo === "saida").forEach((t) => {
      map[t.categoria] = (map[t.categoria] || 0) + t.valor;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transacoesDoMes]);

  // Saldo acumulado real (todas as entradas menos saídas e investimentos, desde o início)
  const saldoAcumulado = useMemo(() => {
    return transacoes.reduce((s, t) => {
      if (t.tipo === "entrada") return s + t.valor;
      return s - t.valor; // saida ou investimento
    }, 0);
  }, [transacoes]);

  // Evolução do patrimônio: saldo acumulado ao final de cada um dos últimos 6 meses com movimentação
  const evolucaoPatrimonio = useMemo(() => {
    if (transacoes.length === 0) return [];
    const porMes = {};
    [...transacoes]
      .sort((a, b) => (a.data > b.data ? 1 : -1))
      .forEach((t) => {
        const chave = t.data.slice(0, 7);
        const delta = t.tipo === "entrada" ? t.valor : -t.valor;
        porMes[chave] = (porMes[chave] || 0) + delta;
      });
    const chaves = Object.keys(porMes).sort();
    let acumulado = 0;
    const serieCompleta = chaves.map((chave) => {
      acumulado += porMes[chave];
      const [ano, mes] = chave.split("-");
      return { mes: `${NOMES_MES[Number(mes) - 1]}/${ano.slice(2)}`, valor: Math.round(acumulado) };
    });
    return serieCompleta.slice(-6);
  }, [transacoes]);

  const CORES_PIZZA = [BRAND.orange, "#3E6B8F", BRAND.green, "#9B6FBA", "#C24141", "#C99A3E"];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: BRAND.ink, margin: 0 }}>
          Olá, {cliente.nome.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 13.5, color: BRAND.slate, marginTop: 4 }}>
          Resumo financeiro de {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </div>

      {semanaAtual && (
        <div
          onClick={onIrParaResumos}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            background: semanaAtual.gasto > semanaAtual.teto ? "#FCEEEE" : "#EEF7F1",
            border: `1px solid ${semanaAtual.gasto > semanaAtual.teto ? BRAND.red : BRAND.green}`,
            borderRadius: 16, padding: "14px 18px", marginBottom: 14, cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: semanaAtual.gasto > semanaAtual.teto ? "#FCE0E0" : "#DCEFE3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
              {semanaAtual.gasto > semanaAtual.teto ? "⚠️" : "✅"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: semanaAtual.gasto > semanaAtual.teto ? BRAND.red : BRAND.green }}>
                {semanaAtual.gasto > semanaAtual.teto ? "Você passou do previsto essa semana" : "Você está dentro do previsto essa semana"}
              </div>
              <div style={{ fontSize: 11.5, color: BRAND.slate }}>
                {fmt(semanaAtual.gasto)} de {fmt(semanaAtual.teto)} — toque para ver seu resumo
              </div>
            </div>
          </div>
          <ChevronRight size={16} color={BRAND.slate} style={{ flexShrink: 0 }} />
        </div>
      )}

      <div
        onClick={onIrParaIndicacoes}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.orangeDark})`,
          borderRadius: 16, padding: "16px 20px", marginBottom: 20, cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Gift size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>
              Indique 3 amigos e ganhe um jantar de {fmt(VALOR_RECOMPENSA)}
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)" }}>
              {indicacoes && indicacoes.filter((i) => i.status === "fechado").length}/{META_INDICACOES} indicações fechadas — toque para ver
            </div>
          </div>
        </div>
        <ChevronRight size={18} color="#fff" style={{ flexShrink: 0 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon={DollarSign} label="Saldo em conta" value={fmt(saldoAcumulado)} sub="Baseado nos seus lançamentos" />
        <StatCard icon={ArrowUpCircle} label="Entradas no mês" value={fmt(entradas)} accent={BRAND.green} />
        <StatCard icon={ArrowDownCircle} label="Saídas no mês" value={fmt(saidas)} accent={BRAND.red} />
        <StatCard icon={PiggyBank} label="Sobra do mês" value={fmt(saldoMes)} sub={saldoMes > 0 ? "Você está no azul" : "Atenção ao orçamento"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 20 }} className="grid-2col">
        <Card>
          <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: "0 0 16px" }}>
            Evolução do patrimônio
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            {evolucaoPatrimonio.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 12.5, color: BRAND.slate }}>
                Faça seus primeiros lançamentos para ver sua evolução aqui.
              </div>
            ) : (
            <AreaChart data={evolucaoPatrimonio}>
              <defs>
                <linearGradient id="corPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND.orange} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={BRAND.orange} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.line} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: BRAND.slate }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: BRAND.slate }} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={64} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 10, border: `1px solid ${BRAND.line}`, fontSize: 12.5 }} />
              <Area type="monotone" dataKey="valor" stroke={BRAND.orange} strokeWidth={2.5} fill="url(#corPatrimonio)" />
            </AreaChart>
            )}
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: "0 0 16px" }}>
            Gastos por categoria
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {porCategoria.map((_, i) => (
                  <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {porCategoria.map((c, i) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: BRAND.slate }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: CORES_PIZZA[i % CORES_PIZZA.length] }} />
                  {c.name}
                </span>
                <span style={{ fontWeight: 600, color: BRAND.ink }}>{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: 0 }}>Últimos lançamentos</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {transacoes.slice(0, 5).map((t) => (
            <LinhaTransacao key={t.id} t={t} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function LinhaTransacao({ t, onClick, onDuplicar }) {
  const cor = t.tipo === "entrada" ? BRAND.green : t.tipo === "investimento" ? "#3E6B8F" : BRAND.red;
  const Icon = t.tipo === "entrada" ? ArrowUpCircle : t.tipo === "investimento" ? TrendingUp : ArrowDownCircle;
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BRAND.line}` }}
    >
      <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, cursor: onClick ? "pointer" : "default" }}>
        <Icon size={18} color={cor} style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: BRAND.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.desc} {t.recorrente && <span style={{ fontSize: 10.5, color: BRAND.orangeDark, fontWeight: 600 }}>· recorrente</span>}
          </div>
          <div style={{ fontSize: 11.5, color: BRAND.slate }}>{t.categoria} · {new Date(t.data).toLocaleDateString("pt-BR")}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <div onClick={onClick} style={{ fontSize: 13.5, fontWeight: 700, color: cor, cursor: onClick ? "pointer" : "default" }}>
          {t.tipo === "entrada" ? "+" : "−"} {fmt(t.valor)}
        </div>
        {onDuplicar && (
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicar(); }}
            title="Duplicar lançamento"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: BRAND.mist, border: "none", borderRadius: 7, cursor: "pointer", color: BRAND.slate, flexShrink: 0 }}
          >
            <Copy size={13} />
          </button>
        )}
        {onClick && <ChevronRight size={15} color={BRAND.slate} onClick={onClick} style={{ cursor: "pointer" }} />}
      </div>
    </div>
  );
}

/* ============================================================
   TELA: LANÇAMENTOS
   ============================================================ */
function TelaLancamentos({ transacoes, onAdicionar, onEditar, onExcluir }) {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [transacaoEditando, setTransacaoEditando] = useState(null);
  const [transacaoDuplicando, setTransacaoDuplicando] = useState(null);

  const lista = transacoes
    .filter((t) => filtro === "todos" || t.tipo === filtro)
    .filter((t) => !busca.trim() || t.desc.toLowerCase().includes(busca.trim().toLowerCase()) || t.categoria.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Lançamentos</h1>
            <DicaEducativa
              titulo="Entradas, saídas e investimentos"
              texto={`Toda movimentação financeira do seu dia a dia entra aqui: salário e outras rendas (entrada), gastos do dia a dia (saída), ou dinheiro que você guardou/aplicou (investimento).\n\nManter isso atualizado é o que faz o resto do app funcionar bem — seu dashboard, seus gráficos e a visão que seu consultor tem do seu momento financeiro dependem dos lançamentos estarem em dia.\n\nDica: ao digitar a descrição, o app já sugere a categoria certa automaticamente. Toque em qualquer lançamento da lista para editar ou excluir, ou segure para duplicar um gasto recorrente rapidamente.`}
            />
          </div>
          <p style={{ fontSize: 13, color: BRAND.slate, marginTop: 4 }}>Suas entradas e saídas do mês</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={16} /> Novo lançamento
        </button>
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color={BRAND.slate} style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          style={{ ...inputStyle, paddingLeft: 34, width: "100%", boxSizing: "border-box" }}
          placeholder="Buscar por descrição ou categoria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "todos", label: "Todos" },
          { id: "entrada", label: "Entradas" },
          { id: "saida", label: "Saídas" },
          { id: "investimento", label: "Investimentos" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${filtro === f.id ? BRAND.orange : BRAND.line}`,
              background: filtro === f.id ? BRAND.orangeLight : "#fff",
              color: filtro === f.id ? BRAND.orangeDark : BRAND.slate,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {lista.map((t) => (
            <LinhaTransacao
              key={t.id}
              t={t}
              onClick={() => setTransacaoEditando(t)}
              onDuplicar={() => setTransacaoDuplicando(t)}
            />
          ))}
          {lista.length === 0 && (
            <p style={{ fontSize: 13, color: BRAND.slate, textAlign: "center", padding: "20px 0" }}>
              {busca.trim() ? "Nenhum lançamento encontrado para essa busca." : "Nenhum lançamento nessa categoria ainda."}
            </p>
          )}
        </div>
      </Card>

      {modalAberto && <ModalNovoLancamento onClose={() => setModalAberto(false)} onSalvar={onAdicionar} />}
      {transacaoEditando && (
        <ModalNovoLancamento
          onClose={() => setTransacaoEditando(null)}
          onSalvar={onEditar}
          onExcluir={onExcluir}
          transacaoEditando={transacaoEditando}
        />
      )}
      {transacaoDuplicando && (
        <ModalNovoLancamento
          onClose={() => setTransacaoDuplicando(null)}
          onSalvar={onAdicionar}
          transacaoEditando={{
            ...transacaoDuplicando,
            id: undefined,
            data: new Date().toISOString().slice(0, 10),
          }}
          duplicando
        />
      )}
    </div>
  );
}

// Formulário mínimo (valor + descrição + tipo) para lançar algo rapidamente
// sem precisar abrir a tela completa de Lançamentos.
function ModalLancamentoRapido({ onClose, onSalvar }) {
  const [tipo, setTipo] = useState("saida");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const podeSalvar = descricao.trim() && valor && parseFloat(valor) > 0;

  const salvar = async () => {
    if (!podeSalvar) return;
    setSalvando(true);
    const categoria = sugerirCategoria(descricao, tipo) || (tipo === "entrada" ? "Renda extra" : tipo === "investimento" ? "Renda fixa" : "Outros");
    await onSalvar({
      tipo,
      desc: descricao.trim(),
      categoria,
      valor: parseFloat(valor),
      data: new Date().toISOString().slice(0, 10),
      recorrente: false,
    });
    setSalvando(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60, padding: 0 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 460, boxShadow: "0 -6px 24px rgba(0,0,0,0.15)" }}>
        <div style={{ width: 36, height: 4, background: BRAND.line, borderRadius: 4, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Lançamento rápido</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={BRAND.slate} /></button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[{ id: "saida", label: "Saída" }, { id: "entrada", label: "Entrada" }, { id: "investimento", label: "Investim." }].map((op) => (
            <button key={op.id} onClick={() => setTipo(op.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${tipo === op.id ? BRAND.orange : BRAND.line}`,
              background: tipo === op.id ? BRAND.orangeLight : "#fff", color: tipo === op.id ? BRAND.orangeDark : BRAND.slate,
            }}>{op.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            style={{ ...inputStyle, fontSize: 24, fontWeight: 700, textAlign: "center", padding: "16px" }}
            placeholder="R$ 0,00"
            type="number"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoFocus
          />
          <input
            style={inputStyle}
            placeholder="O que foi? Ex: Gasolina, Mercado..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <button
            onClick={salvar}
            disabled={!podeSalvar || salvando}
            style={{
              background: podeSalvar && !salvando ? BRAND.orange : BRAND.line, color: "#fff", border: "none",
              borderRadius: 10, padding: "13px", fontSize: 14.5, fontWeight: 700,
              cursor: podeSalvar && !salvando ? "pointer" : "not-allowed",
            }}
          >
            {salvando ? "Salvando..." : "Lançar agora"}
          </button>
          <p style={{ fontSize: 11, color: BRAND.slate, textAlign: "center", margin: 0 }}>
            A categoria é sugerida automaticamente. Você pode ajustar depois em Lançamentos.
          </p>
        </div>
      </div>
    </div>
  );
}

function ModalNovoLancamento({ onClose, onSalvar, onExcluir, transacaoEditando, duplicando }) {
  const editando = !!transacaoEditando && !duplicando;
  const [tipo, setTipo] = useState(transacaoEditando?.tipo || "saida");
  const [descricao, setDescricao] = useState(transacaoEditando?.desc || "");
  const [valor, setValor] = useState(transacaoEditando ? String(transacaoEditando.valor) : "");
  const [categoria, setCategoria] = useState(transacaoEditando?.categoria || "");
  const [categoriaEditadaManual, setCategoriaEditadaManual] = useState(!!transacaoEditando);
  const [data, setData] = useState(transacaoEditando?.data || new Date().toISOString().slice(0, 10));
  const [recorrente, setRecorrente] = useState(transacaoEditando?.recorrente || false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const handleDescricaoChange = (v) => {
    setDescricao(v);
    if (!categoriaEditadaManual) {
      const sugestao = sugerirCategoria(v, tipo);
      if (sugestao) setCategoria(sugestao);
    }
  };

  const handleTipoChange = (novoTipo) => {
    setTipo(novoTipo);
    if (novoTipo !== "saida" && novoTipo !== "entrada") setRecorrente(false);
    // Reavalia a sugestão de categoria com as regras do novo tipo
    if (!categoriaEditadaManual) {
      const sugestao = sugerirCategoria(descricao, novoTipo);
      setCategoria(sugestao || "");
    }
  };

  const podeSalvar = descricao.trim() && valor && categoria.trim();

  const salvar = () => {
    if (!podeSalvar) return;
    onSalvar({
      ...(editando ? { id: transacaoEditando.id } : {}),
      tipo,
      desc: descricao.trim(),
      categoria: categoria.trim(),
      valor: parseFloat(valor),
      data,
      recorrente,
    });
    onClose();
  };

  if (confirmandoExclusao) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FCE8E8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <AlertCircle size={22} color={BRAND.red} />
          </div>
          <h3 style={{ fontSize: 15.5, fontWeight: 700, color: BRAND.ink, margin: "0 0 8px" }}>Excluir "{descricao}"?</h3>
          <p style={{ fontSize: 13, color: BRAND.slate, margin: "0 0 20px", lineHeight: 1.5 }}>
            Essa ação não pode ser desfeita.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setConfirmandoExclusao(false)}
              style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${BRAND.line}`, background: "#fff", color: BRAND.slate, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { onExcluir(transacaoEditando.id); onClose(); }}
              style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: BRAND.red, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND.ink, margin: 0 }}>{editando ? "Editar lançamento" : duplicando ? "Duplicar lançamento" : "Novo lançamento"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={BRAND.slate} /></button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[{ id: "entrada", label: "Entrada" }, { id: "saida", label: "Saída" }, { id: "investimento", label: "Investimento" }].map((op) => (
            <button key={op.id} onClick={() => handleTipoChange(op.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${tipo === op.id ? BRAND.orange : BRAND.line}`,
              background: tipo === op.id ? BRAND.orangeLight : "#fff", color: tipo === op.id ? BRAND.orangeDark : BRAND.slate,
            }}>{op.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Descrição">
            <input style={inputStyle} placeholder={PLACEHOLDERS_DESCRICAO[tipo]} value={descricao} onChange={(e) => handleDescricaoChange(e.target.value)} />
          </Field>
          <Field label="Valor">
            <input style={inputStyle} placeholder="0,00" type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Field>
          <Field label="Categoria">
            <input
              style={inputStyle}
              placeholder="Categoria"
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setCategoriaEditadaManual(true); }}
            />
            {categoria && !categoriaEditadaManual && (
              <span style={{ fontSize: 11, color: BRAND.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={12} /> Categoria sugerida automaticamente
              </span>
            )}
          </Field>
          <Field label="Data"><input style={inputStyle} type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>
          {(tipo === "saida" || tipo === "entrada") && (
            <div style={{ background: recorrente ? BRAND.orangeLight : BRAND.mist, borderRadius: 10, padding: 12, transition: "background .2s" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: recorrente ? BRAND.orangeDark : BRAND.slate, fontWeight: recorrente ? 600 : 500, cursor: "pointer" }}>
                <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} />
                {tipo === "saida" ? "É um custo fixo? (se repete todo mês)" : "É uma entrada fixa? (ex: salário, se repete todo mês)"}
              </label>
              {recorrente && (
                <p style={{ fontSize: 11.5, color: BRAND.orangeDark, margin: "6px 0 0 24px" }}>
                  {tipo === "saida"
                    ? '✓ Esse lançamento vai aparecer automaticamente em "Custo Fixo"'
                    : "✓ Esse valor vai ser lançado automaticamente todo mês, sem você precisar repetir"}
                </p>
              )}
            </div>
          )}
          <button
            onClick={salvar}
            disabled={!podeSalvar}
            style={{
              marginTop: 6, background: podeSalvar ? BRAND.orange : BRAND.line, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600,
              cursor: podeSalvar ? "pointer" : "not-allowed",
            }}
          >
            {editando ? "Salvar alterações" : "Salvar lançamento"}
          </button>
          {editando && (
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(true)}
              style={{ background: "none", border: "none", color: BRAND.red, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Excluir lançamento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TELA: RECORRENTES
   ============================================================ */
function TelaRecorrentes({ transacoes }) {
  const custosFixos = transacoes.filter((t) => t.recorrente && t.tipo === "saida");
  const entradasFixas = transacoes.filter((t) => t.recorrente && t.tipo === "entrada");
  const totalCustoFixo = custosFixos.reduce((s, t) => s + t.valor, 0);
  const totalEntradasFixas = entradasFixas.reduce((s, t) => s + t.valor, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: "0 0 4px" }}>Custo Fixo</h1>
        <DicaEducativa
          titulo="Entradas fixas e Custo Fixo"
          texto={`Custo fixo é tudo que você paga todo mês, no mesmo valor (ou quase): aluguel, plano de saúde, academia, assinaturas de streaming.\n\nEle é diferente de um gasto pontual — enquanto um jantar fora é uma escolha do momento, o custo fixo continua existindo mesmo se você não usar. Por isso ele "come" seu orçamento silenciosamente, mês após mês.\n\nEntradas fixas são o contrário: dinheiro que você recebe todo mês com previsibilidade, como salário ou aluguel recebido.\n\nDica: revise sua lista de custo fixo de vez em quando. Assinaturas esquecidas são uma das formas mais fáceis de recuperar dinheiro sem cortar nada que você realmente usa.`}
        />
      </div>
      <p style={{ fontSize: 13, color: BRAND.slate, marginBottom: 20 }}>Entradas e assinaturas/contas que se repetem todo mês</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
        <StatCard icon={ArrowUpCircle} label="Entradas fixas" value={fmt(totalEntradasFixas)} sub={`${entradasFixas.length} ${entradasFixas.length === 1 ? "item" : "itens"}`} accent={BRAND.green} />
        <StatCard icon={RefreshCw} label="Custo fixo mensal" value={fmt(totalCustoFixo)} sub={`${custosFixos.length} ${custosFixos.length === 1 ? "item" : "itens"} ativos`} />
      </div>

      {entradasFixas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: BRAND.ink, margin: "0 0 10px" }}>Entradas fixas</h3>
          <Card>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {entradasFixas.map((t) => (
                <LinhaTransacao key={t.id} t={t} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: BRAND.ink, margin: "0 0 10px" }}>Custo fixo (contas e assinaturas)</h3>
        <Card>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {custosFixos.map((t) => (
              <LinhaTransacao key={t.id} t={t} />
            ))}
            {custosFixos.length === 0 && (
              <p style={{ fontSize: 13, color: BRAND.slate, textAlign: "center", margin: 0, padding: "10px 0" }}>
                Nenhum custo fixo cadastrado ainda.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   TELA: INVESTIMENTOS
   ============================================================ */
const mesAtualISO = () => new Date().toISOString().slice(0, 7); // "2026-08"

const formatarMes = (mesISO) => {
  const [ano, mes] = mesISO.split("-").map(Number);
  return `${NOMES_MES[mes - 1]}/${ano}`;
};

function TelaInvestimentos({ investimentos, onAdicionar, onConfirmarAporte }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(null);
  const total = investimentos.reduce((s, i) => s + i.valor, 0);
  const aporteMensal = investimentos.filter((i) => i.recorrente).reduce((s, i) => s + (i.valorMensal || 0), 0);
  const mesAtual = mesAtualISO();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Investimentos</h1>
            <DicaEducativa
              titulo="Aporte único x aporte fixo"
              texto={`Aporte único é quando você investe um valor uma vez só, sem compromisso de repetir todo mês.\n\nAporte fixo mensal é um valor que você se compromete a investir todo mês — é essa disciplina que faz o dinheiro crescer de verdade ao longo do tempo, graças aos juros compostos.\n\nDica: se um mês você esquecer de confirmar seu aporte fixo, o app lança automaticamente quando você abrir de novo, para você não perder o registro no seu histórico.`}
            />
          </div>
          <p style={{ fontSize: 13, color: BRAND.slate, marginTop: 4 }}>Sua carteira consolidada</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={16} /> Novo investimento
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon={TrendingUp} label="Total investido" value={fmt(total)} />
        <StatCard icon={PiggyBank} label="Aporte fixo mensal" value={fmt(aporteMensal)} sub="Soma dos aportes recorrentes" />
      </div>

      <Card>
        {investimentos.length === 0 ? (
          <p style={{ fontSize: 13, color: BRAND.slate, textAlign: "center", margin: 0, padding: "10px 0" }}>
            Você ainda não tem investimentos cadastrados.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {investimentos.map((i, idx) => {
              const jaConfirmouEsteMes = i.historico.some((h) => h.mes === mesAtual);
              return (
                <div key={i.id} style={{ padding: "12px 0", borderBottom: idx === investimentos.length - 1 ? "none" : `1px solid ${BRAND.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: BRAND.ink }}>{i.nome}</div>
                      <div style={{ fontSize: 11.5, color: BRAND.slate }}>
                        {i.tipo} · {i.rentab}
                        {i.recorrente && <span style={{ color: BRAND.orangeDark, fontWeight: 600 }}> · aporte fixo de {fmt(i.valorMensal)}/mês</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: BRAND.ink }}>{fmt(i.valor)}</div>
                  </div>

                  {i.recorrente && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                      {jaConfirmouEsteMes ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: BRAND.green, fontWeight: 600 }}>
                          <Check size={13} /> Aporte de {formatarMes(mesAtual)} confirmado
                        </span>
                      ) : (
                        <button
                          onClick={() => onConfirmarAporte(i.id)}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: BRAND.orangeLight, color: BRAND.orangeDark, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          <Check size={13} /> Confirmar aporte de {formatarMes(mesAtual)}
                        </button>
                      )}
                      <button
                        onClick={() => setHistoricoAberto(historicoAberto === i.id ? null : i.id)}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "none", color: BRAND.slate, border: `1px solid ${BRAND.line}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Clock size={13} /> Histórico
                      </button>
                    </div>
                  )}

                  {historicoAberto === i.id && (
                    <div style={{ marginTop: 10, background: BRAND.mist, borderRadius: 10, padding: 12 }}>
                      {i.historico.length === 0 ? (
                        <p style={{ fontSize: 12, color: BRAND.slate, margin: 0 }}>Nenhum aporte registrado ainda.</p>
                      ) : (
                        [...i.historico].reverse().map((h) => (
                          <div key={h.mes} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 12 }}>
                            <span style={{ color: BRAND.ink, fontWeight: 600 }}>{formatarMes(h.mes)}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: BRAND.ink }}>{fmt(h.valor)}</span>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                                color: h.tipo === "confirmado" ? BRAND.green : BRAND.orangeDark,
                                background: h.tipo === "confirmado" ? "#E3F2E9" : BRAND.orangeLight,
                              }}>
                                {h.tipo === "confirmado" ? "confirmado" : "automático"}
                              </span>
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {modalAberto && <ModalNovoInvestimento onClose={() => setModalAberto(false)} onSalvar={onAdicionar} />}
    </div>
  );
}

function ModalNovoInvestimento({ onClose, onSalvar }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Renda fixa");
  const [valor, setValor] = useState("");
  const [rentab, setRentab] = useState("");
  const [aporteTipo, setAporteTipo] = useState("unico"); // unico | fixo
  const [valorMensal, setValorMensal] = useState("");

  const podeSalvar = nome.trim() && valor;

  const salvar = () => {
    if (!podeSalvar) return;
    onSalvar({
      nome: nome.trim(),
      tipo,
      valor: parseFloat(valor),
      rentab: rentab.trim() || "—",
      recorrente: aporteTipo === "fixo",
      valorMensal: aporteTipo === "fixo" ? parseFloat(valorMensal) || 0 : 0,
      historico: [],
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Novo investimento</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={BRAND.slate} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nome"><input style={inputStyle} placeholder="Ex: CDB Banco X, Tesouro Selic..." value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="Tipo">
            <select style={inputStyle} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>Renda fixa</option>
              <option>Renda variável</option>
              <option>Fundo imobiliário</option>
              <option>Previdência privada</option>
              <option>Outro</option>
            </select>
          </Field>
          <Field label="Valor total investido hoje"><input style={inputStyle} type="number" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} /></Field>
          <Field label="Rentabilidade (opcional)"><input style={inputStyle} placeholder="Ex: 108% CDI, 8,2% a.a." value={rentab} onChange={(e) => setRentab(e.target.value)} /></Field>

          <Field label="Tipo de aporte">
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "unico", label: "Aporte único" }, { id: "fixo", label: "Aporte fixo mensal" }].map((op) => (
                <button
                  key={op.id}
                  onClick={() => setAporteTipo(op.id)}
                  style={{
                    flex: 1, padding: "9px 4px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${aporteTipo === op.id ? BRAND.orange : BRAND.line}`,
                    background: aporteTipo === op.id ? BRAND.orangeLight : "#fff",
                    color: aporteTipo === op.id ? BRAND.orangeDark : BRAND.slate,
                  }}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </Field>

          {aporteTipo === "fixo" && (
            <Field label="Valor do aporte mensal">
              <input style={inputStyle} type="number" placeholder="0,00" value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} />
            </Field>
          )}

          <button
            onClick={salvar}
            disabled={!podeSalvar}
            style={{
              marginTop: 6, background: podeSalvar ? BRAND.orange : BRAND.line, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: podeSalvar ? "pointer" : "not-allowed",
            }}
          >
            Salvar investimento
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TELA: METAS
   ============================================================ */
const CORES_META = [BRAND.orange, BRAND.green, "#3E6B8F", "#9B6FBA", "#C99A3E"];

function TelaMetas({ metas, onAdicionar, onAdicionarValor, onExcluir }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [metaAportando, setMetaAportando] = useState(null);
  const [historicoAberto, setHistoricoAberto] = useState(null);
  const [metaExcluindo, setMetaExcluindo] = useState(null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Metas financeiras</h1>
            <DicaEducativa
              titulo="Como usar suas metas"
              texto={`Uma meta é qualquer objetivo com um valor definido — uma reserva de emergência, uma viagem, a entrada de um imóvel.\n\nToda vez que você guardar dinheiro para ela, use o botão "Adicionar" para registrar o valor, em vez de recalcular o total sozinho. Assim você acompanha o histórico de cada aporte e o progresso fica sempre correto.\n\nDica: se uma meta não faz mais sentido pra você, é melhor excluí-la do que deixá-la parada — isso mantém seu painel focado no que realmente importa agora.`}
            />
          </div>
          <p style={{ fontSize: 13, color: BRAND.slate, marginTop: 4 }}>Acompanhe o progresso de cada objetivo</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={16} /> Nova meta
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {metas.map((m) => {
          const pct = Math.min(100, (m.atual / m.alvo) * 100);
          return (
            <Card key={m.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.ink }}>{m.nome}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setMetaAportando(m)}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#fff", fontWeight: 600, background: BRAND.orange, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                  >
                    <Plus size={13} /> Adicionar
                  </button>
                  <button
                    onClick={() => setMetaExcluindo(m)}
                    title="Excluir meta"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: BRAND.mist, border: "none", borderRadius: 8, cursor: "pointer", color: BRAND.red }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: BRAND.slate, marginBottom: 8 }}>{fmt(m.atual)} de {fmt(m.alvo)}</div>
              <div style={{ width: "100%", height: 8, background: BRAND.mist, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: m.cor, borderRadius: 6, transition: "width .3s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 11.5, color: BRAND.slate }}>{pct.toFixed(0)}% concluído</span>
                {m.historico && m.historico.length > 0 && (
                  <button
                    onClick={() => setHistoricoAberto(historicoAberto === m.id ? null : m.id)}
                    style={{ display: "flex", alignItems: "center", gap: 4, background: "none", color: BRAND.slate, border: "none", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Clock size={12} /> Histórico
                  </button>
                )}
              </div>

              {historicoAberto === m.id && (
                <div style={{ marginTop: 10, background: BRAND.mist, borderRadius: 10, padding: 12 }}>
                  {[...m.historico].reverse().map((h, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12 }}>
                      <span style={{ color: BRAND.slate }}>{new Date(h.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                      <span style={{ color: BRAND.green, fontWeight: 600 }}>+{fmt(h.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
        {metas.length === 0 && (
          <Card>
            <p style={{ fontSize: 13, color: BRAND.slate, textAlign: "center", margin: 0 }}>
              Você ainda não tem metas. Clique em "Nova meta" para criar a primeira.
            </p>
          </Card>
        )}
      </div>

      {modalAberto && (
        <ModalNovaMeta
          onClose={() => setModalAberto(false)}
          onSalvar={(m) => onAdicionar({ ...m, cor: CORES_META[metas.length % CORES_META.length] })}
        />
      )}
      {metaAportando && (
        <ModalAdicionarValorMeta
          meta={metaAportando}
          onClose={() => setMetaAportando(null)}
          onSalvar={(valor) => { onAdicionarValor(metaAportando.id, valor); setMetaAportando(null); }}
        />
      )}
      {metaExcluindo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={() => setMetaExcluindo(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FCE8E8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <AlertCircle size={22} color={BRAND.red} />
            </div>
            <h3 style={{ fontSize: 15.5, fontWeight: 700, color: BRAND.ink, margin: "0 0 8px" }}>Excluir "{metaExcluindo.nome}"?</h3>
            <p style={{ fontSize: 13, color: BRAND.slate, margin: "0 0 20px", lineHeight: 1.5 }}>
              Você já guardou {fmt(metaExcluindo.atual)} para essa meta. Isso não apaga o dinheiro, só remove a meta do seu painel. Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setMetaExcluindo(null)}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${BRAND.line}`, background: "#fff", color: BRAND.slate, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { onExcluir(metaExcluindo.id); setMetaExcluindo(null); }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: BRAND.red, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalNovaMeta({ onClose, onSalvar }) {
  const [nome, setNome] = useState("");
  const [alvo, setAlvo] = useState("");
  const [atual, setAtual] = useState("");

  const podeSalvar = nome.trim() && alvo;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Nova meta</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={BRAND.slate} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nome da meta"><input style={inputStyle} placeholder="Ex: Viagem para o Chile" value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="Valor alvo"><input style={inputStyle} type="number" placeholder="0,00" value={alvo} onChange={(e) => setAlvo(e.target.value)} /></Field>
          <Field label="Valor já guardado (opcional)"><input style={inputStyle} type="number" placeholder="0,00" value={atual} onChange={(e) => setAtual(e.target.value)} /></Field>
          <button
            onClick={() => podeSalvar && (onSalvar({ nome: nome.trim(), alvo: parseFloat(alvo), atual: parseFloat(atual) || 0, historico: [] }), onClose())}
            disabled={!podeSalvar}
            style={{
              marginTop: 6, background: podeSalvar ? BRAND.orange : BRAND.line, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: podeSalvar ? "pointer" : "not-allowed",
            }}
          >
            Criar meta
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalAdicionarValorMeta({ meta, onClose, onSalvar }) {
  const [valor, setValor] = useState("");
  const podeSalvar = valor && parseFloat(valor) > 0;
  const novoTotal = (meta.atual || 0) + (parseFloat(valor) || 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND.ink, margin: 0 }}>{meta.nome}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={BRAND.slate} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: BRAND.slate, margin: "0 0 14px" }}>
          Você já guardou {fmt(meta.atual)} de {fmt(meta.alvo)}
        </p>
        <Field label="Quanto quer adicionar agora?">
          <input style={inputStyle} type="number" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
        </Field>
        {podeSalvar && (
          <p style={{ fontSize: 11.5, color: BRAND.green, marginTop: 8, fontWeight: 600 }}>
            Novo total: {fmt(novoTotal)}
          </p>
        )}
        <button
          onClick={() => podeSalvar && onSalvar(parseFloat(valor))}
          disabled={!podeSalvar}
          style={{
            marginTop: 14, background: podeSalvar ? BRAND.orange : BRAND.line, color: "#fff", border: "none",
            borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: podeSalvar ? "pointer" : "not-allowed", width: "100%",
          }}
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   TELA: CALCULADORA DE APOSENTADORIA
   ============================================================ */
/* ============================================================
   TELA: RESUMOS (semanal + teto de gasto)
   ============================================================ */
function TelaResumos({ cliente, transacoes, tetoMensal, onSalvarTeto }) {
  const [editandoTeto, setEditandoTeto] = useState(false);
  const [novoTeto, setNovoTeto] = useState(String(tetoMensal));
  const mesAtual = new Date().toISOString().slice(0, 7);

  const resumo = useMemo(() => calcularResumoSemanal(transacoes, mesAtual, tetoMensal), [transacoes, mesAtual, tetoMensal]);
  const semanaAtual = resumo.semanas.find((s) => s.atual);
  const totalGastoMes = resumo.semanas.reduce((sum, s) => sum + s.gasto, 0);
  const pctUsado = Math.min(100, (totalGastoMes / tetoMensal) * 100);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: "0 0 4px" }}>Resumos</h1>
          <DicaEducativa
            titulo="Como funciona o teto de gasto"
            texto={`Defina quanto você pode gastar por mês. O app divide esse valor pelas semanas do mês, então você sabe exatamente quanto pode gastar em cada uma.\n\nSe você passar do previsto numa semana, o app recalcula automaticamente quanto sobra por semana para você ainda fechar o mês dentro do teto.\n\nToda segunda-feira você recebe um resumo de como foi sua semana anterior — assim dá pra ajustar o rumo antes que o mês termine, e não só descobrir o estrago no fim.`}
          />
        </div>
        <button
          onClick={() => gerarRelatorioMensalPDF(cliente, transacoes, mesAtual)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: BRAND.mist, color: BRAND.ink, border: `1px solid ${BRAND.line}`, borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          <Download size={14} /> Baixar relatório do mês
        </button>
      </div>
      <p style={{ fontSize: 13, color: BRAND.slate, marginBottom: 20 }}>Acompanhe seu teto de gastos semana a semana</p>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: BRAND.ink }}>Teto mensal</span>
          <button
            onClick={() => setEditandoTeto(!editandoTeto)}
            style={{ fontSize: 12, color: BRAND.orangeDark, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
          >
            {editandoTeto ? "Cancelar" : "Editar"}
          </button>
        </div>
        {editandoTeto ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} type="number" value={novoTeto} onChange={(e) => setNovoTeto(e.target.value)} />
            <button
              onClick={() => { onSalvarTeto(parseFloat(novoTeto) || 0); setEditandoTeto(false); }}
              style={{ background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Salvar
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 26, fontWeight: 700, color: BRAND.ink, marginBottom: 8 }}>{fmt(tetoMensal)}<span style={{ fontSize: 13, color: BRAND.slate, fontWeight: 500 }}> /mês</span></div>
            <div style={{ width: "100%", height: 8, background: BRAND.mist, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${pctUsado}%`, height: "100%", background: pctUsado > 100 ? BRAND.red : BRAND.orange, borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: 11.5, color: BRAND.slate, marginTop: 6 }}>
              {fmt(totalGastoMes)} gastos até agora ({pctUsado.toFixed(0)}% do teto)
            </div>
          </>
        )}
      </Card>

      {semanaAtual && (
        <Card style={{
          marginBottom: 16,
          border: `1px solid ${semanaAtual.gasto > semanaAtual.teto ? BRAND.red : BRAND.green}`,
          background: semanaAtual.gasto > semanaAtual.teto ? "#FCEEEE" : "#EEF7F1",
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: semanaAtual.gasto > semanaAtual.teto ? BRAND.red : BRAND.green, marginBottom: 4 }}>
            {semanaAtual.gasto > semanaAtual.teto ? "⚠️ Você passou do previsto nesta semana" : "✅ Você está dentro do previsto nesta semana"}
          </div>
          <div style={{ fontSize: 12.5, color: BRAND.slate }}>
            Gastou {fmt(semanaAtual.gasto)} de {fmt(semanaAtual.teto)} previstos ({formatarDataCurta(semanaAtual.inicio)} a {formatarDataCurta(semanaAtual.fim)})
          </div>
          <div style={{ fontSize: 12.5, color: BRAND.ink, fontWeight: 600, marginTop: 6 }}>
            Para fechar o mês dentro do teto, você pode gastar até {fmt(resumo.tetoAjustadoRestante)}/semana nas semanas restantes.
          </div>
        </Card>
      )}

      <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: "0 0 12px" }}>Semanas do mês</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {resumo.semanas.map((s) => {
          const pct = Math.min(100, (s.gasto / s.teto) * 100);
          const estourou = s.gasto > s.teto;
          return (
            <Card key={s.numero} style={{ opacity: s.passou || s.atual ? 1 : 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.ink }}>
                  Semana {s.numero} <span style={{ fontWeight: 400, color: BRAND.slate }}>({formatarDataCurta(s.inicio)} – {formatarDataCurta(s.fim)})</span>
                  {s.atual && <span style={{ fontSize: 10, fontWeight: 700, color: BRAND.orangeDark, background: BRAND.orangeLight, padding: "2px 7px", borderRadius: 20, marginLeft: 6 }}>atual</span>}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: estourou ? BRAND.red : BRAND.ink }}>
                  {fmt(s.gasto)} <span style={{ fontWeight: 400, color: BRAND.slate }}>/ {fmt(s.teto)}</span>
                </span>
              </div>
              {(s.passou || s.atual) && (
                <div style={{ width: "100%", height: 6, background: BRAND.mist, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: estourou ? BRAND.red : BRAND.green, borderRadius: 6 }} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}


function TelaAposentadoria({ cliente }) {
  const idadeAtual = idade(cliente.nascimento);
  const idadeAtualFracionada = idadeFracionada(cliente.nascimento);
  const [idadeAposentadoria, setIdadeAposentadoria] = useState(65);
  const [aporteInicial, setAporteInicial] = useState(5000);
  const [aporteMensal, setAporteMensal] = useState(1000);
  const [rentabilidadeAnual, setRentabilidadeAnual] = useState(12);
  const [ipcaAnual, setIpcaAnual] = useState(5);

  // valores "aplicados" — só mudam quando o cliente clica em "Gerar simulação"
  const [parametros, setParametros] = useState({
    idadeAposentadoria: 65, aporteInicial: 5000, aporteMensal: 1000,
    rentabilidadeAnual: 12, ipcaAnual: 5,
  });
  const [jaGerou, setJaGerou] = useState(false);

  const resultado = useMemo(
    () =>
      calcularAposentadoria({
        idadeAtualFracionada,
        idadeAposentadoria: Number(parametros.idadeAposentadoria),
        aporteInicial: Number(parametros.aporteInicial),
        aporteMensal: Number(parametros.aporteMensal),
        rentabilidadeAnual: Number(parametros.rentabilidadeAnual) / 100,
        ipcaAnual: Number(parametros.ipcaAnual) / 100,
      }),
    [idadeAtualFracionada, parametros]
  );

  const gerarSimulacao = () => {
    setParametros({ idadeAposentadoria, aporteInicial, aporteMensal, rentabilidadeAnual, ipcaAnual });
    setJaGerou(true);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: "0 0 4px" }}>
          Calculadora de aposentadoria
        </h1>
        <DicaEducativa
          titulo="Como funciona essa simulação"
          texto={`Essa calculadora projeta quanto você teria acumulado até a idade de aposentadoria, considerando juros compostos (seu dinheiro rendendo sobre o próprio rendimento) e a inflação (IPCA), que reajusta seu aporte mensal ao longo dos anos para manter o poder de compra.\n\nA "renda perpétua" mostrada é quanto você poderia sacar todo mês, para sempre, sem nunca gastar o patrimônio — sacando só os juros.\n\nEssa é uma estimativa educativa. Para um planejamento real e personalizado, fale com seu consultor.`}
        />
      </div>
      <p style={{ fontSize: 13, color: BRAND.slate, marginBottom: 20 }}>
        Simule quanto você pode acumular e quanto poderá sacar por mês
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-2col">
        <Card>
          <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: "0 0 16px" }}>
            Seus dados
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Idade atual (do seu cadastro)">
              <input style={{ ...inputStyle, background: "#EFEDE8", color: BRAND.slate, cursor: "not-allowed" }} value={`${idadeAtual} anos`} disabled />
            </Field>
            <Field label="Idade que pretende se aposentar">
              <input style={inputStyle} type="number" value={idadeAposentadoria} onChange={(e) => setIdadeAposentadoria(e.target.value)} />
            </Field>
            <Field label="Quanto já tem investido hoje">
              <input style={inputStyle} type="number" value={aporteInicial} onChange={(e) => setAporteInicial(e.target.value)} />
            </Field>
            <Field label="Quanto pretende investir por mês">
              <input style={inputStyle} type="number" value={aporteMensal} onChange={(e) => setAporteMensal(e.target.value)} />
            </Field>
            <Field label="Rentabilidade anual esperada (%)">
              <input style={inputStyle} type="number" value={rentabilidadeAnual} onChange={(e) => setRentabilidadeAnual(e.target.value)} />
            </Field>
            <Field label="Inflação anual esperada — IPCA (%)">
              <input style={inputStyle} type="number" value={ipcaAnual} onChange={(e) => setIpcaAnual(e.target.value)} />
            </Field>
            <button
              onClick={gerarSimulacao}
              style={{ marginTop: 4, background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
            >
              Gerar simulação
            </button>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!jaGerou ? (
            <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, gap: 8 }}>
              <Calculator size={28} color={BRAND.slate} />
              <p style={{ fontSize: 13, color: BRAND.slate, margin: 0 }}>
                Preencha seus dados e clique em <strong>"Gerar simulação"</strong> para ver a projeção.
              </p>
            </Card>
          ) : (
            <>
              <Card style={{ background: BRAND.ink, border: "none" }}>
                <div style={{ fontSize: 12.5, color: "#C8C4BC", fontWeight: 500, marginBottom: 6 }}>
                  Patrimônio projetado aos {parametros.idadeAposentadoria} anos
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>
                  {fmt(resultado.patrimonioFinal)}
                </div>
                <div style={{ fontSize: 12, color: "#C8C4BC", marginTop: 4 }}>
                  Faltam {parametros.idadeAposentadoria - idadeAtual} anos para essa idade
                </div>
              </Card>

              <Card>
                <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: "0 0 14px" }}>
                  Renda mensal estimada
                </h3>
                <div style={{ padding: 14, background: BRAND.orangeLight, borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: BRAND.orangeDark, fontWeight: 600 }}>
                    Renda perpétua
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, marginTop: 2 }}>
                    {fmt(resultado.rendaPerpetua)}/mês
                  </div>
                  <div style={{ fontSize: 11.5, color: BRAND.slate, marginTop: 2 }}>
                    Saca só os juros — o saldo nunca acaba
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {jaGerou && (
      <Card style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: "0 0 16px" }}>
          Evolução do patrimônio até a aposentadoria
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={resultado.serie}>
            <defs>
              <linearGradient id="corAposent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.orange} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BRAND.orange} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={BRAND.line} vertical={false} />
            <XAxis dataKey="ano" tick={{ fontSize: 12, fill: BRAND.slate }} axisLine={false} tickLine={false} label={{ value: "Anos a partir de hoje", position: "insideBottom", offset: -4, fontSize: 11, fill: BRAND.slate }} />
            <YAxis tick={{ fontSize: 11, fill: BRAND.slate }} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={64} />
            <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Ano ${l}`} contentStyle={{ borderRadius: 10, border: `1px solid ${BRAND.line}`, fontSize: 12.5 }} />
            <Area type="monotone" dataKey="saldo" stroke={BRAND.orange} strokeWidth={2.5} fill="url(#corAposent)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, padding: 14, background: BRAND.orangeLight, borderRadius: 12 }}>
        <AlertCircle size={18} color={BRAND.orangeDark} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12.5, color: BRAND.orangeDark, margin: 0, lineHeight: 1.5 }}>
          Esta simulação é uma estimativa educativa e não considera impostos, taxas de administração ou oscilações de mercado.
          Fale com seu consultor da Sundown Gestão de Risco para um planejamento personalizado.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   TELA: INDIQUE E GANHE (visão do cliente)
   ============================================================ */
function TelaIndicacoes({ indicacoes, onAdicionar }) {
  const [modalAberto, setModalAberto] = useState(false);
  const fechadas = indicacoes.filter((i) => i.status === "fechado" && i.valorSeguro >= VALOR_MINIMO_SEGURO);
  const progresso = Math.min(fechadas.length, META_INDICACOES);
  const completou = progresso >= META_INDICACOES;
  const vagasDisponiveis = META_INDICACOES - indicacoes.length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: BRAND.ink, margin: "0 0 4px" }}>Indique e Ganhe</h1>
        <DicaEducativa
          titulo="Como funciona o Indique e Ganhe"
          texto={`Indique até 3 amigos que você acredita que se beneficiariam de um planejamento financeiro. Quando as 3 indicações virarem clientes de verdade (com um seguro contratado), você ganha um voucher de R$200 para jantar onde quiser.\n\nO ideal é enviar a mensagem de apresentação você mesmo pelo WhatsApp — quando é você quem avisa, a pessoa chega muito mais receptiva pra conversa.\n\nEssa recompensa não tem custo pra você: é nossa forma de agradecer por ajudar mais gente a cuidar do próprio futuro.`}
        />
      </div>
      <p style={{ fontSize: 13, color: BRAND.slate, marginBottom: 20 }}>
        Indique amigos e ganhe recompensas quando eles se tornarem clientes
      </p>

      <Card style={{ background: BRAND.ink, border: "none", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: BRAND.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gift size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>
              {completou ? "Você completou a meta! 🎉" : `${progresso} de ${META_INDICACOES} indicações fechadas`}
            </div>
            <div style={{ fontSize: 11.5, color: "#C8C4BC" }}>
              A cada {META_INDICACOES} indicações que virarem clientes (seguro a partir de {fmt(VALOR_MINIMO_SEGURO)}), você ganha um voucher de {fmt(VALOR_RECOMPENSA)} para jantar
            </div>
          </div>
        </div>
        <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ width: `${(progresso / META_INDICACOES) * 100}%`, height: "100%", background: BRAND.orange, borderRadius: 6, transition: "width .3s" }} />
        </div>
      </Card>

      {completou && (
        <Card style={{ marginBottom: 16, border: `1px solid ${BRAND.orange}`, background: BRAND.orangeLight }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: BRAND.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
              🍽️
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.ink }}>
                Você ganhou um voucher de {fmt(VALOR_RECOMPENSA)}!
              </div>
              <div style={{ fontSize: 12, color: BRAND.slate, marginTop: 2 }}>
                Para usar num jantar no restaurante da sua escolha. Em breve entraremos em contato para entregar.
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: 0 }}>Suas indicações</h3>
        <button
          onClick={() => setModalAberto(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <Share2 size={15} /> Indicar amigo
        </button>
      </div>

      <Card>
        {indicacoes.length === 0 ? (
          <p style={{ fontSize: 13, color: BRAND.slate, textAlign: "center", margin: 0, padding: "10px 0" }}>
            Você ainda não indicou ninguém. Indique até {META_INDICACOES} amigos para começar a acumular sua recompensa.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {indicacoes.map((i, idx) => (
              <IndicacaoLinha key={i.id} indicacao={i} isLast={idx === indicacoes.length - 1} />
            ))}
          </div>
        )}
      </Card>

      {modalAberto && (
        <ModalNovaIndicacao
          onClose={() => setModalAberto(false)}
          onSalvar={onAdicionar}
        />
      )}
    </div>
  );
}

function IndicacaoLinha({ indicacao, isLast }) {
  const statusInfo = {
    pendente: { label: "Aguardando contato", cor: BRAND.slate, Icon: Clock },
    contatado: { label: "Em conversa", cor: "#3E6B8F", Icon: Clock },
    fechado: { label: "Cliente fechado!", cor: BRAND.green, Icon: Check },
  }[indicacao.status];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: isLast ? "none" : `1px solid ${BRAND.line}` }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: BRAND.ink }}>{indicacao.nome}</div>
        <div style={{ fontSize: 11.5, color: BRAND.slate }}>
          {indicacao.profissao ? `${indicacao.profissao} · ` : ""}{indicacao.contato}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: statusInfo.cor }}>
        <statusInfo.Icon size={14} /> {statusInfo.label}
      </div>
    </div>
  );
}

// Monta o link do WhatsApp já com a mensagem preenchida
function montarLinkWhatsapp(telefone, nomeIndicado) {
  const numeroLimpo = telefone.replace(/\D/g, "");
  const primeiroNome = nomeIndicado.split(" ")[0];
  const mensagem = `Oi ${primeiroNome}! Tava pensando em você e no seu futuro, e resolvi te apresentar o Marcos Bicaco. Já parou pra imaginar se hoje você precisasse ficar 3 meses sem trabalhar, como ficaria sua renda? Ele faz um trabalho sério de planejamento financeiro voltado pra proteção de renda, e eu queria muito que você tivesse essa segurança também. Dá uma conferida, com certeza vai valer a pena!`;
  return `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
}

function ModalNovaIndicacao({ onClose, onSalvar }) {
  const [etapa, setEtapa] = useState("form"); // form | confirmacao
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [profissao, setProfissao] = useState("");
  const [whatsappEnviado, setWhatsappEnviado] = useState(false);
  const podeSalvar = nome.trim() && telefone.trim() && profissao.trim();

  const enviar = () => {
    if (!podeSalvar) return;
    onSalvar({
      nome: nome.trim(),
      contato: telefone.trim(),
      profissao: profissao.trim(),
      status: "pendente",
      valorSeguro: null,
      data: new Date().toISOString().slice(0, 10),
    });
    setEtapa("confirmacao");
  };

  if (etapa === "confirmacao") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 0, width: "100%", maxWidth: 380, textAlign: "center", overflow: "hidden" }}>
          {/* Cabeçalho de impacto */}
          <div style={{ background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.orangeDark})`, padding: "24px 24px 20px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Gift size={22} color="#fff" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Mostre pra {nome.split(" ")[0]} que você se importa</h3>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)", margin: 0, lineHeight: 1.5 }}>
              Uma mensagem sua agora pode ser o primeiro passo pra proteger o futuro dela.
            </p>
          </div>

          <div style={{ padding: 24 }}>
            <div style={{ textAlign: "left", background: BRAND.mist, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: BRAND.slate, lineHeight: 1.5, fontStyle: "italic" }}>
              "Tava pensando em você e no seu futuro, e resolvi te apresentar o Marcos Bicaco..."
            </div>

            <a
              href={montarLinkWhatsapp(telefone, nome)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setWhatsappEnviado(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: "#25D366", color: "#fff", textDecoration: "none",
                borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, marginBottom: 12,
                boxShadow: "0 6px 18px rgba(37,211,102,0.4)",
              }}
            >
              💬 Enviar mensagem no WhatsApp
            </a>

            {whatsappEnviado && (
              <button
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: BRAND.mist, border: "none", color: BRAND.green, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", padding: "10px", width: "100%", borderRadius: 10,
                }}
              >
                <Check size={15} /> Mensagem enviada — concluir
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Indicar amigo</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={BRAND.slate} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nome completo"><input style={inputStyle} placeholder="Ex: João da Silva" value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="Telefone / WhatsApp"><input style={inputStyle} placeholder="(21) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Field>
          <Field label="Profissão"><input style={inputStyle} placeholder="Ex: Dentista, Advogado..." value={profissao} onChange={(e) => setProfissao(e.target.value)} /></Field>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: BRAND.orangeLight, borderRadius: 10, padding: 10 }}>
            <AlertCircle size={15} color={BRAND.orangeDark} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11.5, color: BRAND.orangeDark, margin: 0, lineHeight: 1.4 }}>
              Vamos entrar em contato com essa pessoa em nome da Sundown Gestão de Risco.
            </p>
          </div>
          <button
            onClick={enviar}
            disabled={!podeSalvar}
            style={{
              marginTop: 6, background: podeSalvar ? BRAND.orange : BRAND.line, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: podeSalvar ? "pointer" : "not-allowed",
            }}
          >
            Enviar indicação
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAINEL ADMIN
   ============================================================ */
function PainelAdmin({ onLogout }) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [abaAdmin, setAbaAdmin] = useState("clientes");
  const [modalNovoClienteAberto, setModalNovoClienteAberto] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [carregandoClientes, setCarregandoClientes] = useState(true);

  const buscarClientes = async () => {
    setCarregandoClientes(true);
    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("eh_admin", false)
      .order("criado_em", { ascending: false });
    if (!error && data) {
      setClientes(
        data.map((p) => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria || "—",
          idade: idade(p.data_nascimento),
          nascimento: p.data_nascimento,
          semSeguro: !p.tem_seguro_vida,
          semPrevidencia: !p.tem_previdencia,
        }))
      );
    }
    setCarregandoClientes(false);
  };

  useEffect(() => {
    buscarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const totalClientes = clientes.length;
  const semSeguro = clientes.filter((c) => c.semSeguro).length;
  const semPrevidencia = clientes.filter((c) => c.semPrevidencia).length;

  if (selecionado) {
    return <PerfilClienteAdmin cliente={selecionado} onVoltar={() => setSelecionado(null)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: BRAND.mist }}>
      <div style={{ background: BRAND.white, borderBottom: `1px solid ${BRAND.line}`, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: BRAND.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: BRAND.ink }}>Painel do consultor — Sundown</span>
        </div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: BRAND.slate, fontSize: 13, cursor: "pointer" }}>
          <LogOut size={15} /> Sair
        </button>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <StatCard icon={Users} label="Total de clientes" value={totalClientes} />
          <StatCard icon={AlertCircle} label="Sem seguro de vida" value={semSeguro} accent={BRAND.red} sub="Oportunidade de contato" />
          <StatCard icon={Target} label="Sem previdência" value={semPrevidencia} accent={BRAND.orange} sub="Oportunidade de contato" />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setAbaAdmin("clientes")}
            style={{
              padding: "9px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${abaAdmin === "clientes" ? BRAND.orange : BRAND.line}`,
              background: abaAdmin === "clientes" ? BRAND.orangeLight : "#fff",
              color: abaAdmin === "clientes" ? BRAND.orangeDark : BRAND.slate,
            }}
          >
            Clientes
          </button>
          <button
            onClick={() => setAbaAdmin("indicacoes")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${abaAdmin === "indicacoes" ? BRAND.orange : BRAND.line}`,
              background: abaAdmin === "indicacoes" ? BRAND.orangeLight : "#fff",
              color: abaAdmin === "indicacoes" ? BRAND.orangeDark : BRAND.slate,
            }}
          >
            <Gift size={14} /> Indicações
          </button>
        </div>

        {abaAdmin === "clientes" ? (
          <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Clientes</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={15} color={BRAND.slate} style={{ position: "absolute", left: 12, top: 10 }} />
              <input
                style={{ ...inputStyle, paddingLeft: 34, width: 220 }}
                placeholder="Buscar cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <button
              onClick={() => setModalNovoClienteAberto(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <Plus size={15} /> Novo cliente
            </button>
          </div>
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          {carregandoClientes ? (
            <p style={{ fontSize: 13, color: BRAND.slate, textAlign: "center", margin: 0, padding: "24px 0" }}>
              Carregando clientes...
            </p>
          ) : filtrados.length === 0 ? (
            <p style={{ fontSize: 13, color: BRAND.slate, textAlign: "center", margin: 0, padding: "24px 0" }}>
              {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
            </p>
          ) : (
          filtrados.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setSelecionado(c)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px",
                borderBottom: i < filtrados.length - 1 ? `1px solid ${BRAND.line}` : "none",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: BRAND.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: BRAND.orangeDark }}>
                  {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: BRAND.ink }}>{c.nome}</div>
                  <div style={{ fontSize: 11.5, color: BRAND.slate }}>{c.categoria} · {c.idade} anos</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {c.semSeguro && <Badge label="Sem seguro" cor={BRAND.red} />}
                  {c.semPrevidencia && <Badge label="Sem previdência" cor={BRAND.orange} />}
                </div>
                <ChevronRight size={16} color={BRAND.slate} />
              </div>
            </div>
          ))
          )}
        </Card>
          </>
        ) : (
          <PainelIndicacoesAdmin />
        )}
      </div>

      {modalNovoClienteAberto && (
        <ModalNovoClienteAdmin onClose={() => setModalNovoClienteAberto(false)} onSucesso={buscarClientes} />
      )}
    </div>
  );
}

function ModalNovoClienteAdmin({ onClose, onSucesso }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [profissao, setProfissao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const podeSalvar = nome.trim() && email.trim() && senha.length >= 6 && nascimento;

  const gerarSenha = () => {
    const s = Math.random().toString(36).slice(-8);
    setSenha(s);
  };

  const salvar = async () => {
    if (!podeSalvar) return;
    setErro("");
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
    if (error) {
      setErro(
        error.message.includes("already registered") || error.status === 422
          ? "Esse e-mail já está cadastrado."
          : error.status === 429
          ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo."
          : "Não foi possível criar a conta. Tente novamente."
      );
      setCarregando(false);
      return;
    }
    const { error: erroPerfil } = await supabase.from("perfis").insert({
      id: data.user.id,
      nome: nome.trim(),
      email: email.trim(),
      data_nascimento: nascimento,
      categoria: profissao.trim() || null,
      eh_admin: false,
    });
    setCarregando(false);
    if (erroPerfil) {
      setErro("Conta criada, mas houve um problema ao salvar os dados do cliente.");
      return;
    }
    onSucesso();
    setSucesso(true);
  };

  if (sucesso) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#DCEFE3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Check size={22} color={BRAND.green} />
          </div>
          <h3 style={{ fontSize: 15.5, fontWeight: 700, color: BRAND.ink, margin: "0 0 10px" }}>Cliente cadastrado!</h3>
          <div style={{ textAlign: "left", background: BRAND.mist, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 12.5 }}>
            <p style={{ margin: "0 0 6px", color: BRAND.slate }}>Repasse esses dados de acesso para {nome.split(" ")[0]}:</p>
            <p style={{ margin: "0 0 4px", color: BRAND.ink }}><strong>E-mail:</strong> {email}</p>
            <p style={{ margin: 0, color: BRAND.ink }}><strong>Senha provisória:</strong> {senha}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: BRAND.orange, color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", width: "100%" }}
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,35,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND.ink, margin: 0 }}>Novo cliente</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={BRAND.slate} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nome completo"><input style={inputStyle} placeholder="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="E-mail"><input style={inputStyle} placeholder="cliente@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Data de nascimento"><input style={inputStyle} type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} /></Field>
          <Field label="Profissão (opcional)"><input style={inputStyle} placeholder="Ex: Médica, Advogado..." value={profissao} onChange={(e) => setProfissao(e.target.value)} /></Field>
          <Field label="Senha provisória">
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Mínimo 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} />
              <button onClick={gerarSenha} style={{ background: BRAND.mist, border: `1px solid ${BRAND.line}`, borderRadius: 10, padding: "0 12px", fontSize: 12, fontWeight: 600, color: BRAND.slate, cursor: "pointer" }}>
                Gerar
              </button>
            </div>
          </Field>

          {erro && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FCEEEE", borderRadius: 10, padding: 10 }}>
              <AlertCircle size={15} color={BRAND.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: BRAND.red, margin: 0, lineHeight: 1.4 }}>{erro}</p>
            </div>
          )}

          <button
            onClick={salvar}
            disabled={!podeSalvar || carregando}
            style={{
              marginTop: 6, background: podeSalvar && !carregando ? BRAND.orange : BRAND.line, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: podeSalvar && !carregando ? "pointer" : "not-allowed",
            }}
          >
            {carregando ? "Cadastrando..." : "Cadastrar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PainelIndicacoesAdmin() {
  const [indicacoesAdmin, setIndicacoesAdmin] = useState(
    CLIENTES_ADMIN.slice(0, 3).map((c, i) => ({
      clienteNome: c.nome,
      indicacoes: i === 0 ? INDICACOES_EXEMPLO : [],
    })).filter((g) => g.indicacoes.length > 0)
  );

  const totalFechadas = INDICACOES_EXEMPLO.filter((i) => i.status === "fechado").length;
  const totalPendentes = INDICACOES_EXEMPLO.filter((i) => i.status !== "fechado").length;
  const clientesElegiveis = indicacoesAdmin.filter(
    (g) => g.indicacoes.filter((i) => i.status === "fechado").length >= META_INDICACOES
  ).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Check} label="Indicações fechadas" value={totalFechadas} accent={BRAND.green} />
        <StatCard icon={Clock} label="Em andamento" value={totalPendentes} />
        <StatCard icon={Gift} label="Clientes prontos p/ recompensa" value={clientesElegiveis} accent={BRAND.orange} />
      </div>

      <Card>
        <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: "0 0 14px" }}>
          Indicações por cliente
        </h3>
        {indicacoesAdmin.length === 0 ? (
          <p style={{ fontSize: 13, color: BRAND.slate, textAlign: "center", margin: 0, padding: "10px 0" }}>
            Nenhuma indicação recebida ainda.
          </p>
        ) : (
          indicacoesAdmin.map((grupo) => {
            const fechadas = grupo.indicacoes.filter((i) => i.status === "fechado").length;
            return (
              <div key={grupo.clienteNome} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${BRAND.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: BRAND.ink }}>{grupo.clienteNome}</span>
                  <span style={{ fontSize: 12, color: fechadas >= META_INDICACOES ? BRAND.green : BRAND.slate, fontWeight: 600 }}>
                    {fechadas}/{META_INDICACOES} fechadas {fechadas >= META_INDICACOES && "— recompensa liberada"}
                  </span>
                </div>
                {grupo.indicacoes.map((i) => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 12.5 }}>
                    <div>
                      <span style={{ color: BRAND.ink, fontWeight: 600 }}>{i.nome}</span>
                      <span style={{ color: BRAND.slate }}> · {i.contato}</span>
                    </div>
                    <select
                      value={i.status}
                      onChange={(e) => {
                        const novoStatus = e.target.value;
                        setIndicacoesAdmin((prev) =>
                          prev.map((g) =>
                            g.clienteNome === grupo.clienteNome
                              ? { ...g, indicacoes: g.indicacoes.map((x) => (x.id === i.id ? { ...x, status: novoStatus } : x)) }
                              : g
                          )
                        );
                      }}
                      style={{ fontSize: 11.5, border: `1px solid ${BRAND.line}`, borderRadius: 6, padding: "4px 6px", color: BRAND.slate }}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="contatado">Contatado</option>
                      <option value="fechado">Fechado</option>
                    </select>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

function Badge({ label, cor }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: cor, background: `${cor}18`, padding: "3px 8px", borderRadius: 20 }}>
      {label}
    </span>
  );
}

function PerfilClienteAdmin({ cliente, onVoltar }) {
  return (
    <div style={{ minHeight: "100vh", background: BRAND.mist }}>
      <div style={{ background: BRAND.white, borderBottom: `1px solid ${BRAND.line}`, padding: "16px 32px" }}>
        <button onClick={onVoltar} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: BRAND.slate, fontSize: 13, cursor: "pointer" }}>
          ← Voltar para clientes
        </button>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: BRAND.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: BRAND.orangeDark }}>
            {cliente.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: BRAND.ink, margin: 0 }}>{cliente.nome}</h1>
            <p style={{ fontSize: 13, color: BRAND.slate, margin: "2px 0 0" }}>{cliente.categoria} · {cliente.idade} anos</p>
          </div>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 600, color: BRAND.ink, margin: "0 0 14px" }}>
            Oportunidades identificadas
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cliente.semSeguro && (
              <OportunidadeItem
                titulo="Sem seguro de vida"
                texto="Cliente não possui proteção patrimonial cadastrada. Bom momento para uma conversa sobre seguro de vida."
              />
            )}
            {cliente.semPrevidencia && (
              <OportunidadeItem
                titulo="Sem previdência privada"
                texto="Cliente ainda não tem previdência privada cadastrada. Vale apresentar os benefícios de uma previdência estruturada."
              />
            )}
            {!cliente.semSeguro && !cliente.semPrevidencia && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: BRAND.green, fontSize: 13 }}>
                <Check size={16} /> Cliente já possui os dois produtos — foco em relacionamento e revisão anual.
              </div>
            )}
          </div>
        </Card>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 14, background: BRAND.mist, borderRadius: 12 }}>
          <AlertCircle size={18} color={BRAND.slate} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: BRAND.slate, margin: 0, lineHeight: 1.5 }}>
            Dados financeiros (saldo, investimentos, projeção de aposentadoria) ainda não estão disponíveis aqui — essa visão será adicionada quando os lançamentos do cliente forem conectados ao painel.
          </p>
        </div>
      </div>
    </div>
  );
}

function OportunidadeItem({ titulo, texto }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: 12, background: BRAND.orangeLight, borderRadius: 10 }}>
      <AlertCircle size={17} color={BRAND.orangeDark} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.orangeDark }}>{titulo}</div>
        <div style={{ fontSize: 12, color: BRAND.slate, marginTop: 2, lineHeight: 1.5 }}>{texto}</div>
      </div>
    </div>
  );
}

/* ============================================================
   APP RAIZ
   ============================================================ */
export default function App() {
  const [sessao, setSessao] = useState(null); // null | { tipo: 'cliente'|'admin', cliente? }
  const [modoRecuperacaoSenha, setModoRecuperacaoSenha] = useState(false);
  const [aba, setAba] = useState("dashboard");
  const [transacoes, setTransacoes] = useState([]);
  const [metas, setMetas] = useState([]);
  const [indicacoes, setIndicacoes] = useState(INDICACOES_EXEMPLO);
  const [investimentos, setInvestimentos] = useState([]);
  const [tetoMensal, setTetoMensal] = useState(4000);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);

  const fazerLogout = async () => {
    await supabase.auth.signOut();
    setSessao(null);
  };

  // Detecta quando o usuário chega pelo link de "esqueci minha senha".
  // O Supabase processa o token da URL e dispara o evento PASSWORD_RECOVERY.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setModoRecuperacaoSenha(true);
      }
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  // ---------- TRANSAÇÕES (lançamentos + custo fixo) ----------
  const carregarTransacoes = async (clienteId) => {
    const { data, error } = await supabase
      .from("transacoes")
      .select("*")
      .eq("usuario_id", clienteId)
      .order("data", { ascending: false });
    if (!error && data) {
      setTransacoes(
        data.map((t) => ({
          id: t.id,
          tipo: t.tipo,
          desc: t.descricao,
          categoria: t.categoria,
          valor: Number(t.valor),
          data: t.data,
          recorrente: t.recorrente,
        }))
      );
    }
  };

  const adicionarTransacao = async (t) => {
    const clienteId = sessao.cliente.id;
    const { data, error } = await supabase
      .from("transacoes")
      .insert({
        usuario_id: clienteId,
        tipo: t.tipo,
        descricao: t.desc,
        categoria: t.categoria,
        valor: t.valor,
        data: t.data,
        recorrente: t.recorrente || false,
      })
      .select()
      .single();
    if (!error && data) {
      setTransacoes((prev) => [
        { id: data.id, tipo: data.tipo, desc: data.descricao, categoria: data.categoria, valor: Number(data.valor), data: data.data, recorrente: data.recorrente },
        ...prev,
      ]);
    }
  };

  const editarTransacao = async (t) => {
    const { data, error } = await supabase
      .from("transacoes")
      .update({
        tipo: t.tipo,
        descricao: t.desc,
        categoria: t.categoria,
        valor: t.valor,
        data: t.data,
        recorrente: t.recorrente || false,
      })
      .eq("id", t.id)
      .select()
      .single();
    if (!error && data) {
      setTransacoes((prev) =>
        prev.map((tr) =>
          tr.id === t.id
            ? { id: data.id, tipo: data.tipo, desc: data.descricao, categoria: data.categoria, valor: Number(data.valor), data: data.data, recorrente: data.recorrente }
            : tr
        )
      );
    }
  };

  const excluirTransacao = async (id) => {
    const { error } = await supabase.from("transacoes").delete().eq("id", id);
    if (!error) {
      setTransacoes((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // ---------- METAS ----------
  const carregarMetas = async (clienteId) => {
    const { data, error } = await supabase
      .from("metas")
      .select("*")
      .eq("usuario_id", clienteId)
      .order("criado_em", { ascending: true });
    if (!error && data) {
      setMetas(
        data.map((m) => ({
          id: m.id,
          nome: m.nome,
          alvo: Number(m.valor_alvo),
          atual: Number(m.valor_atual),
          cor: m.cor || CORES_META[0],
          historico: m.historico || [],
        }))
      );
    }
  };

  const adicionarMeta = async (m) => {
    const clienteId = sessao.cliente.id;
    const { data, error } = await supabase
      .from("metas")
      .insert({
        usuario_id: clienteId,
        nome: m.nome,
        valor_alvo: m.alvo,
        valor_atual: m.atual || 0,
        cor: m.cor,
        historico: m.historico || [],
      })
      .select()
      .single();
    if (!error && data) {
      setMetas((prev) => [
        ...prev,
        { id: data.id, nome: data.nome, alvo: Number(data.valor_alvo), atual: Number(data.valor_atual), cor: data.cor, historico: data.historico || [] },
      ]);
    }
  };

  const adicionarValorMeta = async (id, valorAdicionado) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const meta = metas.find((m) => m.id === id);
    if (!meta) return;
    const novoAtual = meta.atual + valorAdicionado;
    const novoHistorico = [...(meta.historico || []), { data: hoje, valor: valorAdicionado }];
    const { error } = await supabase
      .from("metas")
      .update({ valor_atual: novoAtual, historico: novoHistorico })
      .eq("id", id);
    if (!error) {
      setMetas((prev) => prev.map((m) => (m.id === id ? { ...m, atual: novoAtual, historico: novoHistorico } : m)));
    }
  };

  const excluirMeta = async (id) => {
    const { error } = await supabase.from("metas").delete().eq("id", id);
    if (!error) {
      setMetas((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // ---------- INVESTIMENTOS ----------
  const carregarInvestimentos = async (clienteId) => {
    const { data, error } = await supabase
      .from("investimentos")
      .select("*")
      .eq("usuario_id", clienteId)
      .order("criado_em", { ascending: true });
    if (!error && data) {
      setInvestimentos(
        data.map((inv) => ({
          id: inv.id,
          nome: inv.nome,
          tipo: inv.tipo,
          valor: Number(inv.valor),
          rentab: inv.rentabilidade_info || "—",
          recorrente: inv.recorrente,
          valorMensal: Number(inv.valor_mensal || 0),
          historico: inv.historico || [],
        }))
      );
    }
  };

  const adicionarInvestimento = async (inv) => {
    const clienteId = sessao.cliente.id;
    const { data, error } = await supabase
      .from("investimentos")
      .insert({
        usuario_id: clienteId,
        nome: inv.nome,
        tipo: inv.tipo,
        valor: inv.valor,
        rentabilidade_info: inv.rentab,
        recorrente: inv.recorrente || false,
        valor_mensal: inv.valorMensal || 0,
        historico: inv.historico || [],
      })
      .select()
      .single();
    if (!error && data) {
      setInvestimentos((prev) => [
        ...prev,
        { id: data.id, nome: data.nome, tipo: data.tipo, valor: Number(data.valor), rentab: data.rentabilidade_info, recorrente: data.recorrente, valorMensal: Number(data.valor_mensal || 0), historico: data.historico || [] },
      ]);
    }
  };

  const confirmarAporte = async (investimentoId) => {
    const mes = mesAtualISO();
    const inv = investimentos.find((i) => i.id === investimentoId);
    if (!inv || inv.historico.some((h) => h.mes === mes)) return;
    const novoValor = inv.valor + inv.valorMensal;
    const novoHistorico = [...inv.historico, { mes, valor: inv.valorMensal, tipo: "confirmado" }];
    const { error } = await supabase
      .from("investimentos")
      .update({ valor: novoValor, historico: novoHistorico })
      .eq("id", investimentoId);
    if (!error) {
      setInvestimentos((prev) =>
        prev.map((i) => (i.id === investimentoId ? { ...i, valor: novoValor, historico: novoHistorico } : i))
      );
    }
  };

  const adicionarIndicacao = (i) => {
    setIndicacoes((prev) => [...prev, { ...i, id: Date.now() }]);
  };

  // Carrega tudo do banco quando o cliente loga
  useEffect(() => {
    if (sessao && sessao.tipo === "cliente" && sessao.cliente?.id) {
      setCarregandoDados(true);
      Promise.all([
        carregarTransacoes(sessao.cliente.id),
        carregarMetas(sessao.cliente.id),
        carregarInvestimentos(sessao.cliente.id),
      ]).finally(() => setCarregandoDados(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao]);

  // Ao abrir o app, relança automaticamente qualquer transação RECORRENTE
  // (entrada fixa como salário, ou custo fixo) que ainda não tenha um
  // lançamento equivalente no mês atual — evita o cliente ter que
  // relançar salário/aluguel/assinaturas todo mês manualmente.
  useEffect(() => {
    if (carregandoDados) return;
    const mesAtual = mesAtualISO();
    const clienteId = sessao?.cliente?.id;
    if (!clienteId) return;

    // Para cada descrição+categoria recorrente, pega o lançamento mais recente
    // como "modelo" e verifica se já existe um lançamento dele no mês atual.
    const recorrentesUnicas = new Map();
    [...transacoes]
      .filter((t) => t.recorrente)
      .sort((a, b) => (a.data > b.data ? 1 : -1)) // mais antigo primeiro, para o mais recente sobrescrever
      .forEach((t) => {
        const chave = `${t.tipo}|${t.desc}|${t.categoria}`;
        recorrentesUnicas.set(chave, t);
      });

    recorrentesUnicas.forEach(async (modelo) => {
      const jaLancadoEsteMes = transacoes.some(
        (t) => t.recorrente && t.tipo === modelo.tipo && t.desc === modelo.desc && t.categoria === modelo.categoria && t.data.slice(0, 7) === mesAtual
      );
      if (jaLancadoEsteMes) return;
      // só relança se o modelo for de um mês ANTERIOR ao atual (nunca duplica no mesmo mês)
      if (modelo.data.slice(0, 7) >= mesAtual) return;

      const novaData = `${mesAtual}-${modelo.data.slice(8, 10)}`;
      const { data, error } = await supabase
        .from("transacoes")
        .insert({
          usuario_id: clienteId,
          tipo: modelo.tipo,
          descricao: modelo.desc,
          categoria: modelo.categoria,
          valor: modelo.valor,
          data: novaData,
          recorrente: true,
        })
        .select()
        .single();
      if (!error && data) {
        setTransacoes((prev) => [
          { id: data.id, tipo: data.tipo, desc: data.descricao, categoria: data.categoria, valor: Number(data.valor), data: data.data, recorrente: data.recorrente },
          ...prev,
        ]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregandoDados]);

  // Ao abrir o app, lança automaticamente qualquer aporte fixo de meses ANTERIORES
  // que o cliente esqueceu de confirmar (nunca lança o mês atual sozinho).
  useEffect(() => {
    if (carregandoDados || investimentos.length === 0) return;
    const mesAtual = mesAtualISO();
    investimentos.forEach(async (inv) => {
      if (!inv.recorrente) return;
      const ultimoMes = inv.historico.length > 0 ? inv.historico[inv.historico.length - 1].mes : null;
      if (ultimoMes === mesAtual || !ultimoMes) return;
      const [ano, mesNum] = mesAtual.split("-").map(Number);
      const mesAnterior = mesNum === 1 ? `${ano - 1}-12` : `${ano}-${String(mesNum - 1).padStart(2, "0")}`;
      if (ultimoMes < mesAnterior) {
        const novoValor = inv.valor + inv.valorMensal;
        const novoHistorico = [...inv.historico, { mes: mesAnterior, valor: inv.valorMensal, tipo: "automatico" }];
        const { error } = await supabase
          .from("investimentos")
          .update({ valor: novoValor, historico: novoHistorico })
          .eq("id", inv.id);
        if (!error) {
          setInvestimentos((prev) =>
            prev.map((i) => (i.id === inv.id ? { ...i, valor: novoValor, historico: novoHistorico } : i))
          );
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregandoDados]);

  const fontStack = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

  if (modoRecuperacaoSenha) {
    return (
      <div style={{ fontFamily: fontStack }}>
        <TelaNovaSenha
          onConcluido={async () => {
            setModoRecuperacaoSenha(false);
            await supabase.auth.signOut();
            window.location.hash = "";
          }}
        />
      </div>
    );
  }

  if (!sessao) {
    return (
      <div style={{ fontFamily: fontStack }}>
        <TelaLogin
          onLogin={(cliente, ehContaNova) => {
            setSessao({ tipo: "cliente", cliente });
            if (ehContaNova) setMostrarOnboarding(true);
          }}
          onAdminLogin={() => setSessao({ tipo: "admin" })}
        />
      </div>
    );
  }

  if (sessao.tipo === "admin") {
    return (
      <div style={{ fontFamily: fontStack }}>
        <PainelAdmin onLogout={fazerLogout} />
      </div>
    );
  }

  if (carregandoDados) {
    return (
      <div style={{ fontFamily: fontStack, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.mist }}>
        <p style={{ color: BRAND.slate, fontSize: 14 }}>Carregando seus dados...</p>
      </div>
    );
  }

  if (mostrarOnboarding) {
    return (
      <div style={{ fontFamily: fontStack }}>
        <TelaOnboarding
          cliente={sessao.cliente}
          onConcluir={async () => {
            setMostrarOnboarding(false);
            setCarregandoDados(true);
            await carregarTransacoes(sessao.cliente.id);
            setCarregandoDados(false);
          }}
        />
      </div>
    );
  }

  const telas = {
    dashboard: <TelaDashboard cliente={sessao.cliente} transacoes={transacoes} indicacoes={indicacoes} onIrParaIndicacoes={() => setAba("indicacoes")} tetoMensal={tetoMensal} onIrParaResumos={() => setAba("resumos")} />,
    lancamentos: <TelaLancamentos transacoes={transacoes} onAdicionar={adicionarTransacao} onEditar={editarTransacao} onExcluir={excluirTransacao} />,
    recorrentes: <TelaRecorrentes transacoes={transacoes} />,
    investimentos: <TelaInvestimentos investimentos={investimentos} onAdicionar={adicionarInvestimento} onConfirmarAporte={confirmarAporte} />,
    metas: <TelaMetas metas={metas} onAdicionar={adicionarMeta} onAdicionarValor={adicionarValorMeta} onExcluir={excluirMeta} />,
    aposentadoria: <TelaAposentadoria cliente={sessao.cliente} />,
    indicacoes: <TelaIndicacoes indicacoes={indicacoes} onAdicionar={adicionarIndicacao} />,
    resumos: <TelaResumos cliente={sessao.cliente} transacoes={transacoes} tetoMensal={tetoMensal} onSalvarTeto={setTetoMensal} />,
  };

  return (
    <div style={{ fontFamily: fontStack }}>
      <Shell aba={aba} setAba={setAba} onLogout={fazerLogout} nome={sessao.cliente.nome} onLancamentoRapido={adicionarTransacao}>
        {telas[aba]}
      </Shell>
      <style>{`
        @media (max-width: 860px) {
          .grid-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}