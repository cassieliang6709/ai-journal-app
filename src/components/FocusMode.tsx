import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Play, Pause, Clock, Sparkles, RotateCcw } from 'lucide-react';
import { generateQuickStartSuggestion } from '../lib/ai';
import type { Todo } from '../types';

interface FocusModeProps {
  duration: number;
  task: Todo;
  onClose: () => void;
  onComplete: () => void;
}

const NOISE_SOURCES = [
  { 
    name: '火焰',
    url: 'https://assets.mixkit.co/active_storage/sfx/2438/2438-preview.mp3'
  },
  {
    name: '雨声',
    url: 'https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3'
  },
  {
    name: '鸟叫',
    url: 'https://assets.mixkit.co/active_storage/sfx/2434/2434-preview.mp3'
  }
];

const CIRCLE_RADIUS = 88;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function FocusMode({ duration, task, onClose, onComplete }: FocusModeProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNoise, setSelectedNoise] = useState(NOISE_SOURCES[0]);
  const [volume, setVolume] = useState(0.5);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{
    quickStart: string;
    completion: string;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [quickStartRefreshCount, setQuickStartRefreshCount] = useState(0);
  const MAX_REFRESH = 5;

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const result = await generateQuickStartSuggestion(task);
        setSuggestions(result);
      } catch (error) {
        console.error('获取建议失败:', error);
      }
    };
    loadSuggestions();
  }, [task]);

  useEffect(() => {
    const audio = new Audio();
    audio.src = selectedNoise.url;
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    const handleCanPlay = () => {
      setAudioLoaded(true);
      setAudioError(null);
    };

    const handleError = () => {
      setAudioError('音频加载失败，请尝试其他音效');
      setAudioLoaded(false);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, [selectedNoise.url]);

  useEffect(() => {
    if (!audioRef.current || !audioLoaded) return;

    audioRef.current.volume = volume;
    
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('播放失败:', error);
          setAudioError('播放失败，请重试');
          setIsPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, volume, audioLoaded]);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isPlaying && timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeLeft, onComplete]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleNoiseChange = (noise: typeof NOISE_SOURCES[0]) => {
    setSelectedNoise(noise);
    setAudioLoaded(false);
    setAudioError(null);
    if (audioRef.current) {
      audioRef.current.src = noise.url;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - timeLeft / (duration * 60));

  const handleRefreshSuggestion = async (type: 'quickStart' | 'completion') => {
    const count = type === 'quickStart' ? quickStartRefreshCount : refreshCount;
    if (count >= MAX_REFRESH) return;
    
    try {
      const result = await generateQuickStartSuggestion(task);
      setSuggestions(result);
      if (type === 'quickStart') {
        setQuickStartRefreshCount(prev => prev + 1);
      } else {
        setRefreshCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('刷新建议失败:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">专注模式</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="relative w-48 h-48 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r={CIRCLE_RADIUS}
                className="stroke-current text-gray-200"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r={CIRCLE_RADIUS}
                className="stroke-current text-blue-500"
                strokeWidth="12"
                fill="none"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-800">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <button
            onClick={togglePlay}
            className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
            <span className="ml-2">{isPlaying ? '暂停' : '开始'}</span>
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">背景音效</h3>
          {audioError && (
            <div className="text-sm text-red-500 mb-2">{audioError}</div>
          )}
          <div className="flex gap-2">
            {NOISE_SOURCES.map((noise) => (
              <button
                key={noise.name}
                onClick={() => handleNoiseChange(noise)}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedNoise === noise
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {noise.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <VolumeX className="w-5 h-5 text-gray-500" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1"
            />
            <Volume2 className="w-5 h-5 text-gray-500" />
          </div>
        </div>

        {suggestions && (
          <div className="space-y-4 mt-6">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-purple-700 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  1分钟快速启动
                </h3>
                <button
                  onClick={() => handleRefreshSuggestion('quickStart')}
                  disabled={quickStartRefreshCount >= MAX_REFRESH}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                    quickStartRefreshCount >= MAX_REFRESH
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-purple-600 hover:text-purple-700'
                  }`}
                >
                  <RotateCcw className={`w-4 h-4 ${
                    quickStartRefreshCount >= MAX_REFRESH ? '' : 'hover:rotate-180 transition-transform'
                  }`} />
                  <span className="text-xs">
                    {quickStartRefreshCount >= MAX_REFRESH ? '已达上限' : `换一换 (${MAX_REFRESH - quickStartRefreshCount})`}
                  </span>
                </button>
              </div>
              <p className="text-purple-600">
                {suggestions.quickStart}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-green-700">
                  完成建议
                </h3>
                <button
                  onClick={() => handleRefreshSuggestion('completion')}
                  disabled={refreshCount >= MAX_REFRESH}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                    refreshCount >= MAX_REFRESH
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-green-600 hover:text-green-700'
                  }`}
                >
                  <RotateCcw className={`w-4 h-4 ${
                    refreshCount >= MAX_REFRESH ? '' : 'hover:rotate-180 transition-transform'
                  }`} />
                  <span className="text-xs">
                    {refreshCount >= MAX_REFRESH ? '已达上限' : `换一换 (${MAX_REFRESH - refreshCount})`}
                  </span>
                </button>
              </div>
              <div className="text-green-600 whitespace-pre-line">
                {suggestions.completion}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

export default FocusMode;