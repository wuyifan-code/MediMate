import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Loader2, AlertCircle, Check } from 'lucide-react';
import { apiService } from '../services/apiService';
import { Language } from '../types';

interface CurrentProfile {
  name?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
}

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  currentProfile: CurrentProfile;
  lang: Language;
}

export const EditProfile: React.FC<EditProfileProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentProfile,
  lang
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; bio?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    zh: {
      title: '编辑资料',
      name: '姓名',
      namePlaceholder: '请输入姓名',
      nameRequired: '姓名不能为空',
      nameMaxLength: '姓名最多50个字符',
      phone: '手机号',
      phonePlaceholder: '请输入手机号',
      phoneInvalid: '手机号格式不正确',
      bio: '简介',
      bioPlaceholder: '介绍一下自己吧...',
      bioMaxLength: '简介最多500个字符',
      avatar: '头像',
      changeAvatar: '更换头像',
      save: '保存',
      saving: '保存中...',
      cancel: '取消',
      success: '资料更新成功',
      error: '更新失败，请稍后重试',
      uploadError: '头像上传失败'
    },
    en: {
      title: 'Edit Profile',
      name: 'Name',
      namePlaceholder: 'Enter your name',
      nameRequired: 'Name is required',
      nameMaxLength: 'Name cannot exceed 50 characters',
      phone: 'Phone',
      phonePlaceholder: 'Enter phone number',
      phoneInvalid: 'Invalid phone number format',
      bio: 'Bio',
      bioPlaceholder: 'Tell us about yourself...',
      bioMaxLength: 'Bio cannot exceed 500 characters',
      avatar: 'Avatar',
      changeAvatar: 'Change Avatar',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      success: 'Profile updated successfully',
      error: 'Update failed, please try again',
      uploadError: 'Failed to upload avatar'
    }
  }[lang];

  useEffect(() => {
    if (isOpen && currentProfile) {
      setFormData({
        name: currentProfile.name || '',
        phone: currentProfile.phone || '',
        bio: currentProfile.bio || ''
      });
      setAvatarPreview(currentProfile.avatar_url || '');
      setAvatarFile(null);
      setErrors({});
    }
  }, [isOpen, currentProfile]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; phone?: string; bio?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t.nameRequired;
    } else if (formData.name.length > 50) {
      newErrors.name = t.nameMaxLength;
    }

    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = t.phoneInvalid;
    }

    if (formData.bio.length > 500) {
      newErrors.bio = t.bioMaxLength;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert(lang === 'zh' ? '请上传图片文件' : 'Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(lang === 'zh' ? '图片大小不能超过5MB' : 'Image size cannot exceed 5MB');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    setUploadingAvatar(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', avatarFile);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/uploads/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('medimate_access_token')}`
        },
        body: formDataUpload
      });

      const result = await response.json();
      if (result.success && result.data?.url) {
        return result.data.url;
      }
      throw new Error(result.message || 'Upload failed');
    } catch (error) {
      console.error('Avatar upload error:', error);
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let avatarUrl = currentProfile.avatar_url;

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const updateData: {
        name: string;
        phone?: string;
        bio?: string;
        avatar_url?: string;
      } = {
        name: formData.name.trim()
      };

      if (formData.phone) {
        updateData.phone = formData.phone.trim();
      }

      if (formData.bio) {
        updateData.bio = formData.bio.trim();
      }

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const updatedUser = await apiService.updateUserProfile(updateData);
      
      onSuccess(updatedUser);
      onClose();
    } catch (error) {
      console.error('Update profile error:', error);
      alert(t.error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
          <h2 className="text-xl font-bold text-slate-900">{t.title}</h2>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Camera className="h-10 w-10" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              {t.changeAvatar}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {t.name} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t.namePlaceholder}
                maxLength={50}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.name 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-slate-200 focus:border-teal-500'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.name}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400 text-right">
                {formData.name.length}/50
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {t.phone}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t.phonePlaceholder}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.phone 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-slate-200 focus:border-teal-500'
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {t.bio}
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder={t.bioPlaceholder}
                maxLength={500}
                rows={4}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                  errors.bio 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-slate-200 focus:border-teal-500'
                }`}
              />
              {errors.bio && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.bio}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400 text-right">
                {formData.bio.length}/500
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploadingAvatar}
            className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t.saving}
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                {t.save}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
