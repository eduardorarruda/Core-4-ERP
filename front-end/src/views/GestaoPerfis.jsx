import React, { useMemo, useState } from 'react';
import { Eye, Info, Lock, Pencil, Plus, ShieldCheck, ShieldQuestion, Trash2 } from 'lucide-react';
import { perfisAcesso } from '../lib/api';
import { useCarga } from '../hooks/useCarga';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import ComoFunciona from '../components/ui/ComoFunciona';
import SkeletonCard from '../components/ui/SkeletonCard';
import { Stagger, StaggerItem } from '../components/motion/Movimento';
import FormField, { FormInput } from '../components/ui/FormField';
import MatrizPermissoes from '../components/configuracoes/MatrizPermissoes';
import { GRUPOS, ID_NOTA_BLOQUEIO, MODULOS, montarMatriz } from '../components/configuracoes/permissoesCatalogo';
import { MSG_ESCALADA, mensagemErroPermissao, nomePerfil } from '../components/configuracoes/perfilUtils';
import { useConcessao } from '../components/configuracoes/useConcessao';

const VISUALIZAR = 'VISUALIZAR';

function GavetaPerfil({ perfil, somenteLeitura, todasPermissoes, onClose, onSave }) {
  const concessao = useConcessao();
  const originais = useMemo(
    () => new Set(perfil ? todasPermissoes.filter((p) => perfil.permissoes.includes(p.codigo)).map((p) => p.id) : []),
    [perfil, todasPermissoes],
  );
  const [form, setForm] = useState(() => ({
    nome: perfil?.nome ?? '',
    descricao: perfil?.descricao ?? '',
    permissaoIds: new Set(originais),
  }));
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  const matriz = useMemo(() => montarMatriz(todasPermissoes), [todasPermissoes]);
  const grupos = useMemo(() => {
    const g = {};
    todasPermissoes.forEach((p) => { (g[p.modulo] ??= []).push(p); });
    return g;
  }, [todasPermissoes]);

  // Escalada de privilégio: só concede o que você tem — acessos que o perfil já tinha continuam livres
  const podeAlternar = (p) => concessao.pode(p.codigo) || originais.has(p.id);
  const bloqueada = (p) => {
    if (!podeAlternar(p)) return true;
    if (p.acao === VISUALIZAR) return false;
    // Ação depende do "Ver" do módulo: se o "Ver" está desmarcado e você não pode concedê-lo, trava
    const ver = grupos[p.modulo]?.find((x) => x.acao === VISUALIZAR);
    return Boolean(ver && !form.permissaoIds.has(ver.id) && !podeAlternar(ver));
  };
  const temBloqueio = !somenteLeitura && todasPermissoes.some((p) => bloqueada(p));

  // --- Regra de dependência do VISUALIZAR (CLAUDE.md §4) — preservada ---
  const togglePermissao = (id) => {
    setForm((prev) => {
      const ids = new Set(prev.permissaoIds);
      const permissao = todasPermissoes.find((p) => p.id === id);
      if (ids.has(id)) {
        ids.delete(id);
        // Ao remover VISUALIZAR, remove todas as outras do mesmo módulo
        if (permissao?.acao === VISUALIZAR) {
          const idsModulo = grupos[permissao.modulo]?.map((p) => p.id) ?? [];
          idsModulo.forEach((mid) => ids.delete(mid));
        }
      } else {
        ids.add(id);
        // Ao adicionar qualquer ação não-VISUALIZAR, auto-adiciona VISUALIZAR do módulo
        if (permissao && permissao.acao !== VISUALIZAR) {
          const visualizar = grupos[permissao.modulo]?.find((p) => p.acao === VISUALIZAR);
          if (visualizar) ids.add(visualizar.id);
        }
      }
      return { ...prev, permissaoIds: ids };
    });
  };

  // "Tudo" do módulo: marca/desmarca só o que você pode alternar
  const toggleModulo = (linha) => {
    const editaveis = linha.todas.filter((p) => !bloqueada(p)).map((p) => p.id);
    const todosMarcados = editaveis.every((id) => form.permissaoIds.has(id));
    setForm((prev) => {
      const ids = new Set(prev.permissaoIds);
      if (todosMarcados) editaveis.forEach((id) => ids.delete(id));
      else editaveis.forEach((id) => ids.add(id));
      return { ...prev, permissaoIds: ids };
    });
  };

  async function salvar() {
    const novos = {};
    if (!form.nome.trim()) novos.nome = 'Dê um nome ao perfil (ex.: Vendedor).';
    setErros(novos);
    setErroGeral(form.permissaoIds.size === 0 ? 'Marque pelo menos um acesso para o perfil.' : '');
    if (Object.keys(novos).length || form.permissaoIds.size === 0) return;
    setSalvando(true);
    try {
      await onSave({ nome: form.nome.trim(), descricao: form.descricao.trim(), permissaoIds: [...form.permissaoIds] });
    } catch (e) {
      setErroGeral(mensagemErroPermissao(e, 'Não foi possível salvar o perfil. Tente novamente.'));
      setSalvando(false);
    }
  }

  const titulo = somenteLeitura ? `Perfil ${nomePerfil(perfil?.nome)}` : perfil ? 'Editar perfil' : 'Novo perfil';
  const total = form.permissaoIds.size;

  return (
    <Drawer
      open
      onClose={onClose}
      title={titulo}
      description={somenteLeitura ? 'Perfil padrão do sistema: só para consulta.' : `${total} de ${todasPermissoes.length} acessos marcados.`}
      size="lg"
      closeOnEsc={!salvando}
      closeOnOverlay={!salvando}
      footer={somenteLeitura ? <Button variant="secondary" onClick={onClose}>Fechar</Button> : (
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando}>{perfil ? 'Salvar' : 'Criar perfil'}</Button>
        </>
      )}
    >
      <div className="space-y-5">
        {!somenteLeitura && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nome do perfil" required error={erros.nome} help="Aparece na lista de operadores.">
              <FormInput value={form.nome} maxLength={50} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} error={erros.nome} />
            </FormField>
            <FormField label="Descrição" help="Opcional. Para que serve este perfil.">
              <FormInput value={form.descricao} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
            </FormField>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info/10 px-3.5 py-3 text-sm text-text-primary/80 leading-relaxed">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-info" aria-hidden="true" />
          <p>
            Marcar qualquer ação de um módulo marca também <strong>Ver</strong>. Desmarcar <strong>Ver</strong> tira todas as ações do módulo.
          </p>
        </div>

        {temBloqueio && (
          <p id={ID_NOTA_BLOQUEIO} className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm text-text-primary/85 leading-relaxed">
            <Lock className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span>Acessos com cadeado: {MSG_ESCALADA}</span>
          </p>
        )}

        <MatrizPermissoes
          matriz={matriz}
          marcadas={form.permissaoIds}
          bloqueada={somenteLeitura ? () => false : bloqueada}
          onToggle={togglePermissao}
          onToggleModulo={toggleModulo}
          somenteLeitura={somenteLeitura}
        />

        {erroGeral && <AlertaErro titulo="Não deu para salvar" mensagem={erroGeral} compacto />}
      </div>
    </Drawer>
  );
}

