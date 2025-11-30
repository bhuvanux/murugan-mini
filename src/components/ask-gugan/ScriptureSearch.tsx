// Scripture Search Component for Ask Gugan
// Search and display Tamil scriptures and mantras
import React from 'react';
import { BookOpen, Search, Copy, Share2 } from 'lucide-react';

export interface Scripture {
  id: string;
  title: string;
  titleTamil: string;
  content: string;
  contentTamil: string;
  reference: string;
  category: 'mantra' | 'sloka' | 'hymn' | 'stotra' | 'kavacham';
  deity: string;
  benefits?: string[];
  audio?: string;
}

export const MURUGAN_SCRIPTURES: Scripture[] = [
  {
    id: 'kanda-sashti-kavasam-1',
    title: 'Kanda Sashti Kavasam (Opening)',
    titleTamil: 'கந்த சஷ்டி கவசம்',
    content: 'Lord Skanda! Please bestow me with your grace',
    contentTamil: 'முருகன் துணை போற்றி போற்றி போற்றி',
    reference: 'Kanda Sashti Kavasam - Verse 1',
    category: 'kavacham',
    deity: 'Lord Murugan',
    benefits: ['Protection from enemies', 'Spiritual strength', 'Removal of obstacles'],
    audio: null
  },
  {
    id: 'vel-vakuppu',
    title: 'Vel Vakuppu',
    titleTamil: 'வேல் வாகுப்பு',
    content: 'Salutations to the divine spear of Murugan',
    contentTamil: 'வேலும் மயிலும் துணையா வருக',
    reference: 'Traditional Vel Prayer',
    category: 'mantra',
    deity: 'Lord Murugan',
    benefits: ['Victory in endeavors', 'Courage', 'Divine protection']
  },
  {
    id: 'muruga-mantra',
    title: 'Murugan Moola Mantra',
    titleTamil: 'முருகன் மூல மந்திரம்',
    content: 'Om Saravanabhavaya Namaha',
    contentTamil: 'ஓம் சரவணபவாய நமஹ',
    reference: 'Murugan Moola Mantra',
    category: 'mantra',
    deity: 'Lord Murugan',
    benefits: ['Peace of mind', 'Spiritual growth', 'Blessings of Lord Murugan']
  },
  {
    id: 'subramanya-ashtottara',
    title: 'Subramanya Ashtottara Shatanamavali',
    titleTamil: 'சுப்பிரமணிய அஷ்டோத்தர நாமாவளி',
    content: '108 Names of Lord Subramanya',
    contentTamil: 'சுப்பிரமணியாய நமஃ',
    reference: 'Ashtottara Shatanamavali',
    category: 'hymn',
    deity: 'Lord Murugan',
    benefits: ['Divine blessings', 'Success in life', 'Spiritual upliftment']
  },
  {
    id: 'skanda-guru-kavacham',
    title: 'Skanda Guru Kavacham',
    titleTamil: 'ஸ்கந்த குரு கவசம்',
    content: 'The protective armor of Skanda',
    contentTamil: 'குமரா குருவே துணை',
    reference: 'Skanda Guru Kavacham',
    category: 'kavacham',
    deity: 'Lord Murugan',
    benefits: ['Protection', 'Guidance', 'Spiritual wisdom']
  },
  {
    id: 'tiruppugazh',
    title: 'Tiruppugazh',
    titleTamil: 'திருப்புகழ்',
    content: 'Sacred hymns in praise of Murugan by Arunagirinathar',
    contentTamil: 'தனத்தன தானா தனத்தன தானா',
    reference: 'Tiruppugazh - Various Hymns',
    category: 'hymn',
    deity: 'Lord Murugan',
    benefits: ['Liberation', 'Divine grace', 'Removal of sins']
  },
  {
    id: 'murugan-shadakshara',
    title: 'Shadakshara Mantra',
    titleTamil: 'ஷடாக்ஷர மந்திரம்',
    content: 'Om Saravana Bhava',
    contentTamil: 'ஓம் சரவண பவ',
    reference: 'Six Letter Mantra',
    category: 'mantra',
    deity: 'Lord Murugan',
    benefits: ['Quick blessings', 'Protection', 'Peace']
  },
  {
    id: 'kumaresa-ashtakam',
    title: 'Kumaresa Ashtakam',
    titleTamil: 'குமாரேஸ அஷ்டகம்',
    content: 'Eight verses in praise of Lord Kumara',
    contentTamil: 'குமாரேஸ ஜய குமாரேஸ',
    reference: 'Adi Shankaracharya',
    category: 'stotra',
    deity: 'Lord Murugan',
    benefits: ['Knowledge', 'Success', 'Divine blessings']
  }
];

