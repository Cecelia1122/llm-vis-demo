const express = require('express');
const path = require('path');

// --- CONFIGURATION ---
const app = express();
// Use Render's PORT environment variable or fallback to 3000 for local development
const port = process.env.PORT || 3000;

// IMPORTANT: REPLACE with your actual Hugging Face API key
const HF_API_KEY = process.env.HF_API_KEY ;
const HF_API_URL = 'https://api-inference.huggingface.co/models/gpt2';

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

// Helper function to call Hugging Face API
async function callHuggingFaceAPI(prompt) {
    try {
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: 200,
                    temperature: 0.3,
                    return_full_text: false
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Hugging Face API error: ${response.status}`);
        }

        const result = await response.json();
        return result[0]?.generated_text || '';
    } catch (error) {
        console.error('Hugging Face API Error:', error);
        throw error;
    }
}

// Function to extract JSON from LLM response
function extractJSONFromResponse(text) {
    // Try to find JSON pattern in the response
    const jsonMatch = text.match(/\{[^}]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            // If parsing fails, return null
        }
    }
    return null;
}

// Function to generate fallback visualization based on keywords
function generateFallbackVisualization(query) {
    const lowerQuery = query.toLowerCase();
    
    // Detect chart type from keywords
    let geom = 'bar'; // default
    if (lowerQuery.includes('scatter') || lowerQuery.includes('correlation') || lowerQuery.includes('relationship')) {
        geom = 'point';
    } else if (lowerQuery.includes('line') || lowerQuery.includes('trend') || lowerQuery.includes('time') || lowerQuery.includes('over time')) {
        geom = 'line';
    } else if (lowerQuery.includes('area') || lowerQuery.includes('filled')) {
        geom = 'area';
    }
    
    // Extract likely variable names
    let x = 'categories';
    let y = 'values';
    
    if (lowerQuery.includes('price')) y = 'price';
    if (lowerQuery.includes('sales')) y = 'sales';
    if (lowerQuery.includes('revenue')) y = 'revenue';
    if (lowerQuery.includes('count')) y = 'count';
    if (lowerQuery.includes('amount')) y = 'amount';
    
    if (lowerQuery.includes('month')) x = 'months';
    if (lowerQuery.includes('year')) x = 'years';
    if (lowerQuery.includes('region')) x = 'regions';
    if (lowerQuery.includes('category')) x = 'categories';
    if (lowerQuery.includes('product')) x = 'products';
    
    // Generate title
    const title = query.charAt(0).toUpperCase() + query.slice(1);
    
    return {
        geom: geom,
        title: title.length > 50 ? title.substring(0, 47) + '...' : title,
        x: x,
        y: y
    };
}

// Main API endpoint
app.post('/generate-visualization', async (req, res) => {
    const userQuery = req.body.query;

    if (!userQuery) {
        return res.status(400).json({ error: 'Query is required.' });
    }

    try {
        console.log("Processing query:", userQuery);
        
        // Create a structured prompt for the LLM
        const prompt = `Convert this visualization request to JSON format:
Query: "${userQuery}"

Return a JSON object with these fields:
- geom: chart type ("point", "line", "bar", or "area")  
- title: descriptive chart title
- x: x-axis variable name
- y: y-axis variable name

JSON:`;

        let vizSpec;
        
        try {
            // Try to get response from Hugging Face
            const llmResponse = await callHuggingFaceAPI(prompt);
            console.log("LLM Response:", llmResponse);
            
            // Try to extract JSON from the response
            vizSpec = extractJSONFromResponse(llmResponse);
            
            if (!vizSpec) {
                console.log("Could not extract JSON from LLM, using fallback");
                vizSpec = generateFallbackVisualization(userQuery);
            }
        } catch (error) {
            console.log("LLM call failed, using fallback:", error.message);
            vizSpec = generateFallbackVisualization(userQuery);
        }
        
        // Validate the generated specification
        if (!vizSpec.geom || !['point', 'line', 'bar', 'area'].includes(vizSpec.geom)) {
            vizSpec.geom = 'bar';
        }
        if (!vizSpec.title) {
            vizSpec.title = 'Generated Visualization';
        }
        if (!vizSpec.x) {
            vizSpec.x = 'categories';
        }
        if (!vizSpec.y) {
            vizSpec.y = 'values';
        }

        console.log("Final specification:", vizSpec);
        res.json(vizSpec);

    } catch (error) {
        console.error("Error generating visualization:", error);
        
        // Return fallback even on complete failure
        const fallback = generateFallbackVisualization(userQuery);
        res.json(fallback);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint to serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Using Hugging Face API for LLM inference`);
});