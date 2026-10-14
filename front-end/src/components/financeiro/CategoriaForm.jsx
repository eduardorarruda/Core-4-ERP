import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { categorias as api } from '../../lib/api';
import FormField, { FormInput, FormSelect } from '../ui/FormField';
import Button from '../ui/Button';
import { ChipCategoria, IconePicker } from './IconesCategoria';

/**
 * Formulário de categoria (criar/editar): nome, categoria principal (vazio = principal) e ícone.
 * Mudar a "categoria principal" de uma subcategoria é a forma de reorganizar a árvore.
 * Props: inicial? ({ id?, descricao, icone, categoriaPaiId }), raizes (categorias principais ativas),
 *        onSalvo(categoria), onCancelar().
 */
export default function CategoriaForm({ inicial, raizes = [], onSalvo, onCancelar }) {
  const editando = Boolean(inicial?.id);
  const temFilhas = editando && inicial?.temFilhas;
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [icone, setIcone] = useState(inicial?.icone ?? '');
  const [paiId, setPaiId] = useState(inicial?.categoriaPaiId != null ? String(inicial.categoriaPaiId) : '');
  const [erro, setErro] = useState('');
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);
  const opcoesPai = raizes.filter((r) => r.id !== inicial?.id);

  async function enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    const nome = descricao.trim();
    setErro(nome.length < 2 ? 'Escreva um nome com pelo menos 2 letras.' : '');
    setErroApi('');
    if (nome.length < 2) return;
    setSalvando(true);
    try {
      const dto = { descricao: nome, icone: icone || '', categoriaPaiId: paiId ? Number(paiId) : null };
      const salvo = editando ? await api.atualizar(inicial.id, dto) : await api.criar(dto);
      onSalvo?.(salvo);
    } catch (err) {
      setErroApi(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" aria-label={editando ? 'Editar categoria' : 'Nova categoria'}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-medium/60 p-3" aria-hidden="true">
        <ChipCategoria icone={icone} />
        <div className="min-w-0">
          <p className="font-medium truncate">{descricao.trim() || 'Nome da categoria'}</p>
          <p className="text-xs text-text-primary/60">
            {paiId ? `Subcategoria de ${raizes.find((r) => String(r.id) === paiId)?.descricao ?? '—'}` : 'Categoria principal'}
          </p>
        </div>
      </div>

      <FormField label="Nome" required error={erro}>
        <FormInput value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={100} placeholder="Ex.: Alimentação" autoComplete="off" />
      </FormField>

      <FormField
        label="Fica dentro de"
        help={temFilhas ? 'Esta categoria tem subcategorias, então continua sendo principal.' : 'Vazio = categoria principal. Escolha uma para virar subcategoria dela.'}
      >
        <FormSelect value={paiId} onChange={(e) => setPaiId(e.target.value)} disabled={temFilhas}>
          <option value="">Nenhuma (categoria principal)</option>
          {opcoesPai.map((r) => <option key={r.id} value={r.id}>{r.descricao}</option>)}
        </FormSelect>
      </FormField>

      <IconePicker value={icone} onChange={setIcone} />

      {erroApi && <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">{erroApi}</p>}

      <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-1 bg-surface-low flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {onCancelar && <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>}
        <Button type="submit" loading={salvando} leftIcon={editando ? null : <Plus className="w-4 h-4" aria-hidden="true" />}>
          {editando ? 'Salvar' : 'Criar categoria'}
        </Button>
      </div>
    </form>
  );
}
