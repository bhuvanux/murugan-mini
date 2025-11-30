import React, { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { Database, Loader2 } from 'lucide-react';

export function SeedDataButton() {
  const [loading, setLoading] = useState(false);

  const seedData = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/admin/seed-sample-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to seed data');
      }

      const result = await response.json();
      toast.success(result.message || 'Sample data loaded successfully!');
      
      // Reload the page to show new data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Seed data error:', error);
      toast.error(error.message || 'Failed to load sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={seedData}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Database className="w-4 h-4" />
          Load Sample Data
        </>
      )}
    </Button>
  );
}
