const express = require('express');
const path = require('path');

// --- CONFIGURATION ---
const app = express();
// Use Render's PORT environment variable or fallback to 3000 for local development
const port = process.env.PORT || 3000;

// IMPORTANT: REPLACE with your actual Hugging Face API key
const HF_API_KEY = process.env.HF_API_KEY;
// Updated to use a more reliable model that supports JSON generation
const HF_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';

// Alternative models you can try:
// const HF_API_URL = 'https://api-inference.huggingface.co/models/gpt2';
// const HF_API_URL = 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill';

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- THE CORE LOGIC ---
const visualizationSchema = {
    "type": "object",
    "properties": {
        "geom": {
            "type": "string",
            "description": "The type of chart following Grammar of Graphics. Must be 'point', 'line', 'bar', or 'area'.",
            "enum": ["point", "line", "bar", "area"]
        },
        "title": {
            "type": "string",
            "description": "A concise, descriptive title for the chart."
        },
        "x": {
            "type": "string", 
            "description": "Variable name for the X-axis data."
        },
        "y": {
            "type": "string",
            "description": "Variable name for the Y-axis data."
        },
        "color": {
            "type": "string",
            "description": "Optional: Variable name for color grouping."
        }
    },
    "required": ["geom", "title", "x", "y"]
};

// Helper function to call Hugging Face API with better error handling
async function callHuggingFaceAPI(prompt) {
    if (!HF_API_KEY) {
        throw new Error('HF_API_KEY environment variable is not set');
    }

    try {
        console.log('Making request to Hugging Face API...');
        
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'LLM-Vis-App/1.0'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: 150,
                    temperature: 0.7,
                    do_sample: true,
                    return_full_text: false,
                    pad_token_id: 50256
                },
                options: {
                    wait_for_model: true,
                    use_cache: false
                }
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('API Response:', result);
        
        // Handle different response formats
        if (Array.isArray(result) && result.length > 0) {
            return result[0]?.generated_text || result[0]?.text || '';
        } else if (result.generated_text) {
            return result.generated_text;
        } else {
            return '';
        }
    } catch (error) {
        console.error('Hugging Face API Error:', error);
        throw error;
    }
}

// Alternative function using a simpler model approach
async function callHuggingFaceAPISimple(prompt) {
    if (!HF_API_KEY) {
        throw new Error('HF_API_KEY environment variable is not set');
    }

    const GPT2_URL = 'https://api-inference.huggingface.co/models/gpt2';
    
    try {
        const response = await fetch(GPT2_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: 100,
                    temperature: 0.3,
                    return_full_text: false
                },
                // --- ADD THIS OBJECT ---
                options: {
                    wait_for_model: true
                }
                // -----------------------
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result[0]?.generated_text || '';
    } catch (error) {
        console.error('GPT-2 API Error:', error);
        throw error;
    }
}

