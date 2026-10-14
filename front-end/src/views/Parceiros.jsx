import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Pencil, Plus, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';
import { parceiros as api } from '../lib/api';
import { iniciais } from '../lib/formatters';
import { useCarga } from '../hooks/useCarga';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { usePermissao } from '../hooks/usePermissao';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import FilterBar from '../components/ui/FilterBar';
import { SegmentedControl } from '../components/ui/Tabs';
import ParceiroForm from '../components/financeiro/ParceiroForm';
import { formatarCpfCnpj, soDigitos } from '../components/financeiro/utilsFinanceiro';

const TIPO = {
  FORNECEDOR: { rotulo: 'Fornecedor', variant: 'warning' },
  CLIENTE: { rotulo: 'Cliente', variant: 'info' },
  AMBOS: { rotulo: 'Cliente e fornecedor', variant: 'success' },
};

const FILTRO_TIPO = [
  { value: '', label: 'Todos' },
  { value: 'FORNECEDOR', label: 'Fornecedores' },
  { value: 'CLIENTE', label: 'Clientes' },
];

/**
 * Busca: nome em qualquer parte; CPF/CNPJ só com o número completo. O documento é guardado
 * cifrado e a busca no servidor é exata (índice cego) — manter a mesma regra aqui evita
 * prometer uma busca parcial que o sistema não faz.
 */
function combina(p, termo) {
  if (!termo) return true;
  const digitos = soDigitos(termo);
  const pareceDocumento = digitos.length >= 3 && digitos.length === termo.replace(/[\s.\-/]/g, '').length;
  if (pareceDocumento) {
    return (digitos.length === 11 || digitos.length === 14) && soDigitos(p.cpfCnpj) === digitos;
  }
  const t = termo.toLowerCase();
  return [p.razaoSocial, p.nomeFantasia].some((v) => v?.toLowerCase().includes(t));
}

function Identidade({ p }) {
  const nome = p.nomeFantasia || p.razaoSocial;
  const pj = soDigitos(p.cpfCnpj).length === 14;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span aria-hidden="true" className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-surface-high border border-border text-xs font-semibold text-text-primary/75">
        {iniciais(nome)}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-text-primary truncate">{nome}</p>
        <p className="text-xs text-text-primary/60 truncate flex items-center gap-1">
          {pj ? <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" /> : <UserRound className="w-3 h-3 shrink-0" aria-hidden="true" />}
          <span className="tabular-nums whitespace-nowrap">{p.cpfCnpj ? formatarCpfCnpj(p.cpfCnpj) : 'Sem documento'}</span>
          {p.nomeFantasia && p.razaoSocial !== p.nomeFantasia && <span className="truncate"> · {p.razaoSocial}</span>}
        </p>
      </div>
    </div>
  );
}

