import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { User, Mail, Phone, Lock, Trash2, Camera, Upload, Database } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { getAnalyticsConsent, setAnalyticsConsent } from '../utils/analytics/consent';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export function AccountSettingsScreen() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => getAnalyticsConsent().analytics);
  const [displayName, setDisplayName] = useState(
    user?.email?.split('@')[0] || 'Devotee'
  );
  const [profileImage, setProfileImage] = useState<string>('https://images.unsplash.com/photo-1550853607-9b3b692e50bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change dialog state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully!');
    setIsEditing(false);
  };

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        toast.success('Profile photo updated!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      // First verify the current password by trying to sign in
      if (user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          toast.error('Current password is incorrect');
          setChangingPassword(false);
          return;
        }
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password changed successfully!');
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast.error('Account deletion is currently unavailable. Please contact support.');
  };

  const handleClearCache = () => {
    // Clear local storage
    localStorage.clear();
    // Clear session storage
    sessionStorage.clear();
    toast.success('Cache cleared successfully!');
  };

  return (
    <div className="px-4 pb-20 bg-[#F2FFF6] min-h-screen">
      <div className="py-4">
        <h2 className="font-extrabold text-lg mb-2">Account Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Manage your account information and preferences
        </p>

        {/* Profile Information */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#0d5e38]" />
              Profile Information
            </h3>

            <div className="space-y-4">
              {/* Profile Photo */}
              <div>
                <Label>Profile Photo</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="relative">
                    <div
                      className="w-20 h-20 rounded-full bg-cover bg-center border-4 border-[#E6F0EA]"
                      style={{
                        backgroundImage: `url('${profileImage}')`,
                      }}
                    />
                    <button
                      onClick={handleProfileImageClick}
                      className="absolute bottom-0 right-0 w-7 h-7 bg-[#0d5e38] rounded-full flex items-center justify-center text-white hover:bg-[#0a5b34] transition-colors shadow-lg"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <Button
                      onClick={handleProfileImageClick}
                      variant="outline"
                      size="sm"
                      className="mb-2"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-xs text-gray-500">
                      JPG, PNG or GIF (max. 5MB)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Display Name */}
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              {/* Email/Phone */}
              <div>
                <Label htmlFor="email">
                  {user?.email ? 'Email' : 'Phone Number'}
                </Label>
                <div className="mt-1 flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  {user?.email ? (
                    <Mail className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Phone className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-sm">
                    {user?.email || user?.phone || 'Not available'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This cannot be changed
                </p>
              </div>

              {/* Action Buttons */}
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-[#0d5e38] hover:bg-[#0a5b34]"
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-[#0d5e38] hover:bg-[#0a5b34]"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#D97706]" />
              Security
            </h3>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowPasswordDialog(true)}
            >
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          </div>
        </Card>

        {/* Data & Privacy */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-[#7C3AED]" />
              Data & Privacy
            </h3>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E6F0EA] bg-white px-3 py-3 mb-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800">பயன்பாட்டு அனலிட்டிக்ஸ் அனுமதி</div>
                <div className="text-xs text-gray-500 mt-1">
                  பயன்பாட்டை மேம்படுத்த பயன்பாட்டு தகவல்கள் சேகரிக்கப்படும்.
                </div>
              </div>
              <Switch
                checked={analyticsEnabled}
                onCheckedChange={(checked: boolean) => {
                  setAnalyticsEnabled(checked);
                  setAnalyticsConsent({ analytics: checked });
                  toast.success(checked ? 'Analytics enabled' : 'Analytics disabled');
                }}
              />
            </div>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleClearCache}
            >
              Clear Cache
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Clear app cache and temporary data
            </p>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50/50">
          <div className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </h3>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers including saved
                    wallpapers, songs, and preferences.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <p className="text-xs text-red-600 mt-2 text-center">
              This will permanently delete all your data
            </p>
          </div>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#0d5e38]" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              disabled={changingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="bg-[#0d5e38] hover:bg-[#0a5b34]"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
