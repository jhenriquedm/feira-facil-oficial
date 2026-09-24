import { Category, Product } from './types';
import { normalizeProductUnit } from './utils/units';

export interface PredefinedProductRaw {
  categoryKey: 'acougue' | 'bebidas' | 'higiene' | 'hortifruti' | 'laticinios' | 'limpeza' | 'mercearia' | 'outros' | 'padaria';
  categoryName: string;
  name: string;
  rawUnit: string;
}

export const PREDEFINED_PRODUCTS_RAW: PredefinedProductRaw[] = [
  // 1. Açougue (20)
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Acém', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Alcatra', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Asa de frango', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Bife bovino', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Carne moída bovina', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Contrafilé', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Costela bovina', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Costela suína', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Coxão duro', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Coxão mole', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Coxa de frango', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Filé de peito de frango', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Frango inteiro', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Linguiça calabresa', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Linguiça toscana', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Músculo bovino', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Patinho', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Peito de frango', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Pernil suíno', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'acougue', categoryName: 'Açougue', name: 'Sobrecoxa de frango', rawUnit: 'Quilograma (kg)' },

  // 2. Bebidas (20)
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Achocolatado pronto', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Água de coco', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Água mineral', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Água saborizada', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Água tônica', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Bebida de soja', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Bebida energética', rawUnit: 'Lata' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Bebida láctea', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Bebida vegetal', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Café pronto', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Cerveja', rawUnit: 'Lata' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Chá pronto', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Espumante', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Isotônico', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Néctar de frutas', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Refrigerante', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Refresco líquido', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Sidra', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Suco', rawUnit: 'Garrafa' },
  { categoryKey: 'bebidas', categoryName: 'Bebidas', name: 'Vinho', rawUnit: 'Garrafa' },

  // 3. Higiene & Beleza (20)
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Absorvente', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Algodão', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Barbeador descartável', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Condicionador', rawUnit: 'Garrafa' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Cotonete', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Creme dental', rawUnit: 'Unidade (un)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Creme de barbear', rawUnit: 'Unidade (un)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Creme hidratante corporal', rawUnit: 'Garrafa' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Creme para pentear', rawUnit: 'Garrafa' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Desodorante aerosol', rawUnit: 'Unidade (un)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Desodorante roll-on', rawUnit: 'Unidade (un)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Enxaguante bucal', rawUnit: 'Garrafa' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Escova dental', rawUnit: 'Unidade (un)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Fio dental', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Papel higiênico', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Protetor solar', rawUnit: 'Garrafa' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Sabonete em barra', rawUnit: 'Unidade (un)' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Sabonete íntimo', rawUnit: 'Garrafa' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Sabonete líquido', rawUnit: 'Garrafa' },
  { categoryKey: 'higiene', categoryName: 'Higiene & Beleza', name: 'Shampoo', rawUnit: 'Garrafa' },

  // 4. Hortifruti (20)
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Abacaxi', rawUnit: 'Unidade (un)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Abobrinha', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Alface', rawUnit: 'Unidade (un)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Alho', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Banana', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Batata', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Beterraba', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Cebola', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Cenoura', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Chuchu', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Limão', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Laranja', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Maçã', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Mamão', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Manga', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Melancia', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Melão', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Pimentão', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Tomate', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'hortifruti', categoryName: 'Hortifruti', name: 'Uva', rawUnit: 'Bandeja' },

  // 5. Laticínios & Ovos (20)
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Bebida láctea', rawUnit: 'Garrafa' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Coalhada', rawUnit: 'Pote' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Cream cheese', rawUnit: 'Pote' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Creme de leite', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Iogurte de frutas', rawUnit: 'Pote' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Iogurte natural', rawUnit: 'Pote' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Leite condensado', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Leite desnatado', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Leite em pó integral', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Leite integral', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Leite semidesnatado', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Leite zero lactose', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Manteiga', rawUnit: 'Pote' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Margarina', rawUnit: 'Pote' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Ovos', rawUnit: 'Bandeja' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Queijo minas', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Queijo muçarela', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Queijo parmesão', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Queijo prato', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'laticinios', categoryName: 'Laticínios & Ovos', name: 'Requeijão', rawUnit: 'Pote' },

  // 6. Limpeza (20)
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Água sanitária', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Amaciante', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Cera para piso', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Desengordurante', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Desinfetante', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Desodorizador de ambiente', rawUnit: 'Unidade (un)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Detergente líquido', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Esponja de aço', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Esponja de limpeza', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Flanela', rawUnit: 'Unidade (un)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Limpa-vidros', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Limpador de banheiro', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Limpador multiuso', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Luvas para limpeza', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Pano de chão', rawUnit: 'Unidade (un)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Pano multiuso', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Sabão em barra', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Sabão em pó', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Sabão líquido para roupas', rawUnit: 'Garrafa' },
  { categoryKey: 'limpeza', categoryName: 'Limpeza', name: 'Sapólio cremoso', rawUnit: 'Garrafa' },

  // 7. Mercearia (20)
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Açúcar', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Adoçante', rawUnit: 'Garrafa' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Arroz', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Atum', rawUnit: 'Lata' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Azeite de oliva', rawUnit: 'Garrafa' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Café', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Ervilha', rawUnit: 'Lata' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Extrato de tomate', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Farinha de mandioca', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Farinha de trigo', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Feijão carioca', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Feijão preto', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Fubá', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Macarrão', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Maionese', rawUnit: 'Pote' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Milho verde', rawUnit: 'Lata' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Molho de tomate', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Óleo de soja', rawUnit: 'Garrafa' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Sal', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'mercearia', categoryName: 'Mercearia', name: 'Sardinha', rawUnit: 'Lata' },

  // 8. Outros (20)
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Areia sanitária para gatos', rawUnit: 'Saco' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Carvão', rawUnit: 'Saco' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Copo descartável', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Filtro de papel para café', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Fralda geriátrica', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Fralda infantil descartável', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Fósforo', rawUnit: 'Caixa (cx)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Guardanapo de papel', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Lâmpada', rawUnit: 'Unidade (un)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Lenço umedecido', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Papel-alumínio', rawUnit: 'Unidade (un)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Papel toalha', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Pilha AA', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Pilha AAA', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Ração para cães', rawUnit: 'Saco' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Ração para gatos', rawUnit: 'Saco' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Saco para freezer', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Sacos para lixo', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Vela', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'outros', categoryName: 'Outros', name: 'Filme plástico', rawUnit: 'Unidade (un)' },

  // 9. Padaria (20)
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Biscoito de polvilho', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Bolo de cenoura', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Bolo de chocolate', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Bolo simples', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Croissant', rawUnit: 'Unidade (un)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Massa para pizza', rawUnit: 'Unidade (un)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão de forma integral', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão de forma sem casca', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão de forma tradicional', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão de hambúrguer', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão de hot dog', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão de leite', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão de milho', rawUnit: 'Unidade (un)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão de queijo', rawUnit: 'Pacote (pct)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão francês', rawUnit: 'Quilograma (kg)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Pão integral', rawUnit: 'Unidade (un)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Quebra-queixo', rawUnit: 'Unidade (un)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Rosca doce', rawUnit: 'Unidade (un)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Sonho', rawUnit: 'Unidade (un)' },
  { categoryKey: 'padaria', categoryName: 'Padaria', name: 'Torrada', rawUnit: 'Pacote (pct)' }
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const DEFAULT_CATEGORIES = (userId: string = 'guest'): Category[] => [
  {
    id: `cat_mercearia_${userId}`,
    name: 'Mercearia',
    iconName: 'Package',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_acougue_${userId}`,
    name: 'Açougue',
    iconName: 'Flame',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_hortifruti_${userId}`,
    name: 'Hortifruti',
    iconName: 'Leaf',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_laticinios_${userId}`,
    name: 'Laticínios & Ovos',
    iconName: 'Egg',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_padaria_${userId}`,
    name: 'Padaria',
    iconName: 'Croissant',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_bebidas_${userId}`,
    name: 'Bebidas',
    iconName: 'CupSoda',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_limpeza_${userId}`,
    name: 'Limpeza',
    iconName: 'Sparkles',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_higiene_${userId}`,
    name: 'Higiene & Beleza',
    iconName: 'Heart',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  },
  {
    id: `cat_outros_${userId}`,
    name: 'Outros',
    iconName: 'Layers',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  }
];

export const DEFAULT_PRODUCTS = (userId: string = 'guest'): Product[] => {
  const timestamp = new Date().toISOString();

  return PREDEFINED_PRODUCTS_RAW.map((item) => {
    const categoryId = `cat_${item.categoryKey}_${userId}`;
    const id = `prod_${item.categoryKey}_${slugify(item.name)}_${userId}`;
    const unit = normalizeProductUnit(item.rawUnit);

    return {
      id,
      name: item.name,
      categoryId,
      unit,
      brand: '',
      lastPrice: 0,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      userId
    };
  });
};
