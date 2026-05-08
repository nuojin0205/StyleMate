import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudSun, ArrowRight, RefreshCw, Bookmark, Share2, Compass, ChevronRight, Shirt, Settings, Ruler, ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../App';
import { getOutfitRecommendations, OutfitRecommendation, getDailyInspiration, StyleInspiration } from '../services/geminiService';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, query, limit, doc, getDoc, updateDoc } from 'firebase/firestore';

const STYLES = ['Gentle (温柔)', 'Casual (休闲)', 'Formal (正式)', 'Sporty (运动)', 'High-End (气质)', 'Outdoor (户外)'];
const SCENES = ['Class/Work (上课/通勤)', 'Date (约会)', 'Dining (聚餐)', 'Gym (健身)', 'Travel (旅行)'];

export default function Home() {
  const { user } = useAuth();
  const [style, setStyle] = useState(STYLES[0]);
  const [scene, setScene] = useState(SCENES[0]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [wardrobe, setWardrobe] = useState<any[]>([]);
  const [weather] = useState({ temp: 18, condition: 'Cloudy', location: 'Shanghai' });
  const [measurements, setMeasurements] = useState<any>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [generatingDetail, setGeneratingDetail] = useState<number | null>(null);
  const [inspirations, setInspirations] = useState<StyleInspiration[]>([]);
  const [loadingInspo, setLoadingInspo] = useState(false);

  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWardrobe();
    fetchMeasurements();
  }, [user]);

  useEffect(() => {
    fetchInspirations();
  }, [style, weather]);

  const fetchMeasurements = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setMeasurements(userDoc.data().measurements || null);
      }
    } catch (err) {
      console.error("Error fetching measurements:", err);
    }
  };

  const saveMeasurements = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      height: Number(formData.get('height')),
      weight: Number(formData.get('weight')),
      bust: Number(formData.get('bust')),
      waist: Number(formData.get('waist')),
      hips: Number(formData.get('hips')),
    };
    try {
      await updateDoc(doc(db, 'users', user.uid), { measurements: data });
      setMeasurements(data);
      setShowMeasurements(false);
    } catch (err) {
      console.error("Error saving measurements:", err);
    }
  };

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

  const fetchInspirations = async () => {
    setLoadingInspo(true);
    setError(null);
    try {
      const ins = await getDailyInspiration(weather, style);
      setInspirations(ins);
    } catch (err) {
      console.error("Error fetching inspirations:", err);
      setError("Unable to connect to AI service. Please check your API configuration on Vercel.");
    } finally {
      setLoadingInspo(false);
    }
  };

  const generateOutfit = async () => {
    setLoading(true);
    setRecommendations([]);
    setActiveIndex(0);
    setGeneratedImages({});
    setError(null);
    try {
      const recs = await getOutfitRecommendations(wardrobe, weather, style, scene, measurements);
      if (recs && Array.isArray(recs)) {
        setRecommendations(recs);
      }
    } catch (err: any) {
      console.error("Error generating outfit:", err);
      setError(err.message || "Outfit generation failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const generateOutfitImage = async (index: number) => {
    if (generatingDetail === index) return;
    setGeneratingDetail(index);
    try {
      // In a real app, this would call a backend for high-quality DALL-E/Midjourney generation
      // For this demo, we use a sophisticated simulated "Dress-up" visualization
      await new Promise(resolve => setTimeout(resolve, 2000));
      setGeneratedImages(prev => ({ ...prev, [index]: 'VISUALIZED' }));
    } catch (err) {
      console.error("Error generating illustration:", err);
    } finally {
      setGeneratingDetail(null);
    }
  };

  const getPositionForCategory = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('top') || c.includes('shirt') || c.includes('blouse') || c.includes('knit')) return { top: '25%', height: '35%', z: 10 };
    if (c.includes('bottom') || c.includes('pants') || c.includes('jeans') || c.includes('skirt')) return { top: '50%', height: '45%', z: 5 };
    if (c.includes('outer') || c.includes('coat') || c.includes('jacket')) return { top: '20%', height: '40%', z: 20 };
    if (c.includes('shoe') || c.includes('boots')) return { top: '85%', height: '12%', z: 15 };
    return { top: '40%', height: '20%', z: 0 };
  };

  return (
    <div className="max-w-4xl mx-auto px-6 space-y-12 pb-24">
      {/* Header */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-medium">Daily Recommendation</p>
            <h2 className="serif text-4xl md:text-5xl font-light leading-tight">Good Morning,<br/>{user?.displayName?.split(' ')[0]}</h2>
          </div>

          <div className="flex flex-col space-y-3">
            <button 
              onClick={() => setShowMeasurements(!showMeasurements)}
              className="flex items-center space-x-3 glass px-5 py-2.5 rounded-2xl hover:bg-white transition-all text-ink/60 hover:text-accent"
            >
              <Ruler size={18} />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                {measurements ? `${measurements.height}cm / ${measurements.weight}kg` : 'Add Measurements'}
              </span>
            </button>

            <div className="flex items-center space-x-4 glass px-5 py-3 rounded-2xl">
              <CloudSun className="text-accent" size={24} />
              <div className="text-right">
                <p className="text-xl font-medium tracking-tighter leading-none">{weather.temp}°C</p>
                <p className="text-[10px] uppercase tracking-widest text-ink/40 font-semibold">{weather.condition} in {weather.location}</p>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showMeasurements && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={saveMeasurements}
              className="glass rounded-[32px] p-8 space-y-6 overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Height (cm)', name: 'height', default: 165 },
                  { label: 'Weight (kg)', name: 'weight', default: 50 },
                  { label: 'Bust (cm)', name: 'bust', default: 85 },
                  { label: 'Waist (cm)', name: 'waist', default: 65 },
                  { label: 'Hips (cm)', name: 'hips', default: 90 }
                ].map(field => (
                  <div key={field.name} className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-ink/40">{field.label}</label>
                    <input 
                      type="number" 
                      name={field.name}
                      defaultValue={measurements?.[field.name] || field.default}
                      className="w-full bg-sand-50 border border-ink/5 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-ink text-white text-[10px] uppercase tracking-[0.2em] font-bold px-8 py-3 rounded-xl hover:bg-ink/90 transition-colors">
                  Save Dimensions
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
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

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 border border-red-100 p-4 rounded-2xl"
          >
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">{error}</p>
          </motion.div>
        )}

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
      {recommendations.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="serif text-2xl font-light">Today's Picks</h3>
              <span className="text-[11px] text-ink/40">({activeIndex + 1}/{recommendations.length})</span>
            </div>
            <div className="flex space-x-2">
              <button 
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                className="p-2 glass rounded-full disabled:opacity-20 hover:text-accent transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                disabled={activeIndex === recommendations.length - 1}
                onClick={() => setActiveIndex(i => Math.min(recommendations.length - 1, i + 1))}
                className="p-2 glass rounded-full disabled:opacity-20 hover:text-accent transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="glass rounded-[40px] overflow-hidden shadow-2xl border border-white/50">
            <div className="p-8 md:p-12 space-y-12">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="bg-accent/10 text-accent text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full border border-accent/20">{recommendations[activeIndex].style}</span>
                    <span className="text-[11px] text-ink/40 uppercase tracking-widest font-bold">{scene.split(' ')[0]}</span>
                  </div>
                  <h3 className="serif text-4xl font-light">{recommendations[activeIndex].items[0]?.name} & More</h3>
                </div>
                <div className="flex space-x-3">
                  <button className="w-12 h-12 flex items-center justify-center glass rounded-full hover:bg-white text-ink/40 hover:text-accent transition-all"><Bookmark size={20} /></button>
                  <button className="w-12 h-12 flex items-center justify-center glass rounded-full hover:bg-white text-ink/40 hover:text-accent transition-all"><Share2 size={20} /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <div className="space-y-4">
                    {recommendations[activeIndex].items.map((item, idx) => {
                      const match = item.id ? wardrobe.find(w => w.id === item.id) : null;

                      return (
                        <div key={idx} className="flex items-center space-x-4 group p-3 rounded-[24px] hover:bg-white transition-all duration-500 border border-transparent hover:border-ink/5">
                          {match ? (
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-ink/5 shadow-sm group-hover:scale-105 transition-transform">
                              <img src={match.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-sand-100 border border-ink/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Shirt size={18} className="text-ink/20" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-ink tracking-tight line-clamp-1">{item.name}</p>
                            <p className="text-[9px] text-ink/40 uppercase tracking-widest font-bold">{match ? 'In Wardrobe' : 'Style Suggestion'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <blockquote className="relative p-6 bg-sand-50/50 rounded-2xl italic border-l-2 border-accent/20">
                    <p className="text-sm text-ink/70 leading-relaxed font-light">
                      "{recommendations[activeIndex].reason}"
                    </p>
                  </blockquote>

                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-accent/60 flex items-center">
                      <Compass size={12} className="mr-2" /> Complete your style
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['Shop via AI', 'Save Look'].map(label => (
                        <button key={label} className="w-full py-3 glass rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-white transition-all">
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative aspect-[4/5] glass rounded-[32px] overflow-hidden flex items-center justify-center p-8 bg-white/20 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-50"></div>
                  
                  {/* Mannequin Base Layer */}
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <svg viewBox="0 0 200 500" className="w-[80%] h-full text-accent/10 fill-current drop-shadow-2xl">
                      {(() => {
                         const h = measurements?.height || 165;
                         const w = measurements?.waist || 65;
                         const b = measurements?.bust || 85;
                         const hps = measurements?.hips || 90;
                         const wScale = w / 65;
                         const bScale = b / 85;
                         const hpsScale = hps / 90;

                         return (
                           <motion.g
                            initial={false}
                            transition={{ duration: 0.5 }}
                           >
                             {/* Headless Body Silhouette */}
                             <motion.path 
                               animate={{
                                 d: `M 100 80 
                                     Q ${100 + 42 * bScale} 120, ${100 + 38 * wScale} 180 
                                     Q ${100 + 48 * hpsScale} 260, ${100 + 35} 380
                                     L ${100 - 35} 380
                                     Q ${100 - 48 * hpsScale} 260, ${100 - 38 * wScale} 180
                                     Q ${100 - 42 * bScale} 120, 100 80`
                               }}
                               fill="currentColor"
                               opacity="0.15"
                             />
                             <path d="M 65 380 L 60 480 M 135 380 L 140 480" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" fill="none" />
                             <path d="M 60 120 L 35 250 M 140 120 L 165 250" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" fill="none" />
                           </motion.g>
                         );
                      })()}
                    </svg>

                    {/* Dressed Items Layer */}
                    <AnimatePresence>
                      {generatedImages[activeIndex] === 'VISUALIZED' && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none"
                        >
                          <div className="relative w-full h-full max-w-[280px]">
                            {recommendations[activeIndex].items.map((recItem, idx) => {
                              const item = recItem.id ? wardrobe.find(w => w.id === recItem.id) : null;
                              if (!item) return null;
                              
                              const pos = getPositionForCategory(recItem.category || item.category);
                              
                              return (
                                <motion.div
                                  key={`${item.id}-${idx}`}
                                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  transition={{ delay: idx * 0.2, type: 'spring', damping: 15 }}
                                  style={{ 
                                    position: 'absolute',
                                    top: pos.top,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    height: pos.height,
                                    width: '100%',
                                    zIndex: pos.z
                                  }}
                                  className="flex items-center justify-center"
                                >
                                  <div className="relative w-full h-full">
                                    <img 
                                      src={item.imageUrl} 
                                      alt={item.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-contain mix-blend-multiply opacity-95 drop-shadow-2xl filter contrast-125 saturate-110"
                                    />
                                    {/* Stylized UI annotation */}
                                    <motion.div 
                                      initial={{ x: 20, opacity: 0 }}
                                      animate={{ x: 0, opacity: 1 }}
                                      transition={{ delay: idx * 0.2 + 0.5 }}
                                      className="absolute -right-8 top-1/2 -translate-y-1/2 flex items-center space-x-2"
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />
                                      <span className="text-[7px] font-bold uppercase tracking-widest bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-ink whitespace-nowrap border border-ink/5">
                                        {item.name}
                                      </span>
                                    </motion.div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Virtual Fit Badge */}
                    <div className="absolute top-6 flex flex-col items-center">
                       <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-accent/60">Virtual Fit</p>
                    </div>

                    {/* Item Bubbles (Summary) */}
                    <div className="absolute bottom-24 flex -space-x-3">
                      {recommendations[activeIndex].items.map(recItem => {
                        const item = recItem.id ? wardrobe.find(w => w.id === recItem.id) : null;
                        return item ? (
                          <div key={item.id} className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg rotate-3 odd:-rotate-3 translate-y-2 group-hover:translate-y-0 transition-transform">
                            <img src={item.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          </div>
                        ) : null;
                      })}
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 px-8">
                      <button 
                        onClick={() => generateOutfitImage(activeIndex)}
                        className="w-full py-4 bg-ink text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold shadow-2xl hover:bg-ink/90 transition-all flex items-center justify-center space-x-3 z-30"
                      >
                        {generatingDetail === activeIndex ? (
                          <>
                            <Loader2 className="animate-spin" size={14} />
                            <span>Visualizing...</span>
                          </>
                        ) : (
                          <>
                            <span>AI Illustration</span>
                            <Compass size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
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
            <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">Curated for Taylor Swift, Jennie, Lisa & You</p>
          </div>
          <button className="text-accent text-[10px] uppercase tracking-widest font-bold flex items-center group">
            Discover Trends <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingInspo ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-sand-100 animate-pulse rounded-[32px]"></div>
            ))
          ) : inspirations.map((inspo, i) => {
            const fashionIds = [
              '1539109132314-34a9c66d1896', // Modern Editorial
              '1483985988355-763728e1935b', // Luxury Shopping
              '1490481651871-ab68de25d43d', // Street Style
              '1485230895905-ec40ba36bc10'  // Minimalist Fashion
            ];
            const imageId = fashionIds[i % fashionIds.length];

            return (
              <motion.a
                key={i}
                href={inspo.url.startsWith('http') ? inspo.url : `https://${inspo.url}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative aspect-[3/4] rounded-[32px] overflow-hidden bg-sand-200 border border-ink/5 block cursor-pointer"
              >
                <img 
                  src={`https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&q=80&w=400&h=533`} 
                  alt={inspo.title} 
                  className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 grayscale-50 group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity"></div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                  <div className="space-y-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-accent">{inspo.source}</p>
                        <h4 className="serif text-xl leading-tight">{inspo.title}</h4>
                      </div>
                      <span className="text-[8px] bg-white/10 px-2 py-1 rounded-md font-bold">{inspo.temp}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {inspo.styles.slice(0, 2).map(s => (
                        <span key={s} className="text-[8px] border border-white/30 px-2 py-0.5 rounded-full uppercase tracking-widest">{s}</span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <p className="text-[9px] text-white/50 mb-1 uppercase tracking-widest font-bold">Outfit Breakdown</p>
                      <p className="text-[10px] line-clamp-2 text-white/90 leading-relaxed font-light">{inspo.items.join(' · ')}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase tracking-widest">Icon</span>
                        <span className="text-[10px] italic text-accent font-medium">{inspo.celebrity}</span>
                      </div>
                      <div className="bg-accent/20 p-2 rounded-full transform group-hover:rotate-12 transition-transform">
                         <Compass size={12} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">
                      {inspo.scene}
                    </div>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
