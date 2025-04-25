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

// Main scan button event handler - SINGLE EVENT LISTENER ONLY
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
        
        // Step 7: Parse ingredients and render chart
        const ingredients = parseIngredientsFromResponse(data);
        console.log('Parsed ingredients for chart:', ingredients);
        
        // Create chart container if it doesn't exist
        if (!document.getElementById('chartContainer')) {
            const container = document.createElement('div');
            container.id = 'chartContainer';
            container.className = 'chart-container';
            document.getElementById('harmfulnessResult').appendChild(container);
        }
        
        // Render chart with the ingredients data
        if (ingredients.length > 0) {
            renderIngredientsChart(ingredients, 'chartContainer');
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
        <div id="chartContainer" class="chart-container"></div>
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

// Function to parse ingredients and ratings from AI response
function parseIngredientsFromResponse(response) {
    console.log('Parsing ingredients from response:', response);
    
    // Default ingredients array
    let ingredients = [];
    
    // If response is already structured data
    if (typeof response === 'object' && response !== null && !Array.isArray(response)) {
        // Case 1: Contains an ingredients array
        if (Array.isArray(response.ingredients)) {
            return response.ingredients.map(ing => {
                // Make sure each ingredient has name and rating properties
                if (typeof ing === 'object' && ing !== null) {
                    return {
                        name: ing.name || ing.ingredient || 'Unknown',
                        rating: parseFloat(ing.rating || ing.score || ing.harmfulness || 5)
                    };
                }
                return { name: String(ing), rating: 5 };
            });
        }
        
        // Case 2: Contains an key-value pairs for ingredients
        if (response.ingredients && typeof response.ingredients === 'object') {
            for (const [key, value] of Object.entries(response.ingredients)) {
                if (!isNaN(value)) {
                    ingredients.push({
                        name: key,
                        rating: parseFloat(value)
                    });
                }
            }
            if (ingredients.length > 0) return ingredients;
        }
        
        // Case 3: Each key-value pair might be ingredient-rating
        for (const [key, value] of Object.entries(response)) {
            if (!isNaN(value) && key !== 'score' && key !== 'rating' && 
                key !== 'harmfulness' && key !== 'status' && key !== 'id') {
                ingredients.push({
                    name: key,
                    rating: parseFloat(value)
                });
            }
        }
        
        // Case 4: Top level score or rating
        if (ingredients.length === 0 && 
            (response.score !== undefined || response.rating !== undefined || 
             response.harmfulness !== undefined)) {
            ingredients.push({
                name: "Overall Harmfulness",
                rating: parseFloat(response.score || response.rating || response.harmfulness)
            });
        }
        
        // Return ingredients if we found any
        if (ingredients.length > 0) return ingredients;
    }
    
    // If it's a string, try to parse it
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
        
        // Return ingredients if we found any
        if (ingredients.length > 0) return ingredients;
    }
    
    // If we couldn't parse anything meaningful, return some dummy data
    // so the chart still renders something
    if (ingredients.length === 0) {
        console.warn('Could not parse ingredients from response, using default data');
        return [
            { name: "Overall Harmfulness", rating: 5 },
        ];
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
    console.log('Rendering chart with ingredients:', ingredients);
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded! Make sure to include it in your HTML.');
        document.getElementById(containerId).innerHTML = 
            '<div class="error">Chart.js library not loaded. Please include it in your HTML.</div>';
        return;
    }
    
    // Get the container
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Chart container with ID '${containerId}' not found`);
        return;
    }
    
    // Create canvas for the chart
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
    
    console.log('Chart rendered successfully');
}