import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  formatRelativeTime,
  formatDuration,
} from '@/utils/formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format date correctly in Chinese', () => {
      const result = formatDate('2024-03-15', 'zh');
      expect(result).toBe('2024/03/15');
    });

    it('should format date correctly in English', () => {
      const result = formatDate('2024-03-15', 'en');
      expect(result).toBe('03/15/2024');
    });

    it('should return empty string for empty input', () => {
      expect(formatDate('')).toBe('');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const result = formatTime('2024-03-15T14:30:00');
      expect(result).toContain('14:30');
    });

    it('should return empty string for empty input', () => {
      expect(formatTime('')).toBe('');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in Chinese Yuan', () => {
      expect(formatCurrency(1000)).toBe('¥10.00');
      expect(formatCurrency(0)).toBe('¥0.00');
    });

    it('should return ¥0.00 for undefined or null', () => {
      expect(formatCurrency(undefined)).toBe('¥0.00');
      expect(formatCurrency(null)).toBe('¥0.00');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in Chinese', () => {
      expect(formatDuration(90)).toBe('1小时30分钟');
      expect(formatDuration(60)).toBe('1小时');
      expect(formatDuration(45)).toBe('45分钟');
    });

    it('should return 0分钟 for zero or negative input', () => {
      expect(formatDuration(0)).toBe('0分钟');
      expect(formatDuration(-5)).toBe('0分钟');
    });
  });
});
