import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize GoogleGenAI SDK
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();

  // CORS middleware for mobile Capacitor apps and cross-origin requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));

  // API Route: AI Receipt OCR (Cupom Fiscal / Nota Fiscal)
  app.post('/api/gemini/receipt-ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Nenhuma imagem de cupom fiscal foi enviada.' });
      }

      if (!apiKey) {
        return res.status(500).json({
          error: 'Chave de API do Gemini não configurada.',
        });
      }

      // Strip data URL header if included
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');

      const systemInstruction = `Você é um especialista em OCR inteligente para cupons fiscais, notas fiscais eletrônicas de consumidor (NFC-e, CF-e-SAT, DANFE e recibos de supermercados e feiras do Brasil).
Sua missão é extrair com precisão absoluta os dados da compra a partir da fotografia do cupom fiscal.

Diretrizes de Extração:
1. NOME DO ESTABELECIMENTO: Identifique o nome comercial ou razão social do supermercado, hipermercado, atacarejo, hortifruti ou feira (ex: Pão de Açúcar, Carrefour, Assaí Atacadista, Atacadão, Extra, etc.). Se não for legível, use "Supermercado".
2. DATA: Extraia a data da compra no formato YYYY-MM-DD. Se apenas dia e mês estiverem visíveis, presuma o ano atual.
3. PRODUTOS:
   - Limpe abreviações fiscais crípticas para nomes comerciais legíveis em português (ex: "ACUCAR CRISTAL UNI 1KG" -> "Açúcar Cristal União 1kg", "LEIT COND MOÇA TP 395G" -> "Leite Condensado Moça 395g", "DESINF PINHO SOL 1L" -> "Desinfetante Pinho Sol 1L", "TOMATE SALAD KG" -> "Tomate Saladete").
   - Quantidade: extraia o número correto (se for peso fracionado em kg como 0.854 ou 1.25, preserve o valor numérico com precisão; se unitário, use inteiros).
   - Unidade de medida: enum ['Un', 'Kg', 'L', 'G', 'Pacote', 'Caixa', 'Bandeja', 'Lata'].
   - Preço Unitário: valor numérico em Reais (R$).
   - Preço Total: quantidade * preço unitário.
   - Categoria: classifique em uma das categorias de supermercado: Açougue, Bebidas, Limpeza, Hortifruti, Mercearia, Higiene, Padaria, Laticínios, Outros.
   - Marca: extraia a marca se estiver identificável na descrição ou embalagem (ex: "União", "Nestlé", "Omo", "Sadia").
   - Código de barras: se o código EAN/GTIN estiver impresso ao lado do item, extraia os dígitos; caso contrário deixe vazio.
4. TOTAIS: Extraia o valor total da nota e valor total de desconto (se indicado).`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          market: {
            type: Type.STRING,
            description: 'Nome do supermercado ou feira identificado no cupom.'
          },
          date: {
            type: Type.STRING,
            description: 'Data da compra no formato YYYY-MM-DD.'
          },
          totalAmount: {
            type: Type.NUMBER,
            description: 'Valor total em Reais registrado no cupom.'
          },
          discountAmount: {
            type: Type.NUMBER,
            description: 'Valor total de descontos do cupom, se houver.'
          },
          items: {
            type: Type.ARRAY,
            description: 'Lista completa de itens decodificados do cupom fiscal.',
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: 'Nome comercial limpo e compreensível do produto.'
                },
                quantity: {
                  type: Type.NUMBER,
                  description: 'Quantidade adquirida.'
                },
                unit: {
                  type: Type.STRING,
                  enum: ['Un', 'Kg', 'L', 'G', 'Pacote', 'Caixa', 'Bandeja', 'Lata'],
                  description: 'Unidade de medida.'
                },
                unitPrice: {
                  type: Type.NUMBER,
                  description: 'Preço unitário em Reais.'
                },
                totalPrice: {
                  type: Type.NUMBER,
                  description: 'Preço total deste item.'
                },
                category: {
                  type: Type.STRING,
                  description: 'Categoria de supermercado sugerida.'
                },
                brand: {
                  type: Type.STRING,
                  description: 'Marca identificada ou string vazia.'
                },
                barcode: {
                  type: Type.STRING,
                  description: 'Código de barras EAN se impresso no cupom.'
                }
              },
              required: ['name', 'quantity', 'unit', 'unitPrice', 'totalPrice', 'category']
            }
          }
        },
        required: ['market', 'items']
      };

      const imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        }
      };

      const textPart = {
        text: 'Leia com precisão todos os dados deste cupom fiscal: identifique o supermercado, a data, o valor total e todos os itens de compras com quantidades e preços unitários.'
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.1,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('O modelo não conseguiu extrair dados do cupom fiscal.');
      }

      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.items)) {
        parsed.items = parsed.items.map((it: any) => ({
          ...it,
          brand: (it.brand && String(it.brand).toLowerCase() !== 'null' && String(it.brand).toLowerCase() !== 'undefined') ? String(it.brand).trim() : ''
        }));
      }

      res.json(parsed);
    } catch (error: any) {
      console.error('Erro no OCR de cupom fiscal:', error);
      res.status(500).json({ error: error.message || 'Erro ao processar imagem do cupom fiscal com IA.' });
    }
  });

  // API Route: AI Shopping List Generator based on Recipe / Event
  app.post('/api/gemini/recipe-shopping-list', async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!apiKey) {
        return res.status(500).json({
          error: 'Chave de API do Gemini não configurada. Por favor, verifique os Segredos.',
        });
      }

      const systemInstruction = 'Você é um assistente de cozinha e especialista em planejamento doméstico. O usuário fornecerá uma receita, prato ou evento (ex: churrasco de aniversário para 10 pessoas) e você gerará uma lista completa de ingredientes e itens de supermercado necessários. Associe cada item a uma categoria realista de supermercado (Açougue, Bebidas, Limpeza, Hortifruti, Mercearia, Higiene, Padaria, Laticínios, Outros) e determine a unidade correta (Un, Kg, L, G, Pacote, Caixa). Defina quantidades plausíveis para a receita descrita.';

      const schema = {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Nome simplificado e elegante para esta lista sugerida.'
          },
          items: {
            type: Type.ARRAY,
            description: 'Lista de itens recomendados para compra',
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: 'Nome do ingrediente ou produto (ex: Peito de Frango, Creme de Leite).'
                },
                categoryName: {
                  type: Type.STRING,
                  description: 'A categoria do supermercado mais adequada para o item.'
                },
                unit: {
                  type: Type.STRING,
                  description: 'Unidade de medida padrão.',
                  enum: ['Un', 'Kg', 'L', 'G', 'Pacote', 'Caixa']
                },
                quantity: {
                  type: Type.NUMBER,
                  description: 'Quantidade recomendada em formato numérico.'
                },
                estimatedPrice: {
                  type: Type.NUMBER,
                  description: 'Um preço unitário estimado realista no Brasil em Reais (R$).'
                },
                brand: {
                  type: Type.STRING,
                  description: 'Uma marca popular recomendada de boa qualidade (ou string vazia).'
                }
              },
              required: ['name', 'categoryName', 'unit', 'quantity', 'estimatedPrice']
            }
          }
        },
        required: ['title', 'items']
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Gere uma lista de compras otimizada baseada no seguinte pedido de receita ou evento: "${prompt}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.7,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('O modelo Gemini não retornou dados.');
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Erro na geração da lista de receitas:', error);
      res.status(500).json({ error: error.message || 'Erro desconhecido no servidor' });
    }
  });

  // API Route: AI Spending Insights Analyst
  app.post('/api/gemini/expense-insights', async (req, res) => {
    try {
      const { shoppingHistory } = req.body;

      if (!apiKey) {
        return res.status(500).json({
          error: 'Chave de API do Gemini não configurada.',
        });
      }

      const systemInstruction = 'Você é um consultor financeiro doméstico experiente e analista de orçamentos de supermercado. O usuário enviará seu histórico de compras recentes contendo o mercado, itens comprados, quantidades e preços pagos. Você analisará esses dados com calma e fornecerá conselhos reais, inteligentes e específicos para reduzir os gastos mensais.';

      const schema = {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'Análise detalhada do padrão de compras atual, identificando onde está ocorrendo a maior concentração de despesas.'
          },
          savingTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 a 5 dicas práticas e específicas de economia que façam sentido diante dos itens comprados pelo usuário.'
          },
          categoryWarnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Alertas de gastos elevados em categorias específicas ou substituições sugeridas (ex: trocar frango de marca X por marca Y).'
          },
          healthyAlternativeRecipe: {
            type: Type.STRING,
            description: 'Sugira uma receita deliciosa, saudável e de baixo custo que pode ser preparada utilizando alguns dos itens já listados nas compras anteriores.'
          }
        },
        required: ['summary', 'savingTips', 'categoryWarnings', 'healthyAlternativeRecipe']
      };

      const payloadString = JSON.stringify(shoppingHistory || []);
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Aqui está o meu histórico de compras recentes do supermercado em formato JSON. Por favor, analise e me dê conselhos estratégicos personalizados: \n\n ${payloadString}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.8,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('O modelo Gemini não retornou nenhum insight.');
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Erro na análise de despesas com Gemini:', error);
      res.status(500).json({ error: error.message || 'Erro no processamento de insights' });
    }
  });

  // API Route: Barcode Product Lookup (Open Food Facts + Gemini Enrichment)
  app.get('/api/barcode/lookup', async (req, res) => {
    try {
      const code = String(req.query.code || '').trim().replace(/\D/g, '');
      if (!code || code.length < 4) {
        return res.status(400).json({ error: 'Código de barras inválido.' });
      }

      let productName = '';
      let productBrand = '';
      let categorySuggestion = 'Mercearia';
      let unit = 'Unidade';
      let found = false;
      let databaseSource = '';

      // Helper function to extract product info from Open Facts JSON responses
      const extractOpenFactsData = (p: any, defaultCat: string = 'Mercearia') => {
        const name = p.product_name_pt || p.product_name || p.generic_name_pt || p.generic_name || '';
        const brand = p.brands || '';
        let detectedUnit = 'Unidade';
        let detectedCat = defaultCat;

        const catHierarchy = (p.categories_tags || []).join(' ').toLowerCase();
        if (catHierarchy.includes('beverage') || catHierarchy.includes('boisson') || catHierarchy.includes('bebida') || catHierarchy.includes('suco') || catHierarchy.includes('refrigerante') || catHierarchy.includes('água') || catHierarchy.includes('cerveja')) {
          detectedCat = 'Bebidas';
          detectedUnit = 'Litros';
        } else if (catHierarchy.includes('meat') || catHierarchy.includes('viande') || catHierarchy.includes('carne') || catHierarchy.includes('frango') || catHierarchy.includes('peixe')) {
          detectedCat = 'Açougue';
          detectedUnit = 'Kg';
        } else if (catHierarchy.includes('fruit') || catHierarchy.includes('vegetable') || catHierarchy.includes('legume') || catHierarchy.includes('verdura')) {
          detectedCat = 'Hortifruti';
          detectedUnit = 'Kg';
        } else if (catHierarchy.includes('clean') || catHierarchy.includes('nettoy') || catHierarchy.includes('deterg') || catHierarchy.includes('sabao') || catHierarchy.includes('desinfetante')) {
          detectedCat = 'Limpeza';
          detectedUnit = 'Unidade';
        } else if (catHierarchy.includes('dairy') || catHierarchy.includes('lait') || catHierarchy.includes('queijo') || catHierarchy.includes('iogurte') || catHierarchy.includes('manteiga')) {
          detectedCat = 'Laticínios';
          detectedUnit = 'Unidade';
        } else if (catHierarchy.includes('bread') || catHierarchy.includes('pain') || catHierarchy.includes('pão') || catHierarchy.includes('biscoito') || catHierarchy.includes('bolo')) {
          detectedCat = 'Padaria';
          detectedUnit = 'Unidade';
        } else if (catHierarchy.includes('hygiene') || catHierarchy.includes('shampoo') || catHierarchy.includes('sabonete') || catHierarchy.includes('creme dental') || catHierarchy.includes('cosmetic')) {
          detectedCat = 'Higiene';
          detectedUnit = 'Unidade';
        }

        if (p.quantity) {
          const qLower = String(p.quantity).toLowerCase();
          if (qLower.includes('kg') || qLower.includes('quilo')) detectedUnit = 'Kg';
          else if (qLower.includes(' g') || qLower.endsWith('g')) detectedUnit = 'Grama';
          else if (qLower.includes(' l') || qLower.endsWith('l') || qLower.includes('litro')) detectedUnit = 'Litros';
        }

        return { name, brand, categorySuggestion: detectedCat, unit: detectedUnit };
      };

      // 1. Bluesoft Cosmos API (Official Brazilian retail catalog if COSMOS_TOKEN is configured)
      const cosmosToken = process.env.COSMOS_TOKEN;
      if (!found && cosmosToken) {
        try {
          const cosmosRes = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${code}`, {
            headers: {
              'X-Cosmos-Token': cosmosToken,
              'User-Agent': 'Cosmos-API-Request'
            },
            signal: AbortSignal.timeout(3500)
          });
          if (cosmosRes.ok) {
            const cosmosData: any = await cosmosRes.json();
            if (cosmosData && (cosmosData.description || cosmosData.name)) {
              found = true;
              databaseSource = 'Bluesoft Cosmos';
              productName = cosmosData.description || cosmosData.name || '';
              productBrand = cosmosData.brand?.name || '';
              categorySuggestion = 'Mercearia';
              unit = 'Unidade';
            }
          }
        } catch (e) {
          // Cosmos lookup error or timeout
        }
      }

      // 2. Open Food Facts (Alimentos, bebidas e mercearia)
      if (!found) {
        try {
          const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
            headers: {
              'User-Agent': 'FeiraFacil/1.0 (https://ais-dev.run.app)'
            },
            signal: AbortSignal.timeout(4500)
          });

          if (offResponse.ok) {
            const offData: any = await offResponse.json();
            if (offData && offData.status === 1 && offData.product) {
              const data = extractOpenFactsData(offData.product, 'Mercearia');
              found = true;
              databaseSource = 'Open Food Facts';
              productName = data.name;
              productBrand = data.brand;
              categorySuggestion = data.categorySuggestion;
              unit = data.unit;
            }
          }
        } catch (e) {
          // Timeout or network error on Open Food Facts
        }
      }

      // 3. Open Beauty Facts (Higiene pessoal, cosméticos, sabonetes, xampus)
      if (!found) {
        try {
          const obfResponse = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${code}.json`, {
            headers: {
              'User-Agent': 'FeiraFacil/1.0 (https://ais-dev.run.app)'
            },
            signal: AbortSignal.timeout(4000)
          });

          if (obfResponse.ok) {
            const obfData: any = await obfResponse.json();
            if (obfData && obfData.status === 1 && obfData.product) {
              const data = extractOpenFactsData(obfData.product, 'Higiene');
              found = true;
              databaseSource = 'Open Beauty Facts';
              productName = data.name;
              productBrand = data.brand;
              categorySuggestion = 'Higiene';
              unit = data.unit;
            }
          }
        } catch (e) {
          // Open Beauty Facts error
        }
      }

      // 4. Open Products Facts (Produtos de limpeza, bazar, utilidades)
      if (!found) {
        try {
          const opfResponse = await fetch(`https://world.openproductsfacts.org/api/v2/product/${code}.json`, {
            headers: {
              'User-Agent': 'FeiraFacil/1.0 (https://ais-dev.run.app)'
            },
            signal: AbortSignal.timeout(4000)
          });

          if (opfResponse.ok) {
            const opfData: any = await opfResponse.json();
            if (opfData && opfData.status === 1 && opfData.product) {
              const data = extractOpenFactsData(opfData.product, 'Limpeza');
              found = true;
              databaseSource = 'Open Products Facts';
              productName = data.name;
              productBrand = data.brand;
              categorySuggestion = data.categorySuggestion;
              unit = data.unit;
            }
          }
        } catch (e) {
          // Open Products Facts error
        }
      }

      return res.json({
        found,
        databaseSource: databaseSource || (found ? 'Base de Produtos' : null),
        notFoundInOpenFoodFacts: !found,
        barcode: code,
        name: productName,
        brand: (productBrand && productBrand.toLowerCase() !== 'null' && productBrand.toLowerCase() !== 'undefined') ? productBrand.trim() : '',
        categorySuggestion: categorySuggestion || 'Mercearia',
        unit: unit || 'Unidade'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao consultar código de barras.' });
    }
  });

  const port = process.env.PORT || 3000;

  // Serve static assets in production or mount Vite in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } else {
    const server = http.createServer(app);
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  }
}

startServer();
