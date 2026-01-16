import React from 'react';
import { Card } from './ui/card';
import { Shield, Lock, Eye, Database, FileText, Mail } from 'lucide-react';

import { AppHeader } from './AppHeader';

interface PrivacyPolicyScreenProps {
  onBack?: () => void;
}

export function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  return (
    <div className="bg-[#f8faf7] min-h-screen">
      <AppHeader title="Privacy Policy" onBack={onBack} variant="primary" showKolam={true} />
      <div className="px-4 pb-20" style={{ paddingTop: 'calc(92px + env(safe-area-inset-top))' }}>
        {/* Removed internal title */}
        <p className="text-sm text-gray-600 mb-6">
          Last updated: November 12, 2025
        </p>

        {/* Introduction */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0d5e38]" />
              Our Commitment to Your Privacy
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              At Murugan Wallpapers & Videos, we are committed to protecting your privacy and
              ensuring the security of your personal information. This privacy policy explains
              how we collect, use, and safeguard your data.
            </p>
          </div>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-[#D97706]" />
              Information We Collect
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <div className="font-semibold mb-1">Account Information</div>
                <p className="text-gray-600">
                  Email address or phone number for authentication and account management.
                </p>
              </div>
              <div>
                <div className="font-semibold mb-1">Usage Data</div>
                <p className="text-gray-600">
                  Information about your interactions with the app, such as wallpapers saved,
                  songs played, and download history.
                </p>
              </div>
              <div>
                <div className="font-semibold mb-1">Device Information</div>
                <p className="text-gray-600">
                  Device type, operating system, and app version for technical support and optimization.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* How We Use Your Information */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#7C3AED]" />
              How We Use Your Information
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-[#0d5e38] mt-1">•</span>
                <span>To provide and improve our services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0d5e38] mt-1">•</span>
                <span>To personalize your experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0d5e38] mt-1">•</span>
                <span>To send notifications about new content (if enabled)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0d5e38] mt-1">•</span>
                <span>To respond to your support requests</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0d5e38] mt-1">•</span>
                <span>To analyze app usage and improve functionality</span>
              </li>
            </ul>
          </div>
        </Card>

        {/* Data Security */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#DC2626]" />
              Data Security
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              We implement industry-standard security measures to protect your personal information.
              Your data is encrypted during transmission and stored securely using Supabase's
              enterprise-grade infrastructure. We never share your personal information with
              third parties without your explicit consent.
            </p>
          </div>
        </Card>

        {/* Your Rights */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0891B2]" />
              Your Rights
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="font-semibold">You have the right to:</p>
              <ul className="space-y-1 ml-4">
                <li>• Access your personal data</li>
                <li>• Correct inaccurate data</li>
                <li>• Request deletion of your account and data</li>
                <li>• Export your data</li>
                <li>• Opt-out of notifications</li>
                <li>• Withdraw consent at any time</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Data Retention */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-3">Data Retention</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              We retain your personal information only for as long as necessary to provide
              our services and comply with legal obligations. When you delete your account,
              we permanently remove all your personal data within 30 days.
            </p>
          </div>
        </Card>

        {/* Children's Privacy */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-3">Children's Privacy</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Our app is suitable for all ages. We do not knowingly collect personal information
              from children under 13 without parental consent. If you believe we have collected
              such information, please contact us immediately.
            </p>
          </div>
        </Card>

        {/* Changes to Policy */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-3">Changes to This Policy</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </div>
        </Card>

        {/* Contact */}
        <Card className="border-[#E6F0EA] bg-[#F3FFF6]">
          <div className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#0d5e38]" />
              Contact Us
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              If you have any questions about this privacy policy or our data practices,
              please contact us at:
            </p>
            <a
              href="mailto:privacy@muruganapp.com"
              className="text-sm font-semibold text-[#0d5e38]"
            >
              privacy@muruganapp.com
            </a>
          </div>
        </Card>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            This privacy policy is compliant with GDPR and Indian data protection laws
          </p>
        </div>
      </div>
    </div>
  );
}
