import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Shield, DollarSign, Hammer, Cpu, Users, 
  Layers, Ruler, Pin, FileText, CheckCircle, 
  TrendingUp, Box, Calendar, ShoppingCart, 
  HelpCircle, Activity, FileCheck, Phone, ChevronRight, Star
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();

  // Redirecionar usuário se ele já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/painel');
    }
  }, [user, navigate]);

  const modulos = [
    { nome: 'CRM & Clientes', desc: 'Funil de vendas, cadastro e histórico completo do cliente.', icon: Users },
    { nome: 'Orçamentos PRO', desc: 'Geração técnica de orçamentos com margens e custos detalhados.', icon: DollarSign },
    { nome: 'Projetos 3D', desc: 'Acompanhamento de visitas, medições e status do projeto.', icon: Layers },
    { nome: 'Plano de Corte', desc: 'Algoritmo industrial Guillotine e MaxRects para chapas.', icon: Ruler },
    { nome: 'Simulador 3D CNC', desc: 'Verificação tridimensional de percursos e spindle CNC.', icon: Cpu },
    { nome: 'Controle de Produção', desc: 'Fases de corte, furação, colagem de borda e montagem.', icon: Hammer },
    { nome: 'Gestão de Sobras', desc: 'Aproveitamento e herança automática de retalhos MDF.', icon: Box },
    { nome: 'Estoque Avançado', desc: 'Conversão automática de chapas para m² e alertas críticos.', icon: Pin },
    { nome: 'Compras & NF', desc: 'Cotação de fornecedores, recebimento de materiais e notas.', icon: ShoppingCart },
    { nome: 'Fluxo de Caixa', desc: 'DRE, plano de contas e conciliação bancária.', icon: TrendingUp },
    { nome: 'Contas a Pagar/Receber', desc: 'Gestão de vencimentos e régua de cobrança automática.', icon: FileText },
    { nome: 'Agenda Industrial', desc: 'Calendário sincronizado de montagens e visitas.', icon: Calendar },
    { nome: 'Pós-Venda & Garantia', desc: 'Chamados técnicos, fotos e custos sob garantia.', icon: Shield },
    { nome: 'Análise de Margens', desc: 'Cálculo automatizado do markup por comodo.', icon: Activity },
    { nome: 'Etiquetas QR Code', desc: 'Geração de etiquetas industriais para peças e retalhos.', icon: FileCheck },
    { nome: 'Assistente IA (Dlux)', desc: 'IA especialista integrada para engenharia e marcenaria.', icon: Cpu },
    { nome: 'Notificações', desc: 'Alertas automáticos de prazos, estoque e cobranças.', icon: FileText },
    { nome: 'Relatórios DRE', desc: 'Visão executiva de rentabilidade, faturamento e custos.', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30 overflow-x-hidden relative">
      
      {/* Background Decorativo e Efeitos Atmosféricos */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-slate-700/10 blur-[150px] rounded-full" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      {/* ── NAVBAR ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 mx-auto max-w-7xl border-b border-white/5 backdrop-blur-xl bg-slate-950/50 sticky top-0">
        <div className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 drop-shadow-sm">
          D'LUXURY CRM
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#modulos" className="text-sm font-semibold text-slate-400 hover:text-amber-500 transition-colors">Módulos</a>
          <a href="#precos" className="text-sm font-semibold text-slate-400 hover:text-amber-500 transition-colors">Preços</a>
          <a href="#faq" className="text-sm font-semibold text-slate-400 hover:text-amber-500 transition-colors">FAQ</a>
          
          <div className="flex items-center gap-4 ml-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-sm font-bold rounded-lg border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-300"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="px-6 py-2.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-600 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Teste Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-24 mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-bold tracking-widest text-amber-500 uppercase rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
          <Star className="w-4 h-4" /> A revolução na marcenaria de alto padrão
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-white mb-8">
          O ERP Definitivo para <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
            Fábricas e Marcenarias
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl text-slate-400 leading-relaxed mb-12">
          Do fechamento da venda ao plano de corte, orçamentos automáticos, fluxo de caixa e gestão CNC. Potencialize seu faturamento com a <strong className="text-slate-300">Inteligência Artificial Integrada</strong>.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <button 
            onClick={() => navigate('/signup')}
            className="group flex items-center gap-2 px-8 py-4 text-base font-black tracking-wide text-slate-950 uppercase bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] hover:scale-105 transition-all duration-300"
          >
            Começar Teste de 14 Dias
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <a 
            href="#modulos"
            className="px-8 py-4 text-base font-bold text-white rounded-xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 hover:border-amber-500/50 transition-all duration-300"
          >
            Explorar Módulos
          </a>
        </div>
      </header>

      {/* ── SHOWCASE MOCKUP ── */}
      <div className="relative z-10 px-4 pb-32 mx-auto max-w-6xl perspective-1000">
        <div className="relative rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 md:p-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden group">
          
          {/* Brilho interno do card */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          {/* Mockup Topbar */}
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="ml-4 text-xs font-mono text-slate-500 bg-slate-950/50 px-3 py-1 rounded-md">
              app.dluxury-crm.com/painel
            </div>
          </div>
          
          {/* Conteúdo Fictício do Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Mock */}
            <div className="hidden lg:flex flex-col gap-4 border-r border-white/5 pr-6">
              {[80, 60, 90, 40, 70].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5" />
                  <div className={`h-3 bg-white/5 rounded-full`} style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            
            {/* Main Content Mock */}
            <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">
              {/* Cards de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-slate-400 tracking-wider mb-2">VENDAS (MÊS)</p>
                  <p className="text-2xl font-black text-amber-500">R$ 148.500</p>
                </div>
                <div className="p-5 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-slate-400 tracking-wider mb-2">ORDENS DE PRODUÇÃO</p>
                  <p className="text-2xl font-black text-white">8 ATIVAS</p>
                </div>
                <div className="p-5 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-slate-400 tracking-wider mb-2">APROVEITAMENTO (CORTES)</p>
                  <p className="text-2xl font-black text-emerald-400">87.4%</p>
                </div>
              </div>
              
              {/* Gráfico/Canvas Mock */}
              <div className="h-64 rounded-xl border border-white/5 bg-slate-950/40 flex items-center justify-center relative overflow-hidden group-hover:border-white/10 transition-colors">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <Activity className="w-10 h-10 text-amber-500/50" />
                  <p className="text-sm font-semibold text-slate-500">Renderização Gráfica do Plano de Corte 3D</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MÓDULOS SECTION (BENTO GRID) ── */}
      <section id="modulos" className="relative z-10 py-24 px-4 mx-auto max-w-7xl">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            Uma Plataforma, <span className="text-amber-500">Infinitas Possibilidades</span>
          </h2>
          <p className="text-lg text-slate-400">
            Abandone as planilhas e integre absolutamente tudo. Da prospecção de vendas à engenharia, produção CNC e fluxo de caixa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map((m, index) => {
            const Icon = m.icon;
            return (
              <div 
                key={index} 
                className="group relative p-6 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-sm hover:bg-slate-800/50 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Glow de fundo no hover */}
                <div className="absolute -inset-x-2 -inset-y-2 z-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:bg-amber-500/10 group-hover:border-amber-500/50 transition-all duration-300 shadow-lg">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">{m.nome}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── PLANOS E PREÇOS ── */}
      <section id="precos" className="relative z-10 py-32 px-4 border-t border-white/5 bg-slate-950/80">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            Planos Transparetens. <span className="text-amber-500">Sem Surpresas.</span>
          </h2>
          <p className="text-lg text-slate-400">
            Cresça no seu ritmo. Altere ou cancele o seu plano a qualquer instante direto pelo painel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          
          {/* BASIC */}
          <div className="flex flex-col p-8 rounded-3xl border border-white/5 bg-slate-900/50 backdrop-blur-md">
            <h3 className="text-2xl font-black text-white mb-2">BASIC</h3>
            <p className="text-sm text-slate-400 mb-8">Para marceneiros autônomos e pequenas lojas.</p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-4xl font-black text-white">R$ 97</span>
              <span className="text-slate-500 font-semibold mb-1">/mês</span>
            </div>
            <button 
              onClick={() => navigate('/signup')} 
              className="w-full py-3 px-4 mb-8 text-sm font-bold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              Começar Teste Grátis
            </button>
            <ul className="flex flex-col gap-4 text-sm text-slate-300">
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> CRM & Clientes</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Orçamentos Básicos</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Agenda de Visitas</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Até 2 usuários</li>
            </ul>
          </div>

          {/* PRO (Destaque) */}
          <div className="relative flex flex-col p-8 rounded-3xl border-2 border-amber-500 bg-slate-900/80 backdrop-blur-xl shadow-[0_0_50px_rgba(245,158,11,0.15)] transform md:-translate-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-xs font-black tracking-widest uppercase rounded-full shadow-lg">
              Mais Escolhido
            </div>
            <h3 className="text-2xl font-black text-amber-500 mb-2 mt-4">PRO</h3>
            <p className="text-sm text-slate-400 mb-8">Gestão 360º com Financeiro e Integrações.</p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-5xl font-black text-white">R$ 197</span>
              <span className="text-slate-500 font-semibold mb-1">/mês</span>
            </div>
            <button 
              onClick={() => navigate('/signup')} 
              className="w-full py-4 px-4 mb-8 text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-600 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all hover:-translate-y-1"
            >
              Começar Teste Grátis
            </button>
            <ul className="flex flex-col gap-4 text-sm text-slate-200 font-medium">
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Tudo do Plano Basic</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Financeiro e Fluxo de Caixa</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Inteligência Artificial Dlux</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Plano de Corte Integrado</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Até 5 usuários simultâneos</li>
            </ul>
          </div>

          {/* ENTERPRISE */}
          <div className="flex flex-col p-8 rounded-3xl border border-white/5 bg-slate-900/50 backdrop-blur-md">
            <h3 className="text-2xl font-black text-white mb-2">ENTERPRISE</h3>
            <p className="text-sm text-slate-400 mb-8">Controle de Indústria e Simulação CNC 3D.</p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-4xl font-black text-white">R$ 397</span>
              <span className="text-slate-500 font-semibold mb-1">/mês</span>
            </div>
            <button 
              onClick={() => navigate('/signup')} 
              className="w-full py-3 px-4 mb-8 text-sm font-bold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              Falar com Consultor
            </button>
            <ul className="flex flex-col gap-4 text-sm text-slate-300">
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Tudo do Plano PRO</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Simulador CNC Tridimensional</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Ordens de Produção (OP)</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-amber-500" /> Usuários Ilimitados</li>
            </ul>
          </div>

        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative z-10 py-32 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-slate-400">Tire suas dúvidas e veja por que somos o melhor ERP do mercado.</p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-amber-500 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Como funciona o teste gratuito?
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Você recebe 14 dias de acesso completo à plataforma sem necessidade de cadastrar um cartão de crédito. Durante esse tempo, você pode testar todos os módulos livremente. Ao final, você decide se deseja assinar.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-amber-500 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> O que a Inteligência Artificial Dlux consegue fazer?
            </h4>
            <p className="text-slate-400 leading-relaxed">
              O Dlux não é um simples chatbot. Ele é treinado em engenharia de móveis, cálculo de folgas, parâmetros industriais de espessura de MDF e fitas de borda. Ele analisa seus projetos para alertar sobre erros estruturais antes de enviar o projeto à fábrica.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-amber-500 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Existe contrato de fidelidade ou multa rescisória?
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Não. O nosso modelo é inteiramente pré-pago mensalmente. Se o sistema deixar de fazer sentido para a sua fábrica, você pode cancelar a qualquer minuto diretamente na página de assinaturas, sem multas burocráticas.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/5 bg-slate-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col gap-2">
            <div className="text-xl font-black text-slate-300">D'LUXURY CRM</div>
            <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} D'Luxury Tecnologias. Todos os direitos reservados.</p>
          </div>
          
          <div className="flex gap-6 text-sm font-semibold">
            <a href="/termos" className="text-slate-400 hover:text-amber-500 transition-colors">Termos de Uso</a>
            <a href="/privacidade" className="text-slate-400 hover:text-amber-500 transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <a 
        href="https://wa.me/5511999999999?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20D'Luxury%20CRM"
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full shadow-[0_4px_20px_rgba(34,197,94,0.4)] hover:scale-110 hover:shadow-[0_8px_30px_rgba(34,197,94,0.6)] transition-all duration-300"
      >
        <Phone className="w-6 h-6" />
      </a>
      
    </div>
  );
};

export default LandingPage;
