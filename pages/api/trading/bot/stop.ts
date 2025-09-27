import { NextApiRequest, NextApiResponse } from 'next';
import { stopBot } from '../../../lib/botState';

interface BotStopResponse {
  success: boolean;
  message: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BotStopResponse>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  try {
    // Stop the bot
    stopBot();

    res.status(200).json({
      success: true,
      message: 'Bot stopped successfully',
    });

  } catch (error) {
    console.error('Error stopping bot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop bot',
    });
  }
}