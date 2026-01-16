
import React, { useState } from 'react';
import { Send, Loader2, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

export function AdminNotifications() {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [targetType, setTargetType] = useState<'all' | 'segment'>('all');

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;

        setLoading(true);
        try {
            // Call Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('send-push', {
                body: {
                    title,
                    body,
                    targetType
                }
            });

            if (error) throw error;

            toast.success('Notification sent successfully!');
            setTitle('');
            setBody('');
        } catch (err: any) {
            console.error('Failed to send push:', err);

            // Try to extract the actual error message from the backend response
            let errorMessage = err.message;
            if (err && typeof err === 'object' && 'context' in err) {
                // Supabase FunctionsHttpError often hides the body in context
                try {
                    const body = await err.context.json();
                    if (body && body.error) {
                        errorMessage = body.error;
                    }
                } catch (e) {
                    console.log('Could not parse error body', e);
                }
            }

            toast.error('Failed: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Send className="w-5 h-5 text-green-600" />
                    Send Push Notification
                </h2>

                <form onSubmit={handleSend} className="space-y-6">
                    {/* Target Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">Target Audience</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setTargetType('all')}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${targetType === 'all'
                                    ? 'border-green-600 bg-green-50 text-green-700 font-medium'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                All Users
                            </button>
                            {/* Future: Add Segment/City targeting */}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Notification Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. New Wallpapers Added!"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Body */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Message</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write your message here..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
                            required
                        />
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">About Notifications</p>
                            <p>Notifications will be delivered to all Android users who have installed the app and granted permission. Users will verify this message even if the app is closed.</p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !title || !body}
                        className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Send Notification
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
