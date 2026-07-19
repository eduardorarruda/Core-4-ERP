import React, { useEffect, useState } from 'react';
import {
  Tag, Plus, Pencil, Trash2,
  ShoppingCart, Home, Car, Utensils, Heart, Zap, Wifi,
  GraduationCap, Plane, Music, Gift, Coffee, Dumbbell, Shirt,
  Briefcase, TrendingUp, DollarSign, Landmark, CreditCard, Wallet,
  Sofa, Lightbulb, Flame, Wrench, Key,
  Bus, Fuel, CarFront, TrainFront, Bike,
  Pizza, ShoppingBasket, UtensilsCrossed,
  Pill, Stethoscope, Activity,
  Gamepad2, Tv, BookOpen, Camera,
  Smartphone, Laptop, Monitor,
  Building2, PiggyBank, Receipt, Banknote, Calculator,
  Baby, Dog, Package,
} from 'lucide-react';
import { categorias as api } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import { inputCls, inputErrorCls, labelCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import IconDropdown from '../components/ui/IconDropdown';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import PermissaoGuard from '../components/ui/PermissaoGuard';

// Tabela de lookup nome -> componente para RENDERIZAR o ícone salvo nas linhas da lista.
// A SELEÇÃO do ícone é feita pelo componente compartilhado IconDropdown (grid + busca + agrupamento),
// que mantém o mesmo catálogo — não recrie um seletor manual aqui.
const ICONES = [
  // Compras e consumo
  { nome: 'ShoppingCart', componente: ShoppingCart },
  { nome: 'ShoppingBasket', componente: ShoppingBasket },
  { nome: 'Receipt', componente: Receipt },
  { nome: 'Package', componente: Package },
  // Habitação e moradia
  { nome: 'Home', componente: Home },
  { nome: 'Sofa', componente: Sofa },
  { nome: 'Lightbulb', componente: Lightbulb },
  { nome: 'Flame', componente: Flame },
  { nome: 'Wrench', componente: Wrench },
  { nome: 'Key', componente: Key },
  // Transporte
  { nome: 'Car', componente: Car },
  { nome: 'CarFront', componente: CarFront },
  { nome: 'Bus', componente: Bus },
  { nome: 'TrainFront', componente: TrainFront },
  { nome: 'Bike', componente: Bike },
  { nome: 'Fuel', componente: Fuel },
  { nome: 'Plane', componente: Plane },
  // Alimentação
  { nome: 'Utensils', componente: Utensils },
  { nome: 'UtensilsCrossed', componente: UtensilsCrossed },
  { nome: 'Pizza', componente: Pizza },
  { nome: 'Coffee', componente: Coffee },
  // Saúde e bem-estar
  { nome: 'Heart', componente: Heart },
  { nome: 'Pill', componente: Pill },
  { nome: 'Stethoscope', componente: Stethoscope },
  { nome: 'Activity', componente: Activity },
  { nome: 'Dumbbell', componente: Dumbbell },
  // Educação e lazer
  { nome: 'GraduationCap', componente: GraduationCap },
  { nome: 'BookOpen', componente: BookOpen },
  { nome: 'Music', componente: Music },
  { nome: 'Gamepad2', componente: Gamepad2 },
  { nome: 'Tv', componente: Tv },
  { nome: 'Camera', componente: Camera },
  { nome: 'Gift', componente: Gift },
  // Tecnologia
  { nome: 'Smartphone', componente: Smartphone },
  { nome: 'Laptop', componente: Laptop },
  { nome: 'Monitor', componente: Monitor },
  { nome: 'Wifi', componente: Wifi },
  { nome: 'Zap', componente: Zap },
  // Finanças
  { nome: 'DollarSign', componente: DollarSign },
  { nome: 'Wallet', componente: Wallet },
  { nome: 'Banknote', componente: Banknote },
  { nome: 'CreditCard', componente: CreditCard },
  { nome: 'Landmark', componente: Landmark },
  { nome: 'PiggyBank', componente: PiggyBank },
  { nome: 'Building2', componente: Building2 },
  { nome: 'Calculator', componente: Calculator },
  { nome: 'TrendingUp', componente: TrendingUp },
  // Trabalho e pessoal
  { nome: 'Briefcase', componente: Briefcase },
  { nome: 'Shirt', componente: Shirt },
  { nome: 'Baby', componente: Baby },
  { nome: 'Dog', componente: Dog },
];

function IconeCategoria({ nome, className = 'w-5 h-5' }) {
  const entry = ICONES.find((i) => i.nome === nome);
  if (!entry) return <Tag className={className} />;
  const Icone = entry.componente;
  return <Icone className={className} />;
}

function CategoriaLinha({ c, sub = false, onEditar, onDeletar }) {
  const entry = ICONES.find((ic) => ic.nome === c.icone);
  const Icone = entry ? entry.componente : Tag;
  return (
    <div className="flex items-center gap-3 p-3 rounded-[12px] transition-all hover:bg-white/[.03] cursor-default">
      <div
        className={cn('rounded-xl flex items-center justify-center shrink-0', sub ? 'w-8 h-8' : 'w-10 h-10')}
        style={{ background: 'rgba(110,255,192,.1)', border: '1px solid rgba(110,255,192,.2)' }}
      >
        <Icone className={cn('text-primary', sub ? 'w-4 h-4' : 'w-5 h-5')} />
      </div>
      <span className={cn('font-bold text-text-primary flex-1 truncate font-display', sub ? 'text-xs' : 'text-sm')}>
        {c.descricao}
      </span>
      <div className="flex gap-1 shrink-0">
        <PermissaoGuard permissao="CATEGORIA_EDITAR">
          <button onClick={() => onEditar(c)} aria-label={`Editar ${c.descricao}`} className="text-text-primary/30 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </PermissaoGuard>
        <PermissaoGuard permissao="CATEGORIA_DELETAR">
          <button onClick={() => onDeletar(c)} aria-label={`Excluir ${c.descricao}`} className="text-text-primary/30 hover:text-error p-1.5 rounded-lg hover:bg-error/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </PermissaoGuard>
      </div>
    </div>
  );
}

const empty = { descricao: '', icone: '', categoriaPaiId: '' };

export default function Categorias() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try { setLista(await api.listar()); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  function validar() {
    const errs = {};
    if (!form.descricao.trim()) errs.descricao = 'Informe uma descrição';
    else if (form.descricao.trim().length < 2) errs.descricao = 'Descrição muito curta';
    return errs;
  }

  async function salvar(e) {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Verifique os campos destacados.'); return; }
    setErrors({});
    setSalvando(true);
    try {
      const dto = {
        descricao: form.descricao,
        icone: form.icone,
        categoriaPaiId: form.categoriaPaiId ? Number(form.categoriaPaiId) : null,
      };
      if (editId) await api.atualizar(editId, dto);
      else await api.criar(dto);
      setForm(empty);
      setEditId(null);
      toast.success(editId ? 'Categoria atualizada!' : 'Categoria criada!');
      await carregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function deletar(c) {
    const filhas = lista.filter((x) => x.categoriaPaiId === c.id && x.ativo !== false);
    const temFilhas = filhas.length > 0;
    setConfirmAction({
      title: 'Excluir categoria',
      message: temFilhas
        ? `A categoria "${c.descricao}" possui ${filhas.length} subcategoria${filhas.length > 1 ? 's' : ''}. Ao excluí-la, ${filhas.length > 1 ? 'elas também serão desativadas' : 'ela também será desativada'} automaticamente.`
        : `Tem certeza que deseja excluir a categoria "${c.descricao}"?`,
      details: temFilhas ? filhas.map((f) => f.descricao) : undefined,
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.deletar(c.id);
          await carregar();
          toast.success('Categoria excluída!');
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  function editar(c) {
    setForm({ descricao: c.descricao, icone: c.icone || '', categoriaPaiId: c.categoriaPaiId ? String(c.categoriaPaiId) : '' });
    setEditId(c.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const PreviewIcon = ICONES.find((i) => i.nome === form.icone)?.componente ?? null;

  // Só categorias ativas na tela; deletar inativa (soft delete) e some daqui.
  const ativas = lista.filter((c) => c.ativo !== false);
  // Raízes disponíveis como "categoria principal" (exclui subcategorias e a própria em edição).
  const raizesDisponiveis = ativas.filter((c) => !c.categoriaPaiId && c.id !== editId);
  const raizes = ativas.filter((c) => !c.categoriaPaiId);
  const subsPorPai = ativas.reduce((acc, c) => {
    if (c.categoriaPaiId) (acc[c.categoriaPaiId] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader title="Categorias" subtitle="Organização dos seus lançamentos" />

      <form
        onSubmit={salvar}
        className="rounded-[18px] p-6 space-y-5 anim-in bg-surface-medium border border-text-primary/5 shadow-elevated"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">
            {editId ? 'Editar' : 'Nova'} Categoria
          </h2>
          {PreviewIcon && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <PreviewIcon className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-bold">{form.descricao || 'Preview'}</span>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-1">
            <label className={labelCls}>Descrição *</label>
            <input
              className={errors.descricao ? inputErrorCls : inputCls}
              value={form.descricao}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, descricao: v }));
                if (errors.descricao) setErrors((prev) => ({ ...prev, descricao: undefined }));
              }}
              placeholder="Ex: Alimentação"
              aria-invalid={!!errors.descricao}
            />
            {errors.descricao && <p className="text-error text-xs mt-1">{errors.descricao}</p>}
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Categoria principal</label>
            <select
              className={inputCls}
              value={form.categoriaPaiId}
              onChange={(e) => setForm((f) => ({ ...f, categoriaPaiId: e.target.value }))}
            >
              <option value="">Nenhuma (categoria principal)</option>
              {raizesDisponiveis.map((c) => (
                <option key={c.id} value={c.id}>{c.descricao}</option>
              ))}
            </select>
            <p className="text-[11px] text-text-primary/40">Deixe em branco para criar uma categoria principal, ou escolha uma para criar uma subcategoria.</p>
          </div>
        </div>

        <div className="space-y-2 max-w-2xl">
          <label className={labelCls}>Ícone</label>
          <div className="sm:max-w-xs">
            <IconDropdown value={form.icone} onChange={(nome) => setForm((f) => ({ ...f, icone: nome }))} />
          </div>
          <p className="text-[11px] text-text-primary/40">Use a busca para encontrar o ícone que melhor representa a categoria.</p>
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={salvando} leftIcon={<Plus className="w-4 h-4" />}>
            {salvando ? 'Gravando...' : editId ? 'Salvar' : 'Criar'}
          </Button>
          {editId && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setForm(empty); setEditId(null); setErrors({}); }}
              className="border border-text-primary/10 text-text-primary/60 hover:text-text-primary"
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[14px] bg-surface-medium border border-text-primary/5 animate-pulse" />
          ))}
        </div>
      ) : ativas.length === 0 ? (
        <EmptyState icon={Tag} title="Nenhuma categoria" description="Crie categorias para organizar seus lançamentos financeiros." />
      ) : (
        <div className="space-y-3">
          {raizes.map((c, i) => {
            const filhas = subsPorPai[c.id] || [];
            return (
              <div
                key={c.id}
                className={`anim-in d${Math.min(i + 1, 6)} rounded-[14px] p-2 bg-surface-medium border border-text-primary/5`}
              >
                <CategoriaLinha c={c} onEditar={editar} onDeletar={deletar} />
                {filhas.length > 0 && (
                  <div className="mt-1 ml-3 pl-3 sm:ml-6 sm:pl-4 border-l border-text-primary/10 space-y-1">
                    {filhas.map((sub) => (
                      <CategoriaLinha key={sub.id} c={sub} sub onEditar={editar} onDeletar={deletar} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
