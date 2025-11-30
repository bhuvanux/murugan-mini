import React, { useState } from 'react';
import { Activity, Calendar, TestTube } from 'lucide-react';
import { TrackingSystemDashboard } from '../components/admin/TrackingSystemDashboard';
import { TrackingCalendar } from '../components/admin/TrackingCalendar';
import { TrackingTestPanel } from '../components/admin/TrackingTestPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function TrackingSystemPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="container mx-auto px-4">
            <TabsList className="w-full justify-start h-14">
              <TabsTrigger value="dashboard" className="gap-2">
                <Activity className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="test" className="gap-2">
                <TestTube className="w-4 h-4" />
                Test Panel
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="container mx-auto">
          <TabsContent value="dashboard" className="m-0">
            <TrackingSystemDashboard />
          </TabsContent>

          <TabsContent value="calendar" className="m-0 p-6">
            <TrackingCalendar />
          </TabsContent>

          <TabsContent value="test" className="m-0 p-6">
            <div className="max-w-2xl mx-auto">
              <TrackingTestPanel />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
