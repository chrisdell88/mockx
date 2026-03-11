import { useState } from "react";
import Layout from "@/components/Layout";
import { useMockDrafts, useScrapeMockDraft } from "@/hooks/use-mock-drafts";
import { format } from "date-fns";
import { Database, Link as LinkIcon, Loader2, Plus, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function MockDrafts() {
  const { data: drafts, isLoading } = useMockDrafts();
  const scrapeMutation = useScrapeMockDraft();
  
  const [url, setUrl] = useState("");
  const [sourceName, setSourceName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !sourceName) return;
    scrapeMutation.mutate({ url, sourceName }, {
      onSuccess: () => {
        setUrl("");
        setSourceName("");
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Data Pipeline</h1>
          <p className="text-muted-foreground">Ingest new mock drafts to update prospect market values.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/20 p-2 rounded-lg text-primary">
                  <Database className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-display font-semibold text-white">New Source</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Source Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. ESPN, PFF, The Athletic"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">URL</label>
                  <input 
                    type="url" 
                    required
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3 text-sm text-primary/90">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>Submitting will simulate scraping the URL, processing the draft order, and updating player ADPs automatically.</p>
                </div>

                <button 
                  type="submit" 
                  disabled={scrapeMutation.isPending || !url || !sourceName}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {scrapeMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <><Plus className="w-5 h-5" /> Ingest Data</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* History Section */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-6 h-full">
              <h2 className="text-xl font-display font-semibold text-white mb-6">Ingestion History</h2>
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : drafts && drafts.length > 0 ? (
                <div className="space-y-3">
                  {drafts.map((draft, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={draft.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div>
                        <h3 className="font-semibold text-white">{draft.sourceName}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                          {draft.publishedAt && format(new Date(draft.publishedAt), "MMM dd, yyyy HH:mm")}
                        </p>
                      </div>
                      <a 
                        href={draft.url || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                        title="View Source"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-xl">
                  <Database className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>No mock drafts ingested yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
