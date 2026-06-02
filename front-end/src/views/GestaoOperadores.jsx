import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, UserPlus, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { operadores, convites, perfisAcesso } from '../lib/api';
import PermissaoGuard from '../components/ui/PermissaoGuard';

function aba(ativo, onClick, label) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: ativo ? 'rgba(110,255,192,.1)' : 'transparent', color: ativo ? '#6EFFC0' : 'rgba(250,250,250,.4)', cursor: 'pointer', fontSize: 13, fontWeight: ativo ? 700 : 400, fontFamily: "'DM Sans', sans-serif", transition: 'all 200ms' }}
    >{label}</button>
  );
}

function ModalConvite({ perfis, onClose, onSave, loading }) {
  const [form, setForm] = useState({ email: '', perfilId: '' });
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));
  const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center' },
    card: { background: '#161616', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 32, maxWidth: 420, width: '90%' },
    input: { display: 'block', width: '100%', padding: '12px 14px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, color: '#fafafa', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', marginBottom: 12, boxSizing: 'border-box' },
  };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: '#fafafa', marginBottom: 20 }}>Convidar Operador</h2>
        <label style={{ fontSize: 11, color: 'rgba(250,250,250,.4)', display: 'block', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>E-mail</label>
        <input style={S.input} type="email" value={form.email} onChange={set('email')} placeholder="operador@empresa.com" />
        <label style={{ fontSize: 11, color: 'rgba(250,250,250,.4)', display: 'block', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>Perfil</label>
        <select style={{ ...S.input, appearance: 'none' }} value={form.perfilId} onChange={set('perfilId')}>
          <option value="">Selecione um perfil…</option>
          {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(250,250,250,.5)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={() => onSave(form)} disabled={loading || !form.email || !form.perfilId} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#6EFFC0', border: 'none', color: '#003824', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: "'Sora', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading || !form.email || !form.perfilId ? .6 : 1 }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Convidar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestaoOperadores() {
  const [tab, setTab] = useState('ativos');
  const [membros, setMembros] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalConvite, setModalConvite] = useState(false);
  const [savingConvite, setSavingConvite] = useState(false);
  const [reenvId, setReenvId] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    setErro('');
    Promise.all([
      operadores.listar({ size: 50 }).catch(() => ({ content: [] })),
      convites.pendentes({ size: 50 }).catch(() => ({ content: [] })),
      perfisAcesso.listar().catch(() => []),
    ]).then(([m, p, pf]) => {
      setMembros(Array.isArray(m) ? m : (m?.content ?? []));
      setPendentes(Array.isArray(p) ? p : (p?.content ?? []));
      setPerfis(Array.isArray(pf) ? pf : (pf?.content ?? []));
    }).catch(() => setErro('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const remover = async (usuarioId, nome) => {
    if (!window.confirm(`Remover ${nome} da empresa?`)) return;
    try {
      await operadores.remover(usuarioId);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao remover operador.');
    }
  };

  const reativar = async (usuarioId, nome) => {
    if (!window.confirm(`Reativar ${nome} na empresa?`)) return;
    try {
      await operadores.reativar(usuarioId);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao reativar operador.');
    }
  };

  const reenviarConvite = async (id) => {
    setReenvId(id);
    setErro('');
    try {
      await convites.reenviar(id);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao reenviar convite.');
    } finally {
      setReenvId(null);
    }
  };

  const enviarConvite = async (form) => {
    setSavingConvite(true);
    try {
      await convites.convidar({ email: form.email, perfilId: Number(form.perfilId) });
      setModalConvite(false);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao enviar convite.');
    } finally {
      setSavingConvite(false);
    }
  };

  const thStyle = { padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(250,250,250,.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.1em' };
  const tdStyle = { padding: '12px 16px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: 'rgba(250,250,250,.8)' };

  return (
    <>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary, #fafafa)', margin: 0 }}>Operadores</h1>
          <p style={{ fontSize: 13, color: 'rgba(250,250,250,.4)', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>Gerencie membros e convites da empresa</p>
        </div>
        <PermissaoGuard permissao="USUARIO_CONVIDAR">
          <button onClick={() => setModalConvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#6EFFC0', border: 'none', color: '#003824', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
            <UserPlus size={15} /> Convidar
          </button>
        </PermissaoGuard>
      </div>

      {erro && <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13, marginBottom: 16 }}>{erro}</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {aba(tab === 'ativos', () => setTab('ativos'), `Ativos (${membros.length})`)}
        {aba(tab === 'pendentes', () => setTab('pendentes'), `Convites Pendentes (${pendentes.length})`)}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#6EFFC0' }} />
        </div>
      ) : tab === 'ativos' ? (
        <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>E-mail</th>
                <th style={thStyle}>Perfil</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => (
                <tr key={m.usuarioId} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.senhaProvisoria && <AlertTriangle size={13} style={{ color: '#FFD37A', flexShrink: 0 }} title="Senha provisória" />}
                      <span style={{ fontWeight: 600, color: '#fafafa' }}>{m.nome}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: 'rgba(250,250,250,.5)' }}>{m.email}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(172,199,255,.1)', color: '#ACC7FF', border: '1px solid rgba(172,199,255,.2)' }}>
                      {m.perfilNome}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: m.ativo ? 'rgba(110,255,192,.08)' : 'rgba(255,255,255,.04)', color: m.ativo ? '#6EFFC0' : 'rgba(250,250,250,.3)', border: `1px solid ${m.ativo ? 'rgba(110,255,192,.2)' : 'rgba(255,255,255,.08)'}` }}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {m.ativo ? (
                      <button onClick={() => remover(m.usuarioId, m.nome)} title="Remover" style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,100,100,.06)', border: '1px solid rgba(255,100,100,.15)', color: '#FFB4AB', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <button onClick={() => reativar(m.usuarioId, m.nome)} title="Reativar" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(110,255,192,.06)', border: '1px solid rgba(110,255,192,.2)', color: '#6EFFC0', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                        <RotateCcw size={12} /> Reativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {membros.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: 'rgba(250,250,250,.3)' }}>Nenhum operador ativo.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <th style={thStyle}>E-mail</th>
                <th style={thStyle}>Perfil</th>
                <th style={thStyle}>Expira em</th>
                <th style={thStyle}>Convidado por</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((c, i) => (
                <tr key={c.id ?? i} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#fafafa' }}>{c.emailConvidado}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(172,199,255,.1)', color: '#ACC7FF', border: '1px solid rgba(172,199,255,.2)' }}>{c.perfilNome}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'rgba(250,250,250,.5)' }}>
                    {c.expiraEm ? new Date(c.expiraEm).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'rgba(250,250,250,.5)' }}>{c.convidadoPorEmail ?? '—'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => reenviarConvite(c.id)}
                      disabled={reenvId === c.id}
                      title="Reenviar convite"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(110,255,192,.06)', border: '1px solid rgba(110,255,192,.2)', color: '#6EFFC0', cursor: reenvId === c.id ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif", opacity: reenvId === c.id ? .6 : 1 }}
                    >
                      {reenvId === c.id
                        ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        : <RotateCcw size={12} />}
                      Reenviar
                    </button>
                  </td>
                </tr>
              ))}
              {pendentes.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: 'rgba(250,250,250,.3)' }}>Nenhum convite pendente.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modalConvite && (
        <ModalConvite
          perfis={perfis}
          onClose={() => setModalConvite(false)}
          onSave={enviarConvite}
          loading={savingConvite}
        />
      )}
    </>
  );
}
