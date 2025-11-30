import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Mail, Phone, MessageCircle, Send, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function ContactScreen() {
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
    
    // Simulate sending
    setTimeout(() => {
      toast.success('Message sent! We will get back to you soon.');
      setSubject('');
      setMessage('');
      setSending(false);
    }, 1500);
  };

  return (
    <div className="px-4 pb-20 bg-[#F2FFF6] min-h-screen">
      <div className="py-4">
        <h2 className="font-extrabold text-lg mb-2">Contact Us</h2>
        <p className="text-sm text-gray-600 mb-6">
          We're here to help! Reach out to us anytime.
        </p>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <Card className="border-[#E6F0EA]">
            <a
              href="mailto:support@muruganapp.com"
              className="p-4 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-[#F3FFF6] flex items-center justify-center">
                <Mail className="w-6 h-6 text-[#0d5e38]" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">Email Support</div>
                <div className="text-xs text-gray-600">support@muruganapp.com</div>
              </div>
            </a>
          </Card>

          <Card className="border-[#E6F0EA]">
            <a
              href="tel:+911234567890"
              className="p-4 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF8E6] flex items-center justify-center">
                <Phone className="w-6 h-6 text-[#D97706]" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">Phone Support</div>
                <div className="text-xs text-gray-600">+91 123 456 7890</div>
              </div>
            </a>
          </Card>

          <Card className="border-[#E6F0EA]">
            <a
              href="https://wa.me/911234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-[#E6FFE6] flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-[#25D366]" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">WhatsApp</div>
                <div className="text-xs text-gray-600">Chat with us instantly</div>
              </div>
            </a>
          </Card>
        </div>

        {/* Support Hours */}
        <Card className="mb-6 border-[#E6F0EA] bg-blue-50/50">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#0d5e38] mt-0.5" />
              <div>
                <div className="font-bold text-sm mb-1">24×7 Customer Support</div>
                <div className="text-xs text-gray-700">
                  We are available round the clock to assist you with any queries or concerns.
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Form */}
        <Card className="border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-[#0d5e38]" />
              Send us a Message
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="How can we help you?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue or feedback..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#0d5e38] hover:bg-[#0a5b34]"
                disabled={sending}
              >
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </Card>

        {/* FAQ Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Looking for quick answers?
          </p>
          <Button
            variant="link"
            className="text-[#0d5e38]"
            onClick={() => toast.info('FAQ section coming soon!')}
          >
            Visit our FAQ Section →
          </Button>
        </div>
      </div>
    </div>
  );
}
