import { useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { usePlayers } from "@/hooks/use-players";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Players() {
  const { data: players, isLoading } = usePlayers();
  const [search, setSearch] = useState("");
  
  const filteredPlayers = players?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.college && p.college.toLowerCase().includes(search.toLowerCase())) ||
    (p.position && p.position.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">2026 Draft Board</h1>
            <p className="text-muted-foreground">Comprehensive database of college prospects entering the 2026 NFL Draft.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search prospects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-card/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all w-full md:w-64"
              />
            </div>
            <button className="bg-card/50 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10 font-mono tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Prospect</th>
                  <th className="px-6 py-4 font-medium hidden sm:table-cell">Measurables</th>
                  <th className="px-6 py-4 font-medium">RAS</th>
                  <th className="px-6 py-4 font-medium">ADP</th>
                  <th className="px-6 py-4 font-medium text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : filteredPlayers?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No prospects found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers?.map((player) => (
                    <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/players/${player.id}`} className="flex items-center gap-3">
                          {player.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-display font-bold text-muted-foreground">
                              {player.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white group-hover:text-primary transition-colors">{player.name}</p>
                            <p className="text-xs text-muted-foreground">{player.position} • {player.college}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell text-muted-foreground font-mono text-xs">
                        {player.height || '--'} / {player.weight ? `${player.weight} lbs` : '--'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded font-mono text-xs",
                          player.rasScore && Number(player.rasScore) >= 8.0 ? "bg-[hsl(var(--stock-up))]/10 text-[hsl(var(--stock-up))]" :
                          player.rasScore && Number(player.rasScore) >= 5.0 ? "bg-white/10 text-white" :
                          player.rasScore ? "bg-[hsl(var(--stock-down))]/10 text-[hsl(var(--stock-down))]" :
                          "text-muted-foreground"
                        )}>
                          {player.rasScore ? Number(player.rasScore).toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        {player.currentAdp?.toFixed(1) || '---'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={cn(
                          "inline-flex px-2 py-1 rounded text-xs font-mono border",
                          player.trend === 'up' ? "text-[hsl(var(--stock-up))] bg-[hsl(var(--stock-up))]/10 border-[hsl(var(--stock-up))]/20" :
                          player.trend === 'down' ? "text-[hsl(var(--stock-down))] bg-[hsl(var(--stock-down))]/10 border-[hsl(var(--stock-down))]/20" :
                          "text-muted-foreground bg-white/5 border-transparent"
                        )}>
                          {player.trend === 'up' ? 'BUY' : player.trend === 'down' ? 'SELL' : 'HOLD'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
