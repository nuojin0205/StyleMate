import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Plus, Search, Filter, Loader2, X, Check, Trash2, Shirt } from 'lucide-react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { analyzeClothingImage } from '../services/geminiService';

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories'];

export default function Wardrobe() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const q = query(collection(db, 'users', user.uid, 'clothes'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/clothes`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const cropImage = (base64Str: string, box: [number, number, number, number]): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const [ymin, xmin, ymax, xmax] = box;
        
        // Gemini coordinates are 0-1000
        const x = (xmin / 1000) * img.width;
        const y = (ymin / 1000) * img.height;
        const width = ((xmax - xmin) / 1000) * img.width;
        const height = ((ymax - ymin) / 1000) * img.height;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, x, y, width, height, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const originalBase64 = reader.result as string;
        console.log("Compressing image...");
        const compressedBase64 = await compressImage(originalBase64);
        const base64Data = compressedBase64.split(',')[1];

        console.log("Analyzing image and detecting object...");
        const info = await analyzeClothingImage(base64Data);
        console.log("Analysis complete:", info);

        let finalImageUrl = compressedBase64;
        if (info.detectedObject?.box_2d) {
          console.log("Applying smart crop...");
          finalImageUrl = await cropImage(compressedBase64, info.detectedObject.box_2d);
        }

        const newItem = {
          ...info,
          userId: user.uid,
          imageUrl: finalImageUrl,
          createdAt: serverTimestamp(),
        };
        
        const path = `users/${user.uid}/clothes`;
        console.log("Saving to Firestore...");
        await addDoc(collection(db, path), newItem);
        console.log("Saved successfully");
        setShowUploadModal(false);
      } catch (err: any) {
        console.error("Upload process error:", err);
        let errorMsg = "Failed to process image. Please try again.";
        if (err.message?.includes("exceeds the maximum allowed size")) {
          errorMsg = "Image too large for database even after compression. Try a smaller file.";
        } else if (err.message?.includes("Gemini")) {
          errorMsg = "AI failed to analyze the image. Please try a clearer photo.";
        }
        alert(errorMsg);
      } finally {
         setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const [selectedItem, setSelectedItem] = useState<any>(null);

  const deleteItem = async (id: string) => {
    if (!user) return;
    
    console.log("Initiating delete for item:", id);
    // Optimistic update
    const previousItems = [...items];
    setItems(prev => prev.filter(i => i.id !== id));
    
    try {
      const itemRef = doc(db, 'users', user.uid, 'clothes', id);
      await deleteDoc(itemRef);
      console.log("Item deleted from Firestore:", id);
      if (selectedItem?.id === id) setSelectedItem(null);
      setDeletingId(null);
    } catch (err) {
      console.error("Delete failed, rolling back:", err);
      setItems(previousItems);
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/clothes/${id}`);
      setDeletingId(null);
      alert("Failed to remove item. Please check your connection.");
    }
  };

  const filteredItems = activeCategory === 'All' 
    ? items 
    : items.filter(i => i.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-8">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="serif text-2xl font-light">Remove Item?</h3>
                <p className="text-sm text-ink/60">This action cannot be undone. Are you sure you want to remove this piece from your wardrobe?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-sand-100 font-bold text-[10px] uppercase tracking-widest hover:bg-sand-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteItem(deletingId)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-red-600 transition-shadow shadow-lg shadow-red-500/20"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-ink/60 backdrop-blur-md"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
              onClick={e => e.stopPropagation()}
            >
              <div className="md:w-1/2 aspect-[4/5] md:aspect-auto">
                <img src={selectedItem.imageUrl} alt={selectedItem.category} className="w-full h-full object-cover" />
              </div>
              <div className="p-8 md:w-1/2 space-y-6 overflow-y-auto max-h-[60vh] md:max-h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs uppercase tracking-widest font-bold text-accent mb-1">{selectedItem.category}</p>
                    <h3 className="serif text-3xl font-light capitalize">{selectedItem.color} {selectedItem.material}</h3>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-sand-100 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-sand-100/50 rounded-2xl space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">Thickness</p>
                    <p className="text-sm font-medium capitalize">{selectedItem.thickness}</p>
                  </div>
                  <div className="p-4 bg-sand-100/50 rounded-2xl space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">Seasons</p>
                    <p className="text-sm font-medium capitalize">{selectedItem.seasons?.join(', ')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">Matching Styles</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.styles?.map((s: string) => (
                      <span key={s} className="px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest rounded-full">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-ink/5">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(selectedItem.id);
                    }}
                    className="flex items-center space-x-2 text-red-500 hover:text-red-600 transition-colors text-[10px] uppercase tracking-widest font-bold"
                   >
                     <Trash2 size={14} />
                     <span>Remove from Wardrobe</span>
                   </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-3xl overflow-hidden border border-ink/5 group shadow-sm hover:shadow-xl hover:shadow-accent/5 transition-all duration-500 cursor-pointer"
            >
              <div className="aspect-[4/5] relative overflow-hidden bg-sand-100">
                <img src={item.imageUrl} alt={item.category} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(item.id);
                  }}
                  className="absolute top-2 right-2 p-2.5 bg-white/90 backdrop-blur-md rounded-full text-red-500 shadow-md border border-red-50 z-10 transition-all hover:scale-110"
                  aria-label="Delete item"
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
