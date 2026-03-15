import { motion } from "framer-motion";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { usePlayers } from "@/hooks/use-players";
import { useQuery } from "@tanstack/react-query";
import { PlayerCard } from "@/components/PlayerCard";
import { 
  Activity, Loader2, TrendingUp, TrendingDown, ArrowRight,
  Users, Wifi, RefreshCw, BarChart3, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type Analyst = {
  id: number;
  name: string;
  outlet: string;
  accuracyWeight: string | null;
  isConsensus: number | null;
  sourceKey: string | null;
};

// ─── Scrolling Market Ticker ──────────────────────────────────────────────────
function MarketTicker({ players }: { players: ReturnType<typeof usePlayers>["data"] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  if (!players?.length) return null;

  const sorted = [...players].sort((a, b) => (a.currentAdp ?? 99) - (b.currentAdp ?? 99));
  const items = [...sorted, ...sorted]; // duplicate for seamless loop

  return (
    <div className="overflow-hidden border-y border-white/5 bg-black/30 py-2.5 relative select-none" data-testid="market-ticker">
      {/* Fades */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/80 to-transparent z-10 pointer-events-none" />
      <div
        ref={trackRef}
        className="flex gap-0 whitespace-nowrap"
        style={{ animation: "ticker-scroll 55s linear infinite" }}
      >
        {items.map((p, idx) => {
          const change = p.adpChange ?? 0;
          const isUp = change > 0.2;
          const isDown = change < -0.2;
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-2 px-4 text-xs font-mono border-r border-white/5"
              data-testid={`ticker-item-${p.id}`}
            >
              <span className="text-white font-semibold">{p.name.split(" ").slice(-1)[0].toUpperCase()}</span>
              <span className={cn(
                "font-bold",
                isUp ? "text-stock-up" : isDown ? "text-stock-down" : "text-muted-foreground"
              )}>
                #{p.currentAdp?.toFixed(1)}
              </span>
              {isUp && <span className="text-stock-up">▲{change.toFixed(1)}</span>}
              {isDown && <span className="text-stock-down">▼{Math.abs(change).toFixed(1)}</span>}
              {!isUp && !isDown && <span className="text-muted-foreground">—</span>}
            </span>
          );
        })}
      </div>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── Mover Row ────────────────────────────────────────────────────────────────
function MoverRow({ player, rank, type }: {
  player: NonNullable<ReturnType<typeof usePlayers>["data"]>[number];
  rank: number;
  type: "up" | "down";
}) {
  const change = Math.abs(player.adpChange ?? 0);
  const isUp = type === "up";

  return (
    <Link href={`/players/${player.id}`}>
      <div
        className="flex items-center justify-between p-3.5 rounded-xl bg-white/3 hover:bg-white/7 transition-all border border-white/3 hover:border-white/10 cursor-pointer group"
        data-testid={`mover-row-${player.id}`}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
            isUp ? "bg-stock-up/15 text-stock-up" : "bg-stock-down/15 text-stock-down"
          )}>
            {rank}
          </div>
          <div>
            <p className="font-semibold text-white text-sm group-hover:text-primary transition-colors leading-tight">
              {player.name}
            </p>
            <p className="text-xs text-muted-foreground">{player.position} · {player.college}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className={cn(
              "font-mono text-base font-bold leading-tight",
              isUp ? "text-stock-up" : "text-stock-down"
            )}>
              #{player.currentAdp?.toFixed(1)}
            </p>
            <p className={cn(
              "text-[10px] font-mono flex items-center gap-0.5 justify-end",
              isUp ? "text-stock-up" : "text-stock-down"
            )}>
              {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {isUp ? "+" : "-"}{change.toFixed(1)} spots
            </p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ─── Position Summary ─────────────────────────────────────────────────────────
function PositionSummary({ players }: { players: NonNullable<ReturnType<typeof usePlayers>["data"]> }) {
  const positions = ["QB", "RB", "WR", "TE", "OT", "IOL", "EDGE", "LB", "S", "CB"];
  const posCounts = positions.map(pos => {
    const group = players.filter(p => p.position === pos);
    const avgAdp = group.length ? group.reduce((s, p) => s + (p.currentAdp ?? 30), 0) / group.length : 0;
    const rising = group.filter(p => (p.adpChange ?? 0) > 0.2).length;
    return { pos, count: group.length, avgAdp: Math.round(avgAdp * 10) / 10, rising };
  }).filter(p => p.count > 0);

  return (
    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
      {posCounts.map(({ pos, count, avgAdp, rising }) => (
        <div
          key={pos}
          className="bg-card/40 border border-white/5 rounded-xl p-3 text-center"
          data-testid={`position-card-${pos}`}
        >
          <p className="text-xs font-bold text-primary font-mono">{pos}</p>
          <p className="text-lg font-bold text-white font-mono">{count}</p>
          <p className="text-[10px] text-muted-foreground">~#{avgAdp} avg</p>
          {rising > 0 && (
            <p className="text-[10px] text-stock-up">↑{rising} rising</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Source Coverage Bar ──────────────────────────────────────────────────────
function SourceCoverage({ analysts }: { analysts: Analyst[] }) {
  const total = analysts.length;
  const withSource = analysts.filter(a => a.sourceKey).length;
  const consensus = analysts.filter(a => a.isConsensus).length;
  const pct = total ? Math.round((withSource / total) * 100) : 0;

  return (
    <div className="bg-card/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
          <Wifi className="w-3 h-3 text-stock-up" />Source Coverage
        </p>
        <Link href="/sources">
          <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-3xl font-bold font-mono text-white">{total}</p>
          <p className="text-xs text-muted-foreground">Total sources</p>
        </div>
        <div>
          <p className="text-xl font-bold font-mono text-stock-up">{withSource}</p>
          <p className="text-xs text-muted-foreground">Auto-scraped</p>
        </div>
        <div>
          <p className="text-xl font-bold font-mono text-blue-400">{consensus}</p>
          <p className="text-xs text-muted-foreground">Consensus</p>
        </div>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-stock-up to-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground font-mono">{pct}% of sources have auto-scrape configured</p>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: players, isLoading } = usePlayers();
  const { data: analysts = [] } = useQuery<Analyst[]>({ queryKey: ["/api/analysts"] });

  const sorted = [...(players ?? [])].sort((a, b) => (a.currentAdp ?? 99) - (b.currentAdp ?? 99));

  // Biggest movers — sort by absolute ADP change, then take top 5 in each direction
  const byChange = [...(players ?? [])].sort((a, b) => Math.abs(b.adpChange ?? 0) - Math.abs(a.adpChange ?? 0));
  const topRisers = byChange.filter(p => (p.adpChange ?? 0) > 0.2).slice(0, 5);
  const topFallers = byChange.filter(p => (p.adpChange ?? 0) < -0.2).slice(0, 5);
  const topProspects = sorted.slice(0, 6);

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Market Ticker */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 md:-mt-12 mb-8">
        <MarketTicker players={players} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-10"
      >
        {/* Header */}
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-stock-up animate-pulse shadow-[0_0_8px_hsl(var(--stock-up))]" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Market Open · Live Data</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">2026 Draft Market</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            ADP based on {analysts.length}+ analyst mock drafts. Updated daily from WalterFootball, Tankathon, MDDB, and 25+ individual sources.
          </p>
        </header>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Prospects Tracked", value: players?.length ?? 0, icon: Users, color: "text-primary" },
            { label: "Analyst Sources", value: analysts.length, icon: BarChart3, color: "text-blue-400" },
            { label: "Rising Today", value: topRisers.length, icon: TrendingUp, color: "text-stock-up" },
            { label: "Falling Today", value: topFallers.length, icon: TrendingDown, color: "text-stock-down" },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card/50 border border-white/5 rounded-xl p-4 flex items-center gap-3"
              data-testid={`stat-card-${label.toLowerCase().replace(/ /g,'-')}`}
            >
              <div className={cn("p-2 rounded-lg bg-white/5", color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className={cn("text-2xl font-bold font-mono", color)}>{value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Biggest Movers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gainers */}
          <section className="glass-card p-6 rounded-2xl border-l-4 border-l-[hsl(var(--stock-up))]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-display font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-stock-up" />
                Biggest Gainers
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-stock-up font-mono bg-stock-up/10 px-2 py-0.5 rounded-full">
                +{topRisers.reduce((s, p) => s + (p.adpChange ?? 0), 0).toFixed(1)} combined
              </span>
            </div>
            {topRisers.length > 0 ? (
              <div className="space-y-2">
                {topRisers.map((player, i) => (
                  <MoverRow key={player.id} player={player} rank={i + 1} type="up" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No significant upward movement</p>
              </div>
            )}
          </section>

          {/* Fallers */}
          <section className="glass-card p-6 rounded-2xl border-l-4 border-l-[hsl(var(--stock-down))]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-display font-semibold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-stock-down" />
                Biggest Fallers
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-stock-down font-mono bg-stock-down/10 px-2 py-0.5 rounded-full">
                -{Math.abs(topFallers.reduce((s, p) => s + (p.adpChange ?? 0), 0)).toFixed(1)} combined
              </span>
            </div>
            {topFallers.length > 0 ? (
              <div className="space-y-2">
                {topFallers.map((player, i) => (
                  <MoverRow key={player.id} player={player} rank={i + 1} type="down" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No significant downward movement</p>
              </div>
            )}
          </section>
        </div>

        {/* Position Breakdown + Source Coverage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <Zap className="w-3 h-3 text-primary" />Position Breakdown
            </h2>
            <PositionSummary players={players ?? []} />
          </div>
          <div>
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2 mb-3">
              <Wifi className="w-3 h-3 text-stock-up" />Live Sources
            </h2>
            <SourceCoverage analysts={analysts} />
          </div>
        </div>

        {/* Top Prospects Grid */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Top Board — Round 1
            </h2>
            <Link href="/players">
              <span className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer flex items-center gap-1 font-mono">
                View All <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topProspects.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <PlayerCard player={player} index={i} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
