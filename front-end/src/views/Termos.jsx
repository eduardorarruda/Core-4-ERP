import React from 'react';
import LegalLayout, { LegalSection, LegalLink, LegalEmail } from '../components/legal/LegalLayout';
import { usePageMeta } from '../hooks/usePageMeta';
import { CONTATO_EMAIL, CONTROLADOR, URL_APP, VERSAO_TERMOS, VIGENCIA } from '../content/legal';

const SECOES = [
  { id: 'objeto', titulo: 'O que é o serviço' },
  { id: 'cadastro', titulo: 'Cadastro e conta' },
  { id: 'contas-empresa', titulo: 'Contas de empresa' },
  { id: 'uso-permitido', titulo: 'Uso permitido e proibido' },
  { id: 'conteudo', titulo: 'Seus dados e conteúdo' },
  { id: 'assistente', titulo: 'Assistente Áurea' },
  { id: 'disponibilidade', titulo: 'Disponibilidade e mudanças' },
  { id: 'responsabilidade', titulo: 'Limitação de responsabilidade' },
  { id: 'encerramento', titulo: 'Suspensão e encerramento' },
  { id: 'propriedade', titulo: 'Propriedade intelectual' },
  { id: 'lei', titulo: 'Lei aplicável e foro' },
  { id: 'contato', titulo: 'Contato e vigência' },
];

