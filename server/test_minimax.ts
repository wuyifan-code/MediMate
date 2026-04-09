import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function testMiniMax() {
  const apiKey = process.env.MINIMAX_API_KEY;
  const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';
  const baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1';

  console.log('Testing MiniMax API with:');
  console.log(`- API Key: ${apiKey ? (apiKey.substring(0, 5) + '...') : 'MISSING'}`);
  console.log(`- Model: ${model}`);
  console.log(`- Base URL: ${baseUrl}`);

  if (!apiKey) {
    console.error('ERROR: MINIMAX_API_KEY is not set in .env');
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: 'Hello, are you online? Answer in 5 words.' }
        ],
      }),
    });

    console.log(`Status: ${response.status}`);
    const data: any = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.choices && data.choices.length > 0) {
      console.log('SUCCESS! AI Response:', data.choices[0].message.content);
    } else {
      console.error('FAILED: No choices in response.');
    }
  } catch (error) {
    console.error('ERROR during API call:', error);
  }
}

testMiniMax();
