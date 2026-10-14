import React from 'react';
import LegalLayout, { LegalSection, LegalLink, LegalEmail } from '../components/legal/LegalLayout';
import { usePageMeta } from '../hooks/usePageMeta';
import { CONTATO_EMAIL, CONTROLADOR, URL_APP, VERSAO_TERMOS, VIGENCIA } from '../content/legal';

const SECOES = [
  { id: 'controlador', titulo: 'Quem é o controlador' },
  { id: 'dados-coletados', titulo: 'Quais dados tratamos' },
  { id: 'finalidades', titulo: 'Finalidades e bases legais' },
  { id: 'compartilhamento', titulo: 'Com quem compartilhamos' },
  { id: 'transferencia-internacional', titulo: 'Transferência internacional' },
  { id: 'retencao', titulo: 'Por quanto tempo guardamos' },
  { id: 'direitos', titulo: 'Seus direitos' },
  { id: 'como-exercer', titulo: 'Como exercer seus direitos' },
  { id: 'seguranca', titulo: 'Segurança' },
  { id: 'cookies', titulo: 'Cookies e armazenamento local' },
  { id: 'menores', titulo: 'Menores de idade' },
  { id: 'encarregado', titulo: 'Encarregado (DPO)' },
  { id: 'alteracoes', titulo: 'Alterações desta política' },
];

