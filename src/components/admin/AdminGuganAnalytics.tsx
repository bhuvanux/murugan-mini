import React from "react";
import { MessageCircle, Users, Image as ImageIcon, Mic, TrendingUp, Clock } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function AdminGuganAnalytics() {
  const chatData = [
    { date: "Mon", chats: 234 },
    { date: "Tue", chats: 312 },
    { date: "Wed", chats: 456 },
    { date: "Thu", chats: 389 },
    { date: "Fri", chats: 512 },
    { date: "Sat", chats: 678 },
    { date: "Sun", chats: 598 },
  ];

  const messageTypeData = [
    { type: "Text", count: 6543 },
    { type: "Image", count: 1234 },
    { type: "Audio", count: 567 },
  ];

  const topQuestions = [
    { question: "Which temple should I visit?", count: 234 },
    { question: "Prayer timings for Murugan", count: 189 },
    { question: "Festival dates", count: 156 },
    { question: "Arupadai Veedu information", count: 134 },
    { question: "Kavadi attam guidance", count: 112 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Ask Gugan AI Analytics</h2>
        <p className="text-gray-500 mt-1">Monitor AI chatbot performance and user engagement</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">8,765</p>
              <p className="text-sm text-gray-500">Total Chats</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">3,456</p>
              <p className="text-sm text-gray-500">Unique Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">1.4s</p>
              <p className="text-sm text-gray-500">Avg Response</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">98.4%</p>
              <p className="text-sm text-gray-500">Success Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-bold text-gray-800 mb-4">New Chats Per Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chatData}>
              <defs>
                <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area type="monotone" dataKey="chats" stroke="#14b8a6" fillOpacity={1} fill="url(#colorChats)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Message Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={messageTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="type" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Questions */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">Top User Questions</h3>
        </div>
        <div className="divide-y">
          {topQuestions.map((item, idx) => (
            <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                  {idx + 1}
                </div>
                <p className="text-gray-800">{item.question}</p>
              </div>
              <span className="text-gray-500 font-semibold">{item.count} asks</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
