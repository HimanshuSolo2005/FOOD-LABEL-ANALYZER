const BACKEND_URL = 'http://localhost:5000/analyze';

document.getElementById('scanButton').addEventListener('click', async () => {
    const imageFile = document.getElementById('imageInput').files[0];
    if (!imageFile) {
        alert('Please select an image first');
        return;
    }
    
    try {
        const extractedText = await performOCR(imageFile);
        
        document.getElementById('extractedText').innerHTML = `
            <h3>Extracted Ingredients:</h3>
            <p>${extractedText}</p>
        `;
        
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: extractedText })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const markdownContent = marked.parse(data.content); // <-- Use marked.js for markdown parsing
        
        document.getElementById('harmfulnessResult').innerHTML = `
            <h3>Harmfulness Rating:</h3>
            <div class="rating">${markdownContent}</div>
        `;
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('harmfulnessResult').innerHTML = `
            <div class="error">Error processing image: ${error.message}</div>
        `;
    }
});
