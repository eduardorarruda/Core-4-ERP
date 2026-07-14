import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Pencil, PowerOff, RefreshCw } from 'lucide-react';
import { planos } from '../lib/api';

function fmt(valor) {
  if (!valor || Number(valor) === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

const FORM_VAZIO = { nome: '', descricao: '', precoMensal: '', maxUsuarios: '1', maxEmpresas: '1' };

function Modal({ title, onClose, onSave, loading, form, setForm }) {
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center' },
    card: { background: '#161616', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 32, maxWidth: 460, width: '90%' },
    input: { display: 'block', width: '100%', padding: '12px 14px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, color: '#fafafa', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', marginBottom: 12, boxSizing: 'border-box' },
    label: { fontSize: 11, color: 'rgba(250,250,250,.4)', fontFamily: "'DM Sans', sans-serif", marginBottom: 4, display: 'block' },
  };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: '#fafafa', marginBottom: 24 }}>{title}</h2>
        <label style={S.label}>Nome</label>
        <input style={S.input} value={form.nome} onChange={set('nome')} placeholder="Ex: PROFISSIONAL" maxLength={60} />
        <label style={S.label}>Descrição</label>
        <textarea style={{ ...S.input, height: 80, resize: 'vertical' }} value={form.descricao} onChange={set('descricao')} placeholder="Descrição do plano" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Preço (R$)</label>
            <input style={{ ...S.input, marginBottom: 0 }} type="number" min="0" step="0.01" value={form.precoMensal} onChange={set('precoMensal')} placeholder="0.00" />
          </div>
          <div>
            <label style={S.label}>Máx. usuários (-1=∞)</label>
            <input style={{ ...S.input, marginBottom: 0 }} type="number" min="-1" value={form.maxUsuarios} onChange={set('maxUsuarios')} />
          </div>
          <div>
            <label style={S.label}>Máx. empresas (-1=∞)</label>
            <input style={{ ...S.input, marginBottom: 0 }} type="number" min="-1" value={form.maxEmpresas} onChange={set('maxEmpresas')} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(250,250,250,.5)', cursor: 'pointer', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={onSave} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#6EFFC0', border: 'none', color: '#003824', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: "'Sora', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? .7 : 1 }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestaoPlanos() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    planos.listarTodos()
      .then(setLista)
      .catch(() => setErro('Erro ao carregar planos.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCriar = () => { setEditando(null); setForm(FORM_VAZIO); setModalAberto(true); };
  const abrirEditar = (p) => {
    setEditando(p);
    setForm({ nome: p.nome, descricao: p.descricao ?? '', precoMensal: String(p.precoMensal), maxUsuarios: String(p.maxUsuarios), maxEmpresas: String(p.maxEmpresas) });
    setModalAberto(true);
  };

  const salvar = async () => {
    setSaving(true);
    const dto = { nome: form.nome, descricao: form.descricao, precoMensal: parseFloat(form.precoMensal) || 0, maxUsuarios: parseInt(form.maxUsuarios) || 1, maxEmpresas: parseInt(form.maxEmpresas) || 1 };
    try {
      if (editando) await planos.atualizar(editando.id, dto);
      else await planos.criar(dto);
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar plano.');
    } finally {
      setSaving(false);
    }
  };

  const desativar = async (p) => {
    if (!window.confirm(`Desativar o plano ${p.nome}?`)) return;
    try {
      await planos.desativar(p.id);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao desativar plano.');
    }
  };

  const reativar = async (p) => {
    if (!window.confirm(`Reativar o plano ${p.nome}?`)) return;
    try {
      await planos.reativar(p.id);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao reativar plano.');
    }
  };

  return (
    <>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary, #fafafa)', margin: 0 }}>Gestão de Planos</h1>
          <p style={{ fontSize: 13, color: 'rgba(250,250,250,.4)', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>Admin Sistema — gerenciamento da plataforma</p>
        </div>
        <button onClick={abrirCriar} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#6EFFC0', border: 'none', color: '#003824', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
          <Plus size={16} /> Novo Plano
        </button>
      </div>

      {erro && <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13, marginBottom: 16 }}>{erro}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#6EFFC0' }} />
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {['Nome', 'Descrição', 'Preço', 'Máx. Usuários', 'Máx. Empresas', 'Status', 'Ações'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(250,250,250,.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fafafa' }}>{p.nome}</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(250,250,250,.5)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descricao ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#6EFFC0', fontWeight: 600 }}>{fmt(p.precoMensal)}</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(250,250,250,.7)' }}>{p.maxUsuarios === -1 ? '∞' : p.maxUsuarios}</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(250,250,250,.7)' }}>{p.maxEmpresas === -1 ? '∞' : p.maxEmpresas}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: p.ativo ? 'rgba(110,255,192,.1)' : 'rgba(255,255,255,.05)', color: p.ativo ? '#6EFFC0' : 'rgba(250,250,250,.35)', border: `1px solid ${p.ativo ? 'rgba(110,255,192,.2)' : 'rgba(255,255,255,.08)'}` }}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirEditar(p)} title="Editar" style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(250,250,250,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Pencil size={13} />
                      </button>
                      {p.ativo ? (
                        <button onClick={() => desativar(p)} title="Desativar" style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,100,100,.06)', border: '1px solid rgba(255,100,100,.15)', color: '#FFB4AB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <PowerOff size={13} />
                        </button>
                      ) : (
                        <button onClick={() => reativar(p)} title="Reativar" style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(110,255,192,.06)', border: '1px solid rgba(110,255,192,.2)', color: '#6EFFC0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <RefreshCw size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(250,250,250,.3)', fontSize: 13 }}>Nenhum plano encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal
          title={editando ? 'Editar Plano' : 'Novo Plano'}
          onClose={() => setModalAberto(false)}
          onSave={salvar}
          loading={saving}
          form={form}
          setForm={setForm}
        />
      )}
    </>
  );
}
