import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Mail, Phone, Lock, Trash2, Camera, Upload, Database } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
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
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.user_metadata?.name || 'Devotee'
  );
  const [city, setCity] = useState(user?.user_metadata?.city || '');
  const [profileImage, setProfileImage] = useState<string>('https://images.unsplash.com/photo-1550853607-9b3b692e50bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change dialog state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          city: city,
        }
      });
      if (error) throw error;
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
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
                <Label htmlFor="displayName">Full Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              {/* City */}
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="Your City"
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


        {/* Data & Privacy */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-[#7C3AED]" />
              Data & Privacy
            </h3>

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

    </div>
  );
}
