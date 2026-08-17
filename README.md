# Estudo de Tríades na Guitarra

Aplicação web interativa focada no estudo de tríades, tétrades e inversões no braço da guitarra (afinação padrão E A D G B E).

## Funcionalidades principais

1. **Explorador de Campo Harmônico**:
   - Geração dinâmica do campo harmônico (Maior e Menor Natural) para qualquer tom.
   - Suporte a variações modais e empréstimos harmônicos (ex: `iv` menor, `bVI`, `bVII`, diminutos de passagem).
   - Busca livre de acordes com autocomplete para reconhecer extensões de forma rápida (ex: `Cmaj7`, `Am9`, `Dsus4`).

2. **Visualização Avançada do Braço**:
   - Fretboard responsivo (SVG) com todas as 6 cordas visíveis.
   - Indicação de casas, notas soltas e indicação visual de cordas mudas (×).
   - Destaque das funções das notas: Fundamental (Vermelho), Terças (Azul), Quintas (Verde) e Extensões (Roxo/Ciano/Amarelo).

3. **Modo Cifra Interativo**:
   - Permite colar qualquer cifra ou buscar diretamente via URL do Cifra Club (utiliza proxies CORS redundantes).
   - O parser identifica todos os acordes de forma inteligente, simplifica-os para tríades correspondentes ou mantêm as extensões no mapeamento.
   - Cada acorde da cifra vira um link interativo e clicável que carrega os shapes correspondentes no braço.

4. **Roteiro de Voicings Selecionados**:
   - Botão para fixar shapes de acordes favoritos no topo da tela, permitindo a visualização lado a lado de múltiplos shapes para transição visual e harmônica (ex: visualizar a transição do acorde G para o acorde C no mesmo painel).

5. **Síntese de Áudio (Web Audio API)**:
   - Sintetizador integrado que simula cordas de guitarra/violão.
   - Modos de reprodução: Dedilhado (Arpejo) ou Simultâneo (Acorde).
   - Reprodução de shapes completos de diagramas individuais ou toques isolados diretamente nos note-markers do braço.

## Como rodar o projeto localmente

Como o projeto é composto por um único arquivo HTML contendo todo o CSS, HTML e JavaScript, você não precisa instalar nenhuma dependência.

1. Abra a pasta do projeto.
2. Abra o arquivo `index.html` diretamente no seu navegador ou inicie um servidor HTTP simples (ex: `python -m http.server 8289`).
3. Acesse `http://localhost:8289` no seu navegador.

## Deploy

Para publicar na Vercel, Netlify ou GitHub Pages, basta subir o arquivo `index.html` na raiz do seu repositório estático.
