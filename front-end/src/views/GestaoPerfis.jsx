import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, ShieldCheck, Lock } from 'lucide-react';
import { perfisAcesso } from '../lib/api';

const MODULO_LABEL = {
  CONTA: 'Lançamentos',
  CONTA_CORRENTE: 'Contas Correntes',
  CARTAO: 'Cartões',
  CARTAO_CONCILIACAO: 'Conciliação de Cartão',
  CATEGORIA: 'Categorias',
  PARCEIRO: 'Parceiros',
  INVESTIMENTO: 'Investimentos',
  ASSINATURA: 'Assinaturas',
  CONCILIACAO: 'Conciliação Bancária',
  RELATORIO: 'Relatórios',
  RELATORIO_FLUXO_CAIXA: 'Relatório: Fluxo de Caixa',
  RELATORIO_CONTAS_ABERTAS: 'Relatório: Contas Abertas',
  RELATORIO_EXTRATO: 'Relatório: Extrato',
  RELATORIO_DRE: 'Relatório: DRE',
  RELATORIO_INVESTIMENTOS: 'Relatório: Investimentos',
  RELATORIO_CARTOES: 'Relatório: Cartões',
  RELATORIO_POSICAO_FINANCEIRA: 'Relatório: Posição Financeira',
  RELATORIO_ASSINATURAS: 'Relatório: Assinaturas',
  USUARIO: 'Usuários',
  CONFIGURACAO: 'Configurações',
  AUDITORIA: 'Auditoria',
  CALENDARIO: 'Calendário',
  DASHBOARD: 'Dashboard Geral',
  DASHBOARD_CARTAO: 'Dashboard de Cartões',
};

const FORM_VAZIO = { nome: '', descricao: '', permissaoIds: new Set() };

function agruparPorModulo(permissoes) {
  return permissoes.reduce((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push(p);
    return acc;
  }, {});
}

