/**
 * Food Ingredient Analyzer - Main Application Logic
 * Handles user interactions, API communication, and results display
 */

// Configuration
const BACKEND_URL = 'http://localhost:5000/analyze';

// Initialize and configure markdown renderer
const markedRenderer = new marked.Renderer();
marked.setOptions({
    renderer: markedRenderer,
    gfm: true,
    breaks: true,
    sanitize: false,
    smartypants: true
});

// Main scan button event handler
document.getElementById('scanButton').addEventListener('click', async () => {
    const imageFile = document.getElementById('imageInput').files[0];
    if (!imageFile) {
        showError('Please select an image first');
        return;
    }

    // Reset previous results
    clearResults();
    
    try {
        // Step 1: Perform OCR on the image
        const extractedText = await performOCR(imageFile);
        
        // Step 2: Display extracted text
        displayExtractedText(extractedText);

        // Step 3: Send to backend for analysis
        document.getElementById('loadingIndicator').classList.remove('hidden');
        document.getElementById('ocrProgressText').textContent = 'Analyzing ingredients...';
        document.getElementById('ocrProgress').style.width = '50%';
        
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ingredients: extractedText })
        });

        // Step 4: Process and display the response
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        document.getElementById('ocrProgress').style.width = '100%';
        document.getElementById('ocrProgressText').textContent = 'Analysis complete!';
        
        // Hide loading indicator after a slight delay
        setTimeout(() => {
            document.getElementById('loadingIndicator').classList.add('hidden');
        }, 500);

        // Step 5: Show raw result (for debugging)
        showRawResult(data);

        // Step 6: Format and display markdown analysis
        if (data.message || data.result || data.content || data.analysis) {
            const markdownContent = data.message || data.result || data.content || data.analysis || '';
            renderMarkdown(markdownContent);
        }

    } catch (error) {
        console.error('Error:', error);
        showError(`Error processing image: ${error.message}`);
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
});

/**
 * Helper Functions
 */

// Clear previous results
function clearResults() {
    document.getElementById('extractedText').innerHTML = '';
    document.getElementById('harmfulnessResult').innerHTML = '';
    document.getElementById('markdownContainer').innerHTML = '';
    document.getElementById('markdownContainer').classList.add('hidden');
}

// Display the extracted text from OCR
function displayExtractedText(text) {
    if (!text || text.trim() === '') {
        document.getElementById('extractedText').innerHTML = `
            <div class="error">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                No text detected in the image. Please try a clearer image.
            </div>
        `;
        return;
    }

    document.getElementById('extractedText').innerHTML = `
        <h3>Extracted Ingredients</h3>
        <div class="response-container">
            <div class="response-header">Detected Text</div>
            <div class="response-content">
                <pre class="code-block">${text}</pre>
            </div>
            <div class="response-meta">Processed using Tesseract OCR</div>
        </div>
    `;
}

// Display raw API result
function showRawResult(data) {
    // Format API response for display
    const formattedResponse = formatAPIResponse(data);
    
    document.getElementById('harmfulnessResult').innerHTML = `
        <h3>Analysis Results</h3>
        <div class="response-container">
            <div class="response-header">Ingredient Assessment</div>
            <div class="response-content">
                ${formattedResponse}
            </div>
            <div class="response-meta">Based on ingredient analysis</div>
        </div>
    `;
}

// Format API response for better readability
function formatAPIResponse(data) {
    // If data is a string, return it directly
    if (typeof data === 'string') {
        return data;
    }
    
    // If data has a specific content format
    if (data.content) {
        return data.content;
    }
    
    // Format JSON data for readability
    try {
        // If it's a simple score
        if (data.score !== undefined) {
            return `<div class="food-rating ${getRatingClass(data.score)}">
                        Harmfulness Score: ${data.score}/10
                    </div>`;
        }
        if (data.rating !== undefined) {
            return `<div class="food-rating ${getRatingClass(data.rating)}">
                        Harmfulness Rating: ${data.rating}/10
                    </div>`;
        }
        if (data.harmfulness !== undefined) {
            return `<div class="food-rating ${getRatingClass(data.harmfulness)}">
                        Harmfulness: ${data.harmfulness}/10
                    </div>`;
        }
        
        // For simple numeric values
        if (typeof data === 'number' || !isNaN(Number(data))) {
            return `<div class="food-rating ${getRatingClass(data)}">
                        Harmfulness Score: ${data}/10
                    </div>`;
        }
        
        // For complex data structures, format as pre-formatted text
        return `<pre class="code-block">${JSON.stringify(data, null, 2)}</pre>`;
            
    } catch (e) {
        // If JSON parsing fails, return the raw stringified data
        return `<pre class="code-block">${JSON.stringify(data)}</pre>`;
    }
}

