# Copiar imagem do Instagram

Extensão Manifest V3 para Chrome. Adiciona um ícone branco de câmera, no estilo do Instagram, depois da contagem de compartilhamentos na linha de ações da publicação. Clique nele para copiar a foto que está visível, incluindo a imagem atual de um carrossel. Também adiciona a opção de texto **Copiar imagem** acima de **Copiar link** no menu de três pontos e remove camadas vazias para liberar o menu nativo de clique direito do Chrome.

O ícone da câmera também identifica a extensão no Chrome. A interface segue o idioma do navegador quando há tradução disponível (inglês, português, espanhol, francês, alemão, italiano, japonês e chinês simplificado); outros idiomas usam inglês.

## Instalação no Chrome

1. Abra `chrome://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta do projeto.
5. Atualize a aba do Instagram que já estava aberta.

## Limitações

- O botão de câmera na linha de ações copia a imagem principal do post.
- A opção **Copiar imagem** nos três pontos usa a mesma rotina do botão de câmera e não exibe ícone.
- O menu nativo do Chrome depende de a publicação conter um elemento `<img>` e de não haver uma camada bloqueando o clique.
- Vídeos, imagens desenhadas em canvas e conteúdo sem elemento `<img>` continuam fora do menu nativo de imagem.

