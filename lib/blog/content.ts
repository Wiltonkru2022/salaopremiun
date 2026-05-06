export type BlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  categorySlug: string;
  categoryName: string;
  readTime: string;
  publishedAt: string;
  coverImage: string;
  coverAlt: string;
  tags: string[];
  body: string[];
  bodyHtml?: string;
  featured?: boolean;
  categoryId?: string;
  status?: "rascunho" | "publicado" | "arquivado";
  rawContent?: string;
};

export const defaultBlogCategories: BlogCategory[] = [
  {
    id: "agenda-online",
    slug: "agenda-online",
    name: "Agenda online",
    description: "Organização de horários, clientes, profissionais e remarcações.",
  },
  {
    id: "vendas-e-caixa",
    slug: "vendas-e-caixa",
    name: "Vendas e caixa",
    description: "Comandas, pagamentos, fechamento de caixa e gestão comercial.",
  },
  {
    id: "automacao",
    slug: "automacao",
    name: "Automação",
    description: "Rotinas que reduzem tarefas repetitivas no salão.",
  },
  {
    id: "marketing",
    slug: "marketing",
    name: "Marketing e fidelização",
    description: "Ideias para redes sociais, relacionamento e retorno de clientes.",
  },
];

export const defaultBlogPosts: BlogPost[] = [
  {
    id: "agenda-clientes-vantagens-ferramentas",
    slug: "agenda-de-clientes-veja-vantagens-e-ferramentas-usadas",
    title: "Agenda de clientes: veja as vantagens e ferramentas usadas",
    description:
      "Entenda como uma agenda de clientes ajuda salões a reduzir faltas, organizar profissionais e melhorar a experiência de atendimento.",
    excerpt:
      "Uma boa agenda deixa de ser apenas uma lista de horários e vira o centro da operação: cliente, serviço, profissional, comanda e histórico no mesmo fluxo.",
    categorySlug: "agenda-online",
    categoryName: "Agenda online",
    readTime: "6 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/site-hero.png",
    coverAlt: "Tela do sistema SalaoPremium com visão comercial e operacional",
    tags: ["agenda de clientes", "sistema para salão", "atendimento"],
    featured: true,
    body: [
      "A agenda de clientes é uma das ferramentas mais importantes para salões, barbearias, clínicas de estética e studios. Quando ela está integrada ao restante do sistema, cada horário marcado já nasce com contexto: quem é o cliente, qual serviço será feito, qual profissional atende e quais próximos passos precisam acontecer.",
      "No SalaoPremium, a agenda conversa com clientes, profissionais, comandas e caixa. Isso ajuda a diminuir remarcações perdidas, melhora a previsão de movimento do dia e facilita a rotina da recepção.",
      "Outra vantagem está no histórico. Saber quando a cliente voltou, qual serviço costuma fazer e qual profissional prefere ajuda o salão a vender melhor sem parecer insistente.",
    ],
  },
  {
    id: "tarefas-vendas-automatizar",
    slug: "5-tarefas-de-vendas-para-automatizar-com-o-ecossistema-salao-premiun",
    title: "5 tarefas de vendas para automatizar com o ecossistema Salão Premiun",
    description:
      "Veja tarefas comerciais que podem ser automatizadas para vender mais serviços e produtos sem perder controle do atendimento.",
    excerpt:
      "Automatizar vendas no salão não significa perder o toque humano. Significa tirar peso operacional da equipe para ela atender melhor.",
    categorySlug: "automacao",
    categoryName: "Automação",
    readTime: "7 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/instagram-feed.png",
    coverAlt: "Peças de marketing para divulgação de salão nas redes sociais",
    tags: ["automação de vendas", "whatsapp", "gestão comercial"],
    body: [
      "A primeira tarefa é lembrar clientes sobre retornos. Corte, manutenção, hidratação, unha e procedimentos recorrentes podem gerar oportunidades futuras quando ficam registrados no sistema.",
      "A segunda é organizar comandas abertas. Cada atendimento precisa virar venda fechada com clareza de serviços, produtos, descontos e pagamentos.",
      "A terceira é acompanhar clientes sem visita recente. Uma lista simples de leitura comercial já mostra quem merece uma campanha, uma mensagem ou uma oferta de retorno.",
      "A quarta é padronizar pacotes e combos. Quando os serviços estão bem cadastrados, a equipe oferece com mais segurança.",
      "A quinta é medir resultados. Sem relatório, o salão vende no escuro. Com sistema, dá para enxergar faturamento, ticket médio, produtos e profissionais com mais saída.",
    ],
  },
  {
    id: "o-que-oferece",
    slug: "o-que-o-salao-premium-oferece",
    title: "O que o SalaoPremium oferece para salões e barbearias",
    description:
      "Conheça os principais recursos do SalaoPremium: agenda, clientes, comandas, caixa, estoque, profissionais, comissões e app profissional.",
    excerpt:
      "O SalaoPremium une agenda, financeiro, equipe e operação para o dono do salão tomar decisões com menos improviso.",
    categorySlug: "vendas-e-caixa",
    categoryName: "Vendas e caixa",
    readTime: "5 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/facebook-link.png",
    coverAlt: "Arte de divulgacao do SalaoPremium para redes sociais",
    tags: ["sistema para salão", "comandas", "caixa"],
    body: [
      "O SalaoPremium oferece uma base completa para administrar o dia a dia do salão. A agenda organiza horários e profissionais; o cadastro de clientes guarda histórico; as comandas registram serviços, produtos e pagamentos.",
      "No financeiro, o caixa ajuda a entender entradas, saídas e fechamento. No operacional, o controle de estoque evita perda de produtos e melhora a reposição.",
      "Para equipes, o app profissional permite acompanhar agenda, clientes e atendimentos com mais autonomia, mantendo o dono do salão no controle.",
    ],
  },
  {
    id: "agenda-online",
    slug: "o-que-e-uma-agenda-online",
    title: "O que é uma agenda online e por que ela melhora a rotina do salão",
    description:
      "Saiba como a agenda online ajuda a centralizar horários, reduzir desencontros e criar uma experiência mais profissional para clientes.",
    excerpt:
      "Agenda online é o ponto de partida para transformar horários soltos em uma operação organizada e vendável.",
    categorySlug: "agenda-online",
    categoryName: "Agenda online",
    readTime: "4 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/stories.png",
    coverAlt: "Modelo visual para comunicação do salão em stories",
    tags: ["agenda online", "marcação de horário", "produtividade"],
    body: [
      "Uma agenda online é um sistema acessível pela internet para registrar, consultar e atualizar horários. Diferente de uma agenda em papel, ela pode ser compartilhada com equipe, atualizada em tempo real e conectada a outros dados do negócio.",
      "No salão, isso evita conflitos de horário, melhora a comunicação entre recepção e profissional e ajuda o gestor a acompanhar a ocupação da equipe.",
      "Quando a agenda está integrada a clientes e comandas, cada atendimento deixa rastro comercial. Esse rastro vira histórico, relatório e oportunidade de fidelização.",
    ],
  },
  {
    id: "fidelizar-clientes",
    slug: "como-posso-fidelizar-clientes-no-salao",
    title: "Como posso fidelizar clientes no salão?",
    description:
      "Ideias práticas para fidelizar clientes usando histórico de atendimento, retornos, ofertas e relacionamento organizado.",
    excerpt:
      "Fidelização acontece quando o cliente sente que o salão lembra dele, entende seu gosto e facilita sua próxima visita.",
    categorySlug: "marketing",
    categoryName: "Marketing e fidelização",
    readTime: "6 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/site-hero.png",
    coverAlt: "Visão institucional do sistema SalaoPremium",
    tags: ["fidelização", "clientes", "retenção"],
    body: [
      "Para fidelizar clientes, comece pelo histórico. Anote preferências, serviços feitos, produtos comprados e frequência de retorno.",
      "Depois, transforme esse histórico em ação. Um lembrete de manutenção, uma oferta no momento certo ou uma mensagem pós-atendimento podem ser mais fortes que descontos genéricos.",
      "O sistema também ajuda a identificar clientes que sumiram. Essa lista de leitura comercial mostra quem precisa de contato antes que escolha outro salão.",
    ],
  },
  {
    id: "redes-sociais",
    slug: "o-que-fazer-para-estar-a-frente-nas-redes-sociais",
    title: "O que fazer para estar à frente nas redes sociais",
    description:
      "Veja ideias de conteúdo para salões crescerem nas redes sociais com consistência, prova social e ofertas bem organizadas.",
    excerpt:
      "Redes sociais funcionam melhor quando o salão combina rotina real, resultado visual, agenda organizada e chamada clara para marcar horário.",
    categorySlug: "marketing",
    categoryName: "Marketing e fidelização",
    readTime: "5 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/instagram-feed.png",
    coverAlt: "Layout de feed para conteúdo de salão no Instagram",
    tags: ["redes sociais", "instagram para salão", "marketing"],
    body: [
      "Para estar à frente nas redes sociais, mostre bastidores, antes e depois, agenda da semana, serviços mais procurados e depoimentos de clientes.",
      "O segredo é transformar a operação em conteúdo. Se o salão sabe quais serviços vendem mais, quais horários estão livres e quais clientes voltam sempre, fica mais fácil publicar com intenção.",
      "Use chamadas simples: marcar horário, conhecer pacote, falar no WhatsApp ou ver disponibilidade. Conteúdo bom precisa abrir caminho para uma ação.",
    ],
  },
  {
    id: "gerenciar-vendas-agenda",
    slug: "como-posso-gerenciar-minhas-vendas-com-sistema-de-agenda",
    title: "Como posso gerenciar minhas vendas com sistema de agenda?",
    description:
      "Entenda como uma agenda integrada ao caixa ajuda a controlar vendas, comandas, produtos, serviços e desempenho da equipe.",
    excerpt:
      "A venda começa antes do pagamento. Ela nasce na agenda, passa pelo atendimento e se confirma na comanda e no caixa.",
    categorySlug: "vendas-e-caixa",
    categoryName: "Vendas e caixa",
    readTime: "6 min",
    publishedAt: "2026-05-06",
    coverImage: "/marketing-kit/facebook-link.png",
    coverAlt: "Arte comercial do SalaoPremium para divulgação",
    tags: ["vendas", "agenda integrada", "caixa"],
    body: [
      "Gerenciar vendas com sistema de agenda significa ligar cada horário marcado a um possível faturamento. O atendimento deixa de ser um evento isolado e passa a fazer parte de um fluxo comercial.",
      "Quando a cliente chega, a comanda pode registrar serviços, produtos, descontos e formas de pagamento. No fim do dia, o caixa mostra o que realmente entrou.",
      "Essa visão ajuda o gestor a saber quais serviços trazem mais receita, quais profissionais estão com agenda cheia e quais produtos saem junto com os atendimentos.",
    ],
  },
];

export function getDefaultCategory(slug: string) {
  return defaultBlogCategories.find((category) => category.slug === slug);
}
