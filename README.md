# AuditIA — demonstração local

MVP estático para demonstrar o fluxo de recebimento, conferência documental, análise simulada, revisão médica, indicadores e exportação de relatório. A aplicação usa **HTML, CSS e JavaScript puros**, sem módulos ES, build step, backend, dependências ou chamadas externas. É compatível com GitHub Pages e pode ser aberta diretamente no navegador.

> **Ambiente de demonstração — dados e análises simulados.** Todos os usuários, casos, documentos, referências e resultados são fictícios. O produto não está pronto para produção, não foi validado clinicamente e não deve ser usado em decisões assistenciais.

## Executar localmente

Não precisa instalar nada nem iniciar servidor:

1. Baixe ou clone os arquivos do projeto.
2. Abra `index.html` diretamente no navegador (duplo clique ou **Arquivo → Abrir arquivo**).

Os scripts usam tags `<script defer>` em ordem de dependência, e não `type="module"`, para funcionar também com `file://`. No GitHub, publique `index.html`, `style.css` e a pasta `js/` juntos no mesmo diretório. Em **Settings → Pages**, escolha a branch e a pasta que contém o `index.html` (por exemplo, `main` / raiz). Não existe processo de build.

## Acessos demonstrativos

Use os botões na tela de login:

| Perfil | Identificação fictícia | Senha exibida |
| --- | --- | --- |
| Médico auditor | `auditor@demo.auditia` | `demonstração` |
| Gestor médico | `gestor@demo.auditia` | `demonstração` |

Os botões entram sem enviar credenciais; os dados acima são apenas ilustrativos. A sessão é simulada por `sessionStorage`. O auditor vê casos atribuídos a si e pode revisar; o gestor vê todos os casos e indicadores, mas não conclui revisão.

## Roteiro de apresentação — 5 minutos

1. **Login e painel (0:00–0:40):** entre como auditor e mostre os indicadores e seus filtros.
2. **Solicitação (0:40–1:30):** abra um caso recente ou crie um caso fictício; demonstre campos e anexos locais. O botão “Carregar caso de exemplo” preenche dados de teste.
3. **Análise mock (1:30–2:30):** escolha um cenário no detalhe e execute “Executar análise simulada”. Explore matriz, limitações e evidências clicáveis. Teste “Falha técnica de processamento” para mostrar que não há conclusão nessa situação.
4. **Revisão (2:30–3:40):** abra a revisão, altere um critério e informe justificativa; salve rascunho ou marque a confirmação exigida e conclua. Confira a linha do tempo.
5. **Relatório e gestão (3:40–5:00):** visualize/ imprima o relatório; saia e entre como gestor para apresentar os indicadores e a concordância na demonstração. Finalize mostrando “Restaurar demonstração”.

## O que é simulado

- Autenticação, perfis, atribuições e permissões: controle apenas no cliente, sem servidor.
- Oito casos, identidades, CRM/UF, operadora, documentos textuais, referências, datas e histórico: dados fictícios.
- Análise: regras determinísticas por cenário; não há IA, extração de PDF/OCR, avaliação clínica, API ou serviço externo.
- Anexos: PDFs/JPGs/PNGs são selecionados e pré-visualizados localmente quando possível; apenas metadados ficam em `localStorage`. Os arquivos não são transmitidos nem persistidos. Resultados mock não são atribuídos ao conteúdo anexado.
- Indicadores e trilha de eventos: cálculos e registros locais demonstrativos, mutáveis e sem garantias de integridade.
- Relatório: composição local com opção de impressão/salvamento em PDF pelo navegador; revisão não equivale a assinatura digital nem a autorização assistencial.
- Checklists/códigos: conteúdos fictícios; não representam Rol, DUT, TUSS ou norma oficial vigente.

## Persistência e privacidade

`localStorage` guarda exclusivamente os casos fictícios e metadados de anexos da demonstração. A sessão usa `sessionStorage`. Não insira dados pessoais ou clínicos reais. A opção **Restaurar demonstração** pede confirmação e substitui os dados locais pelos oito casos iniciais. Limpar os dados do site no navegador também remove o estado local.

## Antes de qualquer versão real

- Implementar autenticação e autorização no servidor, controle de acesso por função e atribuição, gestão segura de sessão e proteção contra abuso. O controle de permissões desta interface é demonstrativo e não é uma barreira de segurança.
- Projetar backend/API, banco de dados, trilha de auditoria imutável, retenção, backup, monitoração e tratamento de erros.
- Definir governança, base legal, minimização, segurança e fluxo de privacidade para dados de saúde antes de processar qualquer dado real.
- Criar gestão documental segura, validação de arquivos, antivírus, armazenamento privado, controles de acesso, descarte e processamento verificável.
- Validar clinicamente e com profissionais qualificados todo checklist, fonte e fluxo; revisar também aspectos jurídicos, éticos e regulatórios aplicáveis antes de uso.
- Substituir a análise mock por serviço aprovado e avaliado, com rastreabilidade real das fontes, limites explícitos, revisão profissional obrigatória e monitoramento. Não tratar saídas como decisão autônoma.
- Disponibilizar assinatura digital apropriada se requerida; nome e CRM fictício não validam identidade nem registro.
- Remover dados fictícios, revisar acessibilidade, segurança, testes, disponibilidade e requisitos operacionais antes de qualquer lançamento.

**Este repositório é somente um protótipo de apresentação. Não constitui produto clínico, recomendação médica, decisão de cobertura ou ferramenta pronta para produção.**
