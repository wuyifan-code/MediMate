import React, { useState, useRef } from 'react';
import { apiService } from '../services/apiService';
import { Camera, Mic, MapPin, Heart, Upload, Loader2, CheckCircle } from 'lucide-react';

interface EvidenceCollectorProps {
  orderId: string;
  currentPathNode: string;
  onSuccess?: () => void;
}

const EVIDENCE_TYPES = [
  { key: 'photo', label: '照片', icon: Camera, color: 'bg-blue-500' },
  { key: 'audio', label: '录音', icon: Mic, color: 'bg-purple-500' },
  { key: 'gps', label: '位置', icon: MapPin, color: 'bg-green-500' },
  { key: 'emotion', label: '情绪', icon: Heart, color: 'bg-pink-500' },
];

const EMOTIONS = [
  { key: 'happy', label: '开心', emoji: '😊' },
  { key: 'calm', label: '平静', emoji: '😌' },
  { key: 'hopeful', label: '充满希望', emoji: '🌟' },
  { key: 'grateful', label: '感恩', emoji: '🙏' },
  { key: 'anxious', label: '焦虑', emoji: '😰' },
  { key: 'worried', label: '担忧', emoji: '😟' },
  { key: 'sad', label: '难过', emoji: '😢' },
  { key: 'neutral', label: '一般', emoji: '😐' },
];

export default function EvidenceCollector({ orderId, currentPathNode, onSuccess }: EvidenceCollectorProps) {
  const [evidenceType, setEvidenceType] = useState('photo');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle GPS location capture
  const captureGps = () => {
    if (!navigator.geolocation) {
      setError('您的浏览器不支持定位功能');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(`定位失败: ${err.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  // Submit evidence
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let url = '';
      let content = '';
      let metadata: any = {};

      // Handle different evidence types
      if (evidenceType === 'photo' || evidenceType === 'audio') {
        if (!selectedFile) {
          setError(`请选择${evidenceType === 'photo' ? '图片' : '音频'}文件`);
          setLoading(false);
          return;
        }

        // Upload file first
        const formData = new FormData();
        formData.append('file', selectedFile);

        setUploadProgress(30);
        const uploadResponse = await fetch('/api/uploads/file', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('文件上传失败');
        }

        const uploadData = await uploadResponse.json();
        url = uploadData.url || uploadData.data?.url || '';

        setUploadProgress(70);

        // Add file metadata
        metadata = {
          size: selectedFile.size,
          format: selectedFile.name.split('.').pop(),
          name: selectedFile.name,
        };

        if (evidenceType === 'audio') {
          // For audio, we would need duration - simplified here
          metadata.duration = 10; // Mock
        }
      } else if (evidenceType === 'gps') {
        if (!gpsLocation) {
          setError('请先获取位置信息');
          setLoading(false);
          return;
        }
        metadata = {
          lat: gpsLocation.lat,
          lng: gpsLocation.lng,
          orderId,
        };
      } else if (evidenceType === 'emotion') {
        if (!selectedEmotion) {
          setError('请选择情绪标签');
          setLoading(false);
          return;
        }
        content = selectedEmotion;
      }

      setUploadProgress(90);

      // Submit evidence to backend
      const result = await apiService.submitEvidence({
        orderId,
        nodeName: currentPathNode,
        type: evidenceType,
        url,
        content,
        metadata,
      });

      setUploadProgress(100);
      setSuccess(true);
      setSelectedFile(null);
      setSelectedEmotion('');
      setGpsLocation(null);

      // Reset after delay
      setTimeout(() => {
        setSuccess(false);
        setUploadProgress(0);
      }, 3000);

      onSuccess?.();
    } catch (err: any) {
      console.error('Submit evidence error:', err);
      setError(err.message || '提交存证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const currentType = EVIDENCE_TYPES.find(t => t.key === evidenceType);
  const TypeIcon = currentType?.icon || Camera;

  return (
    <div className="evidence-collector-panel p-4 border rounded-lg shadow-md bg-white max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-slate-800">数字存证打卡</h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">信任协议</span>
      </div>

      <p className="text-gray-600 mb-4 text-sm">
        任务节点: <span className="text-blue-600 font-semibold">{currentPathNode}</span>
      </p>

      {/* Evidence Type Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {EVIDENCE_TYPES.map(type => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => setEvidenceType(type.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                evidenceType === type.key
                  ? `${type.color} text-white shadow-md`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon size={16} />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Upload Area */}
      <div className="mb-4">
        {(evidenceType === 'photo' || evidenceType === 'audio') && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle size={24} />
                <span className="font-medium">{selectedFile.name}</span>
              </div>
            ) : (
              <>
                <TypeIcon className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-500 text-sm">
                  点击选择{evidenceType === 'photo' ? '图片' : '音频'}文件
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  支持 {evidenceType === 'photo' ? 'JPG, PNG, WebP' : 'MP3, WAV, M4A'}
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={evidenceType === 'photo' ? 'image/*' : 'audio/*'}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {evidenceType === 'gps' && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {gpsLocation ? (
              <div className="text-green-600">
                <CheckCircle className="mx-auto mb-2" size={32} />
                <p className="font-medium">定位成功</p>
                <p className="text-sm text-gray-500 mt-1">
                  {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                </p>
              </div>
            ) : (
              <>
                <MapPin className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-500 text-sm">点击获取当前位置</p>
              </>
            )}
            <button
              onClick={captureGps}
              disabled={loading}
              className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
            >
              {gpsLocation ? '重新定位' : '获取位置'}
            </button>
          </div>
        )}

        {evidenceType === 'emotion' && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <p className="text-gray-500 text-sm mb-3 text-center">选择当前情绪状态</p>
            <div className="grid grid-cols-4 gap-2">
              {EMOTIONS.map(emotion => (
                <button
                  key={emotion.key}
                  onClick={() => setSelectedEmotion(emotion.key)}
                  className={`p-2 rounded-lg text-center transition ${
                    selectedEmotion === emotion.key
                      ? 'bg-pink-100 border-2 border-pink-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="text-2xl">{emotion.emoji}</div>
                  <div className="text-xs text-gray-600 mt-1">{emotion.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">上传中... {uploadProgress}%</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
          <CheckCircle size={18} />
          存证提交成功！信任分已更新
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || success}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            提交中...
          </>
        ) : success ? (
          <>
            <CheckCircle size={20} />
            提交成功
          </>
        ) : (
          <>
            <Upload size={20} />
            上传打卡沉淀信用
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 mt-3 text-center">
        每次有效存证将提升您的信任评分
      </p>
    </div>
  );
}
