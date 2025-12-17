
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Settings, 
  Package, 
  Truck, 
  BarChart3, 
  Languages, 
  Search, 
  Plus, 
  RefreshCw, 
  Wand2, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  Globe,
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Edit3,
  Trash2,
  ExternalLink,
  Info,
  Sparkles,
  Save,
  Eye,
  MapPin,
  Clock,
  Calendar
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types & Constants ---

type Language = 'en' | 'fr' | 'he' | 'am';
type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPLIER' | 'CUSTOMER';
type View = 'STORE' | 'ADMIN' | 'PRODUCT_DETAIL' | 'CHECKOUT' | 'TRACKING';
type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'PENDING_AI';

interface TrackingEvent {
  date: string;
  location: string;
  status: string;
  description: string;
}

interface Shipment {
  trackingId: string;
  orderId: string;
  currentStatus: 'ORDERED' | 'PROCESSING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED';
  estimatedDelivery: string;
  carrier: string;
  history: TrackingEvent[];
}

interface Product {
  id: string;
  cjId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inventory: number;
  supplier: string;
  status: ProductStatus;
  translations: Record<Language, { name: string; description: string }>;
}

const LANGUAGES: Record<Language, { label: string; dir: 'ltr' | 'rtl' }> = {
  en: { label: 'English', dir: 'ltr' },
  fr: { label: 'Français', dir: 'ltr' },
  he: { label: 'עברית', dir: 'rtl' },
  am: { label: 'አማርኛ', dir: 'ltr' }
};

const MOCK_SHIPMENTS: Record<string, Shipment> = {
  'CJ12345678TR': {
    trackingId: 'CJ12345678TR',
    orderId: '#NF-8821',
    currentStatus: 'IN_TRANSIT',
    estimatedDelivery: 'Oct 24, 2023',
    carrier: 'CJ Packet Fast Line',
    history: [
      { date: 'Oct 18, 2023 14:22', location: 'Los Angeles, CA', status: 'In Transit', description: 'Arrived at local distribution center' },
      { date: 'Oct 16, 2023 09:15', location: 'San Francisco, CA', status: 'In Transit', description: 'Departed from sorting facility' },
      { date: 'Oct 14, 2023 21:00', location: 'Shanghai, CN', status: 'Shipped', description: 'International shipment processed' },
      { date: 'Oct 12, 2023 11:30', location: 'Yiwu, CN', status: 'Processing', description: 'Order picked and packed by supplier' },
      { date: 'Oct 11, 2023 18:45', location: 'Online', status: 'Ordered', description: 'Order payment confirmed' }
    ]
  },
  'CJ99887766DE': {
    trackingId: 'CJ99887766DE',
    orderId: '#NF-9012',
    currentStatus: 'DELIVERED',
    estimatedDelivery: 'Oct 15, 2023',
    carrier: 'DHL Global Eco',
    history: [
      { date: 'Oct 15, 2023 10:00', location: 'Seattle, WA', status: 'Delivered', description: 'Package delivered to porch' },
      { date: 'Oct 15, 2023 07:45', location: 'Seattle, WA', status: 'Out for Delivery', description: 'Package is with local courier for delivery' },
      { date: 'Oct 14, 2023 13:20', location: 'Kent, WA', status: 'In Transit', description: 'Arrived at destination sort facility' }
    ]
  }
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    cjId: 'CJ-9921',
    name: 'Ergonomic Wireless Mouse',
    description: 'High-precision optical sensor with silent clicking.',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=400&h=400&auto=format&fit=crop',
    category: 'Electronics',
    inventory: 120,
    supplier: 'TechDirect CJ',
    status: 'PUBLISHED',
    translations: {
      en: { name: 'Ergonomic Wireless Mouse', description: 'High-precision optical sensor with silent clicking.' },
      fr: { name: 'Souris Sans Fil Ergonomique', description: 'Capteur optique haute précision avec clic silencieux.' },
      he: { name: 'עכבר אלחוטי ארגונומי', description: 'חיישן אופטי בעל דיוק גבוה עם לחיצה שקטה.' },
      am: { name: 'ኤርጎኖሚክ ገመድ አልባ አይጥ', description: 'ከፍተኛ ትክክለኛነት ያለው የኦፕቲካል ዳሳሽ በጸጥታ ጠቅታ።' }
    }
  },
  {
    id: '2',
    cjId: 'CJ-4412',
    name: 'Smart Water Bottle',
    description: 'Tracks your daily hydration and glows when it\'s time to drink.',
    price: 45.00,
    image: 'https://images.unsplash.com/photo-1602143393494-149b14d2320b?q=80&w=400&h=400&auto=format&fit=crop',
    category: 'Health',
    inventory: 85,
    supplier: 'HydraSource',
    status: 'DRAFT',
    translations: {
      en: { name: 'Smart Water Bottle', description: 'Tracks your daily hydration.' },
      fr: { name: 'Gourde Intelligente', description: 'Suit votre hydratation quotidienne.' },
      he: { name: 'בקבוק מים חכם', description: 'עוקב אחר השתייה היומית שלך.' },
      am: { name: 'ብልጥ የውሃ ጠርሙስ', description: 'የእለት ተእለት ውሃ መጠጣትዎን ይከታተላል።' }
    }
  },
  {
    id: '3',
    cjId: 'CJ-1102',
    name: 'Portable Coffee Maker',
    description: 'Compact espresso machine for travel and camping.',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?q=80&w=400&h=400&auto=format&fit=crop',
    category: 'Kitchen',
    inventory: 40,
    supplier: 'BrewGo',
    status: 'PUBLISHED',
    translations: {
      en: { name: 'Portable Coffee Maker', description: 'Compact espresso machine.' },
      fr: { name: 'Cafetière Portable', description: 'Machine à expresso compacte.' },
      he: { name: 'מכונת קפה ניידת', description: 'מכונת אספרסו קומפקטית.' },
      am: { name: 'ተንቀሳቃሽ ቡና መፍጫ', description: 'ለጉዞ የሚሆን አነስተኛ ኤስፕሬሶ ማሽን።' }
    }
  }
];

