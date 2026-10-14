import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { cartoes as cartoesApi, contasCorrentes as contasApi } from '../lib/api';
import { useCarga } from '../hooks/useCarga';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { usePermissao } from '../hooks/usePermissao';
import { formatarMoeda } from '../lib/formatters';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import FilterBar from '../components/ui/FilterBar';
import PermissaoGuard from '../components/ui/PermissaoGuard';
import Skeleton from '../components/ui/Skeleton';
import { Stagger, StaggerItem } from '../components/motion/Movimento';
import LancamentoCartaoForm from '../components/forms/LancamentoCartaoForm';
import CartoesTabs from '../components/cartoes/CartoesTabs';
import CartaoPlastico from '../components/cartoes/CartaoPlastico';
import CartaoFormModal from '../components/cartoes/CartaoFormModal';
import ImportarPlanilhaModal from '../components/cartoes/ImportarPlanilhaModal';
import LinhaDoTempoFaturas from '../components/cartoes/LinhaDoTempoFaturas';
import FaturaResumo from '../components/cartoes/FaturaResumo';
import LancamentosTabela from '../components/cartoes/LancamentosTabela';
import { useValorAtrasado } from '../hooks/useValorAtrasado';
import { agruparFaturas, chaveFatura, rotuloFatura } from '../components/cartoes/faturas';

/*
 * Cartões → "Faturas e lançamentos" (/cartoes, CARTAO_LANCAR).
 * Galeria de cartões (plástico 3D) → faturas do cartão escolhido (linha do tempo) → resumo da
 * fatura com barra por categoria → lançamentos dessa fatura (um único filtro: a fatura escolhida
 * + busca no servidor, com espera de 300 ms). Estado na URL: ?cartao=1&fatura=2026-10&novo=lancamento.
 */

function AcoesCartao({ cartao, onEditar, onExcluir }) {
  return (
    <div className="flex">
      <PermissaoGuard permissao="CARTAO_EDITAR">
        <Button variant="ghost" size="icon-sm" onClick={() => onEditar(cartao)} aria-label={`Editar ${cartao.nome}`} className="text-text-primary/75 hover:bg-text-primary/10">
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </Button>
      </PermissaoGuard>
      <PermissaoGuard permissao="CARTAO_DELETAR">
        <Button variant="ghost" size="icon-sm" onClick={() => onExcluir(cartao)} aria-label={`Excluir ${cartao.nome}`} className="text-text-primary/75 hover:bg-text-primary/10">
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      </PermissaoGuard>
    </div>
  );
}

