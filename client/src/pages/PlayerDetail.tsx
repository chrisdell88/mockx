import { useRoute } from "wouter";
import { usePlayer, usePlayerTrends, usePlayerRankings } from "@/hooks/use-players";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceLine
} from "recharts";
import { Loader2, ArrowLeft, Ruler, Scale, GraduationCap, Target, TrendingUp, TrendingDown, Minus, Activity, BarChart2, Trophy } from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";

// Convert American odds string to implied probability (0–100)
function americanToProb(oddsStr: string): number {
  const n = parseInt(oddsStr, 10);
  if (isNaN(n)) return 50;
  if (n < 0) return Math.round((-n / (-n + 100)) * 100 * 10) / 10;
  return Math.round((100 / (n + 100)) * 100 * 10) / 10;
}

// Map marketType to a readable label
function marketLabel(mt: string): string {
  const map: Record<string, string> = {
    first_overall: "#1 Overall",
    top_3_pick: "Top 3 Pick",
    top_5_pick: "Top 5 Pick",
    top_10_pick: "Top 10 Pick",
    first_round: "First Round",
  };
  return map[mt] ?? mt;
}

// Color per drafter for the chart
const DRAFTER_COLORS: Record<string, string> = {
  "Daniel Jeremiah (NFL.com) v1.0": "#60a5fa",
  "Daniel Jeremiah (NFL.com) v2.0": "#34d399",
  "Daniel Jeremiah (NFL.com) v3.0": "#f59e0b",
  "Grinding the Mocks (EDP Consensus)": "#a78bfa",
  "MDDB Consensus Mock Draft": "#f472b6",
};

const DRAFTER_SHORT: Record<string, string> = {
  "Daniel Jeremiah (NFL.com) v1.0": "DJ v1.0",
  "Daniel Jeremiah (NFL.com) v2.0": "DJ v2.0",
  "Daniel Jeremiah (NFL.com) v3.0": "DJ v3.0",
  "Grinding the Mocks (EDP Consensus)": "GTM EDP",
  "MDDB Consensus Mock Draft": "MDDB",
};

