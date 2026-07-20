import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json({ limit: "10mb" }));

// API Route for Handover Revision
app.post("/api/revisar", async (req, res) => {
  try {
    const { text, context } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "O texto original é obrigatório." });
    }

    const systemPrompt = `Você é um especialista em comunicação corporativa, revisão textual e Gestão de Sucesso do Cliente (Customer Success / Onboarding) para o fluxo de Ativação (Onboarding) para Adoção (Customer Success). Sua missão é atuar como o 'PB Bot Expert', revisando, corrigindo e reestruturando as observações de passagem de bastão de clientes fornecidas pela equipe do fluxo de Ativação para Adoção.

Seu objetivo é transformar anotações informais ou desorganizadas em relatórios claros, coerentes, coesos, profissionais e estritamente padronizados do fluxo de Ativação para Adoção.

Além disso, identifique e extraia o nome do cliente ou da empresa a partir do texto bruto fornecido (se houver). Se não for possível identificar de forma alguma, retorne "Cliente".

---

### REGRAS DE REVISÃO, ESTILO E FORMATO (PIPEDRIVE COMPATÍVEL)

- SEM EMOJIS: É terminantemente proibido o uso de qualquer tipo de emoji ou ícone gráfico nas respostas. Todo o texto deve ser limpo e profissional.
- COMPATÍVEL COM PIPEDRIVE: O relatório gerado deve estar formatado no estilo de notas do Pipedrive (Pipedrive Notes), utilizando tópicos claros (com hífen ou asterisco: - ou *) e negritos simples (**texto**) para destacar termos-chave. Evite qualquer caractere especial desnecessário ou poluição visual.
- Coerência e Coesão: Corrija erros gramaticais, ajuste a pontuação e conecte as frases de forma fluida e lógica.
- Tom de Voz: Profissional, direto, claro e neutro/objetivo.
- Clareza: Se o texto original for vago em algum dos 5 pontos, faça o seu melhor para inferir com base no contexto OU adicione uma nota destacada "[Nota: Informação pendente sobre X]" alertando o usuário sobre o que faltou.
- Formatação: Use tópicos (bullet points em formato markdown: - ) e negritos dentro das seções para facilitar a leitura rápida. Não use títulos markdown (# ou ##) dentro dos campos de texto das propriedades.

---

### ESTRUTURA OBRIGATÓRIA DA PASSAGEM DE BASTÃO (Cada seção deve ir no seu respectivo campo JSON e sem emojis):

1. Humor do Cliente (humorCliente)
   - Descreva o perfil comportamental, nível de satisfação ou estado emocional do cliente (ex: entusiasmado, neutro, ansioso, exigente, receoso).

2. Processo de Ativação (processoAtivacao)
   - Resuma como foi a jornada do Onboarding/Ativação (ex: prazos cumpridos, principais desafios, engajamento da equipe do cliente).

3. Prestação de Contas (prestacaoContas)
   - Detalhe como foram consolidados e entregues os primeiros resultados, relatórios ou métricas acordadas durante a entrada.

4. Nível de Autonomia e Conhecimento (nivelAutonomia)
   - Avalie o quanto o cliente aprendeu sobre o produto/serviço, se a equipe dele está capacitada ou se ainda precisa de suporte em pontos específicos.

5. Detalhes Adicionais (detalhesAdicionais)
   - Liste particularidades importantes (ex: preferências de comunicação, pontos de atenção para o próximo responsável, combinados extras, dores específicas).`;

    const userMessage = `Aqui estão as anotações originais de passagem de bastão para o fluxo de Ativação ➔ Adoção:
    
"${text}"`;

    // Call Gemini 3.5 Flash for text structuring
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2, // Lower temperature for more structured, factual, and consistent responses
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nomeCliente: {
              type: Type.STRING,
              description: "O nome do cliente ou da empresa identificada no texto bruto. Se não for possível identificar de forma alguma, retorne 'Cliente'."
            },
            humorCliente: {
              type: Type.STRING,
              description: "Texto revisado sobre o perfil comportamental, nível de satisfação ou estado emocional do cliente (em tópicos e com negritos)."
            },
            processoAtivacao: {
              type: Type.STRING,
              description: "Texto revisado resumindo como foi a jornada do Onboarding/Ativação (em tópicos e com negritos)."
            },
            prestacaoContas: {
              type: Type.STRING,
              description: "Texto revisado detalhando a entrega dos primeiros resultados, relatórios ou métricas acordadas (em tópicos e com negritos)."
            },
            nivelAutonomia: {
              type: Type.STRING,
              description: "Texto revisado avaliando o quanto o cliente aprendeu e o nível de capacitação da equipe dele (em tópicos e com negritos)."
            },
            detalhesAdicionais: {
              type: Type.STRING,
              description: "Texto revisado listando particularidades importantes, canais preferidos, dores e pontos de atenção para o próximo responsável (em tópicos e com negritos)."
            },
            resumoGeral: {
              type: Type.STRING,
              description: "Uma ou duas frases curtas resumindo profissionalmente o estado geral do cliente nesta passagem."
            },
            notasPendentes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de observações ou lacunas de informações fundamentais identificadas no texto original, que faltaram para preencher as seções corretamente."
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
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Não foi possível obter resposta da Inteligência Artificial.");
    }

    const parsedResult = JSON.parse(resultText.trim());
    return res.json(parsedResult);

  } catch (error: any) {
    console.error("Erro na rota /api/revisar:", error);
    return res.status(500).json({
      error: "Ocorreu um erro ao processar a revisão do texto.",
      details: error.message || error
    });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
