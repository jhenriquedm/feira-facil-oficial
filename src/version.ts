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
  version: '1.4.5',
  buildNumber: 55,
  releaseDate: '2026-09-24',
  codename: 'MercadoFácil Pro',
  minAndroidVersion: 'Android 8.0 (API 26)',
  targetSdkVersion: 34,
  packageId: 'com.feirafacil.app',
  changelog: [
    {
      version: '1.4.5',
      date: '2026-09-24',
      highlights: [
        'Consulta online direta multi-bases (Open Food Facts Brasil, Open Beauty, Open Products) com CORS aberto e resposta em tempo real',
        'Eliminação da dependência de proxy de nuvem para consultas de códigos de barra no APK Android',
        'Expansão da base offline pré-carregada com cafés e marcas populares brasileiras (3 Corações, Santa Clara, Melitta, Pilão)',
        'Gravação automática instantânea na memória do dispositivo para qualquer produto identificado na nuvem ou cadastrado'
      ]
    },
    {
      version: '1.4.4',
      date: '2026-09-24',
      highlights: [
        'Remoção de todas as sobreposições de textos conflitantes dentro do visor da câmera no Leitor OCR de cupom fiscal',
        'Substituição completa do motor do leitor de código de barras para @zxing/library + BarcodeDetector nativo com aceleração por hardware',
        'Transmissão direta da câmera via getUserMedia no leitor de código de barras, eliminando a tela preta e rejeições de restrições do Html5Qrcode',
        'Visor limpo e fluido com zoom 1x a 2.5x, foco por toque, lanterna e leitura imediata de códigos EAN-13, EAN-8, UPC e Code-128'
      ]
    },
    {
      version: '1.4.3',
      date: '2026-09-24',
      highlights: [
        'Resolução definitiva do erro "Unexpected token <" conectando o app nativo diretamente à nuvem de IA via getApiUrl',
        'Correção do ciclo de vida da câmera no Leitor OCR: stream agora é acoplado imediatamente ao elemento de vídeo',
        'Estilização forçada em CSS no viewport do leitor de código de barras para preenchimento de 100% sem bordas pretas',
        'Remoção completa do ícone circular de Play do WebView substituindo o pôster de vídeo por bitmap transparente',
        'Habilitação de cabeçalhos CORS no servidor backend para aceitar requisições de origem móvel Capacitor'
      ]
    },
    {
      version: '1.4.2',
      date: '2026-09-24',
      highlights: [
        'Ativação de aceleração de hardware (hardwareAccelerated) no AndroidManifest para renderização de câmera no WebView',
        'Desbloqueio de autoplay sem restrição de toque (setMediaPlaybackRequiresUserGesture: false) no WebView',
        'Resolução de tela preta e ícone de play no Leitor OCR de Cupom e Leitor de Código de Barras',
        'Fallback dinâmico de câmeras por ID físico (getCameras) e toque para retomar foco/vídeo'
      ]
    },
    {
      version: '1.4.1',
      date: '2026-09-24',
      highlights: [
        'Mecanismo automático de invalidação de cache (Limpeza de CacheStorage e ServiceWorker ao atualizar)',
        'Bump do versionCode para 51 garantindo sobreposição limpa no Android',
        'Controles avançados no leitor com zoom 1.0x-2.5x e lanterna'
      ]
    },
    {
      version: '1.4.0',
      date: '2026-09-24',
      highlights: [
        'Atualização do versionCode para 50 (superando instalações legadas 36 e permitindo upgrade direto sem desinstalar)',
        'Exibição em destaque da versão e build nas configurações e menu lateral',
        'Controles de câmera com zoom 1.0x-2.5x e lanterna para código de barras e cupom fiscal',
        'Base expandida de 11.123 itens offline pré-carregados',
        'Download direto sem compactação ZIP com nome de pacote específico'
      ]
    },
    {
      version: '1.3.5',
      date: '2026-09-24',
      highlights: [
        'Correção de exibição de foto de perfil (referrerPolicy="no-referrer" e fallback elegante para avatares do Google/externos)',
        'Esclarecimento e alinhamento de persistência de sessão nativa e restauração de dados via Google Drive Auto-Backup',
        'Versionamento contínuo sincronizado no app, APK e pipeline de CI'
      ]
    },
    {
      version: '1.3.4',
      date: '2026-09-24',
      highlights: [
        'Resolução de conflito de instalação Android: unificação e fixação definitiva da chave de assinatura (keystore)',
        'Versionamento automático e contínuo no app e build a cada novo commit (v1.3.4)',
        'Controles de câmera com zoom ajustável (1.0x - 2.5x), foco macro e lanterna para código de barras e cupom fiscal',
        'Base de dados offline expandida com 11.123 itens nativos (alimentos, bebidas, limpeza, medicamentos e bazar)'
      ]
    },
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