function Acoes({ p, onEditar, onExcluir }) {
  const pode = usePermissao();
  const nome = p.nomeFantasia || p.razaoSocial;
  return (
    <div className="flex justify-end gap-1">
      {pode('PARCEIRO_EDITAR') && (
        <Button variant="ghost" size="icon-sm" onClick={() => onEditar(p)} aria-label={`Editar ${nome}`} title="Editar">
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
      {pode('PARCEIRO_DELETAR') && (
        <Button variant="danger-ghost" size="icon-sm" onClick={() => onExcluir(p)} aria-label={`Excluir ${nome}`} title="Excluir">
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export default function Parceiros() {
  const toast = useToast();
  const confirmar = useConfirm();
  const pode = usePermissao();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [editando, setEditando] = useState(null);
  const criando = searchParams.get('novo') != null && pode('PARCEIRO_CRIAR');

  const setNovo = (abrir) => setSearchParams((atual) => {
    const p = new URLSearchParams(atual);
    if (abrir) p.set('novo', '1'); else p.delete('novo');
    return p;
  }, { replace: true });

  const lista = useCarga(() => api.listar(), [], { inicial: [] });
  const termo = busca.trim();
  const filtrados = useMemo(
    () => (lista.dados ?? [])
      .filter((p) => !tipo || p.tipo === tipo || p.tipo === 'AMBOS')
      .filter((p) => combina(p, termo)),
    [lista.dados, tipo, termo],
  );
  const digitosBusca = soDigitos(termo);
  const buscaDocParcial = digitosBusca.length >= 3 && digitosBusca.length !== 11 && digitosBusca.length !== 14
    && digitosBusca.length === termo.replace(/[\s.\-/]/g, '').length;

  async function excluir(p) {
    const nome = p.nomeFantasia || p.razaoSocial;
    const ok = await confirmar({
      title: `Excluir ${nome}?`,
      message: 'Parceiros com contas vinculadas não podem ser excluídos — nesse caso o sistema avisa e nada muda.',
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.deletar(p.id);
      toast.success('Parceiro excluído.');
      lista.recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const colunas = [
    { key: 'razaoSocial', label: 'Parceiro', sortable: true, render: (_v, p) => <Identidade p={p} /> },
    { key: 'tipo', label: 'Tipo', render: (v) => <Badge variant={TIPO[v]?.variant ?? 'neutral'}>{TIPO[v]?.rotulo ?? v}</Badge> },
    { key: 'municipio', label: 'Cidade', sortable: true, render: (v, p) => (v ? `${v}${p.uf ? `/${p.uf}` : ''}` : '—') },
    { key: 'telefone', label: 'Contato', render: (v, p) => <span className="text-sm text-text-primary/75 truncate">{v || p.email || '—'}</span> },
    { key: 'id', label: <span className="sr-only">Ações</span>, render: (_id, p) => <Acoes p={p} onEditar={setEditando} onExcluir={excluir} /> },
  ];

  const fechar = () => { setEditando(null); setNovo(false); };
  const aberto = criando || Boolean(editando);
  const filtrosAtivos = [busca, tipo].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parceiros"
        subtitle="Clientes e fornecedores das suas contas."
        icon={Users}
        actions={pode('PARCEIRO_CRIAR') ? (
          <Button onClick={() => setNovo(true)} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>Novo parceiro</Button>
        ) : null}
      />

      <div className="space-y-2">
        <FilterBar
          busca={{ value: busca, onChange: setBusca, placeholder: 'Nome, ou CPF/CNPJ completo', label: 'Buscar parceiro por nome ou documento completo' }}
          filtrosAtivos={filtrosAtivos}
          onLimpar={() => { setBusca(''); setTipo(''); }}
        >
          <SegmentedControl label="Tipo de parceiro" items={FILTRO_TIPO} value={tipo} onChange={setTipo} size="sm" />
        </FilterBar>
        <p className={buscaDocParcial ? 'text-xs text-warning flex items-center gap-1.5' : 'text-xs text-text-primary/60 flex items-center gap-1.5'} role={buscaDocParcial ? 'status' : undefined}>
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {buscaDocParcial
            ? 'Para achar pelo documento, digite o CPF (11 dígitos) ou o CNPJ (14 dígitos) completo.'
            : 'Por segurança, CPF e CNPJ ficam cifrados: a busca por documento só encontra o número completo. Nomes podem ser buscados em parte.'}
        </p>
      </div>

      {lista.erro ? (
        <AlertaErro mensagem={lista.erro.message} onTentarNovamente={lista.recarregar} />
      ) : (
        <DataTable
          caption="Parceiros cadastrados"
          columns={colunas}
          data={filtrados}
          loading={lista.carregandoInicial}
          keyExtractor={(p) => p.id}
          renderCard={(p) => (
            <div className="p-4 space-y-3">
              <Identidade p={p} />
              <div className="flex items-center justify-between gap-2">
                <Badge variant={TIPO[p.tipo]?.variant ?? 'neutral'}>{TIPO[p.tipo]?.rotulo ?? p.tipo}</Badge>
                <Acoes p={p} onEditar={setEditando} onExcluir={excluir} />
              </div>
            </div>
          )}
          emptyState={filtrosAtivos ? (
            <EmptyState icon={Users} tom="neutro" title="Ninguém encontrado"
              description={buscaDocParcial ? 'Digite o documento completo para buscar por CPF ou CNPJ.' : 'Tente outro nome ou limpe os filtros.'}
              action={{ label: 'Limpar busca', onClick: () => { setBusca(''); setTipo(''); } }} />
          ) : (
            <EmptyState icon={Users} title="Nenhum parceiro"
              description="Cadastre clientes e fornecedores para saber de quem você recebe e para quem paga."
              action={pode('PARCEIRO_CRIAR') ? { label: 'Novo parceiro', onClick: () => setNovo(true), icon: Plus } : undefined} />
          )}
        />
      )}

      <Drawer open={aberto} onClose={fechar} title={editando ? 'Editar parceiro' : 'Novo parceiro'} size="md">
        {aberto && (
          <ParceiroForm
            key={editando?.id ?? 'novo'}
            inicial={editando ?? undefined}
            onCancelar={fechar}
            onSalvo={() => {
              toast.success(editando ? 'Parceiro atualizado.' : 'Parceiro criado.');
              fechar();
              lista.recarregar();
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
