const apiKey = "sk-cp-WK-OVoUJFfOlcMhybeFzooXwUnfz89J_YFL2ZBAiJP3EN66ypWx7wABcdT02I2AUkWY3aTGA72nt8-ymvqHFGXUdzBP5Frfb7C9HW6t8Eus0pt0YbQtdpB8";

async function testUrl(url: string) {
  console.log(`Testing URL: ${url}`);
  try {
    const response = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data).substring(0, 200));
    return response.ok;
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
    return false;
  }
}

async function run() {
  await testUrl('https://api.minimax.io/v1');
  await testUrl('https://api.minimaxi.com/v1');
  await testUrl('https://api.minimax.chat/v1');
}

run();
