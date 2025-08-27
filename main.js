document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const generateButton = document.getElementById('generateButton');
    const ctx = document.getElementById('myChart').getContext('2d');
    let myChart;

    // Example queries for user inspiration
    const exampleQueries = [
        "Show a bar chart of monthly sales",
        "Create a line chart showing website traffic over time",
        "Display a scatter plot of price vs quality ratings", 
        "Generate an area chart of revenue growth",
        "Show correlation between age and income"
    ];

    // Add example buttons
    addExampleButtons();

    generateButton.addEventListener('click', generateVisualization);
    
    // Allow Enter key to trigger generation
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateVisualization();
        }
    });

    function addExampleButtons() {
        const container = document.createElement('div');
        container.innerHTML = '<p><strong>Try these examples:</strong></p>';
        container.style.marginTop = '1em';
        
        exampleQueries.forEach(query => {
            const button = document.createElement('button');
            button.textContent = query;
            button.style.cssText = `
                display: block; 
                width: 100%; 
                margin: 0.5em 0; 
                padding: 0.5em; 
                background: #f8f9fa; 
                border: 1px solid #dee2e6; 
                border-radius: 4px; 
                cursor: pointer;
                text-align: left;
            `;
            
            button.addEventListener('click', () => {
                userInput.value = query;
                generateVisualization();
            });
            
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#e9ecef';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#f8f9fa';
            });
            
            container.appendChild(button);
        });
        
        userInput.parentNode.insertBefore(container, generateButton);
    }

    async function generateVisualization() {
        const query = userInput.value.trim();
        if (!query) {
            alert("Please enter a description for the chart.");
            return;
        }

        // UI Feedback
        generateButton.textContent = 'Generating...';
        generateButton.disabled = true;

        try {
            const response = await fetch('/generate-visualization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const spec = await response.json();
            console.log('Received specification:', spec);
            renderChart(spec);

        } catch (error) {
            console.error("Error:", error);
            alert(`Failed to generate chart: ${error.message}`);
        } finally {
            generateButton.textContent = 'Generate Chart';
            generateButton.disabled = false;
        }
    }

    function generateSampleData(geom, x, y) {
        // Generate appropriate sample data based on chart type and variables
        const dataPoints = 8;
        const labels = [];
        const values = [];
        
        // Generate labels based on x variable
        if (x.includes('month') || x.includes('time')) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
            labels.push(...months.slice(0, dataPoints));
        } else if (x.includes('year')) {
            for (let i = 0; i < dataPoints; i++) {
                labels.push((2017 + i).toString());
            }
        } else if (x.includes('region') || x.includes('location')) {
            const regions = ['North', 'South', 'East', 'West', 'Central', 'Northeast', 'Southwest', 'Southeast'];
            labels.push(...regions.slice(0, dataPoints));
        } else if (x.includes('product') || x.includes('category')) {
            const products = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E', 'Product F', 'Product G', 'Product H'];
            labels.push(...products.slice(0, dataPoints));
        } else {
            // Default generic labels
            for (let i = 1; i <= dataPoints; i++) {
                labels.push(`Item ${i}`);
            }
        }
        
        // Generate values based on y variable and chart type
        const baseValue = y.includes('price') ? 50 : y.includes('sales') ? 1000 : 50;
        const variance = baseValue * 0.4;
        
        if (geom === 'line' || geom === 'area') {
            // For line/area charts, create trending data
            let currentValue = baseValue;
            for (let i = 0; i < dataPoints; i++) {
                currentValue += (Math.random() - 0.4) * variance * 0.3;
                values.push(Math.max(0, Math.round(currentValue)));
            }
        } else if (geom === 'point') {
            // For scatter plots, create more varied data
            for (let i = 0; i < dataPoints; i++) {
                values.push(Math.round(baseValue + (Math.random() - 0.5) * variance * 2));
            }
        } else {
            // For bar charts, create varied but reasonable data
            for (let i = 0; i < dataPoints; i++) {
                values.push(Math.round(baseValue + (Math.random() - 0.5) * variance));
            }
        }
        
        return { labels, values };
    }

    function getChartColors(geom) {
        const colorSchemes = {
            point: {
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)'
            },
            line: {
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)'
            },
            bar: {
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)'
            },
            area: {
                backgroundColor: 'rgba(153, 102, 255, 0.4)',
                borderColor: 'rgba(153, 102, 255, 1)'
            }
        };
        
        return colorSchemes[geom] || colorSchemes.bar;
    }

    function renderChart(spec) {
        if (myChart) {
            myChart.destroy();
        }

        const sampleData = generateSampleData(spec.geom, spec.x, spec.y);
        const colors = getChartColors(spec.geom);
        
        // Map our grammar to Chart.js types
        const chartTypeMapping = {
            'point': 'scatter',
            'line': 'line', 
            'bar': 'bar',
            'area': 'line'
        };
        
        const chartType = chartTypeMapping[spec.geom] || 'bar';
        
        const chartData = {
            labels: sampleData.labels,
            datasets: [{
                label: spec.y || 'Values',
                data: chartType === 'scatter' ? 
                    sampleData.values.map((val, idx) => ({x: idx, y: val})) : 
                    sampleData.values,
                backgroundColor: colors.backgroundColor,
                borderColor: colors.borderColor,
                borderWidth: 2,
                fill: spec.geom === 'area' ? true : false,
                tension: spec.geom === 'line' || spec.geom === 'area' ? 0.4 : 0
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: spec.title,
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: spec.geom !== 'bar'
                }
            },
            scales: chartType !== 'scatter' ? {
                x: {
                    display: true,
                    title: { 
                        display: true, 
                        text: spec.x || 'X Axis',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y: {
                    display: true,
                    title: { 
                        display: true, 
                        text: spec.y || 'Y Axis',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: true
                }
            } : {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: { 
                        display: true, 
                        text: spec.x || 'X Axis',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y: {
                    title: { 
                        display: true, 
                        text: spec.y || 'Y Axis',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        };

        myChart = new Chart(ctx, {
            type: chartType,
            data: chartData,
            options: options
        });
        
        // Show the specification used
        showSpecification(spec);
    }
    
    function showSpecification(spec) {
        let specDiv = document.getElementById('spec-display');
        if (!specDiv) {
            specDiv = document.createElement('div');
            specDiv.id = 'spec-display';
            specDiv.style.cssText = `
                margin-top: 1em; 
                padding: 1em; 
                background: #f8f9fa; 
                border: 1px solid #dee2e6; 
                border-radius: 4px;
                font-family: monospace;
                font-size: 0.9em;
            `;
            document.getElementById('chart-container').appendChild(specDiv);
        }
        
        specDiv.innerHTML = `
            <strong>Generated Specification:</strong><br>
            <pre>${JSON.stringify(spec, null, 2)}</pre>
        `;
    }
});