export default function Termos() {
  usePageMeta({
    title: 'Termos de Uso',
    canonical: '/termos',
    description:
      'Regras de uso do Core 4 ERP, sistema gratuito de gestão financeira desenvolvido como projeto acadêmico: conta, contas de empresa, assistente de IA, responsabilidades e encerramento.',
  });

  return (
    <LegalLayout
      titulo="Termos de Uso"
      resumo="Estes termos regulam o uso do Core 4 ERP. Ao criar uma conta ou usar o sistema, você declara que leu e concorda com eles e com a Política de Privacidade. Se não concordar, não use o serviço."
      secoes={SECOES}
    >
      <LegalSection id="objeto" titulo="1. O que é o serviço">
        <p>
          O Core 4 ERP, disponível em <span className="font-mono">{URL_APP}</span>, é um software de gestão financeira
          para pessoas e empresas: contas a pagar e a receber, contas correntes, cartões, conciliação de extratos OFX,
          investimentos, assinaturas, relatórios e um assistente de inteligência artificial.
        </p>
        <p>
          Ele é um {CONTROLADOR.natureza}, mantido por {CONTROLADOR.responsavel} e pelos demais autores. É fornecido
          gratuitamente e <strong>no estado em que se encontra</strong>: não há garantia de funcionamento contínuo,
          acordo de nível de serviço (SLA), suporte com prazo definido nem garantia de que atenderá a uma necessidade
          específica sua.
        </p>
      </LegalSection>

      <LegalSection id="cadastro" titulo="2. Cadastro e conta">
        <ul>
          <li>Você precisa ter 18 anos ou mais para criar uma conta.</li>
          <li>Os dados informados no cadastro devem ser verdadeiros e mantidos atualizados.</li>
          <li>
            A senha é pessoal. Você é responsável por guardá-la e por tudo o que for feito com a sua conta. Se suspeitar
            de acesso indevido, troque a senha e avise pelo e-mail de contato.
          </li>
          <li>Cada conta pertence a uma pessoa. Não compartilhe seu acesso: em contas de empresa, convide membros.</li>
        </ul>
      </LegalSection>

      <LegalSection id="contas-empresa" titulo="3. Contas de empresa">
        <p>
          Em contas de empresa, o proprietário pode convidar outras pessoas e atribuir a cada uma um perfil de acesso,
          que define o que ela pode ver e fazer.
        </p>
        <ul>
          <li>
            O proprietário responde pelos membros que convida e pelos perfis e permissões que atribui, inclusive pelo
            acesso que eles passam a ter aos dados financeiros da empresa.
          </li>
          <li>
            O proprietário deve garantir que tem autorização para registrar no sistema os dados da empresa e de
            terceiros, como clientes e fornecedores.
          </li>
          <li>
            Os registros criados por um membro pertencem à empresa e continuam nela se o membro for removido.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="uso-permitido" titulo="4. Uso permitido e proibido">
        <p>Você pode usar o sistema para organizar as finanças suas ou da empresa que representa. Não é permitido:</p>
        <ul>
          <li>registrar dados que você não tem direito de tratar, ou usar o sistema para fins ilícitos, como fraude ou lavagem de dinheiro;</li>
          <li>tentar acessar dados de outras contas ou empresas, ou contornar o controle de acesso;</li>
          <li>testar vulnerabilidades, sobrecarregar o serviço, fazer engenharia reversa da instância em produção ou automatizar acessos em massa;</li>
          <li>enviar arquivos com código malicioso;</li>
          <li>usar o assistente para tentar obter dados de terceiros ou fazê-lo agir fora das suas permissões.</li>
        </ul>
        <p>
          Vulnerabilidades encontradas de boa-fé devem ser comunicadas pelo e-mail de contato, sem exploração.
        </p>
      </LegalSection>

      <LegalSection id="conteudo" titulo="5. Seus dados e conteúdo">
        <p>
          Os dados financeiros, arquivos e mensagens que você inclui no sistema são seus (ou da sua empresa). Você nos
          concede apenas uma licença limitada, não exclusiva e revogável para armazená-los e processá-los com o único
          fim de operar o serviço para você, inclusive enviando-os aos operadores descritos na{' '}
          <LegalLink to="/privacidade">Política de Privacidade</LegalLink>.
        </p>
        <p>
          Você pode baixar seus dados ou excluir sua conta em Configurações → Privacidade e dados. Recomendamos manter
          cópias próprias das informações importantes: por ser um projeto acadêmico, não garantimos backup.
        </p>
      </LegalSection>

      <LegalSection id="assistente" titulo="6. Assistente Áurea">
        <p>
          A Áurea é um assistente de inteligência artificial que responde perguntas e pode registrar lançamentos a seu
          pedido. O uso é opcional e envolve o envio de dados à OpenAI, nos Estados Unidos, conforme a{' '}
          <LegalLink to="/privacidade">Política de Privacidade</LegalLink>.
        </p>
        <ul>
          <li>
            As respostas são geradas por IA e <strong>podem conter erros</strong>, inclusive valores, datas e
            classificações incorretas.
          </li>
          <li>
            O assistente <strong>não substitui orientação contábil, fiscal, jurídica ou financeira profissional</strong>.
            Não tome decisões de investimento, impostos ou crédito apenas com base nele.
          </li>
          <li>
            Confira o que o assistente registrou antes de agir. As ações feitas por ele ficam identificadas na trilha de
            auditoria e podem ser corrigidas por você.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="disponibilidade" titulo="7. Disponibilidade e mudanças">
        <p>
          O serviço pode ficar indisponível para manutenção, por falhas ou por limites da infraestrutura. Podemos
          alterar, incluir ou remover funcionalidades, e podemos encerrar o serviço. Se decidirmos encerrá-lo,
          avisaremos com antecedência razoável para que você possa baixar seus dados.
        </p>
        <p>
          Podemos atualizar estes termos. Avisaremos dentro do aplicativo, e mudanças relevantes só valerão para você
          depois de um novo aceite.
        </p>
      </LegalSection>

      <LegalSection id="responsabilidade" titulo="8. Limitação de responsabilidade">
        <p>
          Dentro do permitido pela legislação brasileira, inclusive o Código de Defesa do Consumidor (Lei 8.078/1990)
          quando aplicável, não respondemos por:
        </p>
        <ul>
          <li>decisões financeiras, fiscais ou contábeis tomadas com base em informações do sistema ou do assistente;</li>
          <li>erros causados por dados incorretos inseridos por você ou pelos membros da sua empresa, ou por arquivos de extrato com problemas;</li>
          <li>perda de dados ou indisponibilidade decorrentes de falhas de terceiros, caso fortuito ou força maior;</li>
          <li>acesso indevido causado por descuido na guarda da senha ou por permissões atribuídas pelo proprietário.</li>
        </ul>
        <p>
          Nada nestes termos afasta direitos que a lei garante a você e que não podem ser renunciados, nem a nossa
          responsabilidade por dano causado com dolo ou culpa grave.
        </p>
      </LegalSection>

      <LegalSection id="encerramento" titulo="9. Suspensão e encerramento">
        <p>
          Você pode encerrar sua conta a qualquer momento em Configurações → Privacidade e dados →{' '}
          <strong>Excluir minha conta</strong>. O que acontece com os dados depois disso está descrito na{' '}
          <LegalLink to="/privacidade">Política de Privacidade</LegalLink>.
        </p>
        <p>
          Podemos suspender ou encerrar uma conta que viole estes termos, coloque em risco a segurança do serviço ou de
          outros usuários, ou por determinação legal. Sempre que possível, avisaremos antes e explicaremos o motivo.
        </p>
      </LegalSection>

      <LegalSection id="propriedade" titulo="10. Propriedade intelectual">
        <p>
          O código-fonte do Core 4 ERP é distribuído sob a licença MIT, que permite usá-lo, copiá-lo e modificá-lo nos
          termos dessa licença. Essa licença cobre o código, não a instância em produção: o uso do serviço hospedado em{' '}
          <span className="font-mono">{URL_APP}</span> segue estes termos.
        </p>
        <p>
          O nome e a marca Core 4 ERP identificam o projeto e não podem ser usados de forma a sugerir que uma versão
          modificada ou outro serviço é mantido pelos autores.
        </p>
      </LegalSection>

      <LegalSection id="lei" titulo="11. Lei aplicável e foro">
        <p>
          Estes termos seguem as leis da República Federativa do Brasil. Quando você for consumidor, fica eleito o foro
          do seu domicílio. Nos demais casos, aplica-se o foro definido pela legislação processual.
        </p>
      </LegalSection>

      <LegalSection id="contato" titulo="12. Contato e vigência">
        <p>
          Dúvidas, pedidos ou reclamações: <LegalEmail email={CONTATO_EMAIL} />.
        </p>
        <p>
          Versão <span className="font-mono">{VERSAO_TERMOS}</span>, vigente desde {VIGENCIA}.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