function CarregandoGaleria() {
  return (
    <div role="status" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      <span className="sr-only">Carregando cartões…</span>
      {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[1.586/1] rounded-3xl" />)}
    </div>
  );
}

export default function Cartoes() {
  const toast = useToast();
  const confirmar = useConfirm();
  const pode = usePermissao();
  const [params, setParams] = useSearchParams();
  const [versao, setVersao] = useState(0);
  const [busca, setBusca] = useState('');
  const termo = useValorAtrasado(busca.trim(), 300);
  const [editando, setEditando] = useState(null);
  const [modalCartao, setModalCartao] = useState(null); // { modo, cartao? }
  const [importando, setImportando] = useState(false);
  const [fechando, setFechando] = useState(false);

  // ── Dados ───────────────────────────────────────────────────────────────
  const cargaCartoes = useCarga(() => cartoesApi.listar(), [versao]);
  const cartoes = useMemo(() => cargaCartoes.dados ?? [], [cargaCartoes.dados]);
  const cartao = cartoes.find((c) => String(c.id) === params.get('cartao')) ?? cartoes[0] ?? null;

  const cargaTodos = useCarga(() => cartoesApi.lancamentos.listar(cartao.id), [cartao?.id, versao], { ativo: Boolean(cartao), inicial: [] });
  const faturas = useMemo(() => agruparFaturas(cargaTodos.dados ?? []), [cargaTodos.dados]);
  const fatura = faturas.find((f) => f.chave === params.get('fatura'))
    ?? faturas.find((f) => f.situacao === 'aberta')
    ?? faturas[faturas.length - 1]
    ?? null;
  const lancsDaFatura = useMemo(
    () => (fatura ? (cargaTodos.dados ?? []).filter((l) => chaveFatura(l.anoFatura, l.mesFatura) === fatura.chave) : []),
    [cargaTodos.dados, fatura],
  );

  // Lista da tabela: UM filtro (servidor) — fatura escolhida + busca
  const cargaTabela = useCarga(
    () => cartoesApi.lancamentos.listar(cartao.id, { mes: fatura.mes, ano: fatura.ano, ...(termo ? { busca: termo } : {}) }),
    [cartao?.id, fatura?.chave, termo, versao],
    { ativo: Boolean(cartao && fatura), inicial: [] },
  );

  const contasCarga = useCarga(() => contasApi.listar(), ['contas'], { ativo: Boolean(modalCartao), inicial: [] });

  // ── URL ─────────────────────────────────────────────────────────────────
  const mudarParams = (mudar) => setParams((atual) => {
    const p = new URLSearchParams(atual);
    mudar(p);
    return p;
  }, { replace: true });
  const escolherCartao = (c) => mudarParams((p) => { p.set('cartao', String(c.id)); p.delete('fatura'); });
  const escolherFatura = (chave) => mudarParams((p) => p.set('fatura', chave));
  const novoAberto = params.get('novo') === 'lancamento' && Boolean(cartao);
  const abrirNovo = () => mudarParams((p) => p.set('novo', 'lancamento'));
  const fecharDrawer = () => { setEditando(null); mudarParams((p) => p.delete('novo')); };

  const recarregar = () => setVersao((v) => v + 1);

  // ── Ações ───────────────────────────────────────────────────────────────
  async function excluirLancamento(l) {
    const ok = await confirmar({
      title: 'Excluir lançamento?',
      message: `"${l.descricao}" sai da fatura de ${rotuloFatura(l.anoFatura, l.mesFatura, { curto: false })}.${l.totalParcelas > 1 ? ' Só esta parcela é excluída.' : ''}`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await cartoesApi.lancamentos.deletar(cartao.id, l.id);
      toast.success('Lançamento excluído.');
      recarregar();
    } catch (e) {
      toast.error(e.message || 'Não foi possível excluir o lançamento.');
    }
  }

  async function excluirCartao(c) {
    const ok = await confirmar({
      title: `Excluir o ${c.nome}?`,
      message: 'O cartão sai da lista. Só é possível excluir um cartão sem fatura em aberto.',
      confirmLabel: 'Excluir cartão',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await cartoesApi.deletar(c.id);
      toast.success('Cartão excluído.');
      mudarParams((p) => { p.delete('cartao'); p.delete('fatura'); });
      recarregar();
    } catch (e) {
      toast.error(e.message || 'Não foi possível excluir o cartão.');
    }
  }

  async function fecharFatura(f) {
    const ok = await confirmar({
      title: `Fechar a fatura de ${rotuloFatura(f.ano, f.mes, { curto: false })}?`,
      message: `Vamos gerar uma conta a pagar de ${formatarMoeda(f.total)} e a fatura não aceitará mais lançamentos.`,
      confirmLabel: 'Fechar fatura',
      variant: 'warning',
    });
    if (!ok) return;
    setFechando(true);
    try {
      await cartoesApi.fecharFatura(cartao.id, { mes: f.mes, ano: f.ano });
      toast.success('Fatura fechada. A conta a pagar já está em Contas a pagar e receber.');
      recarregar();
    } catch (e) {
      toast.error(e.message || 'Não foi possível fechar a fatura.');
    } finally {
      setFechando(false);
    }
  }

  function aoSalvarLancamento(_, dto) {
    const editar = Boolean(editando);
    toast.success(editar ? 'Lançamento atualizado.' : dto.quantidadeParcelas > 1 ? `Compra lançada em ${dto.quantidadeParcelas} parcelas.` : 'Lançamento adicionado.');
    fecharDrawer();
    recarregar();
  }

  // ── Render ──────────────────────────────────────────────────────────────
  const podeLancar = pode('CARTAO_LANCAR');
  const cabecalho = (
    <PageHeader
      title="Cartões"
      subtitle="Faturas, limites e lançamentos de cada cartão."
      icon={CreditCard}
      actions={
        <div className="flex flex-wrap gap-2">
          <PermissaoGuard permissao="CARTAO_CRIAR">
            <Button variant="secondary" onClick={() => setModalCartao({ modo: 'criar' })} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
              Novo cartão
            </Button>
          </PermissaoGuard>
          {cartao && podeLancar && (
            <Button onClick={abrirNovo} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>Novo lançamento</Button>
          )}
        </div>
      }
    >
      <CartoesTabs />
    </PageHeader>
  );

  let conteudo;
  if (cargaCartoes.carregandoInicial) {
    conteudo = <CarregandoGaleria />;
  } else if (cargaCartoes.erro && !cartoes.length) {
    conteudo = <AlertaErro mensagem={cargaCartoes.erro.message} onTentarNovamente={cargaCartoes.recarregar} />;
  } else if (!cartoes.length) {
    conteudo = (
      <EmptyState
        icon={CreditCard}
        title="Nenhum cartão cadastrado"
        description="Cadastre um cartão para lançar compras, acompanhar as faturas e ver quanto do limite ainda está livre."
        action={pode('CARTAO_CRIAR') ? { label: 'Adicionar cartão', onClick: () => setModalCartao({ modo: 'criar' }), icon: Plus } : undefined}
      />
    );
  } else {
    conteudo = (
      <div className="space-y-8">
        <section aria-labelledby="titulo-galeria">
          <h2 id="titulo-galeria" className="sr-only">Seus cartões</h2>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {cartoes.map((c) => (
              <StaggerItem key={c.id}>
                <CartaoPlastico
                  cartao={c}
                  selecionado={c.id === cartao.id}
                  onSelecionar={escolherCartao}
                  acoes={<AcoesCartao cartao={c} onEditar={(x) => setModalCartao({ modo: 'editar', cartao: x })} onExcluir={excluirCartao} />}
                />
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section aria-labelledby="titulo-faturas" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="titulo-faturas" className="font-display text-lg font-semibold text-text-primary">Faturas do {cartao.nome}</h2>
              <p className="text-sm text-text-primary/60">Escolha uma fatura para ver os lançamentos dela.</p>
            </div>
          </div>

          {cargaTodos.erro ? (
            <AlertaErro mensagem={cargaTodos.erro.message} onTentarNovamente={recarregar} compacto />
          ) : cargaTodos.carregando && !faturas.length ? (
            <div className="flex gap-2" role="status"><span className="sr-only">Carregando faturas…</span>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="w-36 h-[5.5rem] rounded-2xl" />)}</div>
          ) : !fatura ? (
            <EmptyState
              compact
              icon={CreditCard}
              title="Este cartão ainda não tem lançamentos"
              description="Lance a primeira compra ou importe uma planilha para começar a montar as faturas."
              action={podeLancar ? { label: 'Novo lançamento', onClick: abrirNovo, icon: Plus } : undefined}
              secondaryAction={{ label: 'Importar planilha', onClick: () => setImportando(true) }}
            />
          ) : (
            <>
              <LinhaDoTempoFaturas faturas={faturas} valor={fatura.chave} onChange={escolherFatura} />
              <FaturaResumo
                cartao={cartao}
                fatura={fatura}
                lancamentos={lancsDaFatura}
                fechando={fechando}
                onFechar={fecharFatura}
                onImportar={() => setImportando(true)}
              />
            </>
          )}
        </section>

        {fatura && (
          <section aria-labelledby="titulo-lancamentos" className="space-y-4">
            <h2 id="titulo-lancamentos" className="font-display text-lg font-semibold text-text-primary">
              Lançamentos de {rotuloFatura(fatura.ano, fatura.mes, { curto: false })}
            </h2>
            <FilterBar
              busca={{ value: busca, onChange: setBusca, placeholder: 'Buscar por descrição, categoria ou parceiro', label: 'Buscar lançamentos' }}
              filtrosAtivos={busca ? 1 : 0}
              onLimpar={() => setBusca('')}
            />
            <div aria-busy={cargaTabela.carregando} className={cargaTabela.carregando && !cargaTabela.carregandoInicial ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              {cargaTabela.erro ? (
                <AlertaErro mensagem={cargaTabela.erro.message} onTentarNovamente={cargaTabela.recarregar} />
              ) : (
                <LancamentosTabela
                  rotulo={`Lançamentos da fatura de ${rotuloFatura(fatura.ano, fatura.mes, { curto: false })}`}
                  lancamentos={cargaTabela.dados ?? []}
                  carregando={cargaTabela.carregandoInicial}
                  podeEditar={podeLancar}
                  onEditar={setEditando}
                  onExcluir={excluirLancamento}
                  vazio={termo ? (
                    <EmptyState compact icon={Search} title="Nada encontrado" description={`Nenhum lançamento desta fatura combina com "${termo}".`} action={{ label: 'Limpar busca', onClick: () => setBusca('') }} />
                  ) : undefined}
                />
              )}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cabecalho}
      {conteudo}

      <Drawer
        open={Boolean(editando) || novoAberto}
        onClose={fecharDrawer}
        title={editando ? 'Editar lançamento' : 'Novo lançamento'}
        description={cartao ? cartao.nome : undefined}
        size="md"
      >
        {cartao && (editando || novoAberto) && (
          <LancamentoCartaoForm
            key={editando?.id ?? `novo-${cartao.id}`}
            modo={editando ? 'editar' : 'criar'}
            cartaoId={cartao.id}
            inicial={editando ?? undefined}
            diaFechamento={cartao.diaFechamento}
            onSalvo={aoSalvarLancamento}
            onCancelar={fecharDrawer}
            compacto
          />
        )}
      </Drawer>

      <CartaoFormModal
        open={Boolean(modalCartao)}
        modo={modalCartao?.modo}
        cartao={modalCartao?.cartao}
        contas={contasCarga.dados ?? []}
        onFechar={() => setModalCartao(null)}
        onSalvo={(salvo) => {
          toast.success(modalCartao?.modo === 'editar' ? 'Cartão atualizado.' : 'Cartão adicionado.');
          setModalCartao(null);
          if (salvo?.id) escolherCartao(salvo);
          recarregar();
        }}
      />

      <ImportarPlanilhaModal
        open={importando}
        cartao={cartao}
        onFechar={() => setImportando(false)}
        onImportado={(res) => { toast.success(`${res.lancamentosCriados} lançamento(s) importado(s).`); recarregar(); }}
      />
    </div>
  );
}