// --- AI Service ---

class AIService {
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: (process.env.API_KEY as string) });
  }

  async generateDescription(productName: string, category: string) {
    const prompt = `Generate a compelling, high-converting product description for an e-commerce platform.
    Product Name: ${productName}
    Category: ${category}
    Tone: Persuasive, professional, and benefit-driven.
    Length: Approximately 100-150 words.
    
    Return the result as a plain text description.`;

    const result = await this.genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return result.text;
  }

  async translateProduct(content: string, targetLang: string) {
    const prompt = `Translate the following product content to ${targetLang}. Ensure it sounds professional and localized for an e-commerce platform.
    Content: ${content}`;

    const result = await this.genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    return result.text;
  }
}

// --- UI Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, size = 'md' }: any) => {
  const base = "font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-md",
    md: "px-4 py-2 rounded-lg",
    lg: "px-6 py-3 rounded-xl text-lg"
  };
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:scale-95",
    outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    ghost: "text-gray-600 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700"
  };

  return (
    <button onClick={onClick} className={`${base} ${sizes[size as keyof typeof sizes]} ${variants[variant as keyof typeof variants]} ${className}`} disabled={disabled}>
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'info' }: any) => {
  const styles = {
    info: "bg-blue-50 text-blue-700 border-blue-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    neutral: "bg-slate-50 text-slate-700 border-slate-100",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[variant as keyof typeof styles]}`}>
      {children}
    </span>
  );
};

// --- App Root ---

