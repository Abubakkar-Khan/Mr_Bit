import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as repo from './posts.repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../../../data/ascii-outputs');

export async function publishToFacebook(postRecord, isRetry = false) {
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!PAGE_ID || !ACCESS_TOKEN) {
    throw new Error('Facebook credentials are not configured in .env');
  }

  try {
    if (!isRetry) {
      repo.updatePostStatus(postRecord.id, 'pending');
    }

    const filename = path.basename(postRecord.ascii_output_path);
    const filePath = path.join(outputDir, filename);

    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const formData = new FormData();
    formData.append('source', fs.createReadStream(filePath));
    formData.append('message', postRecord.caption || '');
    formData.append('access_token', ACCESS_TOKEN);

    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/photos`;
    
    console.log(`Publishing post ${postRecord.id} to Facebook...`);
    const response = await axios.post(url, formData, {
      headers: formData.getHeaders(),
    });

    const facebookPostId = response.data.post_id || response.data.id;
    console.log(`Successfully published! FB Post ID: ${facebookPostId}`);

    repo.updatePostStatus(postRecord.id, 'posted', null, facebookPostId);
    return { success: true, facebookPostId };

  } catch (error) {
    console.error('Facebook publish failed:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message;
    repo.updatePostStatus(postRecord.id, 'failed', errorMessage);
    
    throw new Error(`Failed to publish: ${errorMessage}`);
  }
}

export async function createAndPublishPost(candidate, asciiOutputPath, caption) {
  const postRecord = repo.createPostRecord({
    candidate_id: candidate?.id || null,
    image_url: candidate?.image_url || null,
    ascii_output_path: asciiOutputPath,
    caption: caption,
    status: 'pending'
  });

  // Don't await here if we want to run in background, but for manual/cron we await
  return await publishToFacebook(postRecord);
}
