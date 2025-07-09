const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

async function testS3Connection() {
  console.log('🔄 Testing S3 connection...');
  console.log('Bucket:', process.env.AWS_S3_BUCKET);
  console.log('Region:', process.env.AWS_REGION);
  
  try {
    // Test upload
    const result = await s3.upload({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: 'test-connection.txt',
      Body: 'Hello from App Ecosystem!',
      ContentType: 'text/plain'
    }).promise();
    
    console.log('✅ S3 connection successful!');
    console.log('📁 File uploaded to:', result.Location);
    
    // Clean up test file
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: 'test-connection.txt'
    }).promise();
    
    console.log('🧹 Test file cleaned up');
    console.log('🎉 S3 setup is working perfectly!');
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    console.error('🔍 Error details:', error.code || error);
  }
}

testS3Connection();