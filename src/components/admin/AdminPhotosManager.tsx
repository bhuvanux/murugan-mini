import React from "react";
import { Plus, Camera, Upload } from "lucide-react";

export function AdminPhotosManager() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Photos Management</h2>
          <p className="text-gray-500 mt-1">Upload and manage temple photos</p>
        </div>
        <button className="flex items-center gap-2 bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700">
          <Plus className="w-5 h-5" />
          Upload Photos
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">3,921</p>
              <p className="text-sm text-gray-500">Total Photos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <p className="text-gray-500 text-center py-8">Photo gallery grid would be implemented here</p>
      </div>
    </div>
  );
}
