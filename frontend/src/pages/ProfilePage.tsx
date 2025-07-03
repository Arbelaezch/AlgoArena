import React, { useState } from 'react';
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
  LogOut
} from 'lucide-react';

import { useAuth } from '@/hooks/auth/useAuth';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  avatar: string;
  bio: string;
  totalStrategies: number;
  activeStrategies: number;
  portfolioValue: string;
  rank: number;
  achievements: number;
}

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
  onChange
}) => {
  if (isEditing) {
    const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";
    
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
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile>({
    id: 'user_123',
    name: 'Alex Thompson',
    email: 'alex.thompson@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    joinDate: 'January 2023',
    avatar: '/api/placeholder/120/120',
    bio: 'Experienced algorithmic trader with a focus on momentum and RSI-based strategies. Always looking to optimize and improve trading performance.',
    totalStrategies: 12,
    activeStrategies: 5,
    portfolioValue: '$12,450',
    rank: 42,
    achievements: 18
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({ ...profile });
  };

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
    // Here you would typically make an API call to save the changes
    // await updateProfile(editedProfile);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
  };

  const updateField = (field: keyof UserProfile, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const statsCards = [
    {
      title: 'Portfolio Value',
      value: profile.portfolioValue,
      icon: DollarSign,
      trend: 'up' as const,
      subtitle: '+12.5% this month'
    },
    {
      title: 'Active Strategies',
      value: profile.activeStrategies,
      icon: Activity,
      trend: 'up' as const,
      subtitle: '2 new this week'
    },
    {
      title: 'Leaderboard Rank',
      value: `#${profile.rank}`,
      icon: Trophy,
      trend: 'up' as const,
      subtitle: '↑8 positions'
    },
    {
      title: 'Achievements',
      value: profile.achievements,
      icon: Star,
      trend: 'up' as const,
      subtitle: '3 unlocked recently'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>
        
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Edit3 size={20} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Save size={20} />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <X size={20} />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
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
                label="Full Name"
                value={isEditing ? editedProfile.name : profile.name}
                icon={User}
                isEditing={isEditing}
                onChange={(value) => updateField('name', value)}
              />

              <EditableField
                label="Email Address"
                value={isEditing ? editedProfile.email : profile.email}
                type="email"
                icon={Mail}
                isEditing={isEditing}
                onChange={(value) => updateField('email', value)}
              />

              <EditableField
                label="Phone Number"
                value={isEditing ? editedProfile.phone : profile.phone}
                type="tel"
                icon={Phone}
                isEditing={isEditing}
                onChange={(value) => updateField('phone', value)}
              />

              <EditableField
                label="Location"
                value={isEditing ? editedProfile.location : profile.location}
                icon={MapPin}
                isEditing={isEditing}
                onChange={(value) => updateField('location', value)}
              />
            </div>

            <div className="mt-6">
              <EditableField
                label="Bio"
                value={isEditing ? editedProfile.bio : profile.bio}
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
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                />
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105">
                    <Camera size={16} />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-3">
                {isEditing ? 'Click camera icon to change' : 'Profile photo'}
              </p>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium text-gray-900">{profile.joinDate}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Account Type</span>
                <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm font-medium">
                  Premium
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Strategies</span>
                <span className="font-medium text-gray-900">{profile.totalStrategies}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-medium">
                  Upgrade Account
                </button>
                
                <button
                  onClick={handleLogout}
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