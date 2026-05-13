/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Shield, 
  ChevronRight, 
  Building2, 
  Phone, 
  Mail, 
  Calendar,
  FileText,
  TrendingUp,
  Printer,
  Download,
  Upload,
  RotateCcw,
  Cloud,
  LogOut,
  User,
  Save,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider, signInWithPopup, signOut } from './firebase';
import { 
  collection, 
  query, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  originalPrice: number;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [cloudProposals, setCloudProposals] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  // Firestore Error Handler
  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Cloud Proposals Effect
  useEffect(() => {
    if (!user) {
      setCloudProposals([]);
      return;
    }

    const q = query(
      collection(db, `users/${user.uid}/proposals`),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const proposals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCloudProposals(proposals);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/proposals`);
    });

    return () => unsubscribe();
  }, [user]);

  // Test connection on boot
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        // Normal if 'test/connection' doesn't exist, but helps check early failures
      }
    };
    testConnection();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

  const saveToCloud = async () => {
    if (!user) {
      alert("Por favor, faça login para salvar na nuvem.");
      return;
    }

    const proposalName = prompt("Dê um nome para esta proposta:", `Proposta - ${clientName}`);
    if (!proposalName) return;

    setIsSaving(true);
    const proposalId = 'p_' + Date.now();
    const data = {
      clientName, clientAddress, companyName, companyTagline, companyPhone,
      companyEmail, companySite, companyCNPJ, logoUrl, footerMessage, laborCost, laborDescription,
      proposalStatus, clientTagline, validity, executionTime, warranty,
      paymentTerms, signatureRole, items, markupPercent
    };

    try {
      await setDoc(doc(db, `users/${user.uid}/proposals`, proposalId), {
        userId: user.uid,
        name: proposalName,
        data,
        updatedAt: serverTimestamp()
      });
      alert("Proposta salva na nuvem com sucesso!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/proposals/${proposalId}`);
      alert("Erro ao salvar. Verifique o console.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadFromCloud = (proposalData: any) => {
    if (confirm(`Carregar proposta "${proposalData.name}"? Isso substituirá os dados atuais.`)) {
      const data = proposalData.data;
      setClientName(data.clientName || '');
      setClientAddress(data.clientAddress || '');
      setCompanyName(data.companyName || '');
      setCompanyTagline(data.companyTagline || '');
      setCompanyPhone(data.companyPhone || '');
      setCompanyEmail(data.companyEmail || '');
      setCompanySite(data.companySite || '');
      setCompanyCNPJ(data.companyCNPJ || '');
      setLogoUrl(data.logoUrl || '');
      setFooterMessage(data.footerMessage || '');
      setLaborCost(data.laborCost || 0);
      setLaborDescription(data.laborDescription || '');
      setProposalStatus(data.proposalStatus || '');
      setClientTagline(data.clientTagline || '');
      setValidity(data.validity || '');
      setExecutionTime(data.executionTime || '');
      setWarranty(data.warranty || '');
      setPaymentTerms(data.paymentTerms || '');
      setSignatureRole(data.signatureRole || '');
      setItems(data.items || []);
      setMarkupPercent(data.markupPercent || 45);
    }
  };

  const deleteFromCloud = async (proposalId: string) => {
    if (!user) return;
    if (confirm("Tem certeza que deseja excluir esta proposta da nuvem?")) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/proposals`, proposalId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/proposals/${proposalId}`);
      }
    }
  };

  // Funções de Persistência
  const saveToLocalStorage = (key: string, value: any) => {
    localStorage.setItem(`nds_proposal_${key}`, JSON.stringify(value));
  };

  const getFromLocalStorage = (key: string, defaultValue: any) => {
    const saved = localStorage.getItem(`nds_proposal_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  };

  // Funções de Backup Externo (JSON)
  const exportData = () => {
    const data = {
      clientName, clientAddress, companyName, companyTagline, companyPhone,
      companyEmail, companySite, companyCNPJ, logoUrl, footerMessage, laborCost, laborDescription,
      proposalStatus, clientTagline, validity, executionTime, warranty,
      paymentTerms, signatureRole, items, markupPercent
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proposta-nds-${clientName.replace(/\s+/g, '-').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('Isso irá substituir todos os dados atuais pela proposta carregada. Prosseguir?')) {
          setClientName(data.clientName || '');
          setClientAddress(data.clientAddress || '');
          setCompanyName(data.companyName || '');
          setCompanyTagline(data.companyTagline || '');
          setCompanyPhone(data.companyPhone || '');
          setCompanyEmail(data.companyEmail || '');
          setCompanySite(data.companySite || '');
          setCompanyCNPJ(data.companyCNPJ || '');
          setLogoUrl(data.logoUrl || '');
          setFooterMessage(data.footerMessage || '');
          setLaborCost(data.laborCost || 0);
          setLaborDescription(data.laborDescription || 'Mão de obra especializada.');
          setProposalStatus(data.proposalStatus || '');
          setClientTagline(data.clientTagline || '');
          setValidity(data.validity || '');
          setExecutionTime(data.executionTime || '');
          setWarranty(data.warranty || '');
          setPaymentTerms(data.paymentTerms || '');
          setSignatureRole(data.signatureRole || '');
          setItems(data.items || []);
          setMarkupPercent(data.markupPercent || 45);
        }
      } catch (err) {
        alert('Erro ao ler o arquivo. Certifique-se que é um arquivo .json válido.');
      }
    };
    reader.readAsText(file);
  };

  const clearAllItems = () => {
    if (confirm('Deseja remover TODOS os itens da lista?')) {
      setItems([]);
    }
  };

  const [clientName, setClientName] = useState(() => getFromLocalStorage('clientName', 'BENEDITO DA CUNHA MACHADO NETO'));
  const [clientAddress, setClientAddress] = useState(() => getFromLocalStorage('clientAddress', 'QNJ 31 1 CASA 01, TAGUATINGA NORTE, BRASÍLIA-DF'));
  const [companyName, setCompanyName] = useState(() => getFromLocalStorage('companyName', 'NDS CFTV'));
  const [companyTagline, setCompanyTagline] = useState(() => getFromLocalStorage('companyTagline', 'Digital'));
  const [companyPhone, setCompanyPhone] = useState(() => getFromLocalStorage('companyPhone', '(61) 99830-8655'));
  const [companyEmail, setCompanyEmail] = useState(() => getFromLocalStorage('companyEmail', 'comercial@ndscftv.com.br'));
  const [companySite, setCompanySite] = useState(() => getFromLocalStorage('companySite', 'www.ndscftv.com.br'));
  const [companyCNPJ, setCompanyCNPJ] = useState(() => getFromLocalStorage('companyCNPJ', 'XX.XXX.XXX/XXXX-XX'));
  const [logoUrl, setLogoUrl] = useState(() => getFromLocalStorage('logoUrl', 'https://storage.googleapis.com/static-artifacts/NDS_LOGO_UP.png'));
  const [footerMessage, setFooterMessage] = useState(() => getFromLocalStorage('footerMessage', 'Qualidade e Segurança que seu Patrimônio Merece'));
  const [laborCost, setLaborCost] = useState(() => getFromLocalStorage('laborCost', 0));
  const [laborDescription, setLaborDescription] = useState(() => getFromLocalStorage('laborDescription', 'Mão de obra especializada para instalação e configuração do sistema.'));

  // Novos campos editáveis
  const [proposalStatus, setProposalStatus] = useState(() => getFromLocalStorage('proposalStatus', 'Comercial Profissional'));
  const [clientTagline, setClientTagline] = useState(() => getFromLocalStorage('clientTagline', 'Soluções de Monitoramento de Alta Performance'));
  const [validity, setValidity] = useState(() => getFromLocalStorage('validity', '07 dias corridos'));
  const [executionTime, setExecutionTime] = useState(() => getFromLocalStorage('executionTime', 'Conforme cronograma acordado'));
  const [warranty, setWarranty] = useState(() => getFromLocalStorage('warranty', '12 meses para equipamentos'));
  const [paymentTerms, setPaymentTerms] = useState(() => getFromLocalStorage('paymentTerms', 'Depósito / PIX / Cartão (consulte taxas)'));
  const [signatureRole, setSignatureRole] = useState(() => getFromLocalStorage('signatureRole', 'Segurança Eletrônica Inteligente'));
  const [items, setItems] = useState<ProposalItem[]>(() => getFromLocalStorage('items', [
    { id: '1', description: 'GRAVADOR DIG. DE VIDEO DVR MHDX 3116-C C/HD 4TB', quantity: 2, originalPrice: 2135.13 },
    { id: '2', description: 'CAMERA BULLET VHL 1220 B G9', quantity: 17, originalPrice: 93.25 },
    { id: '3', description: 'CABO COAXIAL 4MM C/ALI 75 CFTV (CX 100MT)', quantity: 10, originalPrice: 77.41 },
    { id: '4', description: 'FONTE AC/DC 12,8V 10A EFM 1210 G2', quantity: 3, originalPrice: 89.90 },
    { id: '5', description: 'CABO DE ALIMENTACAO 2 VIAS P/ FONTE', quantity: 3, originalPrice: 12.90 },
    { id: '6', description: 'CAIXA SOBREPOR R/CFTV VBOX 1100', quantity: 17, originalPrice: 7.41 },
    { id: '7', description: 'CONECTOR BNC C/MOLA G2 (PCT 10UN)', quantity: 4, originalPrice: 30.65 },
    { id: '8', description: 'CONECTOR PLUG P4 MACHO (PCT 10UN)', quantity: 2, originalPrice: 19.25 },
    { id: '9', description: 'PROTETOR ELETRONICO C/5 TOMADAS', quantity: 1, originalPrice: 26.73 },
    { id: '10', description: 'SWITCH NAO GERENCIAVEL 24 PORTAS 1000MBPS', quantity: 4, originalPrice: 542.64 },
    { id: '11', description: 'CABO LAN CAT 5E 24 AWG CMX AZUL (CX 305MT)', quantity: 15, originalPrice: 619.06 },
    { id: '12', description: 'PATCH PANEL IMPACT LAN CAT5E 24 PORTAS', quantity: 4, originalPrice: 215.93 },
    { id: '13', description: 'ORGANIZADOR DE CABO HORIZONTAL 19 X 1U', quantity: 4, originalPrice: 31.90 },
    { id: '14', description: 'RACK 19 RPD 24US X 670MM', quantity: 1, originalPrice: 1646.65 },
    { id: '15', description: 'CONECTOR RJ45 FEMEA 180 CAT 5E', quantity: 100, originalPrice: 9.75 },
    { id: '16', description: 'ESPELHO 4X2 P/1 RJ 45 BRANCO', quantity: 100, originalPrice: 4.98 },
    { id: '17', description: 'GRAVADOR DIGITAL NVD 1516 AM', quantity: 2, originalPrice: 959.76 },
    { id: '18', description: 'SWITCH NAO GERENCIAVEL POE 18 PORTAS', quantity: 2, originalPrice: 1021.70 },
    { id: '19', description: 'CAMERA IP VIPC 1230 B G2', quantity: 17, originalPrice: 225.71 },
    { id: '20', description: 'RJ 45 MACHO CAT 5E (PCT 50)', quantity: 1, originalPrice: 27.99 },
  ]));
  const [markupPercent, setMarkupPercent] = useState(() => getFromLocalStorage('markupPercent', 45));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Efeitos de persistência
  useEffect(() => {
    saveToLocalStorage('clientName', clientName);
    saveToLocalStorage('clientAddress', clientAddress);
    saveToLocalStorage('companyName', companyName);
    saveToLocalStorage('companyTagline', companyTagline);
    saveToLocalStorage('companyPhone', companyPhone);
    saveToLocalStorage('companyEmail', companyEmail);
    saveToLocalStorage('companySite', companySite);
    saveToLocalStorage('companyCNPJ', companyCNPJ);
    saveToLocalStorage('logoUrl', logoUrl);
    saveToLocalStorage('footerMessage', footerMessage);
    saveToLocalStorage('laborCost', laborCost);
    saveToLocalStorage('laborDescription', laborDescription);
    saveToLocalStorage('proposalStatus', proposalStatus);
    saveToLocalStorage('clientTagline', clientTagline);
    saveToLocalStorage('validity', validity);
    saveToLocalStorage('executionTime', executionTime);
    saveToLocalStorage('warranty', warranty);
    saveToLocalStorage('paymentTerms', paymentTerms);
    saveToLocalStorage('signatureRole', signatureRole);
    saveToLocalStorage('items', items);
    saveToLocalStorage('markupPercent', markupPercent);
  }, [
    clientName, clientAddress, companyName, companyTagline, companyPhone, 
    companyEmail, companyCNPJ, logoUrl, footerMessage, laborCost, laborDescription,
    proposalStatus, clientTagline, validity, executionTime, warranty, 
    paymentTerms, signatureRole, items, markupPercent
  ]);

  const resetToDefault = () => {
    if (confirm('Deseja realmente restaurar todos os campos para o padrão? Isso apagará seus dados atuais.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, originalPrice: 0 }
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ProposalItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const totals = useMemo(() => {
    const originalTotal = items.reduce((acc, item) => acc + (item.originalPrice * item.quantity), 0);
    const increaseFactor = 1 + (markupPercent / 100);
    const materialsAdjusted = originalTotal * increaseFactor;
    const finalTotal = materialsAdjusted + laborCost;
    
    return {
      materialsAdjusted,
      laborCost,
      finalTotal,
      difference: materialsAdjusted - originalTotal
    };
  }, [items, markupPercent, laborCost]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Configuration Panel */}
        <div className="space-y-6 print:hidden">
          <header className="flex items-center gap-4 mb-10">
            <div className="relative">
              <img 
                src={logoUrl} 
                alt="NDS Logo" 
                className="w-16 h-16 rounded-xl shadow-xl shadow-orange-900/20 object-cover border-2 border-orange-500/30"
              />
              <div className="absolute -inset-1 bg-gradient-to-tr from-orange-600 to-transparent opacity-20 blur rounded-xl"></div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">{companyName}</h1>
              <p className="text-xs text-orange-600 font-black uppercase tracking-[0.2em] mt-1">{companyTagline}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Conectado como</p>
                    <p className="text-xs font-bold text-slate-900">{user.displayName || user.email}</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Sair"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={login}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-xs hover:bg-orange-100 transition-colors"
                >
                  <User size={16} /> ENTRAR / SALVAR NA NUVEM
                </button>
              )}
              <button 
                onClick={resetToDefault}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Restaurar Padrões originais"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </header>

          {/* Cloud Section */}
          {user && (
            <motion.section 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden mb-6"
            >
              <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-orange-700 flex items-center gap-2">
                  <Cloud size={16} /> Suas Propostas na Nuvem
                </h3>
                <button 
                  onClick={saveToCloud}
                  disabled={isSaving}
                  className="px-3 py-1 bg-orange-600 text-white text-[10px] font-bold rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  SALVAR ATUAL
                </button>
              </div>
              <div className="p-2 max-h-[200px] overflow-y-auto">
                {cloudProposals.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4 uppercase font-bold italic">Nenhuma proposta salva na nuvem ainda.</p>
                ) : (
                  <div className="space-y-1">
                    {cloudProposals.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group transition-colors">
                        <div className="flex-1 cursor-pointer" onClick={() => loadFromCloud(p)}>
                          <p className="text-xs font-bold text-slate-700">{p.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-medium">
                            Salvo em: {p.updatedAt?.toDate ? p.updatedAt.toDate().toLocaleString('pt-BR') : 'Recentemente'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => loadFromCloud(p)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Carregar"
                          >
                            <Download size={14} />
                          </button>
                          <button 
                            onClick={() => deleteFromCloud(p.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* Backup Section */}
          <section className="bg-orange-600 rounded-2xl p-4 text-white shadow-lg mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-1">Segurança de Dados</h3>
                <p className="text-[10px] opacity-80 uppercase font-bold">Salve sua proposta em um arquivo para não perder nunca</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={exportData}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                  title="Exportar para arquivo"
                >
                  <Download size={16} /> SALVAR BACKUP
                </button>
                <label className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <Upload size={16} /> CARREGAR BACKUP
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                </label>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Building2 size={16} /> Dados da Empresa (Cabeçalho)
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-orange-600 uppercase flex items-center gap-2">
                    <Plus size={14} /> Sua Logo (Upload ou URL)
                  </label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <label className="flex-1 cursor-pointer bg-orange-50 border-2 border-dashed border-orange-200 hover:border-orange-400 p-2 rounded-lg text-center transition-all">
                      <span className="text-[10px] font-bold text-orange-600 uppercase">Selecionar Imagem</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        className="hidden" 
                      />
                    </label>
                    <input 
                      type="text" 
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="Ou cole o link da imagem aqui"
                      className="flex-[2] px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Nome da Empresa</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Subtítulo (Ex: Digital)</label>
                  <input 
                    type="text" 
                    value={companyTagline}
                    onChange={(e) => setCompanyTagline(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Telefone de Contato</label>
                  <input 
                    type="text" 
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">E-mail Comercial</label>
                  <input 
                    type="text" 
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Site / Website</label>
                  <input 
                    type="text" 
                    value={companySite}
                    onChange={(e) => setCompanySite(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">CNPJ / Identificação</label>
                  <input 
                    type="text" 
                    value={companyCNPJ}
                    onChange={(e) => setCompanyCNPJ(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Mensagem do Rodapé</label>
                  <input 
                    type="text" 
                    value={footerMessage}
                    onChange={(e) => setFooterMessage(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText size={16} /> Termos & Condições
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Status do Documento</label>
                  <input type="text" value={proposalStatus} onChange={(e) => setProposalStatus(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Resumo Cliente (Destaque)</label>
                  <input type="text" value={clientTagline} onChange={(e) => setClientTagline(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Validade</label>
                  <input type="text" value={validity} onChange={(e) => setValidity(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Prazo de Execução</label>
                  <input type="text" value={executionTime} onChange={(e) => setExecutionTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Garantia</label>
                  <input type="text" value={warranty} onChange={(e) => setWarranty(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Cargo na Assinatura</label>
                  <input type="text" value={signatureRole} onChange={(e) => setSignatureRole(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Formas de Pagamento</label>
                  <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Building2 size={16} /> Dados do Cliente & Serviços
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Nome / Empresa</label>
                  <input 
                    type="text" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase text-blue-600">Mão de Obra (R$)</label>
                  <input 
                    type="number" 
                    value={laborCost}
                    onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-blue-50 border border-blue-200 font-bold text-blue-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase text-blue-600">Descrição da Mão de Obra</label>
                  <textarea 
                    value={laborDescription}
                    onChange={(e) => setLaborDescription(e.target.value)}
                    rows={2}
                    placeholder="Descreva o serviço de mão de obra..."
                    className="w-full px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Endereço</label>
                <input 
                  type="text" 
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText size={16} /> Itens da Proposta
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={clearAllItems}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 font-bold border border-red-100 transition-colors"
                >
                  <Trash2 size={14} /> Limpar Lista
                </button>
                <button 
                  onClick={addItem}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium transition-colors"
                >
                  <Plus size={14} /> Adicionar Item
                </button>
              </div>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group"
                    >
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="absolute -top-2 -right-2 p-1.5 bg-white border border-red-100 text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6 space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição</label>
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Qtd</label>
                          <input 
                            type="number" 
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Custo Unit. (R$)</label>
                          <input 
                            type="number" 
                            value={item.originalPrice}
                            onChange={(e) => updateItem(item.id, 'originalPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </section>

          <section className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 overflow-hidden relative">
            <TrendingUp className="absolute right-[-20px] bottom-[-20px] w-48 h-48 opacity-10" />
            <div className="relative z-10">
              <h2 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-4">Resumo Geral</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium opacity-80 italic">Margem Materiais</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                      className="bg-white/10 border border-white/20 rounded-md px-3 py-1 w-20 text-xl font-bold outline-none focus:bg-white/20"
                    />
                    <span className="text-2xl font-bold">%</span>
                  </div>
                </div>
                <div className="h-12 w-px bg-white/20"></div>
                <div className="flex-1 text-right">
                  <p className="text-xs font-medium opacity-80 mb-1 italic">Total Proposta</p>
                  <p className="text-3xl font-bold">{formatCurrency(totals.finalTotal)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-[11px]">
                <p>Equipamentos (+45%): {formatCurrency(totals.materialsAdjusted)}</p>
                <p className="text-right">Mão de Obra: {formatCurrency(totals.laborCost)}</p>
              </div>
            </div>
          </section>

          <button 
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
          >
            <Printer size={20} /> Visualizar & Imprimir
          </button>
        </div>

        {/* Live Preview (Document) */}
        <div className="print:m-0 print:p-0 print:block">
          <div className="bg-white shadow-2xl rounded-sm p-4 md:p-12 min-h-[1056px] w-full border border-slate-100 print:shadow-none print:border-none sticky top-8 print:static print-container">
            <header className="flex justify-between items-center mb-12 pb-10 border-b-2 border-slate-900/5">
              <div className="flex items-center gap-5">
                <img 
                  src={logoUrl} 
                  alt="NDS Logo" 
                  className="w-24 h-24 rounded-2xl shadow-2xl object-cover border-4 border-white ring-1 ring-slate-100"
                />
                <div className="space-y-3">
                  <div className="font-black text-3xl tracking-tighter text-slate-900 leading-none">
                    {companyName}<br/>
                    <span className="text-sm tracking-[0.3em] uppercase font-black text-orange-600 drop-shadow-sm">{companyTagline}</span>
                  </div>
                  <div className="text-[9px] space-y-0.5 text-slate-400 font-bold uppercase tracking-[0.1em]">
                    <p className="flex items-center gap-2 text-slate-600 font-bold"><Phone size={10} className="text-orange-500" /> {companyPhone}</p>
                    <p className="flex items-center gap-2"><Mail size={10} className="text-orange-500" /> {companyEmail.toUpperCase()}</p>
                    <p className="flex items-center gap-2"><Building2 size={10} className="text-orange-500" /> {companySite.toLowerCase()}</p>
                    <p className="flex items-center gap-2 font-bold opacity-60"><Shield size={10} className="text-orange-500" /> CNPJ: {companyCNPJ}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">Proposta</h3>
                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] bg-orange-600 inline-block px-3 py-1 rounded-full shadow-lg shadow-orange-200">{proposalStatus}</p>
                <div className="mt-8 space-y-0.5 text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">
                  <p className="flex items-center justify-end gap-2">EMISSÃO: {new Date().toLocaleDateString('pt-BR')} <Calendar size={10} className="text-orange-500" /></p>
                  <p>REF: <span className="text-slate-900">#NDS-{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</span></p>
                </div>
              </div>
            </header>

            <div className="mb-10 grid grid-cols-2 gap-8 py-6 px-8 bg-slate-50/50 rounded-lg border border-slate-100">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1 italic">Cliente</h4>
                  <p className="text-[13px] font-bold text-slate-800">{clientName}</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{clientAddress}</p>
                </div>
              </div>
              <div className="text-right flex flex-col justify-end">
                <p className="text-[9px] uppercase font-black text-slate-300 tracking-[0.1em] italic">{clientTagline}</p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 pb-2 mb-2 border-b-2 border-slate-900 font-black text-[10px] uppercase tracking-widest text-slate-700 italic">
              <div className="col-span-1 text-center">Item</div>
              <div className="col-span-5">Descrição</div>
              <div className="col-span-1 text-center">Qtd</div>
              <div className="col-span-2 text-right">Unitário</div>
              <div className="col-span-3 text-right">Valor Total</div>
            </div>

            <div className="space-y-1 mb-8">
              {items.map((item, index) => {
                const adjustedPrice = item.originalPrice * (1 + (markupPercent / 100));
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-4 py-2 border-b border-slate-100 text-[10px] text-slate-600 items-center">
                    <div className="col-span-1 text-center font-mono opacity-40">{index + 1}</div>
                    <div className="col-span-5 font-bold text-slate-800 uppercase leading-snug">{item.description}</div>
                    <div className="col-span-1 text-center font-bold text-slate-400">{item.quantity}</div>
                    <div className="col-span-2 text-right font-mono font-medium">{formatCurrency(adjustedPrice)}</div>
                    <div className="col-span-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(adjustedPrice * item.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mb-12">
              <div className="w-80 space-y-2">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span>Equipamentos</span>
                  <span className="font-mono text-slate-600">{formatCurrency(totals.materialsAdjusted)}</span>
                </div>
                <div className="flex flex-col text-right text-[10px] uppercase font-black text-orange-600 tracking-wider bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">
                  <div className="flex justify-between items-center mb-1">
                    <span>Mão de Obra e Instalação</span>
                    <span className="font-mono text-lg">{formatCurrency(totals.laborCost)}</span>
                  </div>
                  <div className="text-[8px] opacity-60 normal-case font-medium">
                    {laborDescription}
                  </div>
                </div>
                <div className="h-[3px] bg-slate-900 mt-4 mb-2"></div>
                <div className="flex justify-between items-center pt-3">
                  <span className="text-sm font-black uppercase tracking-widest italic text-slate-900">VALOR TOTAL DA PROPOSTA</span>
                  <span className="text-3xl font-black text-orange-600 tracking-tighter drop-shadow-sm">
                    {formatCurrency(totals.finalTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto border-t pt-10 border-slate-100 mb-8 no-break">
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-2 italic">Condições Relevantes</h5>
                  <div className="text-[9px] leading-relaxed text-slate-500 font-medium space-y-1">
                    <p>• Validade: {validity}.</p>
                    <p>• Prazo de Execução: {executionTime}.</p>
                    <p>• Garantia: {warranty}.</p>
                    <p>• Pagamento: {paymentTerms}.</p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full h-px bg-slate-100 mb-2 max-w-[220px]"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 italic">{companyName} {companyTagline.toUpperCase()}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{signatureRole}</p>
                </div>
              </div>
            </div>

            <footer className="text-center border-t border-slate-50 pt-8 no-break">
              <p className="text-[9px] uppercase font-bold tracking-[0.4em] text-slate-200 italic">
                {footerMessage}
              </p>
            </footer>
          </div>
        </div>

      </div>

      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
