import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Send, MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { AppHeader } from './AppHeader';
import { userAPI } from '../utils/api/client';

interface ContactScreenProps {
  onBack?: () => void;
}

export function ContactScreen({ onBack }: ContactScreenProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setSending(true);

    try {
      const response = await userAPI.sendSupportMessage(subject, message);

      if (response.success) {
        toast.success('Divine message received! We will get back to you soon. 🙏');
        setSubject('');
        setMessage('');
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message. Please try again later.');
      console.error('[Contact] Submit error:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] flex flex-col">
      {/* Header */}
      <AppHeader title="Contact Us" onBack={onBack} variant="primary" showKolam={true} />

      <div className="flex-1 px-4 pb-8 flex flex-col" style={{ paddingTop: 'calc(92px + env(safe-area-inset-top))' }}>
        <div className="max-w-md mx-auto w-full space-y-8">
          {/* Intro Text */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">How can we help?</h2>
            <p className="text-gray-500 text-sm">Our team is here to support you with any divine inquiries or feedback.</p>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#0d5e38]/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#0d5e38]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Response Time</p>
                <p className="text-sm font-semibold text-gray-700">Under 24h</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#0d5e38]/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#0d5e38]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Support Status</p>
                <p className="text-sm font-semibold text-gray-700">Active</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[24px] overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-[#0d5e38] flex items-center justify-center shadow-lg shadow-[#0d5e38]/20">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 leading-none">Drop us a line</h3>
                  <p className="text-xs text-gray-400 mt-1">Fill out the form below</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-xs uppercase tracking-widest font-bold text-gray-400 ml-1">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="E.g. Technical Help, Content Feedback"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-gray-50/50 border-gray-100 focus:bg-white focus:border-[#0d5e38] focus:ring-4 focus:ring-[#0d5e38]/5 rounded-xl transition-all duration-300 h-12 text-sm placeholder:text-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-xs uppercase tracking-widest font-bold text-gray-400 ml-1">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-gray-50/50 border-gray-100 focus:bg-white focus:border-[#0d5e38] focus:ring-4 focus:ring-[#0d5e38]/5 rounded-xl transition-all duration-300 min-h-[220px] resize-none p-4 text-sm placeholder:text-gray-300 leading-relaxed"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#0d5e38] hover:bg-[#0a5b34] text-white font-bold py-7 rounded-xl shadow-xl shadow-[#0d5e38]/20 transition-all duration-300 active:scale-[0.98] group overflow-hidden relative"
                  disabled={sending}
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {sending ? (
                    <span className="flex items-center gap-2 relative z-10">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing divine message...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 text-base relative z-10">
                      <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                      Send Message
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </Card>

          {/* Bottom Help Text */}
          <div className="text-center pb-20">
            <p className="text-gray-400 text-xs">
              By sending this message, you agree to our <span className="text-[#0d5e38] font-semibold">Terms of Service</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

