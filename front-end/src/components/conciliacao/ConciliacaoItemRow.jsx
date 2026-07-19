import React from 'react';
import { conciliacao as api } from '../../lib/api';
import ItemRowBase from './_ItemRowBase';
import VincularContaModal from './VincularContaModal';
import FormularioNovaContaInline from './FormularioNovaContaInline';

export default function ConciliacaoItemRow({ item, conciliacaoId, onUpdate }) {
  const acoesApi = {
    vincular: (itemId, conta) => api.vincularItem(conciliacaoId, itemId, { contaId: conta.id }),
    criar: (itemId, dto) => api.criarContaItem(conciliacaoId, itemId, dto),
    ignorar: (itemId) => api.ignorarItem(conciliacaoId, itemId),
    desvincular: (itemId) => api.desvincularItem(conciliacaoId, itemId),
  };

  return (
    <ItemRowBase
      item={item}
      onUpdate={onUpdate}
      api={acoesApi}
      vinculo={{ idKey: 'contaId', descricaoKey: 'contaDescricao' }}
      descricaoOfx={(it) => it.ofxMemo || it.ofxNome}
      vincularLabel="Vincular a conta existente"
      criarLabel="Criar lançamento"
      renderModal={({ item: it, onConfirm, onClose, salvando }) => (
        <VincularContaModal item={it} salvando={salvando} onConfirm={onConfirm} onClose={onClose} />
      )}
      renderForm={({ item: it, onConfirm, onCancel }) => (
        <FormularioNovaContaInline item={it} onConfirm={onConfirm} onCancel={onCancel} />
      )}
    />
  );
}