function ModalPerfil({ perfil, todasPermissoes, onClose, onSave, loading }) {
  const [form, setForm] = useState(() => {
    if (perfil) {
      const ids = new Set(
        todasPermissoes.filter((p) => perfil.permissoes.includes(p.codigo)).map((p) => p.id)
      );
      return { nome: perfil.nome, descricao: perfil.descricao ?? '', permissaoIds: ids };
    }
    return { ...FORM_VAZIO, permissaoIds: new Set() };
  });

  const grupos = agruparPorModulo(todasPermissoes);

  const togglePermissao = (id) => {
    setForm((prev) => {
      const ids = new Set(prev.permissaoIds);
      const permissao = todasPermissoes.find((p) => p.id === id);
      if (ids.has(id)) {
        ids.delete(id);
        // Ao remover VISUALIZAR, remove todas as outras do mesmo módulo
        if (permissao?.acao === 'VISUALIZAR') {
          const idsModulo = grupos[permissao.modulo]?.map((p) => p.id) ?? [];
          idsModulo.forEach((mid) => ids.delete(mid));
        }
      } else {
        ids.add(id);
        // Ao adicionar qualquer ação não-VISUALIZAR, auto-adiciona VISUALIZAR do módulo
        if (permissao && permissao.acao !== 'VISUALIZAR') {
          const visualizar = grupos[permissao.modulo]?.find((p) => p.acao === 'VISUALIZAR');
          if (visualizar) ids.add(visualizar.id);
        }
      }
      return { ...prev, permissaoIds: ids };
    });
  };

  const toggleModulo = (modulo) => {
    const idsModulo = grupos[modulo].map((p) => p.id);
    const todosMarcados = idsModulo.every((id) => form.permissaoIds.has(id));
    setForm((prev) => {
      const ids = new Set(prev.permissaoIds);
      if (todosMarcados) idsModulo.forEach((id) => ids.delete(id));
      else idsModulo.forEach((id) => ids.add(id));
      return { ...prev, permissaoIds: ids };
    });
  };

  const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', overflowY: 'auto', padding: '24px 0' },
    card: { background: '#161616', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 32, maxWidth: 600, width: '90%' },
    input: { display: 'block', width: '100%', padding: '11px 14px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, color: '#fafafa', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', marginBottom: 12, boxSizing: 'border-box' },
    label: { fontSize: 11, color: 'rgba(250,250,250,.4)', fontFamily: "'DM Sans', sans-serif", marginBottom: 4, display: 'block' },
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: '#fafafa', marginBottom: 20 }}>
          {perfil ? 'Editar Perfil' : 'Novo Perfil'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
          <div>
            <label style={S.label}>Nome do perfil</label>
            <input style={{ ...S.input, marginBottom: 0, textTransform: 'uppercase' }} value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: VENDEDOR" maxLength={50} />
          </div>
          <div>
            <label style={S.label}>Descrição</label>
            <input style={{ ...S.input, marginBottom: 0 }} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o perfil" maxLength={200} />
          </div>
        </div>

        <div style={{ marginTop: 20, marginBottom: 8 }}>
          <label style={{ ...S.label, fontSize: 12, color: 'rgba(250,250,250,.6)', marginBottom: 12 }}>Permissões</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
            {Object.entries(grupos).map(([modulo, perms]) => {
              const todos = perms.every((p) => form.permissaoIds.has(p.id));
              const alguns = !todos && perms.some((p) => form.permissaoIds.has(p.id));
              return (
                <div key={modulo} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }} onClick={() => toggleModulo(modulo)}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${todos ? '#6EFFC0' : alguns ? '#FFD37A' : 'rgba(255,255,255,.2)'}`, background: todos ? '#6EFFC0' : alguns ? 'rgba(255,211,122,.15)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {todos && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#003824" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      {alguns && <div style={{ width: 8, height: 2, background: '#FFD37A', borderRadius: 1 }} />}
                    </div>
                    <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 700, color: '#fafafa' }}>
                      {MODULO_LABEL[modulo] ?? modulo}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(250,250,250,.3)', fontFamily: 'monospace' }}>
                      {perms.filter((p) => form.permissaoIds.has(p.id)).length}/{perms.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {perms.map((p) => {
                      const marcado = form.permissaoIds.has(p.id);
                      return (
                        <button key={p.id} onClick={() => togglePermissao(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: `1px solid ${marcado ? 'rgba(110,255,192,.3)' : 'rgba(255,255,255,.08)'}`, background: marcado ? 'rgba(110,255,192,.08)' : 'transparent', color: marcado ? '#6EFFC0' : 'rgba(250,250,250,.4)', fontSize: 11, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', transition: 'all 150ms' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: marcado ? '#6EFFC0' : 'rgba(255,255,255,.15)', flexShrink: 0 }} />
                          {p.acao}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(250,250,250,.5)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={() => onSave({ nome: form.nome, descricao: form.descricao, permissaoIds: [...form.permissaoIds] })} disabled={loading || !form.nome.trim()} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#6EFFC0', border: 'none', color: '#003824', fontWeight: 700, cursor: loading || !form.nome.trim() ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: "'Sora', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading || !form.nome.trim() ? .6 : 1 }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestaoPerfis() {
  const [perfis, setPerfis] = useState([]);
  const [todasPermissoes, setTodasPermissoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    setErro('');
    Promise.all([
      perfisAcesso.listar().catch(() => []),
      perfisAcesso.listarPermissoes().catch(() => []),
    ]).then(([p, pm]) => {
      setPerfis(Array.isArray(p) ? p : []);
      setTodasPermissoes(Array.isArray(pm) ? pm : []);
    }).catch(() => setErro('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCriar = () => { setEditando(null); setModalAberto(true); };
  const abrirEditar = (p) => { setEditando(p); setModalAberto(true); };

  const salvar = async (dto) => {
    setSaving(true);
    try {
      if (editando) await perfisAcesso.atualizar(editando.id, dto);
      else await perfisAcesso.criar(dto);
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const deletar = async (p) => {
    if (!window.confirm(`Remover o perfil "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await perfisAcesso.deletar(p.id);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao remover perfil.');
    }
  };

  const thStyle = { padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(250,250,250,.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.1em' };
  const tdStyle = { padding: '12px 16px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: 'rgba(250,250,250,.8)' };

  return (
    <>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary, #fafafa)', margin: 0 }}>Perfis de Acesso</h1>
          <p style={{ fontSize: 13, color: 'rgba(250,250,250,.4)', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>Gerencie perfis e permissões dos operadores</p>
        </div>
        <button onClick={abrirCriar} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#6EFFC0', border: 'none', color: '#003824', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
          <Plus size={15} /> Novo Perfil
        </button>
      </div>

      {erro && <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13, marginBottom: 16 }}>{erro}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#6EFFC0' }} />
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <th style={thStyle}>Perfil</th>
                <th style={thStyle}>Descrição</th>
                <th style={thStyle}>Permissões</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={14} style={{ color: p.protegido ? '#FFD37A' : '#6EFFC0', flexShrink: 0 }} />
                      {p.nome}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: 'rgba(250,250,250,.5)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descricao ?? '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(172,199,255,.1)', color: '#ACC7FF', border: '1px solid rgba(172,199,255,.2)' }}>
                      {p.permissoes?.length ?? 0} permissões
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {p.protegido ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(250,250,250,.3)' }}>
                        <Lock size={11} /> Sistema
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#6EFFC0' }}>Personalizado</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirEditar(p)} disabled={p.protegido} title={p.protegido ? 'Perfil do sistema não pode ser editado' : 'Editar'} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: p.protegido ? 'rgba(250,250,250,.15)' : 'rgba(250,250,250,.6)', cursor: p.protegido ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deletar(p)} disabled={p.protegido} title={p.protegido ? 'Perfil do sistema não pode ser removido' : 'Remover'} style={{ padding: '6px 10px', borderRadius: 8, background: p.protegido ? 'transparent' : 'rgba(255,100,100,.06)', border: `1px solid ${p.protegido ? 'rgba(255,255,255,.06)' : 'rgba(255,100,100,.15)'}`, color: p.protegido ? 'rgba(250,250,250,.15)' : '#FFB4AB', cursor: p.protegido ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {perfis.length === 0 && (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: 'rgba(250,250,250,.3)' }}>Nenhum perfil encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <ModalPerfil
          perfil={editando}
          todasPermissoes={todasPermissoes}
          onClose={() => setModalAberto(false)}
          onSave={salvar}
          loading={saving}
        />
      )}
    </>
  );
}
