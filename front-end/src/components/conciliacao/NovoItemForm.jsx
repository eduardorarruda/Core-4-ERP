import React from 'react';
import { Plus } from 'lucide-react';
import ContaForm from '../forms/ContaForm';
import LancamentoCartaoForm from '../forms/LancamentoCartaoForm';

/**
 * "Criar novo" a partir de um item do extrato, com os formulários únicos do app:
 * conta a pagar/receber (banco → forms/ContaForm) ou lançamento no cartão
 * (cartão → forms/LancamentoCartaoForm). O registro é criado E vinculado ao item pelo
 * endpoint da conciliação; erros aparecem dentro do próprio formulário.
 *
 * Props: cfg, sessaoId, item, onCriado(itemAtualizado), onCancelar().
 */
export default function NovoItemForm({ cfg, sessaoId, item, onCriado, onCancelar }) {
  const descricao = cfg.descricaoOfx(item);
  const valor = Math.abs(Number(item.ofxValor) || 0);

  return (
    <div className="rounded-2xl border border-primary/25 bg-surface-medium/60 p-4">
      <p className="flex items-center gap-2 mb-3 font-display text-sm font-semibold text-text-primary">
        <Plus className="w-4 h-4 text-primary" aria-hidden="true" /> {cfg.vinculo.criarTitulo}
      </p>
      {cfg.id === 'cartao' ? (
        <LancamentoCartaoForm
          modo="criar"
          compacto
          inicial={{ descricao, valor, dataCompra: item.ofxData }}
          enviar={(dto) => cfg.acoes.criar(sessaoId, item.id, {
            descricao: dto.descricao,
            valor: dto.valor,
            dataCompra: dto.dataCompra,
            categoriaId: dto.categoriaId,
            parceiroId: dto.parceiroId,
          })}
          parceiroObrigatorio={false}
          mostrarTipo={false}
          mostrarParcelas={false}
          rotuloSalvar="Criar e vincular"
          onSalvo={(atualizado) => onCriado(atualizado)}
          onCancelar={onCancelar}
        />
      ) : (
        <ContaForm
          modo="compacto"
          tipo={Number(item.ofxValor) < 0 ? 'PAGAR' : 'RECEBER'}
          inicial={{ descricao, valorOriginal: valor, dataVencimento: item.ofxData }}
          salvar={async (dto) => {
            // A conciliação bancária exige o fornecedor/cliente (o cadastro comum não).
            if (!dto.parceiroId) throw new Error('Escolha o fornecedor ou cliente para criar a conta a partir do extrato.');
            return cfg.acoes.criar(sessaoId, item.id, {
              descricao: dto.descricao,
              valorOriginal: dto.valorOriginal,
              dataVencimento: dto.dataVencimento,
              tipo: dto.tipo,
              categoriaId: dto.categoriaId,
              parceiroId: dto.parceiroId,
            });
          }}
          rotuloSalvar="Criar e vincular"
          onSalvo={(atualizado) => onCriado(atualizado)}
          onCancelar={onCancelar}
        />
      )}
    </div>
  );
}
