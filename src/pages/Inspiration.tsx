import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Bookmark, ExternalLink, Hash, Star, LayoutGrid, List, Shirt } from 'lucide-react';

const INSPO_DATA = [
  {
    id: '1',
    source: 'Vogue China',
    imageUrl: 'https://images.unsplash.com/photo-1539109132314-34a9c6553041?auto=format&fit=crop&q=80&w=800',
    title: 'Spring Layering Essentials',
    styles: ['Minimalist', 'Chic'],
    author: 'Editorial',
    description: 'The art of neutral tones and textures for early May.'
  },
  {
    id: '2',
    source: 'Celebrity Style',
    imageUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=80&w=800',
    title: 'Off-Duty Model Look',
    styles: ['Streetwear', 'Casual'],
    author: 'Kendall Jenner Inspiration',
    description: 'Baggy denim meets tailored blazers.'
  },
  {
    id: '3',
    source: 'ELLE',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800',
    title: 'Oceanic Blue Themes',
    styles: ['Elegant', 'Office'],
    author: 'Style Desk',
    description: 'How to wear cerulean this season with confident silhouettes.'
  },
  {
    id: '4',
    source: 'Street Style',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=800',
    title: 'Pops of Red',
    styles: ['Bold', 'Trendy'],
    author: 'Paris Fashion Week',
    description: 'Micro-trends focusing on cherry red accessories.'
  },
  {
    id: '5',
    source: 'BAZAAR',
    imageUrl: 'https://images.unsplash.com/photo-1550639525-c97d455acf70?auto=format&fit=crop&q=80&w=800',
    title: 'The Linen Renaissance',
    styles: ['Quiet Luxury', 'Summer'],
    author: 'Luxe Dept',
    description: 'Breezy linen sets for the modern traveler.'
  },
  {
    id: '6',
    source: 'Star Choice',
    imageUrl: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&q=80&w=800',
    title: 'Monochrome Magic',
    styles: ['Classic', 'Gala'],
    author: 'Zendaya Vibe',
    description: 'All-black ensembles with shimmering textures.'
  }
];

export default function Inspiration() {
  const [filter, setFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-12">
      {/* Editorial Header */}
      <header className="relative py-12 border-b border-ink/5 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-[0.03] pointer-events-none">
          <h1 className="serif text-[240px] leading-none uppercase select-none">Style</h1>
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <span className="text-[10px] uppercase tracking-[0.4em] text-accent font-bold">The Lookbook</span>
          <h2 className="serif text-5xl md:text-7xl font-light tracking-tight">Curation of<br/>Inspiration</h2>
          <div className="max-w-md mx-auto h-[1px] bg-accent/20 my-4 w-24"></div>
          <p className="text-sm font-light italic text-ink/40 max-w-sm">
            "Fashion is not something that exists in dresses only. Fashion is in the sky, in the street." — Coco Chanel
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {['All', 'Magazines', 'Celebrities', 'Trend Reports', 'Runway'].map(cat => (
             <button 
               key={cat} 
               onClick={() => setFilter(cat)}
               className={`text-[10px] uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${filter === cat ? 'bg-ink text-white border-ink' : 'border-ink/10 hover:border-ink/30'}`}
             >
               {cat}
             </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input 
              type="text" 
              placeholder="Search inspiration..." 
              className="pl-10 pr-4 py-2 bg-sand-100 border-none rounded-full text-xs focus:ring-1 focus:ring-accent w-64 transition-all"
            />
          </div>
          <div className="flex border border-ink/10 rounded-full overflow-hidden">
             <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-ink text-white' : 'hover:bg-sand-100'}`}
             >
              <LayoutGrid size={16} />
             </button>
             <button 
              onClick={() => setViewMode('masonry')}
              className={`p-2 ${viewMode === 'masonry' ? 'bg-ink text-white' : 'hover:bg-sand-100'}`}
             >
              <List size={16} />
             </button>
          </div>
        </div>
      </div>

      {/* Inspiration List */}
      <div className={`grid gap-x-8 gap-y-16 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
         {INSPO_DATA.map((item, idx) => (
           <motion.div 
             key={item.id}
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: idx * 0.1 }}
             className="flex flex-col space-y-6 group"
           >
             <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-sand-200">
                {/* Fallback Placeholder */}
                {(imageErrors[item.id]) && (
                  <div className="absolute inset-0 bg-gradient-to-br from-sand-300 to-sand-400 flex items-center justify-center p-8">
                    <div className="text-center">
                      <Shirt size={48} className="text-ink/10 mx-auto mb-4" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/20">{item.source}</p>
                    </div>
                  </div>
                )}
                
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                  className={`w-full h-full object-cover transition-all duration-1000 ease-out ${imageErrors[item.id] ? 'opacity-0' : 'grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105'}`}
                />
                <div className="absolute top-6 right-6">
                  <button className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-ink">
                    <Bookmark size={18} />
                  </button>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                   <div className="flex flex-wrap gap-2">
                     {item.styles.map(s => (
                       <span key={s} className="px-2 py-1 bg-white/10 backdrop-blur-sm text-[8px] uppercase tracking-widest text-white border border-white/20 rounded-sm">#{s}</span>
                     ))}
                   </div>
                </div>
             </div>

             <div className="space-y-4 px-2">
               <div className="flex items-center justify-between">
                 <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent">{item.source}</span>
                 <span className="text-[10px] font-medium text-ink/30 uppercase tracking-widest">{item.author}</span>
               </div>
               <div className="space-y-2">
                 <h3 className="serif text-3xl font-light hover:text-accent transition-colors cursor-pointer">{item.title}</h3>
                 <p className="text-sm font-light text-ink/60 leading-relaxed max-w-sm">
                   {item.description}
                 </p>
               </div>
               <div className="pt-2 flex items-center space-x-4">
                 <button className="text-[10px] uppercase tracking-widest font-bold flex items-center group/btn text-ink transition-colors">
                   Read Editorial <ExternalLink size={12} className="ml-2 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5 transition-transform" />
                 </button>
               </div>
             </div>
           </motion.div>
         ))}
      </div>

      {/* Bottom CTA */}
      <footer className="py-24 text-center space-y-8 border-t border-ink/5">
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="serif text-4xl font-light italic">"Style is a way to say who you are <br/> without having to speak."</h3>
          <p className="text-xs uppercase tracking-[0.3em] text-accent font-bold">— Rachel Zoe</p>
        </div>
        <button className="pill-nav text-xs font-bold uppercase tracking-widest mx-auto px-12 py-4">
           Load More Insights
        </button>
      </footer>
    </div>
  );
}
