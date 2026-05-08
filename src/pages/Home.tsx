import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CloudSun, ArrowRight, RefreshCw, Bookmark, Share2, Compass, ChevronRight } from 'lucide-react';
import { useAuth } from '../App';
import { getOutfitRecommendations, OutfitRecommendation } from '../services/geminiService';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

const STYLES = ['Gentle (温柔)', 'Casual (休闲)', 'Formal (正式)', 'Sporty (运动)', 'High-End (气质)', 'Outdoor (户外)'];
const SCENES = ['Class/Work (上课/通勤)', 'Date (约会)', 'Dining (聚餐)', 'Gym (健身)', 'Travel (旅行)'];

export default function Home() {
  const { user } = useAuth();
  const [style, setStyle] = useState(STYLES[0]);
  const [scene, setScene] = useState(SCENES[0]);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<OutfitRecommendation | null>(null);
  const [wardrobe, setWardrobe] = useState<any[]>([]);
  const [weather] = useState({ temp: 18, condition: 'Cloudy', location: 'Shanghai' });

  useEffect(() => {
    fetchWardrobe();
  }, [user]);

  const fetchWardrobe = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'clothes'), limit(50));
      const snap = await getDocs(q);
      setWardrobe(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/clothes`);
    }
  };

  const generateOutfit = async () => {
    setLoading(true);
    try {
      const rec = await getOutfitRecommendations(wardrobe, weather, style, scene);
      setRecommendation(rec);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 space-y-12">
      {/* Header & Weather */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-medium">Daily Recommendation</p>
          <h2 className="serif text-4xl md:text-5xl font-light leading-tight">Good Morning,<br/>{user?.displayName?.split(' ')[0]}</h2>
        </div>
        
        <div className="flex items-center space-x-4 glass px-5 py-3 rounded-2xl">
          <CloudSun className="text-accent" size={24} />
          <div className="text-right">
            <p className="text-xl font-medium tracking-tighter leading-none">{weather.temp}°C</p>
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold">{weather.condition} in {weather.location}</p>
          </div>
        </div>
      </section>

      {/* Selectors */}
      <section className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-widest font-bold">Select Style</h3>
            <span className="text-[10px] text-ink/40 italic">What's your mood today?</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`text-[11px] px-4 py-1.5 rounded-full border transition-all duration-300 tracking-wider font-medium ${style === s ? 'bg-ink text-white border-ink' : 'border-ink/10 text-ink hover:border-ink/40'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest font-bold">Scene</h3>
          <div className="flex flex-wrap gap-2">
            {SCENES.map(s => (
              <button
                key={s}
                onClick={() => setScene(s)}
                className={`text-[11px] px-4 py-1.5 rounded-full border transition-all duration-300 tracking-wider font-medium ${scene === s ? 'bg-ink text-white border-ink' : 'border-ink/10 text-ink hover:border-ink/40'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={generateOutfit}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          {loading ? <RefreshCw className="animate-spin" size={18} /> : (
            <>
              <span className="font-medium tracking-widest text-sm uppercase">Generate Outfit</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </section>

      {/* Result Card */}
      {recommendation && (
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl overflow-hidden shadow-xl shadow-accent/5"
        >
          <div className="p-8 space-y-8">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <span className="bg-accent/10 text-accent text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full">{recommendation.style}</span>
                <h3 className="serif text-3xl font-light">Today's Selection</h3>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 hover:bg-sand-100 rounded-full transition-colors"><Bookmark size={20} className="text-ink/60" /></button>
                <button className="p-2 hover:bg-sand-100 rounded-full transition-colors"><Share2 size={20} className="text-ink/60" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="space-y-4">
                  {recommendation.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-3 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent group-hover:scale-150 transition-transform"></div>
                      <span className="text-sm font-light tracking-wide text-ink/80">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="editorial-line !my-6"></div>
                <p className="text-sm italic text-ink/60 leading-relaxed">
                  "{recommendation.reason}"
                </p>
                <div className="editorial-line !my-6"></div>
                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-accent/60">Complete the Look</h4>
                  <div className="flex items-center justify-between p-3 bg-sand-100 rounded-xl border border-ink/5 group cursor-pointer hover:bg-white transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-sand-200 rounded-lg flex items-center justify-center">
                        <Compass className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-ink">Shop Similar Items</p>
                        <p className="text-[9px] text-ink/40 uppercase tracking-tighter">Amazon • TaoBao • JD</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-ink/20 group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/5] bg-sand-200 rounded-2xl overflow-hidden flex items-center justify-center border border-ink/5">
                {/* Visual Placeholder for Outfit Rendering */}
                <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 to-transparent"></div>
                <div className="text-center p-8 space-y-4">
                  <Compass className="w-12 h-12 text-accent/40 mx-auto animate-pulse" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 font-medium leading-relaxed">
                    AI Visual Generation<br/>Coming Soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Quick Inspiration Preview */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <h3 className="serif text-2xl font-light">Daily Inspiration</h3>
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">Curated from Vogue & ELLE</p>
          </div>
          <button className="text-accent text-[10px] uppercase tracking-widest font-bold flex items-center group">
            See More <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           {[1, 2, 3, 4].map(i => (
             <div key={i} className="aspect-[3/4] bg-sand-200 rounded-2xl overflow-hidden relative group cursor-pointer">
               <img 
                 src={`https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400&h=533`} 
                 alt="Inspo" 
                 className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
               />
               <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-white text-[10px] uppercase tracking-widest font-medium">Magazine View</p>
               </div>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
}
