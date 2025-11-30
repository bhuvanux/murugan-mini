import React from 'react';
import { MapPin, Clock, Phone, ExternalLink, Navigation, Calendar } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface TempleCardProps {
  temple: {
    id: string;
    name: string;
    location: string;
    address: string;
    lat?: number;
    lng?: number;
    timings?: {
      morning?: string;
      evening?: string;
      abhishekam?: string[];
    };
    description?: string;
    image?: string;
    bookingUrl?: string;
    phone?: string;
  };
  onGetDirections?: () => void;
  onBookSlot?: () => void;
}

export function TempleCard({ temple, onGetDirections, onBookSlot }: TempleCardProps) {
  const handleGetDirections = () => {
    if (temple.lat && temple.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${temple.lat},${temple.lng}`;
      window.open(url, '_blank');
    }
    if (onGetDirections) onGetDirections();
  };

  const handleBookSlot = () => {
    if (temple.bookingUrl) {
      window.open(temple.bookingUrl, '_blank');
    }
    if (onBookSlot) onBookSlot();
  };

  const handleCall = () => {
    if (temple.phone) {
      window.location.href = `tel:${temple.phone}`;
    }
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-[#0d5e38]/5 to-white border-[#0d5e38]/10">
      {/* Temple Image */}
      {temple.image && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <img 
            src={temple.image} 
            alt={temple.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Location Badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[#0d5e38]">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{temple.location}</span>
          </div>
        </div>
      )}

      {/* Temple Info */}
      <div className="p-4">
        <h3 className="text-[#0d5e38] mb-1">
          {temple.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 flex items-start gap-1">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{temple.address}</span>
        </p>

        {temple.description && (
          <p className="text-gray-700 text-sm mb-4 line-clamp-3">
            {temple.description}
          </p>
        )}

        {/* Timings */}
        {temple.timings && (
          <div className="space-y-2 mb-4 p-3 rounded-lg bg-[#0d5e38]/5">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-[#0d5e38]" />
              <span className="text-gray-700">Darshan Timings</span>
            </div>
            
            {temple.timings.morning && (
              <div className="text-sm text-gray-600 ml-6">
                <span className="font-['TAU-Paalai',sans-serif]">காலை:</span> {temple.timings.morning}
              </div>
            )}
            
            {temple.timings.evening && (
              <div className="text-sm text-gray-600 ml-6">
                <span className="font-['TAU-Paalai',sans-serif]">மாலை:</span> {temple.timings.evening}
              </div>
            )}
            
            {temple.timings.abhishekam && temple.timings.abhishekam.length > 0 && (
              <div className="text-sm text-gray-600 ml-6">
                <span className="font-['TAU-Paalai',sans-serif]">அபிஷேகம்:</span> {temple.timings.abhishekam.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={handleGetDirections}
            className="bg-[#0d5e38] hover:bg-[#0a4a2a] text-white"
          >
            <Navigation className="w-4 h-4 mr-1" />
            Directions
          </Button>

          {temple.bookingUrl && (
            <Button
              size="sm"
              onClick={handleBookSlot}
              className="bg-[#0d5e38] hover:bg-[#0a4a2a] text-white"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Book Slot
            </Button>
          )}

          {temple.phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCall}
              className="border-[#0d5e38]/20 text-[#0d5e38]"
            >
              <Phone className="w-4 h-4 mr-1" />
              Call Temple
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(temple.name)}`, '_blank')}
            className="border-[#0d5e38]/20 text-[#0d5e38]"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            More Info
          </Button>
        </div>
      </div>
    </Card>
  );
}
