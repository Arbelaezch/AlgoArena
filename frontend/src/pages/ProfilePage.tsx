import React, { useState, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Save, 
  X, 
  Camera,
  DollarSign,
  Trophy,
  Star,
  Activity,
  LogOut,
  AlertCircle,
  Loader2
} from 'lucide-react';

import { useAuth } from '@/hooks/auth/useAuth';
import { useUser } from '@/hooks/useUser';
import type { UpdateUserProfileRequest } from '@/services/userService';

interface ProfileStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
}

interface EditableFieldProps {
  label: string;
  value: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isEditing: boolean;
  onChange: (value: string) => void;
  error?: string;
}

const ProfileStatsCard: React.FC<ProfileStatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend = 'neutral'
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className={`text-sm mt-1 font-medium ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-2xl transition-all duration-300 ${
          trend === 'up' 
            ? 'bg-green-100 group-hover:bg-green-200' 
            : trend === 'down'
            ? 'bg-red-100 group-hover:bg-red-200'
            : 'bg-blue-100 group-hover:bg-blue-200'
        }`}>
          <Icon size={24} className={`transition-transform duration-300 group-hover:scale-110 ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-blue-600'
          }`} />
        </div>
      </div>
    </div>
  );
};

const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  type = 'text',
  icon: Icon,
  isEditing,
  onChange,
  error
}) => {
  const inputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
    error ? 'border-red-300 bg-red-50' : 'border-gray-300'
  }`;
  
  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Icon size={16} className="text-gray-500" />
          {label}
        </label>
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClasses} resize-none`}
            rows={3}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
          />
        )}
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Icon size={16} className="text-gray-500" />
        {label}
      </label>
      <p className="text-gray-900 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
        {value || 'Not provided'}
      </p>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserProfileRequest>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { logout } = useAuth();
  const { 
    profile, 
    loading, 
    error, 
    updating, 
    uploadingAvatar,
    updateProfile, 
    uploadAvatar,
    deleteAvatar,
    clearError,
    refetchProfile
  } = useUser();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-red-50 p-8 rounded-2xl border border-red-200">
          <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load profile</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={refetchProfile}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Get full name
  const fullName = (profile.first_name || profile.last_name)
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : null;

  // Initialize edit form when editing starts
  const handleEdit = () => {
    setEditForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      username: profile.username || '',
      phone: profile.phone || '',
      location: profile.location || '',
      bio: profile.bio || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    clearError();
    const success = await updateProfile(editForm);
    if (success) {
      setIsEditing(false);
      setEditForm({});
    }
  };

  const handleCancel = () => {
    setEditForm({});
    setIsEditing(false);
    clearError();
  };

  const updateField = (field: keyof UpdateUserProfileRequest, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      await uploadAvatar(file);
    }
  };

  const handleDeleteAvatar = async () => {
    await deleteAvatar();
  };

  // Mock stats for now (until backend is ready)
  const statsCards = [
    {
      title: 'Portfolio Value',
      value: '$12,450',
      icon: DollarSign,
      trend: 'up' as const,
      subtitle: '+12.5% this month'
    },
    {
      title: 'Active Strategies',
      value: 5,
      icon: Activity,
      trend: 'up' as const,
      subtitle: '2 new this week'
    },
    {
      title: 'Leaderboard Rank',
      value: '#42',
      icon: Trophy,
      trend: 'up' as const,
      subtitle: '↑8 positions'
    },
    {
      title: 'Achievements',
      value: 18,
      icon: Star,
      trend: 'up' as const,
      subtitle: '3 unlocked recently'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Global error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle size={20} className="text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Header with action buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>
        
        {!isEditing ? (
          <button
            onClick={handleEdit}
            disabled={updating}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit3 size={20} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              <span>{updating ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={updating}
              className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={20} />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid - Mock data for now */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <ProfileStatsCard key={index} {...card} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EditableField
                label="First Name"
                value={isEditing ? editForm.first_name || '' : profile.first_name || ''}
                icon={User}
                isEditing={isEditing}
                onChange={(value) => updateField('first_name', value)}
              />

              <EditableField
                label="Last Name"
                value={isEditing ? editForm.last_name || '' : profile.last_name || ''}
                icon={User}
                isEditing={isEditing}
                onChange={(value) => updateField('last_name', value)}
              />

              <EditableField
                label="Username"
                value={isEditing ? editForm.username || '' : profile.username || ''}
                icon={User}
                isEditing={isEditing}
                onChange={(value) => updateField('username', value)}
              />

              <EditableField
                label="Email Address"
                value={profile.email || ''}
                type="email"
                icon={Mail}
                isEditing={false} // Email should not be editable
                onChange={() => {}}
              />

              <EditableField
                label="Phone Number"
                value={isEditing ? editForm.phone || '' : profile.phone || ''}
                type="tel"
                icon={Phone}
                isEditing={isEditing}
                onChange={(value) => updateField('phone', value)}
              />

              <EditableField
                label="Location"
                value={isEditing ? editForm.location || '' : profile.location || ''}
                icon={MapPin}
                isEditing={isEditing}
                onChange={(value) => updateField('location', value)}
              />
            </div>

            <div className="mt-6">
              <EditableField
                label="Bio"
                value={isEditing ? editForm.bio || '' : profile.bio || ''}
                type="textarea"
                icon={Edit3}
                isEditing={isEditing}
                onChange={(value) => updateField('bio', value)}
              />
            </div>
          </div>
        </div>

        {/* Profile Picture & Account Info */}
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h3>
            
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={profile.avatar || '/api/placeholder/96/96'}
                  alt={fullName || profile.username || 'Profile'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                />
                {isEditing && (
                  <div className="absolute bottom-0 right-0 flex gap-1">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingAvatar ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Camera size={16} />
                      )}
                    </button>
                    {profile.avatar && (
                      <button 
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar || updating}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-3">
                {isEditing ? 'Click camera icon to change' : 'Profile photo'}
              </p>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium text-gray-900">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  }) : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Account Type</span>
                <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm font-medium capitalize">
                  {profile.role}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Balance</span>
                <span className="font-medium text-gray-900">
                  ${typeof profile.balance === 'number' 
                    ? profile.balance.toFixed(2) 
                    : profile.balance || '0.00'}
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-medium">
                  Upgrade Account
                </button>
                
                <button
                  onClick={logout}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-medium flex items-center justify-center space-x-2"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;