import axios from 'axios';

async function testWebSearch() {
  try {
    const response = await axios.post('http://localhost:3001/api/ai/web-search', {
      query: '贵州省人民医院',
      lang: 'zh'
    });
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('API Error Status:', error.response.status);
      console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error reaching the API:', error.message);
    }
  }
}

testWebSearch();