// Get appropriate CSS class based on rating value
function getRatingClass(score) {
    if (score <= 3) return "rating-safe";
    if (score <= 7) return "rating-caution";
    return "rating-harmful";
}

// Render markdown analysis 
function renderMarkdown(markdown) {
    const markdownContainer = document.getElementById('markdownContainer');
    if (!markdown) {
        markdownContainer.innerHTML = `<p>No analysis available</p>`;
        return;
    }

    // Convert markdown to HTML and insert into container
    const htmlContent = marked.parse(markdown);
    markdownContainer.innerHTML = htmlContent;

    // Enhance ingredient sections based on content
    enhanceIngredientSections();

    // Show container with animation
    markdownContainer.classList.remove('hidden');
    markdownContainer.classList.add('fade-in-up');
}

// Add styling to ingredient sections based on content
function enhanceIngredientSections() {
    const markdownContainer = document.getElementById('markdownContainer');
    
    // Find sections that look like ingredient categories
    const sections = markdownContainer.querySelectorAll('section, div, h2, h3');
    
    sections.forEach(section => {
        const text = section.textContent.toLowerCase();
        
        // Apply styling based on section content
        if (text.includes('safe') || text.includes('recommended')) {
            section.closest('div, section') || section.parentElement.classList.add('safe-ingredients');
        } else if (text.includes('caution') || text.includes('moderate') || text.includes('warning')) {
            section.closest('div, section') || section.parentElement.classList.add('caution-ingredients');
        } else if (text.includes('harmful') || text.includes('avoid') || text.includes('danger')) {
            section.closest('div, section') || section.parentElement.classList.add('harmful-ingredients');
        }
    });
}

// Show error message
function showError(message) {
    document.getElementById('extractedText').innerHTML = `
        <div class="error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
            </svg>
            ${message}
        </div>
    `;
}

// Add to your main.js file
// You'll need to include Chart.js in your HTML:
// <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

// Function to parse ingredients and ratings from AI response
function parseIngredientsFromResponse(response) {
    // This is a simplified parser - might need adjustments based on actual API response format
    let ingredients = [];
    
    // If response is already structured data
    if (typeof response === 'object' && !Array.isArray(response)) {
        // Try to extract ingredients if they exist in a specific format
        if (response.ingredients) {
            return response.ingredients;
        }
        
        // Otherwise, treat each key-value pair as ingredient-rating
        for (const [key, value] of Object.entries(response)) {
            if (!isNaN(value)) {
                ingredients.push({
                    name: key,
                    rating: parseFloat(value)
                });
            }
        }
        return ingredients;
    }
    
    // If it's a simple string, try to parse it
    if (typeof response === 'string') {
        // Split by lines or commas
        const lines = response.split(/[\n,]+/);
        
        for (const line of lines) {
            // Look for patterns like "ingredient: rating" or "ingredient - rating"
            const match = line.match(/(.+?)(?::|-)?\s*(\d+(?:\.\d+)?)/);
            if (match) {
                ingredients.push({
                    name: match[1].trim(),
                    rating: parseFloat(match[2])
                });
            }
        }
    }
    
    // If the response is a single number, assume it's overall rating
    if (!isNaN(response) && ingredients.length === 0) {
        ingredients.push({
            name: "Overall Harmfulness",
            rating: parseFloat(response)
        });
    }
    
    return ingredients;
}

// Function to get rating color class
function getRatingColorClass(rating) {
    if (rating <= 3) return "rating-low";
    if (rating <= 7) return "rating-medium";
    return "rating-high";
}

