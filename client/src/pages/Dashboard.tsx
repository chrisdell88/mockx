import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { usePlayers } from "@/hooks/use-players";
import { PlayerCard } from "@/components/PlayerCard";
import { Activity, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: players, isLoading } = usePlayers();

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Split into categories for the dashboard
  const rising = players?.filter(p => p.trend === 'up').slice(0, 3) || [];
  const falling = players?.filter(p => p.trend === 'down').slice(0, 3) || [];
  const topProspects = players?.sort((a, b) => (a.currentAdp || 999) - (b.currentAdp || 999)).slice(0, 6) || [];

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">2026 Draft Market Overview</h1>
          <p className="text-muted-foreground max-w-2xl">
            Track real-time stock value of 2026 NFL Draft prospects based on expert mock drafts and sportsbook odds.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Top Movers - Rising */}
          <section className="glass-card p-6 rounded-2xl border-l-4 border-l-[hsl(var(--stock-up))]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--stock-up))] shadow-[0_0_10px_hsl(var(--stock-up))] animate-pulse" />
                Top Gainers
              </h2>
            </div>
            {rising.length > 0 ? (
              <div className="space-y-4">
                {rising.map((player, i) => (
                  <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono text-sm w-4">{i + 1}.</span>
                      <div>
                        <p className="font-semibold text-white">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.position} • {player.college}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-[hsl(var(--stock-up))] text-glow-up">
                        {player.currentAdp?.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Current ADP</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No significant upward movement detected.</p>
              </div>
            )}
          </section>

          {/* Top Movers - Falling */}
          <section className="glass-card p-6 rounded-2xl border-l-4 border-l-[hsl(var(--stock-down))]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--stock-down))] shadow-[0_0_10px_hsl(var(--stock-down))] animate-pulse" />
                Top Fallers
              </h2>
            </div>
            {falling.length > 0 ? (
              <div className="space-y-4">
                {falling.map((player, i) => (
                  <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono text-sm w-4">{i + 1}.</span>
                      <div>
                        <p className="font-semibold text-white">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.position} • {player.college}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-[hsl(var(--stock-down))] text-glow-down">
                        {player.currentAdp?.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Current ADP</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No significant downward movement detected.</p>
              </div>
            )}
          </section>
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-white">Blue Chip Prospects</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topProspects.map((player, idx) => (
              <PlayerCard key={player.id} player={player} index={idx} />
            ))}
          </div>
        </section>
      </motion.div>
    </Layout>
  );
}
