// Simple test script to verify the AI integration works
const test = async () => {
  console.log('🧪 Testing AI integration endpoints...');
  
  try {
    // Test main product prompt endpoint
    const promptResponse = await fetch('http://localhost:3000/api/admin/main-product-prompt', {
      method: 'GET',
    });
    console.log('✅ Main Product Prompt endpoint accessible:', promptResponse.ok);
    
    // Test chat init endpoint
    const initResponse = await fetch('http://localhost:3000/api/phase/chat/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'test-session',
        productId: '1'
      }),
    });
    console.log('✅ Chat init endpoint accessible:', initResponse.ok);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run test if Node.js environment supports fetch
if (typeof fetch !== 'undefined') {
  test();
} else {
  console.log('💡 Test script ready - run after starting dev server');
}