export interface ScriptureSearchProps {
  query?: string;
  category?: string;
}

export function ScriptureSearch({ query, category }: ScriptureSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState(query || '');
  const [selectedCategory, setSelectedCategory] = React.useState(category || 'all');
  
  const categories = ['all', 'mantra', 'sloka', 'hymn', 'stotra', 'kavacham'];

  const filteredScriptures = MURUGAN_SCRIPTURES.filter(scripture => {
    const matchesCategory = selectedCategory === 'all' || scripture.category === selectedCategory;
    const matchesQuery = !searchQuery || 
      scripture.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scripture.titleTamil.includes(searchQuery) ||
      scripture.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scripture.contentTamil.includes(searchQuery);
    
    return matchesCategory && matchesQuery;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('📋 Copied to clipboard!');
  };

  const shareScripture = (scripture: Scripture) => {
    const shareText = `🔱 ${scripture.title}\n\n${scripture.contentTamil}\n${scripture.content}\n\n- ${scripture.reference}`;
    
    if (navigator.share) {
      navigator.share({
        title: scripture.title,
        text: shareText
      });
    } else {
      copyToClipboard(shareText);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-[#0d5e38] text-white rounded-xl">
          <BookOpen size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#0d5e38]">Scripture Search</h2>
          <p className="text-sm text-gray-600">Find mantras, slokas, and hymns</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search scriptures in English or Tamil..."
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0d5e38] focus:outline-none"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-[#0d5e38] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filteredScriptures.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p>No scriptures found. Try a different search.</p>
          </div>
        ) : (
          filteredScriptures.map(scripture => (
            <div
              key={scripture.id}
              className="border-2 border-gray-200 rounded-xl p-5 hover:border-[#0d5e38] transition-all"
            >
              {/* Title */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[#0d5e38]">{scripture.title}</h3>
                  <p className="text-xl font-tau-paalai text-gray-700 mt-1">{scripture.titleTamil}</p>
                  <p className="text-sm text-gray-500 mt-1">{scripture.reference}</p>
                </div>
                <span className="px-3 py-1 bg-[#0d5e38]/10 text-[#0d5e38] rounded-full text-xs font-semibold uppercase">
                  {scripture.category}
                </span>
              </div>

              {/* Content */}
              <div className="bg-[#0d5e38]/5 rounded-lg p-4 mb-3">
                <p className="text-2xl font-tau-paalai text-[#0d5e38] mb-2">{scripture.contentTamil}</p>
                <p className="text-gray-700 italic">{scripture.content}</p>
              </div>

              {/* Benefits */}
              {scripture.benefits && scripture.benefits.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Benefits:</p>
                  <div className="flex flex-wrap gap-2">
                    {scripture.benefits.map((benefit, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs"
                      >
                        ✓ {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(`${scripture.contentTamil}\n${scripture.content}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-sm font-medium"
                >
                  <Copy size={16} />
                  Copy
                </button>
                <button
                  onClick={() => shareScripture(scripture)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0d5e38] hover:bg-[#0a4a2b] text-white rounded-lg transition-all text-sm font-medium"
                >
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Action Card for Scripture Results
export function ScriptureCard({ scripture }: { scripture: Scripture }) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('📋 Copied to clipboard!');
  };

  return (
    <div className="bg-gradient-to-br from-[#0d5e38] to-[#0a4a2b] rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-white/20 rounded-xl">
          <BookOpen size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg">{scripture.title}</h3>
          <p className="text-sm opacity-80">{scripture.reference}</p>
        </div>
      </div>

      <div className="bg-white/10 rounded-lg p-4 mb-4">
        <p className="text-2xl font-tau-paalai mb-2">{scripture.contentTamil}</p>
        <p className="italic opacity-90">{scripture.content}</p>
      </div>

      <button
        onClick={() => copyToClipboard(`${scripture.contentTamil}\n${scripture.content}`)}
        className="w-full py-3 bg-white text-[#0d5e38] rounded-xl font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
      >
        <Copy size={18} />
        Copy Scripture
      </button>
    </div>
  );
}
