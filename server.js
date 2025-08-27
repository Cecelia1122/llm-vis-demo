const express = require('express');
const path = require('path');

// --- CONFIGURATION ---
const app = express();
const port = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Advanced NLP-style processing without external APIs
function parseVisualizationQuery(query) {
    console.log('🔍 Parsing query:', query);
    
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);
    
    // Chart type detection with scoring
    const chartTypes = {
        'bar': {
            keywords: ['bar', 'column', 'compare', 'comparison', 'between', 'categorical'],
            score: 0
        },
        'line': {
            keywords: ['line', 'trend', 'time', 'over time', 'timeline', 'progression', 'change', 'series'],
            score: 0
        },
        'point': {
            keywords: ['scatter', 'correlation', 'relationship', 'vs', 'against', 'compared to', 'plot'],
            score: 0
        },
        'area': {
            keywords: ['area', 'filled', 'cumulative', 'stacked', 'under curve'],
            score: 0
        }
    };
    
    // Score each chart type
    for (const [type, config] of Object.entries(chartTypes)) {
        config.keywords.forEach(keyword => {
            if (lowerQuery.includes(keyword)) {
                config.score += 1;
            }
        });
        
        // Bonus for exact matches
        words.forEach(word => {
            if (config.keywords.includes(word)) {
                config.score += 0.5;
            }
        });
    }
    
    // Choose best chart type
    let bestType = 'bar';
    let bestScore = chartTypes.bar.score;
    
    for (const [type, config] of Object.entries(chartTypes)) {
        if (config.score > bestScore) {
            bestType = type;
            bestScore = config.score;
        }
    }
    
    // Variable extraction with context awareness
    const variableExtractor = {
        temporal: ['month', 'year', 'quarter', 'week', 'day', 'time', 'date', 'period'],
        categorical: ['category', 'type', 'region', 'location', 'department', 'product', 'brand'],
        quantitative: ['sales', 'revenue', 'price', 'cost', 'count', 'amount', 'total', 'rating', 'score']
    };
    
    let xVar = 'categories';
    let yVar = 'values';
    
    // Find temporal indicators for x-axis
    for (const temporal of variableExtractor.temporal) {
        if (lowerQuery.includes(temporal)) {
            if (temporal.includes('month')) xVar = 'months';
            else if (temporal.includes('year')) xVar = 'years';
            else if (temporal.includes('quarter')) xVar = 'quarters';
            else if (temporal.includes('week')) xVar = 'weeks';
            else xVar = 'time_periods';
            break;
        }
    }
    
    // Find categorical indicators for x-axis
    if (xVar === 'categories') {
        for (const categorical of variableExtractor.categorical) {
            if (lowerQuery.includes(categorical)) {
                if (categorical.includes('region') || categorical.includes('location')) xVar = 'regions';
                else if (categorical.includes('product')) xVar = 'products';
                else if (categorical.includes('department')) xVar = 'departments';
                else xVar = categorical + 's';
                break;
            }
        }
    }
    
    // Find quantitative indicators for y-axis
    for (const quantitative of variableExtractor.quantitative) {
        if (lowerQuery.includes(quantitative)) {
            yVar = quantitative;
            break;
        }
    }
    
    // Generate intelligent title
    let title = query.trim();
    
    // Remove command words
    title = title.replace(/^(show|create|display|generate|make|build|plot|chart|graph)\s+/i, '');
    title = title.replace(/^(a|an|the)\s+/i, '');
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Add chart type to title if not present
    const hasChartType = ['chart', 'graph', 'plot'].some(word => 
        title.toLowerCase().includes(word)
    );
    
    if (!hasChartType) {
        const chartTypeNames = {
            'bar': 'Bar Chart',
            'line': 'Line Chart', 
            'point': 'Scatter Plot',
            'area': 'Area Chart'
        };
        
        // Only add if title is short
        if (title.length < 30) {
            title = `${title} - ${chartTypeNames[bestType]}`;
        }
    }
    
    // Limit title length
    if (title.length > 60) {
        title = title.substring(0, 57) + '...';
    }
    
    const result = {
        geom: bestType,
        title: title || 'Data Visualization',
        x: xVar,
        y: yVar,
        confidence: bestScore > 0 ? 'high' : 'medium'
    };
    
    console.log('📊 Parsed result:', result);
    return result;
}

// Enhanced visualization generation
app.post('/generate-visualization', async (req, res) => {
    const userQuery = req.body.query;

    if (!userQuery) {
        return res.status(400).json({ error: 'Query is required.' });
    }

    console.log('\n=== PROCESSING VISUALIZATION REQUEST ===');
    console.log('Query:', userQuery);

    try {
        const vizSpec = parseVisualizationQuery(userQuery);
        
        // Validate the specification
        const validatedSpec = {
            geom: ['point', 'line', 'bar', 'area'].includes(vizSpec.geom) ? vizSpec.geom : 'bar',
            title: (vizSpec.title && typeof vizSpec.title === 'string') ? 
                   vizSpec.title.substring(0, 100) : 'Data Visualization',
            x: (vizSpec.x && typeof vizSpec.x === 'string') ? 
               vizSpec.x.substring(0, 50) : 'categories',
            y: (vizSpec.y && typeof vizSpec.y === 'string') ? 
               vizSpec.y.substring(0, 50) : 'values'
        };

        console.log('✅ Final specification:', validatedSpec);
        res.json(validatedSpec);

    } catch (error) {
        console.error('❌ Error processing query:', error);
        
        // Ultra-simple fallback
        res.json({
            geom: 'bar',
            title: userQuery.charAt(0).toUpperCase() + userQuery.slice(1),
            x: 'categories',
            y: 'values'
        });
    }
});

// Simple health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mode: 'fallback-only',
        message: 'Using advanced pattern matching instead of external APIs'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log('🧠 Using intelligent fallback processing (no external APIs)');
});