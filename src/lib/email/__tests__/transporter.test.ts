import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    }),
  },
}));

import nodemailer from 'nodemailer';
import { getTransporter, isEmailConfigured } from '../transporter';
import { renderAlertEmail } from '../templates/alert-notification';

describe('transporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton between tests
    vi.resetModules();
  });

  it('getTransporter returns a transporter object', async () => {
    // Re-import to get fresh module
    const mod = await import('../transporter');
    const transporter = mod.getTransporter();
    expect(transporter).toBeDefined();
    expect(transporter).toHaveProperty('sendMail');
  });

  it('isEmailConfigured returns false when SMTP_HOST not set', () => {
    const origHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    // isEmailConfigured checks process.env directly
    expect(isEmailConfigured()).toBe(false);

    if (origHost) process.env.SMTP_HOST = origHost;
  });

  it('isEmailConfigured returns true when SMTP_HOST is set', () => {
    const origHost = process.env.SMTP_HOST;
    process.env.SMTP_HOST = 'smtp.example.com';

    expect(isEmailConfigured()).toBe(true);

    if (origHost) {
      process.env.SMTP_HOST = origHost;
    } else {
      delete process.env.SMTP_HOST;
    }
  });
});

describe('renderAlertEmail', () => {
  it('returns subject and html with expected content', () => {
    const result = renderAlertEmail({
      alertType: 'brand_appeared',
      brandName: 'Acme Corp',
      keywordLabel: 'best CRM software',
      previousValue: '0.0000',
      currentValue: '0.5000',
      providerId: 'chatgpt',
    });

    expect(result.subject).toContain('brand_appeared');
    expect(result.subject).toContain('Acme Corp');
    expect(result.subject).toContain('best CRM software');
    expect(result.html).toContain('brand_appeared');
    expect(result.html).toContain('Acme Corp');
    expect(result.html).toContain('best CRM software');
    expect(result.html).toContain('chatgpt');
    expect(result.html).toContain('0.0000');
    expect(result.html).toContain('0.5000');
  });
});
