export interface AppVersionInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  codename: string;
  minAndroidVersion: string;
  targetSdkVersion: number;
  packageId: string;
  changelog: {
    version: string;
    date: string;
    highlights: string[];
  }[];
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: '1.3.3',
  buildNumber: 16,
  releaseDate: '2026-09-23',
  codename: 'MercadoFácil Pro',
  minAndroidVersion: 'Android 8.0 (API 26)',
  targetSdkVersion: 34,
  packageId: 'com.feirafacil.app',
  changelog: [
    {
      version: '1.3.3',
      date: '2026-09-23',
      highlights: [
        'Catálogo pré-definido com 180 produtos fixos distribuídos pelas 9 categorias padrão (Açougue, Bebidas, Higiene & Beleza, Hortifruti, Laticínios & Ovos, Limpeza, Mercearia, Outros e Padaria)',
        'Atribuição automática dos itens básicos (Nome, Categoria e Unidade de Medida) ao instalar o app ou criar uma nova conta',
        'Liberdade total para o usuário editar ou apagar qualquer item da sua lista',
        'Restauração automática ao estado original de 180 itens em caso de reinstalação limpa sem dados na nuvem ou local'
      ]
    },
    {
      version: '1.3.2',
      date: '2026-09-23',
      highlights: [
        'Marca opcional no cadastro de produtos (manual, leitor de código de barras e cupom fiscal OCR)',
        'Tratamento preventivo para garantir que marcas ausentes nunca sejam exibidas como "null" ou "undefined"',
        'Nova regra refinada contra duplicidade: permite produtos com o mesmo nome na mesma categoria com marcas distintas ou um sem marca',
        'Impedimento estrito contra duplicidade de produtos com mesma marca ou múltiplos sem marca na mesma categoria'
      ]
    },
    {
      version: '1.3.1',
      date: '2026-09-23',
      highlights: [
        'Sincronização imediata de novos usuários no Firestore com banco de dados correto',
        'Inclusão nativa das 9 categorias padrão na instalação e primeiro acesso do app',
        'Remoção do Resumo da Conta na tela de perfil',
        'Otimização do fluxo de registro eliminando redirecionamentos indevidos'
      ]
    },
    {
      version: '1.3.0',
      date: '2026-09-23',
      highlights: [
        'Atalho rápido para cadastro de categorias direto no modal de produto',
        'Cadastro contínuo: modais de produtos e categorias permanecem abertos após salvar',
        'Ordenação alfabética em todos os filtros e listas suspensas',
        'Remoção de botões desnecessários na tela de relatórios e simplificação de ajustes',
        'Integração nativa de permissões do smartphone para câmera e galeria',
        'Configuração e preparação completa para geração de APK Android com Capacitor',
        'Versionamento de sistema integrado com changelog detalhado',
        'Suíte robusta de testes automatizados e pipeline de CI/CD para GitHub Actions'
      ]
    },
    {
      version: '1.2.0',
      date: '2026-09-22',
      highlights: [
        'Máscara monetária BRL automática em todos os campos de valores',
        'Validação e higienização em tempo real de nomes com primeira letra maiúscula',
        'Bloqueio de exclusão para categorias e produtos em uso',
        'Tema de cores personalizado estendido globalmente e suporte a CPF único'
      ]
    },
    {
      version: '1.1.0',
      date: '2026-09-20',
      highlights: [
        'Leitor de código de barras inteligente com busca em banco nacional',
        'Leitura e digitalização inteligente de cupons fiscais via OCR Gemini',
        'Sincronização em nuvem e armazenamento local-first offline'
      ]
    }
  ]
};