const App = () => {
  const [view, setView] = useState<View>('STORE');
  const [lang, setLang] = useState<Language>('en');
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [aiDraft, setAiDraft] = useState('');
  
  // Tracking State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [searchedShipment, setSearchedShipment] = useState<Shipment | null>(null);
  const [trackingError, setTrackingError] = useState(false);
  
  const aiService = useMemo(() => new AIService(), []);

  const currentDir = LANGUAGES[lang].dir;

  useEffect(() => {
    document.documentElement.dir = currentDir;
    document.documentElement.lang = lang;
  }, [lang, currentDir]);

  const handleOpenAiEditor = (product: Product) => {
    setEditingProduct(product);
    setAiDraft(product.description);
  };

  const handleGenerateAiDescription = async () => {
    if (!editingProduct) return;
    setIsOptimizing(true);
    try {
      const newDescription = await aiService.generateDescription(editingProduct.name, editingProduct.category);
      setAiDraft(newDescription);
    } catch (error) {
      console.error(error);
      alert("AI failed to generate description. Please check your API key.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApproveProduct = (id: string, newDesc: string) => {
    setProducts(prev => prev.map(p => 
      p.id === id 
        ? { ...p, description: newDesc, status: 'PUBLISHED' as ProductStatus } 
        : p
    ));
    setEditingProduct(null);
    setAiDraft('');
    alert("Product description approved and published!");
  };

  const navToProduct = (product: Product) => {
    setSelectedProduct(product);
    setView('PRODUCT_DETAIL');
  };

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const shipment = MOCK_SHIPMENTS[trackingNumber.trim()];
    if (shipment) {
      setSearchedShipment(shipment);
      setTrackingError(false);
    } else {
      setSearchedShipment(null);
      setTrackingError(true);
    }
  };

  // Components within App
  const Sidebar = () => (
    <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-white p-6 flex flex-col hidden lg:flex">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
          <ShoppingBag size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight">NexFlow AI</span>
      </div>

      <nav className="flex-1 space-y-2">
        <button onClick={() => setView('ADMIN')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'ADMIN' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800">
          <Package size={20} /> Products
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800">
          <Truck size={20} /> CJ Sync
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800">
          <BarChart3 size={20} /> Analytics
        </button>
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800 flex flex-col gap-2">
        <button onClick={() => setView('STORE')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800">
          <Globe size={20} /> View Store
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800">
          <Settings size={20} /> Settings
        </button>
      </div>
    </div>
  );

  const StoreHeader = () => (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('STORE')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <ShoppingBag size={24} />
          </div>
          <span className="text-2xl font-black text-gray-900 tracking-tight">NexFlow</span>
        </div>

        <div className="flex-1 max-w-lg mx-8 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search trending products..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('TRACKING')}
            className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors uppercase tracking-widest px-4"
          >
            <Truck size={18} /> Track Order
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors uppercase">
              <Languages size={18} /> {lang}
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {Object.entries(LANGUAGES).map(([code, { label }]) => (
                <button 
                  key={code}
                  onClick={() => setLang(code as Language)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${lang === code ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button variant="outline" className="hidden sm:flex" onClick={() => setView('ADMIN')}>Merchant Login</Button>
          <button className="p-2 relative">
            <ShoppingBag size={24} className="text-gray-700" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-indigo-600 text-white text-[10px] flex items-center justify-center rounded-full font-bold">2</span>
          </button>
        </div>
      </div>
    </header>
  );

  const TrackingView = () => (
    <div className="bg-slate-50 min-h-screen">
      <StoreHeader />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-indigo-100 rounded-3xl mb-4 text-indigo-600">
            <Truck size={48} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Track Your Shipment</h1>
          <p className="text-gray-500 max-w-lg mx-auto">Enter your CJ Dropshipping or internal tracking number to view real-time delivery status.</p>
        </div>

        <Card className="mb-8">
          <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. CJ12345678TR"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-lg font-medium"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={24} />
            </div>
            <Button type="submit" size="lg" className="px-10 rounded-2xl shadow-xl shadow-indigo-100">
              Track Package
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Try a demo number:</p>
            <button onClick={() => { setTrackingNumber('CJ12345678TR'); }} className="text-xs text-indigo-600 font-bold hover:underline">CJ12345678TR (Transit)</button>
            <button onClick={() => { setTrackingNumber('CJ99887766DE'); }} className="text-xs text-indigo-600 font-bold hover:underline">CJ99887766DE (Delivered)</button>
          </div>
        </Card>

        {trackingError && (
          <Card className="border-red-100 bg-red-50/50 flex items-center gap-4 text-red-600">
            <AlertCircle size={24} />
            <div>
              <p className="font-bold">Tracking number not found</p>
              <p className="text-sm">We couldn't find a record for that tracking number. Please verify and try again.</p>
            </div>
          </Card>
        )}

        {searchedShipment && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <Card className="relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
                 <div 
                   className="h-full bg-indigo-600 transition-all duration-1000"
                   style={{ width: 
                     searchedShipment.currentStatus === 'ORDERED' ? '10%' :
                     searchedShipment.currentStatus === 'PROCESSING' ? '30%' :
                     searchedShipment.currentStatus === 'SHIPPED' ? '50%' :
                     searchedShipment.currentStatus === 'IN_TRANSIT' ? '75%' : '100%' 
                   }}
                 ></div>
               </div>
               
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mt-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Shipment Status</span>
                      <Badge variant={searchedShipment.currentStatus === 'DELIVERED' ? 'success' : 'info'}>
                        {searchedShipment.currentStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">{searchedShipment.trackingId}</h2>
                    <p className="text-sm text-gray-500">Order: <span className="font-bold text-indigo-600">{searchedShipment.orderId}</span> • Carrier: {searchedShipment.carrier}</p>
                  </div>
                  
                  <div className="text-left md:text-right">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Estimated Delivery</div>
                    <div className="flex items-center md:justify-end gap-2 text-xl font-black text-gray-900">
                      <Calendar size={20} className="text-indigo-600" />
                      {searchedShipment.estimatedDelivery}
                    </div>
                  </div>
               </div>

               {/* Progress Stepper */}
               <div className="mt-12 grid grid-cols-5 gap-2 px-2 pb-6">
                  {[
                    { key: 'ORDERED', label: 'Ordered', icon: ShoppingBag },
                    { key: 'PROCESSING', label: 'Processing', icon: RefreshCw },
                    { key: 'SHIPPED', label: 'Shipped', icon: Package },
                    { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
                    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 }
                  ].map((step, idx, arr) => {
                    const statusOrder = ['ORDERED', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];
                    const currentIdx = statusOrder.indexOf(searchedShipment.currentStatus);
                    const isCompleted = idx <= currentIdx;
                    const isActive = idx === currentIdx;

                    return (
                      <div key={step.key} className="flex flex-col items-center relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors ${isCompleted ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                           <step.icon size={20} className={isActive ? "animate-pulse" : ""} />
                        </div>
                        <span className={`mt-3 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${isCompleted ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
               </div>
            </Card>

            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock size={20} className="text-indigo-600" /> Shipment History
            </h3>
            
            <div className="space-y-4">
              {searchedShipment.history.map((event, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1.5 transition-colors ${idx === 0 ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-gray-300'}`}></div>
                    {idx !== searchedShipment.history.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-100 my-1 group-hover:bg-indigo-50 transition-colors"></div>
                    )}
                  </div>
                  <Card className="flex-1 py-4 px-6 mb-2">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{event.date}</span>
                      <span className="flex items-center gap-1 text-xs font-bold text-gray-600">
                        <MapPin size={12} className="text-indigo-400" /> {event.location}
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 mb-1">{event.status}</div>
                    <p className="text-sm text-gray-500 leading-relaxed">{event.description}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );

  const Storefront = () => (
    <div className="bg-slate-50 min-h-screen">
      <StoreHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
          Trending Now <ArrowRight size={20} className="text-indigo-600" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.filter(p => p.status === 'PUBLISHED').map((p) => (
            <div 
              key={p.id} 
              onClick={() => navToProduct(p)}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-300 cursor-pointer flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                  {p.translations[lang]?.name || p.name}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                  {p.translations[lang]?.description || p.description}
                </p>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                  <span className="text-2xl font-black text-gray-900">${p.price.toFixed(2)}</span>
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    In Stock
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );

  const AdminDashboard = () => (
    <div className="bg-slate-50 min-h-screen lg:ml-64">
      <Sidebar />
      <header className="bg-white border-b border-gray-100 px-8 h-20 flex items-center justify-between sticky top-0 z-40">
        <h2 className="text-xl font-bold text-slate-900">Merchant Center</h2>
        <div className="flex items-center gap-4">
          <Badge variant="success">SUPER_ADMIN</Badge>
        </div>
      </header>

      <main className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            AI Product Manager <Wand2 className="text-indigo-500" size={20} />
          </h3>
          <Button icon={Plus}>Sync CJ Catalog</Button>
        </div>

        <Card className="p-0 overflow-hidden border-none shadow-md">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Product Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Description Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={p.status === 'PUBLISHED' ? 'success' : 'warning'}>{p.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {p.status === 'DRAFT' ? (
                       <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                          <AlertCircle size={14} /> Requires Optimization
                       </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 size={14} /> AI Optimized
                       </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" icon={Wand2} onClick={() => handleOpenAiEditor(p)}>
                        AI Editor
                      </Button>
                      <button className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* AI Editor Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">AI Product Assistant</h3>
                    <p className="text-xs text-slate-500">Edit and approve optimized content for <span className="font-bold text-indigo-600">{editingProduct.name}</span></p>
                  </div>
                  <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <Sparkles className="text-indigo-600" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-1">AI Action Center</p>
                      <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={handleGenerateAiDescription} 
                        disabled={isOptimizing}
                        icon={Wand2}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {isOptimizing ? "Working..." : "Regenerate with Gemini AI"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Product Description</label>
                    <textarea 
                      value={aiDraft}
                      onChange={(e) => setAiDraft(e.target.value)}
                      rows={8}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none leading-relaxed"
                      placeholder="AI content will appear here..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tone Analysis</p>
                      <Badge variant="neutral">Persuasive</Badge>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Word Count</p>
                      <span className="text-sm font-bold text-slate-700">{aiDraft.split(' ').filter(Boolean).length} words</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-slate-50/50 flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setEditingProduct(null)}>Discard</Button>
                  <Button 
                    variant="success" 
                    icon={CheckCircle2} 
                    onClick={() => handleApproveProduct(editingProduct.id, aiDraft)}
                    className="shadow-md shadow-emerald-100"
                  >
                    Approve & Publish
                  </Button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );

  const ProductDetail = () => {
    if (!selectedProduct) return null;
    return (
      <div className="bg-white min-h-screen">
        <StoreHeader />
        <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col lg:flex-row gap-16">
          <div className="lg:w-1/2">
            <div className="rounded-3xl overflow-hidden bg-gray-50 aspect-square border border-gray-100">
              <img src={selectedProduct.image} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="lg:w-1/2">
            <h1 className="text-4xl font-black text-gray-900 mb-6 leading-tight">{selectedProduct.name}</h1>
            <div className="text-3xl font-black text-indigo-600 mb-8">${selectedProduct.price.toFixed(2)}</div>
            <div className="space-y-6 mb-8 pb-8 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 uppercase tracking-widest text-sm">Description</h3>
              <p className="text-gray-600 text-lg leading-relaxed">{selectedProduct.description}</p>
            </div>
            <Button className="w-full py-5 text-xl rounded-2xl shadow-xl shadow-indigo-100" onClick={() => setView('CHECKOUT')}>
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const Checkout = () => (
    <div className="bg-white min-h-screen">
       <StoreHeader />
       <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-6" />
          <h1 className="text-3xl font-black mb-4">Checkout Simulator</h1>
          <p className="text-slate-500 mb-8">This would typically trigger the Stripe or PayPal payment flow.</p>
          <Button variant="primary" onClick={() => setView('STORE')}>Return to Shop</Button>
       </div>
    </div>
  );

  return (
    <div className={`font-sans selection:bg-indigo-100 selection:text-indigo-900 text-slate-900`}>
      {view === 'STORE' && <Storefront />}
      {view === 'ADMIN' && <AdminDashboard />}
      {view === 'PRODUCT_DETAIL' && <ProductDetail />}
      {view === 'CHECKOUT' && <Checkout />}
      {view === 'TRACKING' && <TrackingView />}
      
      {/* Loading Overlay */}
      {isOptimizing && !editingProduct && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white animate-bounce shadow-2xl shadow-indigo-200 mb-8">
            <Wand2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Gemini AI at Work</h2>
          <p className="text-slate-500 max-w-sm">Crafting compelling sales copy...</p>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