export default function PlayerDetail() {
  const [, params] = useRoute("/players/:id");
  const id = parseInt(params?.id || "0");
  
  const { data: player, isLoading: playerLoading } = usePlayer(id);
  const { data: trends, isLoading: trendsLoading } = usePlayerTrends(id);
  const { data: rankings, isLoading: rankingsLoading } = usePlayerRankings(id);

  // Build ADP trend data (consensus EDP over time)
  const adpChartData = useMemo(() => {
    if (!trends?.adp?.length) return [];
    return trends.adp.map(entry => ({
      date: entry.date ? format(new Date(entry.date), "MMM d") : "–",
      adp: Number(entry.adpValue),
    }));
  }, [trends]);

  // Build odds chart data (implied probability over time, grouped by marketType)
  const oddsChartData = useMemo(() => {
    if (!trends?.odds?.length) return [];
    const dateMap = new Map<string, any>();
    trends.odds.forEach(entry => {
      const d = entry.date ? format(new Date(entry.date), "MMM d") : "–";
      if (!dateMap.has(d)) dateMap.set(d, { date: d });
      const key = `prob_${entry.marketType}`;
      if (!dateMap.get(d)[key]) {
        dateMap.get(d)[key] = americanToProb(entry.odds);
        dateMap.get(d)[`label_${entry.marketType}`] = marketLabel(entry.marketType);
      }
    });
    return Array.from(dateMap.values());
  }, [trends]);

  // Get unique market types for odds chart
  const oddsMarkets = useMemo(() => {
    if (!trends?.odds?.length) return [];
    return Array.from(new Set(trends.odds.map(e => e.marketType)));
  }, [trends]);

  // Current ADP (latest snapshot)
  const currentAdp = adpChartData.length > 0 ? adpChartData[adpChartData.length - 1].adp : null;
  const prevAdp = adpChartData.length > 1 ? adpChartData[adpChartData.length - 2].adp : null;
  const trend = currentAdp && prevAdp ? (currentAdp < prevAdp ? 'up' : currentAdp > prevAdp ? 'down' : 'flat') : 'flat';

  // Sorted rankings by pick number
  const sortedRankings = useMemo(() => {
    if (!rankings) return [];
    return [...rankings].sort((a, b) => a.pickNumber - b.pickNumber);
  }, [rankings]);

  if (playerLoading || !player) {
    return (
      <Layout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loading-spinner" />
        </div>
      </Layout>
    );
  }

  const combineStats = [
    { label: "40-Yard", value: player.fortyYard ? `${Number(player.fortyYard).toFixed(2)}s` : null },
    { label: "Vertical", value: player.verticalJump ? `${player.verticalJump}"` : null },
    { label: "Bench Press", value: player.benchPress ? `${player.benchPress} reps` : null },
    { label: "3-Cone", value: player.coneDrill ? `${Number(player.coneDrill).toFixed(2)}s` : null },
    { label: "Shuttle", value: player.shuttleRun ? `${Number(player.shuttleRun).toFixed(2)}s` : null },
    { label: "Broad Jump", value: player.broadJump ? `${player.broadJump}"` : null },
  ].filter(s => s.value !== null);

  return (
    <Layout>
      <div className="mb-6" data-testid="back-link-container">
        <Link href="/players" data-testid="link-back-to-board" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Board
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column ─────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Player Identity Card */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden" data-testid="player-identity-card">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex flex-col items-center text-center">
              {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} className="w-28 h-28 rounded-full object-cover border-4 border-white/10 shadow-xl mb-4" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 flex items-center justify-center font-display text-4xl font-bold text-primary mb-4 shadow-xl">
                  {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <h1 className="text-2xl font-display font-bold text-white" data-testid="text-player-name">{player.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono font-bold bg-primary/20 text-primary border border-primary/30 rounded-full px-3 py-0.5" data-testid="text-player-position">{player.position}</span>
                <span className="text-xs text-muted-foreground">{player.college}</span>
              </div>
            </div>

            {/* Key Stats Row */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center text-center">
                <p className="text-xs text-muted-foreground uppercase font-mono mb-1">ADP</p>
                <p className="font-bold text-white font-mono text-lg" data-testid="text-current-adp">
                  {currentAdp !== null ? currentAdp.toFixed(1) : '–'}
                </p>
                {trend !== 'flat' && (
                  <span className={`text-xs ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trend === 'up' ? '▲' : '▼'}
                  </span>
                )}
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center text-center">
                <p className="text-xs text-muted-foreground uppercase font-mono mb-1">RAS</p>
                <p className="font-bold text-white font-mono text-lg" data-testid="text-ras-score">
                  {player.rasScore ? Number(player.rasScore).toFixed(2) : '–'}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center text-center">
                <p className="text-xs text-muted-foreground uppercase font-mono mb-1">40-yd</p>
                <p className="font-bold text-white font-mono text-lg" data-testid="text-forty-yard">
                  {player.fortyYard ? Number(player.fortyYard).toFixed(2) : '–'}
                </p>
              </div>
            </div>

            {/* Height / Weight */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
                <Ruler className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-mono">Height</p>
                  <p className="font-mono text-white text-sm font-semibold" data-testid="text-height">{player.height || '–'}</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
                <Scale className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-mono">Weight</p>
                  <p className="font-mono text-white text-sm font-semibold" data-testid="text-weight">{player.weight ? `${player.weight} lbs` : '–'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Combine Measurables */}
          {combineStats.length > 0 && (
            <div className="glass-card rounded-2xl p-6" data-testid="combine-stats-card">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider font-mono">Combine Measurables</h3>
              </div>
              <div className="space-y-2">
                {combineStats.map(stat => (
                  <div key={stat.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0" data-testid={`stat-${stat.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                    <span className="text-sm text-muted-foreground font-mono">{stat.label}</span>
                    <span className="text-sm font-mono font-bold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mock Drafter Rankings */}
          {!rankingsLoading && sortedRankings.length > 0 && (
            <div className="glass-card rounded-2xl p-6" data-testid="drafter-rankings-card">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider font-mono">By Mock Drafter</h3>
              </div>
              <div className="space-y-2">
                {sortedRankings.map(r => {
                  const short = DRAFTER_SHORT[r.sourceName] ?? r.sourceName;
                  const color = DRAFTER_COLORS[r.sourceName] ?? '#94a3b8';
                  return (
                    <div key={r.sourceName} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0" data-testid={`ranking-${short.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      <span className="text-sm font-mono" style={{ color }}>{short}</span>
                      <span className="text-sm font-mono font-bold text-white">#{r.pickNumber}</span>
                    </div>
                  );
                })}
              </div>
              {/* Spread bar showing divergence */}
              {sortedRankings.length >= 2 && (() => {
                const picks = sortedRankings.map(r => r.pickNumber);
                const min = Math.min(...picks);
                const max = Math.max(...picks);
                return max - min > 0 ? (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-muted-foreground font-mono mb-1">Analyst Spread</p>
                    <p className="font-mono text-sm font-bold text-amber-400" data-testid="text-analyst-spread">#{min} – #{max} ({max - min} pick spread)</p>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* ── Right Column ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ADP Trend Chart */}
          <div className="glass-card rounded-2xl p-6" data-testid="adp-trend-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-display font-semibold text-white">Consensus ADP Trend</h2>
              </div>
              <span className="text-xs text-muted-foreground font-mono">Source: Grinding the Mocks EDP</span>
            </div>
            
            {trendsLoading ? (
              <div className="h-[260px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : adpChartData.length > 0 ? (
              <div className="h-[260px] w-full" data-testid="chart-adp-trend">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adpChartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.2)" 
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'var(--font-mono)' }} 
                      tickMargin={8}
                    />
                    <YAxis 
                      reversed={true}
                      stroke="rgba(255,255,255,0.2)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                      tickFormatter={(v) => `#${v}`}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: 'white',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                      }}
                      formatter={(v: any) => [`#${Number(v).toFixed(1)}`, "ADP"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="adp" 
                      name="ADP" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-xl text-sm font-mono">
                No ADP history available
              </div>
            )}
          </div>

          {/* Mock Drafter Comparison Chart */}
          {!rankingsLoading && sortedRankings.length > 1 && (
            <div className="glass-card rounded-2xl p-6" data-testid="drafter-comparison-card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-display font-semibold text-white">Analyst Divergence</h2>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-4">Where each mock drafter has this prospect ranked</p>
              <div className="space-y-3">
                {sortedRankings.map(r => {
                  const short = DRAFTER_SHORT[r.sourceName] ?? r.sourceName;
                  const color = DRAFTER_COLORS[r.sourceName] ?? '#94a3b8';
                  const maxPick = Math.max(...sortedRankings.map(x => x.pickNumber));
                  const pct = Math.max(5, Math.round((1 - (r.pickNumber - 1) / Math.max(maxPick, 32)) * 100));
                  return (
                    <div key={r.sourceName} data-testid={`bar-${short.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span style={{ color }}>{short}</span>
                        <span className="text-white font-bold">Pick #{r.pickNumber}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sportsbook Odds Chart */}
          {!trendsLoading && oddsChartData.length > 0 && oddsMarkets.length > 0 && (
            <div className="glass-card rounded-2xl p-6" data-testid="odds-chart-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-lg font-display font-semibold text-white">Sportsbook Implied Probability</h2>
                </div>
                <span className="text-xs text-muted-foreground font-mono">American odds → %</span>
              </div>
              <div className="h-[240px] w-full" data-testid="chart-odds">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={oddsChartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.2)" 
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'var(--font-mono)' }} 
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.2)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <ReferenceLine y={50} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.12)', borderRadius: '8px', color: 'white', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                      formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}%`, name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px' }} />
                    {oddsMarkets.map((mt, i) => {
                      const colors = ['#34d399','#60a5fa','#f59e0b','#f472b6','#a78bfa'];
                      return (
                        <Line
                          key={mt}
                          type="monotone"
                          dataKey={`prob_${mt}`}
                          name={marketLabel(mt)}
                          stroke={colors[i % colors.length]}
                          strokeWidth={2}
                          dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
