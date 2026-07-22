import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Edit3,
  Save,
  RefreshCw,
  Info,
  ClipboardCheck,
  ArrowRight,
  Sparkle
} from "lucide-react";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { RevisedHandover, TEMPLATES } from "./types";

// Auxiliar para formatar negritos simples de markdown em HTML seguro
function formatMarkdownToHtml(text: string) {
  if (!text) return "";
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

export default function App() {
  // State for Form Inputs
  const [rawText, setRawText] = useState("");
  const [clientName, setClientName] = useState("");
  
  // State for UI controls
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Results State
  const [result, setResult] = useState<RevisedHandover | null>(null);
  const [isEditing, setIsEditing] = useState<keyof Omit<RevisedHandover, "notasPendentes"> | null>(null);
  const [editedFields, setEditedFields] = useState<Omit<RevisedHandover, "notasPendentes">>({
    nomeCliente: "",
    humorCliente: "",
    processoAtivacao: "",
    prestacaoContas: "",
    nivelAutonomia: "",
    detalhesAdicionais: "",
    resumoGeral: ""
  });
  
  // Copy States
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Dynamic loading texts
  const loadingSteps = [
    "Analisando texto bruto de passagem...",
    "Identificando nome do cliente e dores principais...",
    "Revisando tom de voz, gramática e concordância...",
    "Estruturando seções obrigatórias: Ativação para CS...",
    "Avaliando lacunas e informações pendentes...",
    "Finalizando formatação do relatório..."
  ];

  // Handle template selection
  const handleApplyTemplate = (index: number) => {
    const t = TEMPLATES[index];
    setRawText(t.text);
    setResult(null);
    setError(null);
  };

  // Simulated progressive loading steps
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Main Submit Handler com Chamada Direta à API do Gemini
  const handleProcessText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setError("Por favor, digite ou cole um texto de passagem.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Captura a chave de API injetada pelo Vite durante o build
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY || "";
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // Definindo a estrutura de resposta em JSON
      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          nomeCliente: { type: Type.STRING, description: "Nome da empresa ou cliente identificado no texto" },
          humorCliente: { type: Type.STRING, description: "Descrição do humor, satisfação e expectativas do cliente" },
          processoAtivacao: { type: Type.STRING, description: "Detalhes do Onboarding, treinamento e implementação executada" },
          prestacaoContas: { type: Type.STRING, description: "Métricas apresentadas, ROI demonstrado ou entregáveis acordados" },
          nivelAutonomia: { type: Type.STRING, description: "Nível de independência da equipe do cliente no uso da ferramenta" },
          detalhesAdicionais: { type: Type.STRING, description: "Informações extras, histórico relevante ou contatos importantes" },
          resumoGeral: { type: Type.STRING, description: "Resumo executivo conciso em 2-3 frases sobre o status da passagem" },
          notasPendentes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Lista de pontos omitidos ou lacunas de informação que o CS precisa ter atenção"
          }
        },
        required: [
          "nomeCliente",
          "humorCliente",
          "processoAtivacao",
          "prestacaoContas",
          "nivelAutonomia",
          "detalhesAdicionais",
          "resumoGeral",
          "notasPendentes"
        ]
      };

      const systemInstruction = `Você é o "PB Bot Expert", um especialista em CS (Customer Success) e Onboarding de Clientes. 
Sua tarefa é ler anotações brutas, informais e desestruturadas sobre a passagem de bastão (PB) de um cliente (do fluxo de Ativação para Adoção) e reescrevê-las de forma altamente profissional, gramaticalmente perfeita e rica em detalhes operacionais para inclusão no CRM/Pipedrive.`;

      const prompt = `Analise as seguintes anotações de passagem de bastão e estruture-as na resposta JSON conforme o esquema:

Texto Bruto:
${rawText}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema
        }
      });

      if (!response.text) {
        throw new Error("Não foi possível obter resposta da Inteligência Artificial.");
      }

      const data: RevisedHandover = JSON.parse(response.text);

      setResult(data);
      setClientName(data.nomeCliente || "Cliente");
      
      // Sync edit fields state
      setEditedFields({
        nomeCliente: data.nomeCliente || "Cliente",
        humorCliente: data.humorCliente,
        processoAtivacao: data.processoAtivacao,
        prestacaoContas: data.prestacaoContas,
        nivelAutonomia: data.nivelAutonomia,
        detalhesAdicionais: data.detalhesAdicionais,
        resumoGeral: data.resumoGeral
      });

    } catch (err: any) {
      console.error("Erro na integração Gemini:", err);
      setError(err.message || "Erro inesperado ao conectar com a Inteligência Artificial.");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy individual section content
  const copyToClipboard = (sectionKey: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Compile full text report formatted for Pipedrive notes
  const compileFullReport = (
    name: string,
    data: Omit<RevisedHandover, "notasPendentes"> & { notasPendentes?: string[] }
  ) => {
    const currentDate = new Date().toLocaleDateString("pt-BR");
    let report = `RELATORIO DE PASSAGEM DE BASTAO: ${name ? name.toUpperCase() : "CLIENTE"}\n`;
    report += `Fluxo: Ativacao -> Adocao\n`;
    report += `Data da Passagem: ${currentDate}\n`;
    report += `-----------------------------------------\n\n`;
    
    report += `RESUMO GERAL:\n${data.resumoGeral}\n\n`;
    report += `1. HUMOR DO CLIENTE:\n${data.humorCliente}\n\n`;
    report += `2. PROCESSO DE ATIVACAO:\n${data.processoAtivacao}\n\n`;
    report += `3. PRESTACAO DE CONTAS:\n${data.prestacaoContas}\n\n`;
    report += `4. NIVEL DE AUTONOMIA E CONHECIMENTO:\n${data.nivelAutonomia}\n\n`;
    report += `5. DETALHES ADICIONAIS:\n${data.detalhesAdicionais}\n\n`;

    if (data.notasPendentes && data.notasPendentes.length > 0) {
      report += `LACUNAS DE INFORMACAO / PONTOS DE ATENCAO:\n`;
      data.notasPendentes.forEach((nota) => {
        report += `- ${nota}\n`;
      });
      report += `\n`;
    }

    report += `-----------------------------------------\n`;
    report += `Gerado pelo PB Bot Expert`;
    return report;
  };

  // Copy full compiled report
  const handleCopyAll = () => {
    if (!result) return;
    
    const currentData = {
      ...result,
      ...editedFields
    };

    const fullReport = compileFullReport(editedFields.nomeCliente || clientName, currentData);
    navigator.clipboard.writeText(fullReport);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Download Report as Text File
  const handleDownloadReport = () => {
    if (!result) return;
    
    const currentData = {
      ...result,
      ...editedFields
    };

    const fullReport = compileFullReport(editedFields.nomeCliente || clientName, currentData);
    const blob = new Blob([fullReport], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (editedFields.nomeCliente || clientName || "Cliente").trim().replace(/\s+/g, "_");
    link.download = `PB_${cleanName}_Ativacao_Adocao.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Save changes to the edited field
  const handleSaveFieldEdit = (field: keyof Omit<RevisedHandover, "notasPendentes">) => {
    if (!result) return;
    
    const updatedRevised = {
      ...result,
      [field]: editedFields[field]
    };
    
    setResult(updatedRevised);
    setIsEditing(null);
  };

  return (
    <div id="pb-bot-expert-root" className="min-h-screen mesh-gradient text-slate-100 font-sans antialiased flex flex-col">
      {/* Header */}
      <header id="app-header" className="glass-panel sticky top-0 z-40 shadow-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 pulse-animation" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                PB Bot Expert
              </h1>
              <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-semibold">
                Ativação ➔ Adoção
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300">
              <span className="font-semibold text-indigo-300">Fluxo:</span>
              <span>Ativação</span>
              <ArrowRight className="w-3 h-3 text-indigo-400" />
              <span>Adoção</span>
            </div>
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
              Pronto para transformar
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div id="main-container" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Banner */}
        <div id="intro-banner" className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden bg-gradient-to-r from-indigo-950/20 to-slate-900/20">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Sparkle className="w-24 h-24" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1.5">Boas-vindas ao PB Bot Expert</h2>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Escreva ou cole as observações brutas e informais da passagem de bastão de clientes no campo abaixo.
            Nossa Inteligência Artificial identificará o nome da empresa e formatará todas as informações na estrutura profissional e obrigatória do fluxo de <strong className="text-indigo-300">Ativação para Adoção</strong>.
          </p>
        </div>

        {/* Center Grid Workspace */}
        <div id="workspace-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Input Panel */}
          <section id="input-section" className="lg:col-span-5 flex flex-col glass-panel rounded-2xl p-5 shadow-2xl h-fit border border-white/10">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <h2 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-indigo-400" />
                Texto Cru
              </h2>
              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold uppercase tracking-wider">
                Entrada
              </span>
            </div>

            <form onSubmit={handleProcessText} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="raw-text-input" className="block text-xs font-semibold text-indigo-300">
                    Insira as anotações informais do cliente:
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {rawText.length} caracteres
                  </span>
                </div>
                <textarea
                  id="raw-text-input"
                  rows={10}
                  required
                  placeholder="Exemplo: Reunião foi ótima. O cliente Açúcar Alegre tá animado. Fizemos onboarding no prazo. Eles aprenderam super rápido. Mostramos o ROI e gostaram..."
                  className="w-full px-4 py-3.5 text-sm rounded-xl glass-input bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-sans resize-y custom-scrollbar leading-relaxed"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
              </div>

              <div id="quick-templates-wrapper">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-300">
                    Carregar exemplos de testes rápidos:
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      id={`template-btn-${i}`}
                      type="button"
                      onClick={() => handleApplyTemplate(i)}
                      className="text-left p-3 rounded-xl border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/10 bg-white/5 transition-all text-xs flex flex-col gap-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-slate-200">{tpl.name}</span>
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-medium px-1.5 py-0.2 rounded">
                          Ativação ➔ Adoção
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 line-clamp-1 italic">"{tpl.text}"</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div id="error-alert" className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <p className="font-semibold">Erro ao processar</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <button
                id="submit-process-btn"
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 px-4 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  isLoading
                    ? "bg-slate-700/50 cursor-not-allowed border border-white/5 text-slate-400"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/15 hover:shadow-indigo-600/30 active:scale-98"
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                    Transformando em PB de Elite...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    Gerar PB Estruturada
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Results Panel */}
          <section id="results-section" className="lg:col-span-7 flex flex-col glass-panel rounded-2xl p-5 shadow-2xl min-h-[450px] border border-white/10">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <h2 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <ClipboardCheck className="w-4 h-4 text-indigo-400" />
                PB Estruturada
              </h2>
              {result && (
                <div className="flex items-center gap-2">
                  <button
                    id="copy-all-btn"
                    onClick={handleCopyAll}
                    className="p-1.5 px-3 text-xs text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/30 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Copiar relatório completo formatado"
                  >
                    {copiedAll ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Tudo
                      </>
                    )}
                  </button>
                  <button
                    id="download-report-btn"
                    onClick={handleDownloadReport}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg border border-white/10 transition-all cursor-pointer"
                    title="Baixar Relatório em .txt"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {!result && !isLoading && (
              <div id="results-empty-state" className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="bg-indigo-500/10 p-4 rounded-full mb-3 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-8 h-8 pulse-animation" />
                </div>
                <h3 className="font-bold text-slate-200 text-sm mb-1">
                  Pronto para estruturar
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                  Insira o rascunho de anotações brutas do cliente à esquerda e clique em gerar para transformar em uma PB qualificada.
                </p>
                <div className="w-full max-w-xs text-left bg-white/5 rounded-xl p-4 border border-white/10 space-y-2 text-[11px] text-slate-300">
                  <p className="font-bold text-indigo-300 text-xs text-center border-b border-white/5 pb-1.5 mb-2 uppercase tracking-wider">
                    Campos Obrigatórios Estruturados:
                  </p>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-indigo-400 font-bold">•</span> <span className="font-medium text-slate-200">Identificação Automática da Empresa</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-indigo-400 font-bold">•</span> <span className="font-medium text-slate-200">Humor e Engajamento do Cliente</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-indigo-400 font-bold">•</span> <span className="font-medium text-slate-200">Processo de Ativação / Onboarding</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-indigo-400 font-bold">•</span> <span className="font-medium text-slate-200">Prestação de Contas (ROI e Métricas)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-indigo-400 font-bold">•</span> <span className="font-medium text-slate-200">Nível de Autonomia da Operação</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-indigo-400 font-bold">•</span> <span className="font-medium text-slate-200">Detalhes Adicionais e Pontos de Atenção</span>
                  </div>
                </div>
              </div>
            )}

            {isLoading && (
              <div id="results-loading-state" className="flex-1 flex flex-col items-center justify-center py-12 px-4">
                <div className="relative mb-6">
                  <div className="w-14 h-14 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-5 h-5 pulse-animation" />
                  </div>
                </div>
                <h3 className="font-bold text-slate-100 text-sm mb-1.5 text-center">
                  PB Bot Expert processando...
                </h3>
                <p className="text-xs text-indigo-400 font-semibold mb-4 animate-pulse">
                  Passo {loadingStep + 1} de {loadingSteps.length}
                </p>
                <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                  <p className="text-xs text-slate-300 font-medium italic">
                    "{loadingSteps[loadingStep]}"
                  </p>
                </div>
              </div>
            )}

            {result && !isLoading && (
              <div id="results-output" className="space-y-5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div className="bg-indigo-950/40 text-white p-4.5 rounded-2xl border border-white/10 relative overflow-hidden shadow-lg">
                  <div className="absolute right-2 bottom-2 opacity-5">
                    <Sparkles className="w-32 h-32" />
                  </div>
                  <div className="relative z-10 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] bg-indigo-500/25 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-wider">
                        Ativação ➔ Adoção
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        reestruturado profissionalmente
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      {isEditing === "nomeCliente" ? (
                        <div className="flex items-center gap-2 w-full mt-1">
                          <input
                            type="text"
                            className="text-sm font-bold bg-[#13112b] border border-white/10 rounded px-2 py-1 text-slate-100 focus:outline-none w-full"
                            value={editedFields.nomeCliente}
                            onChange={(e) => setEditedFields({ ...editedFields, nomeCliente: e.target.value })}
                          />
                          <button
                            onClick={() => handleSaveFieldEdit("nomeCliente")}
                            className="bg-indigo-600 hover:bg-indigo-500 p-1.5 rounded text-white cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-white">
                            {editedFields.nomeCliente || clientName}
                          </h3>
                          <button
                            onClick={() => setIsEditing(isEditing === "nomeCliente" ? null : "nomeCliente")}
                            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Editar nome da empresa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resumo Geral</span>
                        <button
                          onClick={() => setIsEditing(isEditing === "resumoGeral" ? null : "resumoGeral")}
                          className="p-0.5 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Editar Resumo Geral"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                      {isEditing === "resumoGeral" ? (
                        <div className="space-y-2 mt-1">
                          <textarea
                            rows={3}
                            className="w-full p-2 glass-input rounded-lg focus:outline-none text-xs text-slate-200"
                            value={editedFields.resumoGeral}
                            onChange={(e) => setEditedFields({ ...editedFields, resumoGeral: e.target.value })}
                          />
                          <button
                            onClick={() => handleSaveFieldEdit("resumoGeral")}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Salvar Campo
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                          "{editedFields.resumoGeral}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gap Warning */}
                {result.notasPendentes && result.notasPendentes.length > 0 && (
                  <div id="gap-warnings" className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200 space-y-1.5 shadow-md">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Lacunas de Informação Relevantes</span>
                    </div>
                    <p className="text-slate-300 leading-normal text-[11px]">
                      O texto fornecido omitiu ou detalhou pouco alguns dados cruciais para a passagem perfeita. Considere preencher ou investigar os pontos abaixo:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] font-medium text-amber-200/90">
                      {result.notasPendentes.map((nota, idx) => (
                        <li key={idx}>
                          {nota}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mandatory Sections */}
                <div id="mandatory-sections" className="space-y-4">
                  
                  {/* Section 1 */}
                  <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden hover:border-white/20 transition-all">
                    <div className="bg-white/5 px-4 py-2.5 border-b border-white/15 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                        <span>1. Humor do Cliente</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard("humor", editedFields.humorCliente)}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copiar esta seção"
                        >
                          {copiedSection === "humor" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setIsEditing(isEditing === "humorCliente" ? null : "humorCliente")}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Editar seção"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 text-xs text-slate-300 leading-relaxed font-sans">
                      {isEditing === "humorCliente" ? (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            className="w-full p-2.5 glass-input rounded-lg focus:outline-none text-xs text-slate-200"
                            value={editedFields.humorCliente}
                            onChange={(e) => setEditedFields({ ...editedFields, humorCliente: e.target.value })}
                          />
                          <button
                            onClick={() => handleSaveFieldEdit("humorCliente")}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Salvar Campo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(editedFields.humorCliente) }}></div>
                      )}
                    </div>
                  </div>

                  {/* Section 2 */}
                  <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden hover:border-white/20 transition-all">
                    <div className="bg-white/5 px-4 py-2.5 border-b border-white/15 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                        <span>2. Processo de Ativação</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard("ativacao", editedFields.processoAtivacao)}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copiar esta seção"
                        >
                          {copiedSection === "ativacao" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setIsEditing(isEditing === "processoAtivacao" ? null : "processoAtivacao")}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Editar seção"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 text-xs text-slate-300 leading-relaxed font-sans">
                      {isEditing === "processoAtivacao" ? (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            className="w-full p-2.5 glass-input rounded-lg focus:outline-none text-xs text-slate-200"
                            value={editedFields.processoAtivacao}
                            onChange={(e) => setEditedFields({ ...editedFields, processoAtivacao: e.target.value })}
                          />
                          <button
                            onClick={() => handleSaveFieldEdit("processoAtivacao")}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Salvar Campo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(editedFields.processoAtivacao) }}></div>
                      )}
                    </div>
                  </div>

                  {/* Section 3 */}
                  <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden hover:border-white/20 transition-all">
                    <div className="bg-white/5 px-4 py-2.5 border-b border-white/15 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                        <span>3. Prestação de Contas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard("contas", editedFields.prestacaoContas)}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copiar esta seção"
                        >
                          {copiedSection === "contas" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setIsEditing(isEditing === "prestacaoContas" ? null : "prestacaoContas")}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Editar seção"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 text-xs text-slate-300 leading-relaxed font-sans">
                      {isEditing === "prestacaoContas" ? (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            className="w-full p-2.5 glass-input rounded-lg focus:outline-none text-xs text-slate-200"
                            value={editedFields.prestacaoContas}
                            onChange={(e) => setEditedFields({ ...editedFields, prestacaoContas: e.target.value })}
                          />
                          <button
                            onClick={() => handleSaveFieldEdit("prestacaoContas")}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Salvar Campo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(editedFields.prestacaoContas) }}></div>
                      )}
                    </div>
                  </div>

                  {/* Section 4 */}
                  <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden hover:border-white/20 transition-all">
                    <div className="bg-white/5 px-4 py-2.5 border-b border-white/15 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                        <span>4. Nível de Autonomia</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard("autonomia", editedFields.nivelAutonomia)}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copiar esta seção"
                        >
                          {copiedSection === "autonomia" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setIsEditing(isEditing === "nivelAutonomia" ? null : "nivelAutonomia")}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Editar seção"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 text-xs text-slate-300 leading-relaxed font-sans">
                      {isEditing === "nivelAutonomia" ? (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            className="w-full p-2.5 glass-input rounded-lg focus:outline-none text-xs text-slate-200"
                            value={editedFields.nivelAutonomia}
                            onChange={(e) => setEditedFields({ ...editedFields, nivelAutonomia: e.target.value })}
                          />
                          <button
                            onClick={() => handleSaveFieldEdit("nivelAutonomia")}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Salvar Campo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(editedFields.nivelAutonomia) }}></div>
                      )}
                    </div>
                  </div>

                  {/* Section 5 */}
                  <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden hover:border-white/20 transition-all">
                    <div className="bg-white/5 px-4 py-2.5 border-b border-white/15 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                        <span>5. Detalhes Adicionais</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard("detalhes", editedFields.detalhesAdicionais)}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copiar esta seção"
                        >
                          {copiedSection === "detalhes" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setIsEditing(isEditing === "detalhesAdicionais" ? null : "detalhesAdicionais")}
                          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Editar seção"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 text-xs text-slate-300 leading-relaxed font-sans">
                      {isEditing === "detalhesAdicionais" ? (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            className="w-full p-2.5 glass-input rounded-lg focus:outline-none text-xs text-slate-200"
                            value={editedFields.detalhesAdicionais}
                            onChange={(e) => setEditedFields({ ...editedFields, detalhesAdicionais: e.target.value })}
                          />
                          <button
                            onClick={() => handleSaveFieldEdit("detalhesAdicionais")}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Salvar Campo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(editedFields.detalhesAdicionais) }}></div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-4 glass-panel text-center text-xs text-slate-400">
        <p>PB Bot Expert • Automação Inteligente de Passagem de Bastão</p>
      </footer>
    </div>
  );
}
