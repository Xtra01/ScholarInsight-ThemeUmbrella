import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Users, 
  Lightbulb, 
  Plus, 
  Trash2, 
  Loader2, 
  ExternalLink,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  ResearcherInput, 
  ResearcherData, 
  ThemeUmbrella, 
  searchResearcher, 
  analyzeThemes 
} from './services/geminiService';
import { cn } from './lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'umbrella'>('search');
  const [researchers, setResearchers] = useState<ResearcherData[]>([]);
  const [bulkInput, setBulkInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Theme Umbrella State
  const [umbrellaInput, setUmbrellaInput] = useState('');
  const [themes, setThemes] = useState<ThemeUmbrella[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleBulkSearch = async () => {
    const lines = bulkInput.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    setIsSearching(true);
    
    // Parse lines: Name\tTitle\tUniversity\tLinkedIn (Excel uses tabs)
    const newResearchers: ResearcherData[] = lines.map(line => {
      let parts: string[];
      // If line contains tabs, it's likely from Excel. Use tab as primary delimiter.
      if (line.includes('\t')) {
        parts = line.split('\t').map(p => p.trim());
      } else {
        // Fallback to comma, but be careful with commas inside quotes or just split simply
        parts = line.split(',').map(p => p.trim());
      }
      
      return {
        name: parts[0] || 'Unknown',
        title: parts[1] || '',
        university: parts[2] || '',
        linkedin: parts[3] || '',
        researchAreas: [],
        citationsAll: 0,
        hIndexAll: 0,
        i10IndexAll: 0,
        citationsSince2021: 0,
        hIndexSince2021: 0,
        i10IndexSince2021: 0,
        status: 'pending'
      };
    });

    setResearchers(prev => [...prev, ...newResearchers]);

    for (let i = 0; i < newResearchers.length; i++) {
      const index = researchers.length + i;
      setResearchers(prev => {
        const updated = [...prev];
        updated[index].status = 'searching';
        return updated;
      });

      try {
        const result = await searchResearcher(newResearchers[i]);
        setResearchers(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...result, status: 'completed' };
          return updated;
        });
      } catch (error) {
        setResearchers(prev => {
          const updated = [...prev];
          updated[index].status = 'error';
          updated[index].error = 'Not found or search error';
          return updated;
        });
      }
    }
    
    setIsSearching(false);
    setBulkInput('');
  };

  const exportToExcel = () => {
    const dataToExport = researchers.map(r => ({
      'Scholar URL': r.scholarUrl,
      'Ad-Soyad': r.name,
      'Ünvan/Bölüm': r.title,
      'Üniversite': r.university,
      'LinkedIn': r.linkedin,
      'Research Areas': r.researchAreas.join(', '),
      'Citations (All)': r.citationsAll,
      'h-index (All)': r.hIndexAll,
      'i10-index (All)': r.i10IndexAll,
      'Citations (Since 2021)': r.citationsSince2021,
      'h-index (Since 2021)': r.hIndexSince2021,
      'i10-index (Since 2021)': r.i10IndexSince2021,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Researchers");
    XLSX.writeFile(wb, "ScholarData.xlsx");
  };

  const handleAnalyzeThemes = async () => {
    const areas = umbrellaInput.split(/,|\n/).map(a => a.trim()).filter(a => a);
    if (areas.length === 0) return;

    setIsAnalyzing(true);
    const result = await analyzeThemes(areas);
    setThemes(result);
    setIsAnalyzing(false);
  };

  const clearResearchers = () => {
    if (confirm('Tüm listeyi temizlemek istediğinize emin misiniz?')) {
      setResearchers([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <LayoutDashboard className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Scholar<span className="text-blue-600">Insight</span>
            </h1>
          </div>
          
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('search')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'search' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Search className="w-4 h-4" />
              Araştırmacı Bul
            </button>
            <button
              onClick={() => setActiveTab('umbrella')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'umbrella' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Lightbulb className="w-4 h-4" />
              Tema Umbrella
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'search' ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Input Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Araştırmacı Listesi Ekle
                  </h2>
                  <span className="text-xs text-slate-400">
                    Format: Ad Soyad [Tab/Virgül] Ünvan [Tab/Virgül] Üniversite [Tab/Virgül] LinkedIn
                  </span>
                </div>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="Örn: John Doe, Professor, Stanford University, linkedin.com/in/johndoe"
                  className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm"
                />
                <div className="flex justify-end mt-4 gap-3">
                  <button
                    onClick={clearResearchers}
                    disabled={researchers.length === 0}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Listeyi Temizle
                  </button>
                  <button
                    onClick={handleBulkSearch}
                    disabled={isSearching || !bulkInput.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-200"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Araştırmayı Başlat
                  </button>
                </div>
              </div>

              {/* Results Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Sonuçlar ({researchers.length})</h2>
                  {researchers.length > 0 && (
                    <button
                      onClick={exportToExcel}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel Olarak İndir
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                        <th className="px-6 py-4 border-b border-slate-100">Scholar Link</th>
                        <th className="px-6 py-4 border-b border-slate-100">Araştırmacı</th>
                        <th className="px-6 py-4 border-b border-slate-100">Research Areas</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">Citations (All/2021)</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">h-index (All/2021)</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">i10-index (All/2021)</th>
                        <th className="px-6 py-4 border-b border-slate-100">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {researchers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                            Henüz veri yok. Yukarıdan araştırmacı ekleyerek başlayın.
                          </td>
                        </tr>
                      ) : (
                        researchers.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              {r.scholarUrl ? (
                                <a 
                                  href={r.scholarUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center w-10 h-10"
                                  title="Google Scholar Profilini Aç"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300">
                                  <ExternalLink className="w-5 h-5" />
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{r.name}</span>
                                <span className="text-xs text-slate-500">{r.title}</span>
                                <span className="text-xs text-slate-400 italic">{r.university}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {r.researchAreas?.slice(0, 3).map((area, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-medium">
                                    {area}
                                  </span>
                                ))}
                                {(r.researchAreas?.length || 0) > 3 && (
                                  <span className="text-[10px] text-slate-400">+{r.researchAreas.length - 3}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">{r.citationsAll}</span>
                                <span className="text-[10px] text-slate-400">Since 2021: {r.citationsSince2021}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">{r.hIndexAll}</span>
                                <span className="text-[10px] text-slate-400">Since 2021: {r.hIndexSince2021}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">{r.i10IndexAll}</span>
                                <span className="text-[10px] text-slate-400">Since 2021: {r.i10IndexSince2021}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {r.status === 'searching' && (
                                <div className="flex items-center gap-2 text-blue-500 text-xs">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Aranıyor...
                                </div>
                              )}
                              {r.status === 'completed' && (
                                <span className="text-emerald-500 text-xs font-medium">Tamamlandı</span>
                              )}
                              {r.status === 'error' && (
                                <span className="text-red-500 text-xs font-medium">{r.error}</span>
                              )}
                              {r.status === 'pending' && (
                                <span className="text-slate-300 text-xs">Bekliyor</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="umbrella"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left Column: Input */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Tema Analizi
                  </h2>
                  <p className="text-sm text-slate-500 mb-4">
                    Araştırma alanlarını girin (virgül veya yeni satır ile ayırın), AI bunları etkinlik temalarına dönüştürsün.
                  </p>
                  <textarea
                    value={umbrellaInput}
                    onChange={(e) => setUmbrellaInput(e.target.value)}
                    placeholder="Örn: Machine Learning, AI Ethics, Robotics, NLP, Computer Vision..."
                    className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none text-sm mb-4"
                  />
                  <button
                    onClick={handleAnalyzeThemes}
                    disabled={isAnalyzing || !umbrellaInput.trim()}
                    className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-100"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PieChartIcon className="w-4 h-4" />}
                    Temaları Oluştur
                  </button>
                  
                  {researchers.length > 0 && (
                    <button
                      onClick={() => {
                        const allAreas = researchers.flatMap(r => r.researchAreas).join(', ');
                        setUmbrellaInput(allAreas);
                      }}
                      className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 border-dashed"
                    >
                      Araştırmacı Listesinden Veri Çek
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Visualization & Details */}
              <div className="lg:col-span-2 space-y-6">
                {themes.length > 0 ? (
                  <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-md font-semibold mb-6">Tema Dağılımı</h3>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={themes}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="theme" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              cursor={{ fill: '#f8fafc' }}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                              {themes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {themes.map((theme, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:border-blue-200 transition-all group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{theme.theme}</h4>
                            <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
                              Skor: {theme.count}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{theme.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {theme.relatedAreas?.map((area, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full text-[9px]">
                                {area}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                      <PieChartIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-600">Henüz Analiz Yapılmadı</h3>
                    <p className="text-sm text-slate-400 max-w-xs">
                      Soldaki alana araştırma alanlarını girerek temaları ve görselleştirmeyi oluşturun.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-400 text-xs border-t border-slate-200 mt-12">
        &copy; 2026 ScholarInsight - Akademik Veri ve Etkinlik Planlama Aracı
      </footer>
    </div>
  );
}
