// Constantes compartilhadas pela Política de Privacidade e pelos Termos de Uso.
// Ao alterar o conteúdo jurídico, atualize VERSAO_TERMOS e VIGENCIA juntos:
// uma nova versão exige novo aceite dos usuários.

export const VERSAO_TERMOS = '2026-10';
export const VIGENCIA = 'outubro de 2026';

// ATENÇÃO: este endereço veio do placeholder MAIL_FROM do .env.example e é só
// um remetente técnico. ANTES DE IR PARA PRODUÇÃO, substitua pelo e-mail real
// do encarregado pelo tratamento de dados (DPO), que precisa ser lido por uma pessoa.
export const CONTATO_EMAIL = 'noreply@core4erp.com';

// Dados do controlador conforme o arquivo LICENSE do repositório.
// Não há CNPJ nem endereço: o projeto é um Trabalho de Conclusão de Curso (TCC)
// mantido por pessoas físicas. Não invente esses dados.
export const CONTROLADOR = Object.freeze({
  responsavel: 'Eduardo Ribeiro Arruda',
  papel: 'autor principal e responsável pelo projeto',
  coautores: Object.freeze([
    'Carlos Daniel Dias Freitas',
    'João Victor Barbosa Dourado',
    'João Marcello Pereira do Prado',
  ]),
  natureza: 'projeto acadêmico (Trabalho de Conclusão de Curso)',
});

export const URL_APP = 'https://front.core4erp.codes';
