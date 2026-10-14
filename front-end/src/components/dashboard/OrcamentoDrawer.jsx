import React, { useMemo, useState } from 'react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import FormField, { FormInput, FormSelect } from '../ui/FormField';
import { categorias as categoriasApi } from '../../lib/api';
import { useCarga } from '../../hooks/useCarga';
import { useToast } from '../../hooks/useToast';
import { formatarMoeda } from '../../lib/formatters';
import { orcamentosApi } from './apiVisaoGeral';

/**
 * Criar/editar orçamento numa gaveta lateral (mesmo formulário nos dois modos).
 * Só categorias PRINCIPAIS aceitam orçamento (o backend recusa subcategoria) e cada categoria
 * tem no máximo um. Abra com `key` diferente para reiniciar o formulário.
 *
 * Props: aberto, onFechar, item (OrcamentoItemResponseDto para editar | null), inicial
 *        ({ categoriaId, valorLimite } para criar a partir de uma sugestão), usadas (ids com orçamento),
 *        sugestoes (SugestaoOrcamentoResponseDto[]), onSalvo().
 */
const MENSAGENS = {
  ORCAMENTO_JA_EXISTE: 'Essa categoria já tem orçamento. Edite o que já existe na lista.',
};

/** "1.500,50" ou "1500.50" → 1500.5 */
const paraNumero = (texto) => {
  const t = String(texto ?? '').trim().replace(/\s|R\$/g, '');
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normal);
  return t && Number.isFinite(n) ? n : NaN;
};

export default function OrcamentoDrawer({ aberto, onFechar, item = null, inicial = null, usadas = [], sugestoes = [], onSalvo }) {
  const toast = useToast();
  const editando = Boolean(item);
  const { dados: arvore, carregando: carregandoCats, erro: erroCats } = useCarga(() => categoriasApi.arvore(), ['arvore'], { ativo: aberto, inicial: [] });

  const [categoriaId, setCategoriaId] = useState(String(item?.categoria?.id ?? inicial?.categoriaId ?? ''));
  const [valor, setValor] = useState(() => {
    const v = item?.limite ?? inicial?.valorLimite;
    return v != null ? String(Number(v).toFixed(2)).replace('.', ',') : '';
  });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const opcoes = useMemo(() => (arvore ?? [])
    .filter((c) => c.ativo !== false)
    .filter((c) => String(c.id) === categoriaId || !usadas.includes(c.id))
    .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR')), [arvore, usadas, categoriaId]);

  const sugestao = sugestoes.find((s) => String(s.categoria?.id) === categoriaId);

  async function salvar(e) {
    e.preventDefault();
    const valorLimite = paraNumero(valor);
    const novos = {};
    if (!categoriaId) novos.categoria = 'Escolha a categoria.';
    if (!Number.isFinite(valorLimite) || valorLimite <= 0) novos.valor = 'Informe um limite maior que zero, por exemplo 1.500,00.';
    if (Object.keys(novos).length) { setErros(novos); return; }

    setSalvando(true);
    try {
      const dto = { categoriaId: Number(categoriaId), valorLimite: Math.round(valorLimite * 100) / 100 };
      if (editando) await orcamentosApi.atualizar(item.id, dto);
      else await orcamentosApi.criar(dto);
      toast.success(editando ? 'Orçamento atualizado.' : 'Orçamento criado.');
      onSalvo?.();
      onFechar();
    } catch (erro) {
      const msg = MENSAGENS[erro.codigo] ?? erro.message ?? 'Não deu para salvar. Tente de novo.';
      if (erro.status === 409 || erro.status === 400 || erro.status === 404) setErros({ categoria: msg });
      else toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Drawer
      open={aberto}
      onClose={onFechar}
      title={editando ? 'Editar orçamento' : 'Novo orçamento'}
      description="Um limite por mês para uma categoria principal. Vale para todos os meses até você mudar."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" form="form-orcamento" loading={salvando}>{editando ? 'Salvar' : 'Criar orçamento'}</Button>
        </div>
      }
    >
      <form id="form-orcamento" onSubmit={salvar} className="space-y-5" noValidate>
        <FormField
          label="Categoria"
          required
          error={erros.categoria || (erroCats ? 'Não deu para carregar as categorias.' : undefined)}
          help="Subcategorias entram no total da categoria principal."
        >
          <FormSelect
            value={categoriaId}
            onChange={(e) => { setCategoriaId(e.target.value); setErros((x) => ({ ...x, categoria: undefined })); }}
            disabled={carregandoCats}
          >
            <option value="">{carregandoCats ? 'Carregando…' : 'Escolha a categoria'}</option>
            {opcoes.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
          </FormSelect>
        </FormField>

        <FormField
          label="Limite por mês (R$)"
          required
          error={erros.valor}
          help={sugestao?.sugestaoLimite ? `Sugestão pela média dos últimos 3 meses: ${formatarMoeda(sugestao.sugestaoLimite)}.` : 'Quanto você quer gastar, no máximo, nesta categoria a cada mês.'}
        >
          <FormInput
            inputMode="decimal"
            autoComplete="off"
            value={valor}
            onChange={(e) => { setValor(e.target.value); setErros((x) => ({ ...x, valor: undefined })); }}
            placeholder="0,00"
          />
        </FormField>
        {sugestao?.sugestaoLimite && paraNumero(valor) !== Number(sugestao.sugestaoLimite) && (
          <Button type="button" variant="link" size="sm" onClick={() => setValor(Number(sugestao.sugestaoLimite).toFixed(2).replace('.', ','))}>
            Usar a sugestão de {formatarMoeda(sugestao.sugestaoLimite)}
          </Button>
        )}
      </form>
    </Drawer>
  );
}
