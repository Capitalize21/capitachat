import { Button } from "@/components/ui/button";
import { Phone, Globe, UserPlus, HelpCircle, TrendingUp, ShieldCheck, Wallet, Users, Mail, MapPin } from "lucide-react";
import { SUPPORT_PHONE, CAPITALIZE_URL } from "./ChatLayout";
import hero from "@/assets/capitalize-hero.jpg";
import team from "@/assets/capitalize-team.jpg";
import grow from "@/assets/capitalize-grow.jpg";
import logo from "@/assets/logo.png";

export default function CapitalizeInfo() {
  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-0 bg-background">
      {/* Hero */}
      <div className="relative">
        <img src={hero} alt="Investimentos Capitalize" width={1024} height={576} className="w-full h-48 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
          <img src={logo} alt="" width={48} height={48} className="rounded-lg shadow-lg" />
          <div>
            <h1 className="text-xl font-bold">Capitalize</h1>
            <p className="text-xs text-muted-foreground">Investimentos inteligentes. Crescimento real.</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Intro */}
        <section>
          <h2 className="text-base font-semibold mb-1.5">Sobre a Capitalize</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A Capitalize é uma empresa de investimentos que ajuda pessoas e empresas a fazerem o seu
            dinheiro crescer através de oportunidades transparentes e de alta rentabilidade. Combinamos
            tecnologia, experiência e confiança para oferecer retornos consistentes aos nossos clientes.
          </p>
        </section>

        {/* Pillars */}
        <section className="grid grid-cols-3 gap-2">
          {[
            { icon: TrendingUp, label: "Alta rentabilidade" },
            { icon: ShieldCheck, label: "Seguro" },
            { icon: Wallet, label: "Saques fáceis" },
          ].map((f) => (
            <div key={f.label} className="rounded-lg bg-card border border-border p-3 text-center">
              <f.icon className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs font-medium">{f.label}</p>
            </div>
          ))}
        </section>

        {/* Card 1 */}
        <section className="rounded-xl overflow-hidden border border-border bg-card">
          <img src={grow} alt="" width={800} height={600} loading="lazy" className="w-full h-40 object-cover" />
          <div className="p-3">
            <h3 className="font-semibold text-sm mb-1">Faça o seu capital crescer</h3>
            <p className="text-xs text-muted-foreground">
              Escolha entre planos de investimento flexíveis a partir de pequenos valores. Acompanhe os
              seus rendimentos em tempo real e levante quando precisar.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-base font-semibold mb-2">Como funciona</h2>
          <ol className="space-y-2">
            {[
              "Crie a sua conta Capitalize gratuitamente online.",
              "Escolha um plano de investimento que se adapte aos seus objetivos.",
              "Deposite os seus fundos com segurança pelos canais oficiais.",
              "Veja o seu saldo crescer e levante quando quiser.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                <span className="text-muted-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Card 2 */}
        <section className="rounded-xl overflow-hidden border border-border bg-card">
          <img src={team} alt="" width={800} height={600} loading="lazy" className="w-full h-40 object-cover" />
          <div className="p-3">
            <h3 className="font-semibold text-sm mb-1">Uma equipa de confiança</h3>
            <p className="text-xs text-muted-foreground">
              Os nossos consultores experientes estão disponíveis 7 dias por semana para o orientar em
              cada passo da sua jornada de investimento.
            </p>
          </div>
        </section>

        {/* CTAs */}
        <section className="space-y-2">
          <a href={CAPITALIZE_URL} target="_blank" rel="noreferrer" className="block">
            <Button className="w-full bg-primary hover:bg-primary/90"><UserPlus className="mr-2 h-4 w-4" /> Login a sua conta</Button>
          </a>
          <a href={CAPITALIZE_URL} target="_blank" rel="noreferrer" className="block">
            <Button variant="outline" className="w-full"><Globe className="mr-2 h-4 w-4" /> Visitar capitalize.org.za</Button>
          </a>
          <a href={`tel:${SUPPORT_PHONE}`} className="block">
            <Button variant="outline" className="w-full"><Phone className="mr-2 h-4 w-4" /> Ligar para o suporte: {SUPPORT_PHONE}</Button>
          </a>
          <a href={`${CAPITALIZE_URL}/help`} target="_blank" rel="noreferrer" className="block">
            <Button variant="ghost" className="w-full"><HelpCircle className="mr-2 h-4 w-4" /> Central de ajuda</Button>
          </a>
        </section>

        {/* Contact */}
        <section className="rounded-xl bg-card border border-border p-4 space-y-2 text-sm">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Contacte-nos</h3>
          <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {SUPPORT_PHONE}</p>
          <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> contacto@capitalize.org.za</p>
          <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> África do Sul -- Johannesburg, South Africa</p>
        </section>

        <p className="text-[10px] text-center text-muted-foreground pt-2 pb-4">
          © {new Date().getFullYear()} Capitalize. Investimentos envolvem risco. Resultados passados não garantem resultados futuros.
        </p>
      </div>
    </div>
  );
}