// Function to extract JSON from LLM response with better parsing
function extractJSONFromResponse(text) {
    console.log('Attempting to extract JSON from:', text);
    
    // Clean the text first
    const cleanText = text.replace(/```json|```/g, '').trim();
    
    // Try multiple JSON extraction patterns
    const patterns = [
        /\{[^{}]*"geom"[^{}]*\}/g,  // Look for objects containing "geom"
        /\{[^}]*\}/g,                // General JSON objects
        /"geom":\s*"[^"]*"/g         // Just the geom field to build from
    ];
    
    for (const pattern of patterns) {
        const matches = cleanText.match(pattern);
        if (matches) {
            for (const match of matches) {
                try {
                    const parsed = JSON.parse(match);
                    if (parsed.geom) {
                        return parsed;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
    }
    
    return null;
}

// Enhanced fallback function with better keyword detection
function generateFallbackVisualization(query) {
    console.log('Generating fallback for query:', query);
    
    const lowerQuery = query.toLowerCase();
    
    // Detect chart type from keywords
    let geom = 'bar'; // default
    if (lowerQuery.includes('scatter') || lowerQuery.includes('correlation') || 
        lowerQuery.includes('relationship') || lowerQuery.includes('vs') ||
        lowerQuery.includes('against')) {
        geom = 'point';
    } else if (lowerQuery.includes('line') || lowerQuery.includes('trend') || 
               lowerQuery.includes('time') || lowerQuery.includes('over time') ||
               lowerQuery.includes('timeline') || lowerQuery.includes('progression')) {
        geom = 'line';
    } else if (lowerQuery.includes('area') || lowerQuery.includes('filled') ||
               lowerQuery.includes('cumulative')) {
        geom = 'area';
    }
    
    // Extract likely variable names with better detection
    let x = 'categories';
    let y = 'values';
    
    // Y-axis detection
    const yKeywords = {
        'price': ['price', 'cost', 'expense'],
        'sales': ['sales', 'revenue', 'earnings'],
        'count': ['count', 'number', 'quantity'],
        'amount': ['amount', 'total', 'sum'],
        'rating': ['rating', 'score', 'quality'],
        'traffic': ['traffic', 'visits', 'views'],
        'growth': ['growth', 'increase', 'change']
    };
    
    for (const [key, keywords] of Object.entries(yKeywords)) {
        if (keywords.some(keyword => lowerQuery.includes(keyword))) {
            y = key;
            break;
        }
    }
    
    // X-axis detection
    const xKeywords = {
        'months': ['month', 'monthly', 'jan', 'feb', 'mar'],
        'years': ['year', 'yearly', 'annual'],
        'regions': ['region', 'location', 'area', 'city'],
        'categories': ['category', 'type', 'kind'],
        'products': ['product', 'item', 'goods'],
        'time': ['time', 'period', 'date']
    };
    
    for (const [key, keywords] of Object.entries(xKeywords)) {
        if (keywords.some(keyword => lowerQuery.includes(keyword))) {
            x = key;
            break;
        }
    }
    
    // Generate a meaningful title
    let title = query.charAt(0).toUpperCase() + query.slice(1);
    if (title.length > 50) {
        title = title.substring(0, 47) + '...';
    }
    
    // Remove common prefixes for cleaner titles
    title = title.replace(/^(show|create|display|generate)\s+/i, '');
    title = title.replace(/^(a|an|the)\s+/i, '');
    
    return {
        geom: geom,
        title: title || 'Generated Visualization',
        x: x,
        y: y
    };
}

// Main API endpoint with improved error handling
app.post('/generate-visualization', async (req, res) => {
    const userQuery = req.body.query;

    if (!userQuery) {
        return res.status(400).json({ error: 'Query is required.' });
    }

    console.log("Processing query:", userQuery);
    
    // Check if API key is available
    if (!HF_API_KEY) {
        console.log("No HF_API_KEY found, using fallback only");
        const fallback = generateFallbackVisualization(userQuery);
        return res.json(fallback);
    }

    try {
        // Create a more structured prompt for better JSON generation
        const prompt = `Task: Convert visualization request to JSON.

Request: "${userQuery}"

Required JSON format:
{
  "geom": "point|line|bar|area",
  "title": "Chart Title",
  "x": "x_axis_variable", 
  "y": "y_axis_variable"
}

JSON response:`;

        let vizSpec = null;
        
        try {
            // Try primary API call
            const llmResponse = await callHuggingFaceAPISimple(prompt);
            console.log("LLM Response:", llmResponse);
            
            if (llmResponse) {
                vizSpec = extractJSONFromResponse(llmResponse);
            }
            
            if (!vizSpec) {
                console.log("Could not extract valid JSON from LLM response");
            }
        } catch (error) {
            console.log("LLM API call failed:", error.message);
        }
        
        // Use fallback if LLM didn't work
        if (!vizSpec) {
            console.log("Using fallback visualization generation");
            vizSpec = generateFallbackVisualization(userQuery);
        }
        
        // Validate and clean the specification
        vizSpec = validateAndCleanSpec(vizSpec);

        console.log("Final specification:", vizSpec);
        res.json(vizSpec);

    } catch (error) {
        console.error("Error in visualization generation:", error);
        
        // Always return a valid fallback
        const fallback = generateFallbackVisualization(userQuery);
        res.json(fallback);
    }
});

// Function to validate and clean the specification
function validateAndCleanSpec(spec) {
    const validGeoms = ['point', 'line', 'bar', 'area'];
    
    return {
        geom: validGeoms.includes(spec.geom) ? spec.geom : 'bar',
        title: (spec.title && typeof spec.title === 'string') ? 
               spec.title.substring(0, 100) : 'Generated Visualization',
        x: (spec.x && typeof spec.x === 'string') ? 
           spec.x.substring(0, 50) : 'categories',
        y: (spec.y && typeof spec.y === 'string') ? 
           spec.y.substring(0, 50) : 'values'
    };
}

// Health check endpoint with more details
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        hasApiKey: !!HF_API_KEY,
        apiKeyLength: HF_API_KEY ? HF_API_KEY.length : 0
    });
});

// API key test endpoint (for debugging)
// Replace the entire app.get('/test-api', ...) block with this one
app.get('/test-api', async (req, res) => {
    console.log('--- RUNNING NEW API DEBUG TEST (Sentence Similarity) ---');
    if (!HF_API_KEY) {
        return res.status(500).json({ error: 'No API key configured' });
    }

    try {
        const API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_API_KEY}`,
                         'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: ["This is a test sentence."] }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} - ${await response.text()}`);
        }

        const result = await response.json();
        res.json({
            success: true,
            message: "Successfully connected to Hugging Face API with Sentence Similarity model.",
            model: "sentence-transformers/all-MiniLM-L6-v2",
            response_type: typeof result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to connect to Hugging Face API.",
            error: error.message
        });
    }
});

// Root endpoint to serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`HF API Key configured: ${!!HF_API_KEY}`);
    console.log(`Using Hugging Face API for LLM inference`);
});