export default function Privacidade() {
  usePageMeta({
    title: 'Política de Privacidade',
    canonical: '/privacidade',
    description:
      'Como o Core 4 trata seus dados pessoais e financeiros: o que coletamos, para quê, com quem compartilhamos, por quanto tempo guardamos e como exercer seus direitos pela LGPD.',
  });

  return (
    <LegalLayout
      titulo="Política de Privacidade"
      resumo="Este documento explica quais dados pessoais o Core 4 trata, por que trata, com quem compartilha e como você pode exercer seus direitos. Ele segue a Lei Geral de Proteção de Dados (Lei 13.709/2018, a LGPD) e, no que couber, o Regulamento Geral de Proteção de Dados europeu (GDPR)."
      secoes={SECOES}
    >
      <LegalSection id="controlador" titulo="1. Quem é o controlador">
        <p>
          O Core 4 é um {CONTROLADOR.natureza}, disponível em <span className="font-mono break-all">{URL_APP}</span>.
          O controlador dos dados é <strong>{CONTROLADOR.responsavel}</strong>, {CONTROLADOR.papel}, em conjunto
          com os demais autores: {CONTROLADOR.coautores.join(', ')}.
        </p>
        <p>
          O projeto é mantido por pessoas físicas e não tem empresa constituída. Para qualquer assunto sobre seus
          dados, escreva para <LegalEmail email={CONTATO_EMAIL} />.
        </p>
      </LegalSection>

      <LegalSection id="dados-coletados" titulo="2. Quais dados tratamos">
        <h3>Cadastro e conta</h3>
        <ul>
          <li>Nome, e-mail e, se você informar, telefone e foto de perfil.</li>
          <li>
            Senha: nunca é guardada em texto. Armazenamos apenas um hash gerado com bcrypt, que não permite
            recuperar a senha original.
          </li>
          <li>
            Em contas de empresa: nome da empresa e, se informados, CNPJ, e-mail e telefone de contato, além dos
            membros convidados e dos perfis de acesso atribuídos a cada um.
          </li>
        </ul>

        <h3>Dados financeiros que você lança</h3>
        <p>
          Contas a pagar e a receber, contas correntes, cartões, lançamentos, categorias, parceiros
          (clientes e fornecedores), investimentos, assinaturas e relatórios. Esses dados podem conter informações
          pessoais de terceiros, como o nome de um fornecedor pessoa física. Você é responsável por ter base legal
          para registrá-los.
        </p>

        <h3>Arquivos enviados</h3>
        <p>
          Extratos OFX usados na conciliação bancária e de cartão, planilhas e outros anexos que você envia, inclusive
          os anexados em conversas com o assistente.
        </p>

        <h3>Conversas com o assistente Áurea</h3>
        <p>
          As mensagens que você escreve, as respostas geradas e o registro das ações que o assistente executou na sua
          conta.
        </p>

        <h3>Dados técnicos e de segurança</h3>
        <ul>
          <li>Logs técnicos de requisições e erros, com data, hora, rota acessada e tempo de resposta.</li>
          <li>Endereço IP, usado para limitar tentativas de login e investigar abusos.</li>
          <li>
            Trilha de auditoria: quem criou, alterou ou excluiu cada registro, quando, de qual IP e se a ação foi feita
            pelo assistente.
          </li>
          <li>Tentativas de login malsucedidas e bloqueios temporários da conta.</li>
        </ul>

        <h3>Cookie e preferências</h3>
        <p>
          O cookie <span className="font-mono">access_token</span>, que mantém sua sessão, e preferências guardadas
          no próprio navegador, como o tema claro ou escuro. Detalhes na seção{' '}
          <a href="#cookies" className="text-primary underline underline-offset-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cookies e armazenamento local</a>.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" titulo="3. Finalidades e bases legais">
        <p>Cada tratamento se apoia em uma das hipóteses do art. 7º da LGPD:</p>
        <ul>
          <li>
            <strong>Execução de contrato (art. 7º, V):</strong> criar e manter sua conta, autenticar o acesso,
            guardar e processar os dados financeiros que você lança, importar extratos, gerar relatórios, enviar
            e-mails de redefinição de senha e convites para membros da empresa.
          </li>
          <li>
            <strong>Legítimo interesse (art. 7º, IX):</strong> segurança da plataforma, prevenção a fraude e a acesso
            indevido, limite de tentativas de login, logs técnicos, trilha de auditoria e correção de erros. Usamos
            apenas o necessário para esses fins.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal ou regulatória (art. 7º, II):</strong> quando a lei exigir que
            guardemos ou entreguemos algum dado, por exemplo mediante ordem judicial.
          </li>
          <li>
            <strong>Consentimento (art. 7º, I):</strong> uso do assistente de IA Áurea. Ele é opcional: o envio de
            dados à OpenAI acontece quando você decide conversar com o assistente ou pedir uma sugestão automática.
            A exceção são os resumos mensais agregados descritos na seção 4, preparados periodicamente para que o
            assistente tenha contexto quando você o usar. Você pode revogar o consentimento a qualquer momento
            deixando de usar esses recursos ou pedindo pelo e-mail de contato, sem afetar o restante do sistema.
          </li>
        </ul>
        <p>
          Não usamos seus dados para publicidade, não traçamos perfil de consumo para terceiros e não vendemos dados.
        </p>
      </LegalSection>

      <LegalSection id="compartilhamento" titulo="4. Com quem compartilhamos">
        <p>
          Compartilhamos dados apenas com operadores que nos ajudam a fazer o sistema funcionar, e somente o
          necessário para cada função:
        </p>
        <ul>
          <li>
            <strong>OpenAI (Estados Unidos):</strong> processa as conversas com a Áurea. São enviadas suas mensagens,
            os arquivos que você anexa à conversa e o contexto financeiro necessário para a resposta (por exemplo,
            saldos, lançamentos e categorias consultados pelo assistente). A OpenAI também é usada para sugerir
            categorias a partir da descrição de um lançamento e para gerar representações numéricas (embeddings) de
            resumos financeiros mensais agregados, que ficam guardadas em um banco vetorial na nossa própria
            infraestrutura e servem de contexto ao assistente. Conforme a política de uso da API da OpenAI vigente,
            os dados enviados pela API não são usados para treinar os modelos dela.
          </li>
          <li>
            <strong>Cloudflare:</strong> o acesso ao sistema passa por um túnel e pela rede da Cloudflare, que
            trafega as requisições (incluindo endereço IP e conteúdo cifrado em trânsito) até nossos servidores.
          </li>
          <li>
            <strong>Provedor de banco de dados gerenciado:</strong> hospeda o banco PostgreSQL onde ficam os dados da
            conta e os dados financeiros.
          </li>
          <li>
            <strong>Google (Gmail SMTP):</strong> envia os e-mails de redefinição de senha e de convite. Recebe o
            endereço de destino e o conteúdo da mensagem.
          </li>
        </ul>
        <p>
          Em contas de empresa, os membros que o proprietário convidar veem os dados da empresa conforme o perfil de
          acesso atribuído a eles. Também podemos fornecer dados a autoridades quando houver obrigação legal.
        </p>
      </LegalSection>

      <LegalSection id="transferencia-internacional" titulo="5. Transferência internacional">
        <p>
          O uso do assistente envolve transferência de dados para os Estados Unidos, onde a OpenAI processa as
          requisições. A Cloudflare e o Google também podem processar dados fora do Brasil.
        </p>
        <p>
          Essas transferências ocorrem com base no art. 33 da LGPD: no caso do assistente, pelo{' '}
          <strong>consentimento específico e destacado</strong> que você dá ao optar por usá-lo, ciente de que os
          dados serão processados no exterior (art. 33, VIII); e, de forma complementar, pelas cláusulas contratuais
          de proteção de dados oferecidas por cada provedor nos seus termos de serviço. Se você não concordar, basta
          não usar o assistente.
        </p>
      </LegalSection>

      <LegalSection id="retencao" titulo="6. Por quanto tempo guardamos">
        <ul>
          <li><strong>Logs técnicos:</strong> 30 dias.</li>
          <li>
            <strong>Dados da conta, dados financeiros, arquivos e conversas:</strong> enquanto a conta existir.
          </li>
          <li>
            <strong>Após a exclusão da conta:</strong> a conta é desativada e os dados pessoais são anonimizados.
            Guardamos apenas o que for exigido por obrigação legal ou necessário para defesa em processo judicial,
            administrativo ou arbitral, pelo prazo correspondente.
          </li>
        </ul>
        <p>
          Em contas de empresa, os dados financeiros pertencem à empresa. Se você é membro e sai da empresa, seus dados
          pessoais deixam de ser tratados em nome dela, mas os registros que você criou continuam na empresa.
        </p>
      </LegalSection>

      <LegalSection id="direitos" titulo="7. Seus direitos">
        <p>Pelo art. 18 da LGPD, você pode pedir, a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados;</li>
          <li>acesso aos dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desacordo com a lei;</li>
          <li>portabilidade dos dados a outro fornecedor;</li>
          <li>eliminação dos dados tratados com base no consentimento;</li>
          <li>informação sobre com quem compartilhamos seus dados;</li>
          <li>informação sobre a possibilidade de não consentir e as consequências da recusa;</li>
          <li>revogação do consentimento.</li>
        </ul>
        <p>
          Você também pode pedir a revisão de decisões tomadas unicamente com base em tratamento automatizado (art. 20).
          No Core 4, o que a IA sugere ou registra, como a categoria de um lançamento, pode ser revisado e
          corrigido por você a qualquer momento, e as ações do assistente ficam identificadas na trilha de auditoria.
        </p>
      </LegalSection>

      <LegalSection id="como-exercer" titulo="8. Como exercer seus direitos">
        <ul>
          <li>
            <strong>Pelo sistema:</strong> em Configurações → <strong>Privacidade e dados</strong>. A opção
            <strong> Baixar meus dados</strong> gera um arquivo JSON com seus dados; a opção
            <strong> Excluir minha conta</strong> inicia a exclusão. Nome, telefone e foto podem ser corrigidos em
            Configurações a qualquer momento.
          </li>
          <li>
            <strong>Por e-mail:</strong> escreva para <LegalEmail email={CONTATO_EMAIL} /> a partir do e-mail
            cadastrado. Podemos pedir uma confirmação de identidade antes de atender.
          </li>
        </ul>
        <p>
          Respondemos em até 15 dias, contados do recebimento do pedido (art. 19, II). Se não ficar satisfeito com a
          resposta, você pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD) em{' '}
          <span className="font-mono">gov.br/anpd</span>.
        </p>
      </LegalSection>

      <LegalSection id="seguranca" titulo="9. Segurança">
        <p>Medidas que adotamos:</p>
        <ul>
          <li>senhas guardadas apenas como hash bcrypt;</li>
          <li>tráfego cifrado com HTTPS;</li>
          <li>sessão em cookie HttpOnly, inacessível a scripts da página;</li>
          <li>limite de tentativas de login por IP e bloqueio temporário após falhas seguidas;</li>
          <li>isolamento dos dados por empresa: uma conta não acessa dados de outra;</li>
          <li>controle de acesso por perfil dentro de cada empresa;</li>
          <li>trilha de auditoria das alterações feitas por pessoas e pelo assistente.</li>
        </ul>
        <p>
          Nenhum sistema é totalmente seguro. Se ocorrer um incidente que possa causar risco ou dano relevante a você,
          comunicaremos a você e à ANPD em prazo razoável, como determina o art. 48 da LGPD, informando o que
          aconteceu, quais dados foram afetados e o que foi feito.
        </p>
      </LegalSection>

      <LegalSection id="cookies" titulo="10. Cookies e armazenamento local">
        <p>
          Usamos um único cookie: <span className="font-mono">access_token</span>. Ele é estritamente necessário para
          manter você conectado, é marcado como HttpOnly e não serve para rastreamento. Por ser essencial, não depende
          de consentimento.
        </p>
        <p>
          Não usamos cookies de publicidade, de rastreamento nem ferramentas de analytics de terceiros.
        </p>
        <p>
          O navegador também guarda, no armazenamento local (localStorage e sessionStorage), preferências como o tema
          e informações da sessão atual, como seu nome e permissões, para a interface funcionar. Esses dados ficam no
          seu dispositivo e são apagados ao sair da conta ou limpar os dados do site.
        </p>
      </LegalSection>

      <LegalSection id="menores" titulo="11. Menores de idade">
        <p>
          O Core 4 não é destinado a menores de 18 anos. Se soubermos que uma conta pertence a um menor, ela será
          desativada e os dados, eliminados. Se você é responsável por um menor que criou uma conta, escreva para{' '}
          <LegalEmail email={CONTATO_EMAIL} />.
        </p>
      </LegalSection>

      <LegalSection id="encarregado" titulo="12. Encarregado (DPO)">
        <p>
          O encarregado pelo tratamento de dados pessoais é {CONTROLADOR.responsavel}. Contato:{' '}
          <LegalEmail email={CONTATO_EMAIL} />.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" titulo="13. Alterações desta política">
        <p>
          Podemos atualizar esta política quando o sistema ou a lei mudarem. Avisaremos dentro do aplicativo. Quando a
          mudança for relevante, a nova versão só valerá para você depois de um novo aceite.
        </p>
        <p>
          Versão <span className="font-mono">{VERSAO_TERMOS}</span>, vigente desde {VIGENCIA}. Veja também os{' '}
          <LegalLink to="/termos">Termos de Uso</LegalLink>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
