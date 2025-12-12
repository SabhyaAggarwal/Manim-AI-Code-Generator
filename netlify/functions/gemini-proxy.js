exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Validate that prompt is provided
    if (!requestBody.prompt || typeof requestBody.prompt !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required and must be a string' })
      };
    }

    // Prepare the request to Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const geminiRequestBody = {
      contents: [
        {
          parts: [
            {
              text: `You are a Manim code generator.If there is any plain text or string, prefer using British English. Output only valid Python code as plain text. Do not explain anything. Do not format using triple quotes or markdown.\nPrompt:\n${requestBody.prompt}`
            }
          ]
        }
      ]
    };

    // Make request to Gemini API
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = 'Failed to generate code. Please try again';
      if (errorData && errorData.error && errorData.error.message) {
        errorMessage += ': ' + errorData.error.message;
      }
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: errorMessage })
      };
    }

    // Parse successful response
    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanedResult = result?.replace(/^```[a-z]*\n?|```$/g, '').trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        code: cleanedResult || 'No code generated.'
      })
    };

  } catch (error) {
    console.error('Error in gemini-proxy function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