// Function to render charts
function renderIngredientsChart(ingredients, containerId) {
    // Create canvas for the chart
    const container = document.getElementById(containerId);
    container.innerHTML = '<canvas id="ingredientsChart"></canvas>';
    
    // Prepare data for the chart
    const labels = ingredients.map(item => item.name);
    const data = ingredients.map(item => item.rating);
    const backgroundColors = data.map(rating => {
        if (rating <= 3) return 'rgba(76, 175, 80, 0.7)';
        if (rating <= 7) return 'rgba(255, 152, 0, 0.7)';
        return 'rgba(244, 67, 54, 0.7)';
    });
    
    // Create the chart
    const ctx = document.getElementById('ingredientsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Harmfulness Rating (1-10)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Harmfulness Scale'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Ingredients'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const rating = context.raw;
                            let assessment = 'Low risk';
                            if (rating > 3 && rating <= 7) assessment = 'Medium risk';
                            if (rating > 7) assessment = 'High risk';
                            return `Rating: ${rating}/10 (${assessment})`;
                        }
                    }
                }
            }
        }
    });
}

// Modified event listener for the scan button
document.getElementById('scanButton').addEventListener('click', async () => {
    const imageFile = document.getElementById('imageInput').files[0];
    if (!imageFile) {
        alert('Please select an image first');
        return;
    }
    
    try {
        // Perform OCR
        const extractedText = await performOCR(imageFile);
        
        // Display extracted text
        document.getElementById('extractedText').innerHTML = `
            <h3>Extracted Ingredients:</h3>
            <div class="response-container">
                <div class="response-content">${extractedText}</div>
            </div>
        `;
        
        // Send to backend
        document.getElementById('loadingIndicator').classList.remove('hidden');
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ingredients: extractedText
            })
        });
        
        const data = await response.json();
        document.getElementById('loadingIndicator').classList.add('hidden');
        
        // Parse ingredients and ratings
        const ingredients = parseIngredientsFromResponse(data);
        
        // Calculate overall harmfulness
        const overallHarmfulness = ingredients.length > 0
            ? ingredients.reduce((sum, item) => sum + item.rating, 0) / ingredients.length
            : 0;
        
        // Generate HTML for ingredients list
        let ingredientsHtml = '<ul class="ingredients-list">';
        ingredients.forEach(item => {
            const colorClass = getRatingColorClass(item.rating);
            const widthPercentage = (item.rating / 10) * 100;
            
            ingredientsHtml += `
                <li class="ingredient-item">
                    <span class="ingredient-name">${item.name}</span>
                    <div class="rating-bar-container">
                        <div class="rating-bar ${colorClass}" style="width: ${widthPercentage}%"></div>
                    </div>
                    <span class="ingredient-rating ${colorClass}">${item.rating}</span>
                </li>
            `;
        });
        ingredientsHtml += '</ul>';
        
        // Determine overall risk level
        let riskLevel = 'Low';
        let riskClass = 'badge-low';
        if (overallHarmfulness > 3 && overallHarmfulness <= 7) {
            riskLevel = 'Medium';
            riskClass = 'badge-medium';
        } else if (overallHarmfulness > 7) {
            riskLevel = 'High';
            riskClass = 'badge-high';
        }
        
        // Display results
        document.getElementById('harmfulnessResult').innerHTML = `
            <h3>Ingredient Analysis:</h3>
            <div class="response-container">
                <div class="response-header">Food Harmfulness Assessment</div>
                ${ingredientsHtml}
                
                <div class="summary-section">
                    <div class="summary-title">Overall Assessment</div>
                    <div>Average Harmfulness: <strong>${overallHarmfulness.toFixed(1)}/10</strong></div>
                    <div>Risk Level: <span class="harmfulness-badge ${riskClass}">${riskLevel}</span></div>
                </div>
                
                <div class="chart-container" id="chartContainer"></div>
            </div>
        `;
        
        // Render chart
        renderIngredientsChart(ingredients, 'chartContainer');
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('harmfulnessResult').innerHTML = `
            <div class="error">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px;">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                Error processing image: ${error.message}
            </div>
        `;
    }
});