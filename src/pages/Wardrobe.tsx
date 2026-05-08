import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Plus, Search, Filter, Loader2, X, Check, Trash2, Shirt } from 'lucide-react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { analyzeClothingImage } from '../services/geminiService';

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories'];

export default function Wardrobe() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'clothes'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/clothes`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const info = await analyzeClothingImage(base64);
        const newItem = {
          ...info,
          userId: user.uid,
          imageUrl: reader.result, // In real app, upload to storage first
          createdAt: serverTimestamp(),
        };
        const path = `users/${user.uid}/clothes`;
        try {
          await addDoc(collection(db, path), newItem);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
        setShowUploadModal(false);
        fetchItems();
      } catch (err) {
        console.error(err);
      } finally {
         setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'clothes', id));
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/clothes/${id}`);
    }
  };

  const filteredItems = activeCategory === 'All' 
    ? items 
    : items.filter(i => i.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-medium">Your Wardrobe</p>
          <h2 className="serif text-4xl md:text-5xl font-light leading-tight">Collection</h2>
        </div>
        
        <button 
          onClick={() => setShowUploadModal(true)}
          className="bg-ink text-white px-6 py-3 rounded-2xl flex items-center space-x-3 hover:bg-ink/90 transition-all shadow-lg shadow-ink/10 group font-medium text-xs tracking-widest uppercase"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Add New Piece</span>
        </button>
      </header>

      {/* Categories Filter */}
      <div className="flex overflow-x-auto no-scrollbar py-2 space-x-3">
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`pill-nav shrink-0 text-[10px] uppercase tracking-widest font-bold ${activeCategory === cat ? 'pill-nav-active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {filteredItems.map(item => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl overflow-hidden border border-ink/5 group shadow-sm hover:shadow-xl hover:shadow-accent/5 transition-all duration-500"
            >
              <div className="aspect-[4/5] relative overflow-hidden bg-sand-100">
                <img src={item.imageUrl} alt={item.category} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
                >
                  <Trash2 size={14} />
                </button>
                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                   {item.styles?.slice(0, 2).map((s: string) => (
                     <span key={s} className="bg-white/80 backdrop-blur-sm text-[8px] uppercase tracking-tighter px-1.5 py-0.5 rounded-sm font-bold text-ink/60">{s}</span>
                   ))}
                </div>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-accent">{item.category}</p>
                <h4 className="text-xs font-medium text-ink truncate capitalize">{item.color} {item.material}</h4>
              </div>
            </motion.div>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center text-ink/20 space-y-4">
               <Shirt size={48} strokeWidth={1} />
               <p className="text-sm italic">Nothing found in {activeCategory.toLowerCase()}...</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="serif text-3xl font-light">Add Piece</h3>
                  <button onClick={() => setShowUploadModal(false)} className="hover:bg-sand-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-3xl border-2 border-dashed border-ink/10 flex flex-col items-center justify-center space-y-4 hover:border-accent hover:bg-accent/5 transition-all cursor-pointer group"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  {isUploading ? (
                    <div className="text-center space-y-4">
                       <Loader2 className="animate-spin text-accent w-12 h-12 mx-auto" />
                       <p className="text-sm font-medium animate-pulse text-accent">AI Stylist is analyzing...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-sand-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <Camera className="text-ink/40 group-hover:text-accent transition-colors" size={32} />
                      </div>
                      <div className="text-center">
                         <p className="text-sm font-medium">Capture or Upload Photo</p>
                         <p className="text-[10px] uppercase tracking-widest text-ink/40 mt-1">Our AI will automatically tag it</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-ink/40 leading-relaxed italic text-center px-8">
                  "Take a clear photo on a neutral background for better recognition accuracy."
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
