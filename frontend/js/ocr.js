// OCR.js
function performOCR(imageFile) {
    return new Promise((resolve, reject) => {
        const loader = document.getElementById('loadingIndicator');
        const progressBar = document.getElementById('ocrProgress');
        const progressText = document.getElementById('ocrProgressText');

        loader.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Initializing OCR...';

        Tesseract.recognize(
            imageFile,
            'eng',
            {
                logger: ({ status, progress }) => {
                    console.log(status, progress);

                    const percent = Math.floor(progress * 100);
                    progressBar.style.width = `${percent}%`;
                    progressText.textContent = `${status.toUpperCase()} (${percent}%)`;

                    // Optional status-based color feedback
                    if (status === 'recognizing text') {
                        progressBar.style.backgroundColor = '#38bdf8'; // sky blue
                    }
                }
            }
        )
        .then(({ data: { text } }) => {
            progressText.textContent = 'Done!';
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 500); // smooth exit
            resolve(text.trim());
        })
        .catch(error => {
            loader.classList.add('hidden');
            reject(error);
        });
    });
}


// main.js
const BACKEND_URL = 'http://localhost:5000/analyze';

function updateFileInfo() {
    const fileInput = document.getElementById('imageInput');
    const fileInfo = document.getElementById('fileInfo');
    
    if (fileInput.files.length > 0) {
        const fileName = fileInput.files[0].name;
        fileInfo.textContent = `Selected: ${fileName}`;
        fileInfo.classList.remove('hidden');
    } else {
        fileInfo.classList.add('hidden');
    }
}

function formatAPIResponse(data) {
    // Check if data is a string
    if (typeof data === 'string') {
        return data;
    }
    
    // Check if data has a 'content' property (common in AI responses)
    if (data.content) {
        return data.content;
    }
    
    // Format JSON for better readability
    try {
        // If it's a simple object with a key named 'score' or 'rating' or similar
        if (data.score !== undefined) {
            return `Harmfulness Score: ${data.score}/10`;
        }
        if (data.rating !== undefined) {
            return `Harmfulness Rating: ${data.rating}/10`;
        }
        if (data.harmfulness !== undefined) {
            return `Harmfulness: ${data.harmfulness}/10`;
        }
        
        // If it's a simple number
        if (typeof data === 'number' || !isNaN(Number(data))) {
            return `Harmfulness Score: ${data}/10`;
        }
        
        // For other structured data, format it nicely
        const formattedData = JSON.stringify(data, null, 2)
            .replace(/[{}"]/g, '')
            .replace(/,/g, '')
            .trim();
            
        return formattedData;
    } catch (e) {
        // If JSON parsing fails, return the raw data
        return JSON.stringify(data);
    }
}

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
        
        // Format and display result
        const formattedResponse = formatAPIResponse(data);
        
        document.getElementById('harmfulnessResult').innerHTML = `
            <h3>Analysis Result:</h3>
            <div class="response-container">
                <div class="response-header">Food Harmfulness Assessment</div>
                <div class="response-content">${formattedResponse}</div>
                <div class="response-meta">Based on ingredient analysis</div>
            </div>
        `;
        
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