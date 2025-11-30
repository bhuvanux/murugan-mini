import React from "react";
import { Users, UserPlus, Shield, Ban } from "lucide-react";

export function AdminUserManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <p className="text-gray-500 mt-1">Manage admin users and permissions</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
          <UserPlus className="w-5 h-5" />
          Add Admin User
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">8</p>
              <p className="text-sm text-gray-500">Admin Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">7</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-sm text-gray-500">Suspended</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <p className="text-gray-500 text-center py-8">Admin user table would be implemented here</p>
      </div>
    </div>
  );
}
