import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, CornerDownRight, Pencil, Plus, RotateCcw, Tags, Trash2 } from 'lucide-react';
import { categorias as api } from '../lib/api';
import { cn } from '../lib/utils';
import { useCarga } from '../hooks/useCarga';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { usePermissao } from '../hooks/usePermissao';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import FilterBar from '../components/ui/FilterBar';
import SkeletonCard from '../components/ui/SkeletonCard';
import Tabs from '../components/ui/Tabs';
import { Revelar, Stagger, StaggerItem } from '../components/motion/Movimento';
import CategoriaForm from '../components/financeiro/CategoriaForm';
import { ChipCategoria } from '../components/financeiro/IconesCategoria';

const ID_ABAS = 'categorias';
const porNome = (a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR');

function Linha({ c, sub, inativa, paiInativo, onEditar, onExcluir, onReativar, onNovaSub }) {
  const pode = usePermissao();
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1.5 min-h-12 rounded-xl', !inativa && 'hover:bg-text-primary/[0.03]')}>
      {sub && <CornerDownRight className="w-4 h-4 shrink-0 text-text-primary/35" aria-hidden="true" />}
      <ChipCategoria icone={c.icone} tamanho={sub ? 'sm' : 'md'} tom={inativa ? 'neutro' : 'primary'} />
      <div className="min-w-0 flex-1 basis-[7rem]">
        <p className={cn('truncate', sub ? 'text-sm' : 'font-medium font-display')}>{c.descricao}</p>
        {inativa && sub && c.categoriaPaiDescricao && (
          <p className="text-xs text-text-primary/60 truncate">em {c.categoriaPaiDescricao}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {inativa ? (
          pode('CATEGORIA_EDITAR') && (
            <Button variant="secondary" size="sm" className="min-h-11 sm:min-h-9" onClick={() => onReativar(c)} disabled={paiInativo}
              title={paiInativo ? 'Reative primeiro a categoria principal' : undefined}
              leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />} aria-label={`Reativar ${c.descricao}`}>
              Reativar
            </Button>
          )
        ) : (
          <>
            {!sub && pode('CATEGORIA_CRIAR') && (
              <Button variant="ghost" size="icon-sm" onClick={() => onNovaSub(c)} aria-label={`Nova subcategoria em ${c.descricao}`} title="Nova subcategoria">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            {pode('CATEGORIA_EDITAR') && (
              <Button variant="ghost" size="icon-sm" onClick={() => onEditar(c)} aria-label={`Editar ${c.descricao}`} title="Editar ou mover">
                <Pencil className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            {pode('CATEGORIA_DELETAR') && (
              <Button variant="danger-ghost" size="icon-sm" onClick={() => onExcluir(c)} aria-label={`Desativar ${c.descricao}`} title="Desativar">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Ramo({ raiz, filhas, aberto, onAlternar, acoes }) {
  const idFilhas = `filhas-${raiz.id}`;
  return (
    <article className="c4-card p-2">
      <div className="flex flex-wrap items-center">
        <div className="flex-1 min-w-0 basis-[12rem]"><Linha c={raiz} {...acoes} /></div>
        {filhas.length > 0 && (
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={aberto}
            aria-controls={idFilhas}
            aria-label={`${aberto ? 'Esconder' : 'Mostrar'} ${filhas.length} subcategorias de ${raiz.descricao}`}
            className="shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center gap-1 rounded-xl text-xs text-text-primary/65 hover:text-text-primary hover:bg-text-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="tabular-nums">{filhas.length}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
          </button>
        )}
      </div>
      {filhas.length > 0 && (
        <Revelar aberto={aberto} id={idFilhas}>
          <ul className="mt-1 ml-5 pl-3 border-l border-border space-y-0.5">
            {filhas.map((f) => <li key={f.id}><Linha c={f} sub {...acoes} /></li>)}
          </ul>
        </Revelar>
      )}
    </article>
  );
}

export default function Categorias() {
  const toast = useToast();
  const confirmar = useConfirm();
  const pode = usePermissao();
  const [searchParams, setSearchParams] = useSearchParams();
  const [aba, setAba] = useState('ativas');
  const [busca, setBusca] = useState('');
  const [fechados, setFechados] = useState(() => new Set());
  const [form, setForm] = useState(null); // null = fechado; {} = nova; { categoriaPaiId } = nova sub; com id = edição
  const criandoUrl = searchParams.get('novo') != null && pode('CATEGORIA_CRIAR');

  const lista = useCarga(() => api.listar(), [], { inicial: [] });
  const todas = useMemo(() => lista.dados ?? [], [lista.dados]);
  const ativas = useMemo(() => todas.filter((c) => c.ativo !== false), [todas]);
  const inativas = useMemo(() => todas.filter((c) => c.ativo === false).sort(porNome), [todas]);
  const raizesAtivas = useMemo(() => ativas.filter((c) => !c.categoriaPaiId).sort(porNome), [ativas]);
  const idsAtivos = useMemo(() => new Set(ativas.map((c) => c.id)), [ativas]);

  const termo = busca.trim().toLowerCase();
  const arvore = useMemo(() => {
    const filhasDe = (id) => ativas.filter((c) => c.categoriaPaiId === id).sort(porNome);
    return raizesAtivas
      .map((r) => {
        const filhas = filhasDe(r.id);
        if (!termo || r.descricao.toLowerCase().includes(termo)) return { raiz: r, filhas };
        const achadas = filhas.filter((f) => f.descricao.toLowerCase().includes(termo));
        return achadas.length ? { raiz: r, filhas: achadas } : null;
      })
      .filter(Boolean);
  }, [ativas, raizesAtivas, termo]);
  const inativasFiltradas = inativas.filter((c) => !termo || c.descricao.toLowerCase().includes(termo));

  const fechar = () => {
    setForm(null);
    if (criandoUrl) setSearchParams((p) => { const n = new URLSearchParams(p); n.delete('novo'); return n; }, { replace: true });
  };
  const formAtual = form ?? (criandoUrl ? {} : null);

  async function excluir(c) {
    const filhas = ativas.filter((x) => x.categoriaPaiId === c.id);
    const ok = await confirmar({
      title: `Desativar "${c.descricao}"?`,
      message: filhas.length
        ? `Ela e as ${filhas.length} subcategorias saem das listas de escolha. Contas antigas continuam com a categoria, e você pode reativar depois.`
        : 'Ela sai das listas de escolha. Contas antigas continuam com a categoria, e você pode reativar depois.',
      details: filhas.length ? filhas.map((f) => f.descricao) : undefined,
      confirmLabel: 'Desativar',
    });
    if (!ok) return;
    try {
      await api.deletar(c.id);
      toast.success('Categoria desativada. Ela está na aba "Inativas".');
      lista.recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function reativar(c) {
    try {
      await api.reativar(c.id);
      toast.success(`${c.descricao} reativada.`);
      lista.recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const alternar = (id) => setFechados((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const acoes = {
    onEditar: (c) => setForm({ ...c, temFilhas: ativas.some((x) => x.categoriaPaiId === c.id) }),
    onExcluir: excluir,
    onReativar: reativar,
    onNovaSub: (c) => setForm({ categoriaPaiId: c.id }),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        subtitle="Agrupe suas contas por assunto. Subcategorias detalham uma categoria principal."
        icon={Tags}
        actions={pode('CATEGORIA_CRIAR') ? (
          <Button onClick={() => setForm({})} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>Nova categoria</Button>
        ) : null}
      />

      <div className="space-y-4">
        <Tabs idBase={ID_ABAS} label="Situação das categorias" value={aba} onChange={setAba}
          items={[{ value: 'ativas', label: 'Ativas', badge: ativas.length }, { value: 'inativas', label: 'Inativas', badge: inativas.length }]} />
        <FilterBar busca={{ value: busca, onChange: setBusca, placeholder: 'Buscar categoria', label: 'Buscar categoria pelo nome' }}
          filtrosAtivos={busca ? 1 : 0} onLimpar={() => setBusca('')} />

        <div role="tabpanel" id={Tabs.painelId(ID_ABAS, aba)} aria-labelledby={Tabs.abaId(ID_ABAS, aba)}>
          {lista.erro ? (
            <AlertaErro mensagem={lista.erro.message} onTentarNovamente={lista.recarregar} />
          ) : lista.carregandoInicial ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} rows={2} />)}</div>
          ) : aba === 'ativas' ? (
            arvore.length === 0 ? (
              <div className="c4-card">
                <EmptyState icon={Tags} tom={termo ? 'neutro' : 'primary'}
                  title={termo ? 'Nenhuma categoria com esse nome' : 'Nenhuma categoria'}
                  description={termo ? 'Tente outro nome ou veja a aba "Inativas".' : 'Crie categorias como Moradia, Alimentação e Salário para organizar suas contas.'}
                  action={!termo && pode('CATEGORIA_CRIAR') ? { label: 'Nova categoria', onClick: () => setForm({}), icon: Plus } : undefined} />
              </div>
            ) : (
              <Stagger className="lg:columns-2 gap-3">
                {arvore.map(({ raiz, filhas }) => (
                  <StaggerItem key={raiz.id} className="break-inside-avoid mb-3">
                    <Ramo raiz={raiz} filhas={filhas} aberto={Boolean(termo) || !fechados.has(raiz.id)} onAlternar={() => alternar(raiz.id)} acoes={acoes} />
                  </StaggerItem>
                ))}
              </Stagger>
            )
          ) : inativasFiltradas.length === 0 ? (
            <div className="c4-card">
              <EmptyState icon={Tags} tom="neutro" title="Nenhuma categoria inativa"
                description="Categorias desativadas aparecem aqui e podem ser reativadas quando quiser." />
            </div>
          ) : (
            <ul className="c4-card p-2 divide-y divide-border">
              {inativasFiltradas.map((c) => {
                const paiInativo = Boolean(c.categoriaPaiId) && !idsAtivos.has(c.categoriaPaiId);
                return (
                  <li key={c.id}>
                    <Linha c={c} sub={Boolean(c.categoriaPaiId)} inativa paiInativo={paiInativo} {...acoes} />
                    {paiInativo && <p className="px-2 pb-2 text-xs text-text-primary/60">Reative primeiro “{c.categoriaPaiDescricao}”.</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {aba === 'ativas' && raizesAtivas.length > 0 && (
          <p className="text-xs text-text-primary/60 flex items-center gap-2">
            <Badge variant="neutral">Dica</Badge>
            Para mover uma subcategoria para outra categoria, use Editar e troque “Fica dentro de”.
          </p>
        )}
      </div>

      <Drawer
        open={Boolean(formAtual)}
        onClose={fechar}
        title={formAtual?.id ? 'Editar categoria' : formAtual?.categoriaPaiId ? 'Nova subcategoria' : 'Nova categoria'}
        size="md"
      >
        {formAtual && (
          <CategoriaForm
            key={formAtual.id ?? `nova-${formAtual.categoriaPaiId ?? ''}`}
            inicial={formAtual}
            raizes={raizesAtivas}
            onCancelar={fechar}
            onSalvo={() => {
              toast.success(formAtual.id ? 'Categoria atualizada.' : 'Categoria criada.');
              fechar();
              lista.recarregar();
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
