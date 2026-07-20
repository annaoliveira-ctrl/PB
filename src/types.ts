export interface RevisedHandover {
  nomeCliente: string;
  humorCliente: string;
  processoAtivacao: string;
  prestacaoContas: string;
  nivelAutonomia: string;
  detalhesAdicionais: string;
  resumoGeral: string;
  notasPendentes: string[];
}

export interface HistoryItem {
  id: string;
  clientName: string;
  date: string;
  originalText: string;
  context: string;
  revised: RevisedHandover;
}

export interface HandoverTemplate {
  name: string;
  description: string;
  text: string;
  context: string;
}

export const TEMPLATES: HandoverTemplate[] = [
  {
    name: "Caso Ideal (Sucesso)",
    description: "Cliente satisfeito, equipe engajada e ativação bem-sucedida.",
    text: "Reunião de passagem da empresa Açúcar Alegre foi ótima, o cliente ta bem animado com a plataforma. Fizemos o onboarding no prazo certinho, a equipe deles participou de tudo e aprendeu rápido, já estão usando sozinhos e tirando relatórios. Apresentamos o ROI da primeira semana e eles curtiram muito. Só focar agora em manter o contato semanal pra garantir que não tenham dúvidas nas integrações extras.",
    context: "Ativação para Adoção"
  },
  {
    name: "Caso Critico (TI & Atrasos)",
    description: "Cliente ansioso com TI pendente e atraso no cronograma.",
    text: "A reunião com a Tech Solutions Ltda foi tensa, o cliente ta bem nervoso por conta do atraso da integração da TI deles que demorou duas semanas. A ativação atrasou bastante por conta disso, mas agora tá rodando. Apresentamos alguns números iniciais de teste mas não temos o relatório completo de ROI. Eles ainda têm muitas dúvidas operacionais e a equipe deles tá insegura pra rodar sozinhos, precisam de bastante acompanhamento. O ponto focal é o diretor de TI que é super exigente.",
    context: "Ativação para Adoção"
  },
  {
    name: "Caso Frio (Baixo Engajamento)",
    description: "Cliente neutro/distante, com pendência de informações.",
    text: "A passagem da Global Corporates terminou meio aos trancos, o cliente não responde muito os emails e faltou nas duas últimas reuniões. O processo de ativação acabou estendendo demais. Não deu pra mostrar relatórios direito porque eles não subiram a base de dados ainda, então a prestação de contas tá vazia. O analista de lá sabe o básico mas a diretoria não sabe nada e não engajou. Precisamos forçar uma reunião de alinhamento com eles.",
    context: "Ativação para Adoção"
  }
];
