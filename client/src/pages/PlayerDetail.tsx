import { useRoute } from "wouter";
import { usePlayer, usePlayerTrends } from "@/hooks/use-players";
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
  Legend 
} from "recharts";
import { Loader2, ArrowLeft, Ruler, Scale, GraduationCap, Target } from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";

export default function PlayerDetail() {
  const [, params] = useRoute("/players/:id");
  const id = parseInt(params?.id || "0");
  
  const { data: player, isLoading: playerLoading } = usePlayer(id);
  const { data: trends, isLoading: trendsLoading } = usePlayerTrends(id);

  const chartData = useMemo(() => {
    if (!trends) return [];
    
    // Combine ADP and Odds by Date to plot on same chart
    const dateMap = new Map<string, any>();
    
    trends.adp.forEach(entry => {
      const d = entry.date ? format(new Date(entry.date), "MMM dd") : "Unknown";
      if (!dateMap.has(d)) dateMap.set(d, { date: d });
      dateMap.get(d).adp = Number(entry.adpValue);
    });
    
    trends.odds.forEach(entry => {
      const d = entry.date ? format(new Date(entry.date), "MMM dd") : "Unknown";
      if (!dateMap.has(d)) dateMap.set(d, { date: d });
      // In a real app we might average different sportsbooks, here we just take the first one found per date
      if (!dateMap.get(d).odds) {
        dateMap.get(d).odds = Number(entry.overUnder);
      }
    });

    return Array.from(dateMap.values());
  }, [trends]);

  if (playerLoading || !player) {
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
      <div className="mb-6">
        <Link href="/players" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Board
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex flex-col items-center text-center">
              {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-xl mb-4" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-white/5 border-4 border-white/10 flex items-center justify-center font-display text-4xl font-bold text-muted-foreground mb-4 shadow-xl">
                  {player.name.charAt(0)}
                </div>
              )}
              <h1 className="text-3xl font-display font-bold text-white">{player.name}</h1>
              <p className="text-primary font-medium tracking-wide mt-1">{player.position}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                <GraduationCap className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground uppercase font-mono mb-1">College</p>
                <p className="font-semibold text-white text-sm">{player.college || '---'}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                <Target className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground uppercase font-mono mb-1">RAS</p>
                <p className="font-bold text-white font-mono text-lg">{player.rasScore ? Number(player.rasScore).toFixed(2) : '---'}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                <Ruler className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground uppercase font-mono mb-1">Height</p>
                <p className="font-mono text-white text-sm">{player.height || '---'}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
                <Scale className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground uppercase font-mono mb-1">Weight</p>
                <p className="font-mono text-white text-sm">{player.weight ? `${player.weight} lbs` : '---'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-display font-semibold text-white mb-6">Market Trends</h2>
            
            {trendsLoading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.4)" 
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'var(--font-mono)' }} 
                      tickMargin={10}
                    />
                    
                    {/* Left Axis for ADP (Reversed because lower pick # is better) */}
                    <YAxis 
                      yAxisId="left" 
                      reversed={true}
                      stroke="hsl(var(--primary))" 
                      tick={{ fill: 'hsl(var(--primary))', fontSize: 12, fontFamily: 'var(--font-mono)' }} 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      label={{ value: 'Avg Draft Position', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', style: { textAnchor: 'middle' } }}
                    />
                    
                    {/* Right Axis for Odds */}
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#8884d8" 
                      tick={{ fill: '#8884d8', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      label={{ value: 'Sportsbook O/U', angle: 90, position: 'insideRight', fill: 'rgba(255,255,255,0.5)', style: { textAnchor: 'middle' } }}
                    />
                    
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontFamily: 'var(--font-mono)'
                      }}
                      itemStyle={{ color: 'white' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}/>
                    
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="adp" 
                      name="ADP" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="odds" 
                      name="O/U Odds" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-xl">
                No historical trend data available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
