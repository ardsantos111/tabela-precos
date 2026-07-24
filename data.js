/**
 * CATÁLOGO ÓPTICO HAYTEK
 * Versão: 1.0.2
 *
 * Fonte oficial dos produtos e preços:
 * tabela-fonte.csv
 *
 * Os três arquivos devem estar na mesma pasta:
 * - index.html
 * - data.js
 * - tabela-fonte.csv
 */

const catalogMeta = {
  appVersion: "1.0.2",
  sourceFile: "tabela-fonte.csv",
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString()
};

/**
 * Corrige possíveis caracteres invisíveis e espaços extras.
 */
function limparTexto(valor) {
  return String(valor ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

/**
 * Faz a leitura de uma linha CSV separada por ponto e vírgula.
 *
 * Também reconhece campos entre aspas.
 */
function separarLinhaCsv(linha) {
  const campos = [];
  let campoAtual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i += 1) {
    const caractere = linha[i];
    const proximoCaractere = linha[i + 1];

    if (caractere === '"') {
      if (dentroDeAspas && proximoCaractere === '"') {
        campoAtual += '"';
        i += 1;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }

      continue;
    }

    if (caractere === ";" && !dentroDeAspas) {
      campos.push(limparTexto(campoAtual));
      campoAtual = "";
      continue;
    }

    campoAtual += caractere;
  }

  campos.push(limparTexto(campoAtual));

  return campos;
}

/**
 * Converte o conteúdo da planilha CSV em objetos.
 */
function converterCsvParaCatalogo(csvTexto) {
  const linhas = String(csvTexto ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((linha) => linha.trim() !== "");

  if (linhas.length < 2) {
    throw new Error(
      "A tabela-fonte.csv não possui produtos ou está vazia."
    );
  }

  const cabecalhos = separarLinhaCsv(linhas[0]);

  const cabecalhosObrigatorios = [
    "Categoria",
    "Família",
    "Código",
    "Produto",
    "Índice",
    "Disponibilidade",
    "Antirrisco",
    "Antirrisco Tingível",
    "Antirreflexo Verde",
    "Antirreflexo Azul",
    "Antirreflexo Premium Verde",
    "Antirreflexo Premium Azul",
    "Preço Base/Grade"
  ];

  const cabecalhosAusentes = cabecalhosObrigatorios.filter(
    (cabecalho) => !cabecalhos.includes(cabecalho)
  );

  if (cabecalhosAusentes.length > 0) {
    throw new Error(
      `Colunas obrigatórias ausentes: ${cabecalhosAusentes.join(", ")}`
    );
  }

  const produtos = [];
  const codigosEncontrados = new Set();

  linhas.slice(1).forEach((linha, indice) => {
    const numeroLinha = indice + 2;
    const valores = separarLinhaCsv(linha);
    const produto = {};

    cabecalhos.forEach((cabecalho, coluna) => {
      produto[cabecalho] = limparTexto(valores[coluna]);
    });

    const codigo = produto["Código"];

    if (!codigo) {
      console.warn(
        `Linha ${numeroLinha} ignorada porque não possui código.`
      );

      return;
    }

    if (codigosEncontrados.has(codigo)) {
      console.warn(
        `Código duplicado ignorado na linha ${numeroLinha}: ${codigo}`
      );

      return;
    }

    codigosEncontrados.add(codigo);
    produtos.push(produto);
  });

  if (produtos.length === 0) {
    throw new Error(
      "Nenhum produto válido foi encontrado na tabela-fonte.csv."
    );
  }

  return produtos;
}

/**
 * Carrega o CSV de forma síncrona.
 *
 * Isso garante que rawData esteja disponível antes de o index.html
 * executar a inicialização do aplicativo.
 */
function carregarCatalogoHaytek() {
  const requisicao = new XMLHttpRequest();

  requisicao.open(
    "GET",
    `tabela-fonte.csv?v=${Date.now()}`,
    false
  );

  requisicao.overrideMimeType(
    "text/csv; charset=utf-8"
  );

  try {
    requisicao.send(null);
  } catch (erro) {
    console.error(
      "Falha ao solicitar tabela-fonte.csv:",
      erro
    );

    return [];
  }

  const carregamentoValido =
    requisicao.status === 200 ||
    requisicao.status === 0;

  if (!carregamentoValido) {
    console.error(
      `Não foi possível carregar tabela-fonte.csv. Status: ${requisicao.status}`
    );

    return [];
  }

  try {
    return converterCsvParaCatalogo(
      requisicao.responseText
    );
  } catch (erro) {
    console.error(
      "Erro ao processar tabela-fonte.csv:",
      erro
    );

    return [];
  }
}

/**
 * Base utilizada pelo index.html.
 */
const rawData = carregarCatalogoHaytek();

catalogMeta.productCount = rawData.length;

if (rawData.length === 0) {
  console.error(
    "O catálogo não foi carregado. Verifique se tabela-fonte.csv está na mesma pasta do data.js."
  );
} else {
  console.info(
    `Catálogo Haytek carregado com ${rawData.length} produtos.`
  );
}
