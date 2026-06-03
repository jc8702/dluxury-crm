import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  DollarSign,
  Hammer,
  Cpu,
  Users,
  Layers,
  Ruler,
  Pin,
  FileText,
  CheckCircle,
  TrendingUp,
  Box,
  Calendar,
  ShoppingCart,
  HelpCircle,
  Activity,
  FileCheck,
  Phone,
  ChevronRight,
  Star,
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirecionar usuário se ele já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/painel');
    }
  }, [user, navigate]);

  const modulos = [
    {
      nome: 'CRM & Clientes',
      desc: 'Funil de vendas, cadastro e histórico completo do cliente.',
      icon: Users,
    },
    {
      nome: 'Orçamentos PRO',
      desc: 'Geração técnica de orçamentos com margens e custos detalhados.',
      icon: DollarSign,
    },
    {
      nome: 'Projetos 3D',
      desc: 'Acompanhamento de visitas, medições e status do projeto.',
      icon: Layers,
    },
    {
      nome: 'Plano de Corte',
      desc: 'Algoritmo industrial Guillotine e MaxRects para chapas.',
      icon: Ruler,
    },
    {
      nome: 'Simulador 3D CNC',
      desc: 'Verificação tridimensional de percursos e spindle CNC.',
      icon: Cpu,
    },
    {
      nome: 'Controle de Produção',
      desc: 'Fases de corte, furação, colagem de borda e montagem.',
      icon: Hammer,
    },
    {
      nome: 'Gestão de Sobras',
      desc: 'Aproveitamento e herança automática de retalhos MDF.',
      icon: Box,
    },
    {
      nome: 'Estoque Avançado',
      desc: 'Conversão automática de chapas para m² e alertas críticos.',
      icon: Pin,
    },
    {
      nome: 'Compras & NF',
      desc: 'Cotação de fornecedores, recebimento de materiais e notas.',
      icon: ShoppingCart,
    },
    {
      nome: 'Fluxo de Caixa',
      desc: 'DRE, plano de contas e conciliação bancária.',
      icon: TrendingUp,
    },
    {
      nome: 'Contas a Pagar/Receber',
      desc: 'Gestão de vencimentos e régua de cobrança automática.',
      icon: FileText,
    },
    {
      nome: 'Agenda Industrial',
      desc: 'Calendário sincronizado de montagens e visitas.',
      icon: Calendar,
    },
    {
      nome: 'Pós-Venda & Garantia',
      desc: 'Chamados técnicos, fotos e custos sob garantia.',
      icon: Shield,
    },
    {
      nome: 'Análise de Margens',
      desc: 'Cálculo automatizado do markup por cômodo.',
      icon: Activity,
    },
    {
      nome: 'Etiquetas QR Code',
      desc: 'Geração de etiquetas industriais para peças e retalhos.',
      icon: FileCheck,
    },
    {
      nome: 'Assistente IA (Dlux)',
      desc: 'IA especialista integrada para engenharia e marcenaria.',
      icon: Cpu,
    },
    {
      nome: 'Notificações',
      desc: 'Alertas automáticos de prazos, estoque e cobranças.',
      icon: FileText,
    },
    {
      nome: 'Relatórios DRE',
      desc: 'Visão executiva de rentabilidade, faturamento e custos.',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/30 overflow-x-hidden relative">
      {/* Background Decorativo e Efeitos Atmosféricos */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-muted/10 blur-[150px] rounded-full" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />
      </div>

      {/* ── NAVBAR ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 mx-auto max-w-7xl border-b border-border/20 backdrop-blur-xl bg-background/50 sticky top-0">
        <div className="text-2xl font-black tracking-widest drop-shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-accent flex items-center justify-center text-primary-foreground text-sm font-bold">
            DL
          </div>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            D'LUXURY CRM
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#modulos"
            className="text-sm font-semibold text-muted-foreground hover:text-accent transition-colors"
          >
            Módulos
          </a>
          <a
            href="#precos"
            className="text-sm font-semibold text-muted-foreground hover:text-accent transition-colors"
          >
            Preços
          </a>
          <a
            href="#faq"
            className="text-sm font-semibold text-muted-foreground hover:text-accent transition-colors"
          >
            FAQ
          </a>

          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-sm font-bold rounded-lg border border-border/30 hover:border-accent/50 hover:bg-accent/5 transition-all duration-300"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-2.5 text-sm font-bold text-primary-foreground bg-gradient-to-r from-primary to-accent rounded-lg shadow-lg shadow-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Teste Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-24 mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-bold tracking-widest text-accent uppercase rounded-full border border-accent/30 bg-accent/10 backdrop-blur-md">
          <Star className="w-4 h-4" /> A revolução na marcenaria de alto padrão
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
          O ERP Definitivo para <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Fábricas e Marcenarias
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed mb-12">
          Do fechamento da venda ao plano de corte, orçamentos automáticos, fluxo de caixa e gestão
          CNC. Potencialize seu faturamento com a{' '}
          <strong className="text-foreground/80">Inteligência Artificial Integrada</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <button
            onClick={() => navigate('/signup')}
            className="group flex items-center gap-2 px-8 py-4 text-base font-black tracking-wide text-primary-foreground uppercase bg-gradient-to-r from-primary to-accent rounded-xl shadow-lg shadow-primary/30 hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Começar Teste de 14 Dias
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href="#modulos"
            className="px-8 py-4 text-base font-bold rounded-xl border border-border/30 bg-card/5 backdrop-blur-lg hover:bg-card/10 hover:border-accent/50 transition-all duration-300"
          >
            Explorar Módulos
          </a>
        </div>
      </header>

      {/* ── SHOWCASE MOCKUP ── */}
      <div className="relative z-10 px-4 pb-32 mx-auto max-w-6xl perspective-1000">
        <div className="relative rounded-2xl border border-border/20 bg-card/60 backdrop-blur-xl p-4 md:p-6 shadow-lg overflow-hidden group">
          {/* Brilho interno do card */}
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          {/* Mockup Topbar */}
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-border/20">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-accent/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="ml-4 text-xs font-mono text-muted-foreground bg-background/50 px-3 py-1 rounded-md">
              app.dluxury-crm.com/painel
            </div>
          </div>

          {/* Conteúdo Fictício do Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Mock */}
            <div className="hidden lg:flex flex-col gap-4 border-r border-border/20 pr-6">
              {[80, 60, 90, 40, 70].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-foreground/5" />
                  <div className="h-3 bg-foreground/5 rounded-full" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>

            {/* Main Content Mock */}
            <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">
              {/* Cards de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-border/20 bg-background/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-muted-foreground tracking-wider mb-2">
                    VENDAS (MÊS)
                  </p>
                  <p className="text-2xl font-black text-accent">R$ 148.500</p>
                </div>
                <div className="p-5 rounded-xl border border-border/20 bg-background/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-muted-foreground tracking-wider mb-2">
                    ORDENS DE PRODUÇÃO
                  </p>
                  <p className="text-2xl font-black">8 ATIVAS</p>
                </div>
                <div className="p-5 rounded-xl border border-border/20 bg-background/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-2xl rounded-full" />
                  <p className="text-xs font-bold text-muted-foreground tracking-wider mb-2">
                    APROVEITAMENTO (CORTES)
                  </p>
                  <p className="text-2xl font-black text-emerald-400">87.4%</p>
                </div>
              </div>

              {/* Gráfico/Canvas Mock */}
              <div className="h-64 rounded-xl border border-border/20 bg-background/40 flex items-center justify-center relative overflow-hidden group-hover:border-border/30 transition-colors">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <Activity className="w-10 h-10 text-accent/50" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    Renderização Gráfica do Plano de Corte 3D
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MÓDULOS SECTION (BENTO GRID) ── */}
      <section id="modulos" className="relative z-10 py-24 px-4 mx-auto max-w-7xl">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            Uma Plataforma, <span className="text-accent">Infinitas Possibilidades</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Abandone as planilhas e integre absolutamente tudo. Da prospecção de vendas à
            engenharia, produção CNC e fluxo de caixa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map((m, index) => {
            const Icon = m.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-2xl border border-border/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Glow de fundo no hover */}
                <div className="absolute -inset-x-2 -inset-y-2 z-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />

                <div className="relative z-10 flex flex-col gap-4">
                  <div className="w-14 h-14 rounded-xl bg-background border border-border/30 flex items-center justify-center text-accent group-hover:scale-110 group-hover:bg-accent/10 group-hover:border-accent/50 transition-all duration-300 shadow-lg">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold group-hover:text-accent transition-colors">
                    {m.nome}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── PLANOS E PREÇOS ── */}
      <section
        id="precos"
        className="relative z-10 py-32 px-4 border-t border-border/20 bg-background/80"
      >
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            Planos Transparentes. <span className="text-accent">Sem Surpresas.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Cresça no seu ritmo. Altere ou cancele o seu plano a qualquer instante direto pelo
            painel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {/* BASIC */}
          <div className="flex flex-col p-8 rounded-3xl border border-border/20 bg-card/50 backdrop-blur-md">
            <h3 className="text-2xl font-black mb-2">BASIC</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Para marceneiros autônomos e pequenas lojas.
            </p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-4xl font-black">R$ 97</span>
              <span className="text-muted-foreground font-semibold mb-1">/mês</span>
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3 px-4 mb-8 text-sm font-bold bg-card/20 border border-border/30 rounded-xl hover:bg-card/40 transition-colors"
            >
              Começar Teste Grátis
            </button>
            <ul className="flex flex-col gap-4 text-sm text-foreground/80">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> CRM & Clientes
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Orçamentos Básicos
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Agenda de Visitas
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Até 2 usuários
              </li>
            </ul>
          </div>

          {/* PRO (Destaque) */}
          <div className="relative flex flex-col p-8 rounded-3xl border-2 border-accent bg-card/80 backdrop-blur-xl shadow-lg shadow-primary/30 transform md:-translate-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-black tracking-widest uppercase rounded-full shadow-lg">
              Mais Escolhido
            </div>
            <h3 className="text-2xl font-black text-accent mb-2 mt-4">PRO</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Gestão 360° com Financeiro e Integrações.
            </p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-5xl font-black">R$ 197</span>
              <span className="text-muted-foreground font-semibold mb-1">/mês</span>
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-4 px-4 mb-8 text-sm font-black text-primary-foreground bg-gradient-to-r from-primary to-accent rounded-xl shadow-lg shadow-primary/30 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              Começar Teste Grátis
            </button>
            <ul className="flex flex-col gap-4 text-sm font-medium">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Tudo do Plano Basic
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Financeiro e Fluxo de Caixa
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Inteligência Artificial Dlux
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Plano de Corte Integrado
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Até 5 usuários simultâneos
              </li>
            </ul>
          </div>

          {/* ENTERPRISE */}
          <div className="flex flex-col p-8 rounded-3xl border border-border/20 bg-card/50 backdrop-blur-md">
            <h3 className="text-2xl font-black mb-2">ENTERPRISE</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Controle de Indústria e Simulação CNC 3D.
            </p>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-4xl font-black">R$ 397</span>
              <span className="text-muted-foreground font-semibold mb-1">/mês</span>
            </div>
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3 px-4 mb-8 text-sm font-bold bg-card/20 border border-border/30 rounded-xl hover:bg-card/40 transition-colors"
            >
              Falar com Consultor
            </button>
            <ul className="flex flex-col gap-4 text-sm text-foreground/80">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Tudo do Plano PRO
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Simulador CNC Tridimensional
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Ordens de Produção (OP)
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" /> Usuários Ilimitados
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative z-10 py-32 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Perguntas Frequentes</h2>
          <p className="text-muted-foreground">
            Tire suas dúvidas e veja por que somos o melhor ERP do mercado.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-accent mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Como funciona o teste gratuito?
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Você recebe 14 dias de acesso completo à plataforma sem necessidade de cadastrar um
              cartão de crédito. Durante esse tempo, você pode testar todos os módulos livremente.
              Ao final, você decide se deseja assinar.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-accent mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> O que a Inteligência Artificial Dlux consegue
              fazer?
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              O Dlux não é um simples chatbot. Ele é treinado em engenharia de móveis, cálculo de
              folgas, parâmetros industriais de espessura de MDF e fitas de borda. Ele analisa seus
              projetos para alertar sobre erros estruturais antes de enviar o projeto à fábrica.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-accent mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Existe contrato de fidelidade ou multa rescisória?
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Não. O nosso modelo é inteiramente pré-pago mensalmente. Se o sistema deixar de fazer
              sentido para a sua fábrica, você pode cancelar a qualquer minuto diretamente na página
              de assinaturas, sem multas burocráticas.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-border/20 bg-background py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col gap-2">
            <div className="text-xl font-black text-foreground/80">D'LUXURY CRM</div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} D'Luxury CRM. Todos os direitos reservados.
            </p>
          </div>

          <div className="flex gap-6 text-sm font-semibold">
            <a href="/termos" className="text-muted-foreground hover:text-accent transition-colors">
              Termos de Uso
            </a>
            <a
              href="/privacidade"
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              Privacidade
            </a>
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
