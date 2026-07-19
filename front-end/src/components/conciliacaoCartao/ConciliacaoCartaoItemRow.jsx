import React from 'react';
import { conciliacaoCartao as api } from '../../lib/api';
import ItemRowBase from '../conciliacao/_ItemRowBase';
import VincularLancamentoModal from './VincularLancamentoModal';
import FormularioNovoLancamentoInline from './FormularioNovoLancamentoInline';

export default function ConciliacaoCartaoItemRow({ item, conciliacaoId, cartaoId, onUpdate }) {
  const acoesApi = {
    vincular: (itemId, lancamento) => api.vincularItem(conciliacaoId, itemId, { lancamentoId: lancamento.id }),
    criar: (itemId, dto) => api.criarLancamento(conciliacaoId, itemId, dto),
    ignorar: (itemId) => api.ignorarItem(conciliacaoId, itemId),
    desvincular: (itemId) => api.desvincularItem(conciliacaoId, itemId),
  };

  return (
    <ItemRowBase
      item={item}
      onUpdate={onUpdate}
      api={acoesApi}
      vinculo={{ idKey: 'lancamentoId', descricaoKey: 'lancamentoDescricao' }}
      descricaoOfx={(it) => it.ofxMemo}
      // Créditos/estornos do cartão não geram despesa — só podem ser ignorados.
      somenteIgnorar={(it) => it.ofxTipo === 'CREDIT'}
      badgeExtra={(it) => it.ofxTipo === 'CREDIT' ? (
        <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">Crédito</span>
      ) : null}
      vincularLabel="Vincular a lançamento existente"
      criarLabel="Criar lançamento"
      renderModal={({ item: it, onConfirm, onClose, salvando }) => (
        <VincularLancamentoModal item={it} cartaoId={cartaoId} salvando={salvando} onConfirm={onConfirm} onClose={onClose} />
      )}
      renderForm={({ item: it, onConfirm, onCancel }) => (
        <FormularioNovoLancamentoInline item={it} onConfirm={onConfirm} onCancel={onCancel} />
      )}
    />
  );
}