/** Resumo de acessos por área (ex.: "Dinheiro 18 · Relatórios 4"). */
function ResumoAreas({ codigos, todasPermissoes }) {
  const porArea = useMemo(() => {
    const cont = {};
    todasPermissoes.forEach((p) => {
      if (!codigos.includes(p.codigo)) return;
      const g = MODULOS[p.modulo]?.grupo ?? 'outros';
      cont[g] = (cont[g] ?? 0) + 1;
    });
    return GRUPOS.filter((g) => cont[g.id]).map((g) => ({ ...g, n: cont[g.id] }));
  }, [codigos, todasPermissoes]);
  if (!porArea.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Acessos por área">
      {porArea.map((g) => (
        <li key={g.id} className="text-xs px-2 py-1 rounded-md bg-surface-medium text-text-primary/75">
          {g.nome} <span className="font-semibold tabular-nums text-text-primary">{g.n}</span>
        </li>
      ))}
    </ul>
  );
}

function CartaoPerfil({ perfil, todasPermissoes, onAbrir, onExcluir }) {
  const sistema = perfil.protegido;
  const n = perfil.permissoes?.length ?? 0;
  return (
    <article className="c4-card h-full p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-xl ${sistema ? 'bg-invest/12 text-invest' : 'bg-primary/12 text-primary'}`} aria-hidden="true">
          <ShieldCheck className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-text-primary font-display truncate">{nomePerfil(perfil.nome)}</h2>
          <p className="text-sm text-text-primary/65 line-clamp-2">{perfil.descricao || 'Sem descrição.'}</p>
        </div>
        {sistema
          ? <Badge variant="neutral"><Lock className="w-3 h-3" aria-hidden="true" /> Padrão</Badge>
          : <Badge variant="success">Da empresa</Badge>}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-text-primary/80"><span className="font-semibold tabular-nums text-text-primary">{n}</span> {n === 1 ? 'acesso' : 'acessos'}</p>
        <ResumoAreas codigos={perfil.permissoes ?? []} todasPermissoes={todasPermissoes} />
      </div>
      <div className="mt-auto flex gap-2 pt-1">
        {sistema ? (
          <Button variant="secondary" size="sm" onClick={() => onAbrir(perfil, true)} leftIcon={<Eye className="w-4 h-4" aria-hidden="true" />}>
            Ver acessos <span className="sr-only">do perfil {nomePerfil(perfil.nome)}</span>
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={() => onAbrir(perfil, false)} leftIcon={<Pencil className="w-4 h-4" aria-hidden="true" />}>
              Editar <span className="sr-only">perfil {perfil.nome}</span>
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => onExcluir(perfil)} leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />}>
              Excluir <span className="sr-only">perfil {perfil.nome}</span>
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

export default function GestaoPerfis() {
  const toast = useToast();
  const confirmar = useConfirm();
  const [gaveta, setGaveta] = useState(null); // { perfil|null, somenteLeitura }

  const { dados, erro, carregando, recarregar } = useCarga(
    () => Promise.all([perfisAcesso.listar(), perfisAcesso.listarPermissoes()]),
    [],
  );
  const perfis = Array.isArray(dados?.[0]) ? dados[0] : [];
  const todasPermissoes = Array.isArray(dados?.[1]) ? dados[1] : [];
  const ordenados = [...perfis].sort((a, b) => Number(a.protegido) - Number(b.protegido) || a.nome.localeCompare(b.nome));

  const salvar = async (dto) => {
    const editando = gaveta?.perfil;
    if (editando) await perfisAcesso.atualizar(editando.id, dto);
    else await perfisAcesso.criar(dto);
    setGaveta(null);
    toast.success(editando ? 'Perfil atualizado.' : 'Perfil criado.');
    recarregar();
  };

  const excluir = async (p) => {
    const ok = await confirmar({
      title: `Excluir o perfil ${p.nome}?`,
      message: 'Perfis em uso por algum operador ou convite pendente não podem ser excluídos: troque o perfil dessas pessoas antes.',
      confirmLabel: 'Excluir',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await perfisAcesso.deletar(p.id);
      toast.success(`Perfil "${p.nome}" excluído.`);
      recarregar();
    } catch (err) {
      toast.error(mensagemErroPermissao(err, 'Não foi possível excluir o perfil.'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfis de acesso"
        subtitle="O que cada pessoa da empresa pode ver e fazer."
        icon={ShieldCheck}
        actions={(
          <Button onClick={() => setGaveta({ perfil: null, somenteLeitura: false })} disabled={carregando} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
            Novo perfil
          </Button>
        )}
      />

      <ComoFunciona
        titulo="Como funcionam os perfis"
        recolhivel
        chave="perfis-acesso"
        itens={[
          { icon: ShieldCheck, texto: 'Cada operador tem um perfil. O perfil define o que ele vê e faz em cada módulo.' },
          { icon: Lock, texto: 'Os perfis padrão não mudam. Para ajustar, crie um perfil da empresa.' },
          { icon: Info, texto: 'Você só consegue dar acessos que você mesmo tem.' },
        ]}
      />

      {erro && <AlertaErro mensagem={erro.message} onTentarNovamente={recarregar} />}

      {carregando && !dados ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-hidden="true">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : !erro && ordenados.length === 0 ? (
        <EmptyState
          icon={ShieldQuestion}
          title="Nenhum perfil ainda"
          description="Crie perfis para definir o que cada operador pode acessar."
          action={{ label: 'Novo perfil', onClick: () => setGaveta({ perfil: null, somenteLeitura: false }), icon: Plus }}
        />
      ) : (
        <Stagger as="ul" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Perfis de acesso">
          {ordenados.map((p) => (
            <StaggerItem as="li" key={p.id}>
              <CartaoPerfil
                perfil={p}
                todasPermissoes={todasPermissoes}
                onAbrir={(perfil, somenteLeitura) => setGaveta({ perfil, somenteLeitura })}
                onExcluir={excluir}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {gaveta && (
        <GavetaPerfil
          perfil={gaveta.perfil}
          somenteLeitura={gaveta.somenteLeitura}
          todasPermissoes={todasPermissoes}
          onClose={() => setGaveta(null)}
          onSave={salvar}
        />
      )}
    </div>
  );
}
