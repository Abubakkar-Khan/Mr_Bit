import 'dotenv/config';
import axios from 'axios';

async function testFB() {
  try {
    console.log(`Testing with PAGE_ID: ${process.env.FACEBOOK_PAGE_ID}`);
    console.log(`Access Token: ${process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? 'Present (length: ' + process.env.FACEBOOK_PAGE_ACCESS_TOKEN.length + ')' : 'MISSING'}`);
    
    if (!process.env.FACEBOOK_PAGE_ID || !process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
        console.error('Credentials missing in .env!');
        return;
    }

    const res = await axios.get(`https://graph.facebook.com/v19.0/${process.env.FACEBOOK_PAGE_ID}?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`);
    console.log('\n--- SUCCESS ---');
    console.log('Page Name:', res.data.name);
    console.log('Page ID:', res.data.id);
    console.log('Your credentials are VALID!');
  } catch (error) {
    console.error('\n--- ERROR ---');
    console.error(error.response?.data?.error?.message || error.message);
    console.error('Your credentials might be invalid or lacking permissions.');
  }
}

testFB();
