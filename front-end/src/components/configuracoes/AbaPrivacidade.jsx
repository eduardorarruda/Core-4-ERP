import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileJson, ShieldCheck, Trash2 } from 'lucide-react';
import { auth } from '../../lib/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ExcluirContaModal from './ExcluirContaModal';

const LINK = 'text-primary underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** Dispara o download de um Blob como arquivo. */
function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Aba Privacidade e dados (LGPD art. 18): baixar os dados e excluir a conta. */
export default function AbaPrivacidade({ toast }) {
  const [baixando, setBaixando] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);

  async function baixarDados() {
    setBaixando(true);
    try {
      const blob = await auth.exportarDados();
      if (!blob) throw new Error('O servidor não devolveu o arquivo. Tente novamente.');
      baixarArquivo(blob, 'core4-meus-dados.json');
      toast.success('Arquivo com seus dados baixado.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível gerar o arquivo com seus dados.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Seus direitos" subtitle="O que a LGPD garante sobre os seus dados." icon={ShieldCheck}>
        <p className="text-sm text-text-primary/80 leading-relaxed">
          Você pode consultar, levar seus dados ou pedir a exclusão da conta quando quiser (LGPD, art. 18).
          Os detalhes estão na <Link to="/privacidade" className={LINK}>Política de Privacidade</Link> e
          nos <Link to="/termos" className={LINK}>Termos de Uso</Link>.
        </p>
      </Card>

      <Card title="Baixar meus dados" subtitle="Um arquivo JSON com seus dados pessoais e de uso." icon={FileJson}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-text-primary/75 leading-relaxed max-w-md">
            Inclui seu cadastro, vínculos com empresas e registros de uso guardados no Core 4.
          </p>
          <Button variant="secondary" loading={baixando} onClick={baixarDados} leftIcon={<Download className="w-4 h-4" aria-hidden="true" />} className="shrink-0">
            {baixando ? 'Gerando arquivo…' : 'Baixar meus dados'}
          </Button>
        </div>
      </Card>

      <Card title="Excluir minha conta" subtitle="Não dá para desfazer." icon={Trash2} accentColor="var(--color-error)">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-text-primary/75 leading-relaxed max-w-md">
            Seus dados pessoais são anonimizados e a conta é desativada. Só fica o que a lei obriga a guardar.
          </p>
          <Button variant="danger" onClick={() => setExcluirAberto(true)} leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />} className="shrink-0">
            Excluir minha conta
          </Button>
        </div>
      </Card>

      <ExcluirContaModal open={excluirAberto} onClose={() => setExcluirAberto(false)} />
    </div>
  );
}
