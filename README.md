# GuincheJá — MVP funcional

Aplicativo móvel instalável (PWA) para simular a solicitação e o acompanhamento de um guincho.

## Executar

Com Python:

```bash
python3 -m http.server 4173
```

Depois acesse `http://localhost:4173/guincheja/`.

Ou entre nesta pasta e use:

```bash
npx serve . -l 4173
```

## O que funciona

- cadastro local do cliente;
- localização por GPS, mediante permissão;
- origem e destino;
- seleção de problema e veículo;
- estimativa demonstrativa de preço;
- busca simulada de motorista;
- acompanhamento das etapas;
- avaliação e histórico local;
- instalação como aplicativo pelo navegador;
- funcionamento offline após o primeiro acesso.
- cadastro demonstrativo do guincheiro;
- painel online/offline, corridas e ganhos;
- recebimento, aceite e andamento de corrida;
- conclusão com pagamento Pix demonstrativo.

## Próxima fase de produção

Conectar autenticação, banco de dados, mapas, geocodificação, parceiros em tempo real, notificações e pagamentos. Os valores e motoristas deste MVP são simulações e não realizam cobranças.
