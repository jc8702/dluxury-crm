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

  // Redirecionar usuÃ¡rio se ele jÃ¡ estiver logado
  useEffect(() => {
    if (user) {
      navigate('/painel');
    }
  }, [user, navigate]);

  const modulos = [
    { nome: 'CRM & Clientes', desc: 'Funil de vendas, cadastro e histÃ³rico completo do cliente.', icon: Users },
    { nome: 'OrÃ§amentos PRO', desc: 'GeraÃ§Ã£o tÃ©cnica de orÃ§amentos com margens e custos detalhados.', icon: DollarSign },
    { nome: 'Projetos 3D', desc: 'Acompanhamento de visitas, mediÃ§Ãµes e status do projeto.', icon: Layers },
    { nome: 'Plano de Corte', desc: 'Algoritmo industrial Guillotine e MaxRects para chapas.', icon: Ruler },
    { nome: 'Simulador 3D CNC', desc: 'VerificaÃ§Ã£o tridimensional de percursos e spindle CNC.', icon: Cpu },
    { nome: 'Controle de ProduÃ§Ã£o', desc: 'Fases de corte, furaÃ§Ã£o, colagem de borda e montagem.', icon: Hammer },
    { nome: 'GestÃ£o de Sobras', desc: 'Aproveitamento e heranÃ§a automÃ¡tica de retalhos MDF.', icon: Box },
    { nome: 'Estoque AvanÃ§ado', desc: 'ConversÃ£o automÃ¡tica de chapas para mÂ² e alertas crÃ­ticos.', icon: Pin },
    { nome: 'Compras & NF', desc: 'CotaÃ§Ã£o de fornecedores, recebimento de materiais e notas.', icon: ShoppingCart },
    { nome: 'Fluxo de Caixa', desc: 'DRE, plano de contas e conciliaÃ§Ã£o bancÃ¡ria.', icon: TrendingUp },
    { nome: 'Contas a Pagar/Receber', desc: 'GestÃ£o de vencimentos e rÃ©gua de cobranÃ§a automÃ¡tica.', icon: FileText },
    { nome: 'Agenda Industrial', desc: 'CalendÃ¡rio sincronizado de montagens e visitas.', icon: Calendar },
    { nome: 'PÃ³s-Venda & Garantia', desc: 'Chamados tÃ©cnicos, fotos e custos sob garantia.', icon: Shield },
    { nome: 'AnÃ¡lise de Margens', desc: 'CÃ¡lculo automatizado do markup por comodo.', icon: Activity },
    { nome: 'Etiquetas QR Code', desc: 'GeraÃ§Ã£o de etiquetas industriais para peÃ§as e retalhos.', icon: FileCheck },
    { nome: 'Assistente IA (Dlux)', desc: 'IA especialista integrada para engenharia e marcenaria.', icon: Cpu },
    { nome: 'NotificaÃ§Ãµes', desc: 'Alertas automÃ¡ticos de prazos, estoque e cobranÃ§as.', icon: FileText },
    { nome: 'RelatÃ³rios DRE', desc: 'VisÃ£o executiva de rentabilidade, faturamento e custos.', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#0F1713] text-[#F9F8F6] font-sans selection:bg-[#D4AF37]/30 overflow-x-hidden relative">
      
      {/* Background Decorativo e Efeitos AtmosfÃ©ricos */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#8B5A2B]/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-slate-700/10 blur-[150px] rounded-full" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[40%] bg-[#D4AF37]/5 blur-[120px] rounded-full" />
      </div>

      {/* â”€â”€ NAVBAR â”€â”€ */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 mx-auto max-w-7xl border-b border-white/5 backdrop-blur-xl bg-[#0F1713]/50 sticky top-0">
        <div className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#8B5A2B] drop-shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5A2B] to-[#D4AF37] flex items-center justify-center text-[#0F1713] text-sm">F</div>
          FATTO OS
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#modulos" className="text-sm font-semibold text-[#F9F8F6]/60 hover:text-[#D4AF37] transition-colors">MÃ³dulos</a>
          <a href="#precos" className="text-sm font-semibold text-[#F9F8F6]/60 hover:text-[#D4AF37] transition-colors">PreÃ§os</a>
          <a href="#faq" className="text-sm font-semibold text-[#F9F8F6]/60 hover:text-[#D4AF37] transition-colors">FAQ</a>
          
          <div className="flex items-center gap-4 ml-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-sm font-bold rounded-lg border border-white/10 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-300"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="px-6 py-2.5 text-sm font-bold text-[#0F1713] bg-gradient-to-r from-[#D4AF37] to-[#8B5A2B] rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Teste GrÃ¡tis
            </button>
          </div>
        </div>
      </nav>

      {/* â”€â”€ HERO SECTION â”€â”€ */}
      <header className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-24 mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-bold tracking-widest text-[#D4AF37] uppercase rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 backdrop-blur-md">
          <Star className="w-4 h-4" /> A revoluÃ§Ã£o na marcenaria de alto padrÃ£o
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-white mb-8">
          O ERP Definitivo para <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#8B5A2B]">
            FÃ¡bricas e Marcenarias
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl text-[#F9F8F6]/60 leading-relaxed mb-12">
          Do fechamento da venda ao plano de corte, orÃ§amentos automÃ¡ticos, fluxo de caixa e gestÃ£o CNC. Potencialize seu faturamento com a <strong className="text-[#F9F8F6]/80">InteligÃªncia Artificial Integrada</strong>.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <button 
            onClick={() => navigate('/signup')}
            className="group flex items-center gap-2 px-8 py-4 text-base font-black tracking-wide text-[#0F1713] uppercase bg-gradient-to-br from-[#D4AF37] to-[#8B5A2B] rounded-xl shadow-[0_0_40px_rgba(212,175,55,0.4)] hover:shadow-[0_0_60px_rgba(212,175,55,0.6)] hover:scale-105 transition-all duration-300"
          >
            ComeÃ§ar Teste de 14 Dias
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <a 
            href="#modulos"
            className="px-8 py-4 text-base font-bold text-white rounded-xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 hover:border-[#D4AF37]/50 transition-all duration-300"
          >
            Explorar MÃ³dulos
          </a>
        </div>
      </header>

      {/* â”€â”€ SHOWCASE MOCKUP â”€â”€ */}
      <div className="relative z-10 px-4 pb-32 mx-auto max-w-6xl perspective-1000">
        <div className="relative rounded-2xl border border-white/10 bg-[#1C2E24]/60 backdrop-blur-xl p-4 md:p-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden group">
          
          {/* Brilho interno do card */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          {/* Mockup Topbar */}
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-[#D4AF37]/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="ml-4 text-xs font-mono text-[#F9F8F6]/40 bg-[#0F1713]/50 px-3 py-1 rounded-md">
              app.fatto-os.com/painel
            </div>
          </div>
          
          {/* ConteÃºdo FictÃ­cio do Dashboard */}
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
              {/* Cards de MÃ©tricas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-white/5 bg-[#0F1713]/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-[#F9F8F6]/60 tracking-wider mb-2">VENDAS (MÃŠS)</p>
                  <p className="text-2xl font-black text-[#D4AF37]">R$ 148.500</p>
                </div>
                <div className="p-5 rounded-xl border border-white/5 bg-[#0F1713]/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-[#F9F8F6]/60 tracking-wider mb-2">ORDENS DE PRODUÃ‡ÃƒO</p>
                  <p className="text-2xl font-black text-white">8 ATIVAS</p>
                </div>
                <div className="p-5 rounded-xl border border-white/5 bg-[#0F1713]/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-[#F9F8F6]/60 tracking-wider mb-2">APROVEITAMENTO (CORTES)</p>
                  <p className="text-2xl font-black text-emerald-400">87.4%</p>
                </div>
              </div>
              
              {/* GrÃ¡fico/Canvas Mock */}
              <div className="h-64 rounded-xl border border-white/5 bg-[#0F1713]/40 flex items-center justify-center relative overflow-hidden group-hover:border-white/10 transition-colors">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <Activity className="w-10 h-10 text-[#D4AF37]/50" />
                  <p className="text-sm font-semibold text-[#F9F8F6]/40">RenderizaÃ§Ã£o GrÃ¡fica do Plano de Corte 3D</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ MÃ“DULOS SECTION (BENTO GRID) â”€â”€ */}
      <section id="modulos" className="relative z-10 py-24 px-4 mx-auto max-w-7xl">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            Uma Plataforma, <span className="text-[#D4AF37]">Infinitas Possibilidades</span>
          </h2>
          <p className="text-lg text-[#F9F8F6]/60">
            Abandone as planilhas e integre absolutamente tudo. Da prospecÃ§Ã£o de vendas Ã  engenharia, produÃ§Ã£o CNC e fluxo de caixa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map((m, index) => {
            const Icon = m.icon;
            return (
              <div 
                key={index} 
                className="group relative p-6 rounded-2xl border border-white/5 bg-[#1C2E24]/40 backdrop-blur-sm hover:bg-slate-800/50 hover:border-[#D4AF37]/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Glow de fundo no hover */}
                <div className="absolute -inset-x-2 -inset-y-2 z-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#0F1713] border border-white/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/50 transition-all duration-300 shadow-lg">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-[#D4AF37] transition-colors">{m.nome}</h3>
                  <p className="text-sm text-[#F9F8F6]/60 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* â”€â”€ PLANOS E PREÃ‡OS â”€â”€ */}
      <section id="precos" className="relative z-10 py-32 px-4 border-t border-white/5 bg-[#0F1713]/80">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            Planos Transparetens. <span className="text-[#D4AF37]">Sem Surpresas.</span>
          </h2>
          <p className="text-lg text-[#F9F8F6]/60">
            CresÃ§a no seu ritmo. Altere ou cancele o seu plano a qualquer instante direto pelo painel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          
          {/* BASIC */}
          <div className="flex flex-col p-8 rounded-3xl border border-white/5 bg-[#1C2E24]/50 backdrop-blur-md">
            <h3 className="text-2xl font-black text-white mb-2">BASIC</h3>
            <p className="text-sm text-[#F9F8F6]/60 mb-8">Para marceneiros autÃ´nomos e pequenas lojas.</p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-4xl font-black text-white">R$ 97</span>
              <span className="text-[#F9F8F6]/40 font-semibold mb-1">/mÃªs</span>
            </div>
            <button 
              onClick={() => navigate('/signup')} 
              className="w-full py-3 px-4 mb-8 text-sm font-bold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              ComeÃ§ar Teste GrÃ¡tis
            </button>
            <ul className="flex flex-col gap-4 text-sm text-[#F9F8F6]/80">
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> CRM & Clientes</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> OrÃ§amentos BÃ¡sicos</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> Agenda de Visitas</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> AtÃ© 2 usuÃ¡rios</li>
            </ul>
          </div>

          {/* PRO (Destaque) */}
          <div className="relative flex flex-col p-8 rounded-3xl border-2 border-[#D4AF37] bg-[#1C2E24]/80 backdrop-blur-xl shadow-[0_0_50px_rgba(212,175,55,0.15)] transform md:-translate-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#D4AF37] to-[#8B5A2B] text-[#0F1713] text-xs font-black tracking-widest uppercase rounded-full shadow-lg">
              Mais Escolhido
            </div>
            <h3 className="text-2xl font-black text-[#D4AF37] mb-2 mt-4">PRO</h3>
            <p className="text-sm text-[#F9F8F6]/60 mb-8">GestÃ£o 360Âº com Financeiro e IntegraÃ§Ãµes.</p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-5xl font-black text-white">R$ 197</span>
              <span className="text-[#F9F8F6]/40 font-semibold mb-1">/mÃªs</span>
            </div>
            <button 
              onClick={() => navigate('/signup')} 
              className="w-full py-4 px-4 mb-8 text-sm font-black text-[#0F1713] bg-gradient-to-r from-[#D4AF37] to-[#8B5A2B] rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all hover:-translate-y-1"
            >
              ComeÃ§ar Teste GrÃ¡tis
            </button>
            <ul className="flex flex-col gap-4 text-sm text-[#F9F8F6] font-medium">
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> Tudo do Plano Basic</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> Financeiro e Fluxo de Caixa</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> InteligÃªncia Artificial Dlux</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> Plano de Corte Integrado</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> AtÃ© 5 usuÃ¡rios simultÃ¢neos</li>
            </ul>
          </div>

          {/* ENTERPRISE */}
          <div className="flex flex-col p-8 rounded-3xl border border-white/5 bg-[#1C2E24]/50 backdrop-blur-md">
            <h3 className="text-2xl font-black text-white mb-2">ENTERPRISE</h3>
            <p className="text-sm text-[#F9F8F6]/60 mb-8">Controle de IndÃºstria e SimulaÃ§Ã£o CNC 3D.</p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-4xl font-black text-white">R$ 397</span>
              <span className="text-[#F9F8F6]/40 font-semibold mb-1">/mÃªs</span>
            </div>
            <button 
              onClick={() => navigate('/signup')} 
              className="w-full py-3 px-4 mb-8 text-sm font-bold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              Falar com Consultor
            </button>
            <ul className="flex flex-col gap-4 text-sm text-[#F9F8F6]/80">
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> Tudo do Plano PRO</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> Simulador CNC Tridimensional</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> Ordens de ProduÃ§Ã£o (OP)</li>
              <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-[#D4AF37]" /> UsuÃ¡rios Ilimitados</li>
            </ul>
          </div>

        </div>
      </section>

      {/* â”€â”€ FAQ â”€â”€ */}
      <section id="faq" className="relative z-10 py-32 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-[#F9F8F6]/60">Tire suas dÃºvidas e veja por que somos o melhor ERP do mercado.</p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-[#1C2E24]/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-[#D4AF37] mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Como funciona o teste gratuito?
            </h4>
            <p className="text-[#F9F8F6]/60 leading-relaxed">
              VocÃª recebe 14 dias de acesso completo Ã  plataforma sem necessidade de cadastrar um cartÃ£o de crÃ©dito. Durante esse tempo, vocÃª pode testar todos os mÃ³dulos livremente. Ao final, vocÃª decide se deseja assinar.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl border border-white/5 bg-[#1C2E24]/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-[#D4AF37] mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> O que a InteligÃªncia Artificial Dlux consegue fazer?
            </h4>
            <p className="text-[#F9F8F6]/60 leading-relaxed">
              O Dlux nÃ£o Ã© um simples chatbot. Ele Ã© treinado em engenharia de mÃ³veis, cÃ¡lculo de folgas, parÃ¢metros industriais de espessura de MDF e fitas de borda. Ele analisa seus projetos para alertar sobre erros estruturais antes de enviar o projeto Ã  fÃ¡brica.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-[#1C2E24]/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-[#D4AF37] mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Existe contrato de fidelidade ou multa rescisÃ³ria?
            </h4>
            <p className="text-[#F9F8F6]/60 leading-relaxed">
              NÃ£o. O nosso modelo Ã© inteiramente prÃ©-pago mensalmente. Se o sistema deixar de fazer sentido para a sua fÃ¡brica, vocÃª pode cancelar a qualquer minuto diretamente na pÃ¡gina de assinaturas, sem multas burocrÃ¡ticas.
            </p>
          </div>
        </div>
      </section>

      {/* â”€â”€ FOOTER â”€â”€ */}
      <footer className="relative z-10 border-t border-white/5 bg-[#0F1713] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col gap-2">
            <div className="text-xl font-black text-[#F9F8F6]/80">FATTO OS</div>
            <p className="text-sm text-[#F9F8F6]/40">&copy; {new Date().getFullYear()} Fatto OS Tecnologias. Todos os direitos reservados.</p>
          </div>
          
          <div className="flex gap-6 text-sm font-semibold">
            <a href="/termos" className="text-[#F9F8F6]/60 hover:text-[#D4AF37] transition-colors">Termos de Uso</a>
            <a href="/privacidade" className="text-[#F9F8F6]/60 hover:text-[#D4AF37] transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <a 
        href="https://wa.me/5511999999999?text=OlÃ¡,%20gostaria%20de%20saber%20mais%20sobre%20o%20Fatto%20OS"
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

