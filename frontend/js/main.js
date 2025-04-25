const BACKEND_URL = 'http://localhost:5000/analyze';

document.getElementById('scanButton').addEventListener('click', async () => {
    const imageFile = document.getElementById('imageInput').files[0];
    if (!imageFile) {
        alert('📷 Please select an image first.');
        return;
    }

    // Show loading spinner
    toggleLoading(true);

    try {
        // Perform OCR
        const extractedText = await performOCR(imageFile);

        // Display extracted text
        displayExtractedText(extractedText);

        // Send to backend for analysis
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ingredients: extractedText })
        });

        const data = await response.json();

        // Show raw JSON result (for debugging)
        showRawResult(data);

        // Display markdown analysis
        renderMarkdown(data.message || data.result || '');

    } catch (error) {
        console.error('❌ Error:', error);
        showError(`❌ Error processing image: ${error.message}`);
    } finally {
        toggleLoading(false);
    }
});

// 👇 Helper Functions

function toggleLoading(show) {
    const loader = document.getElementById('loadingIndicator');
    loader.classList.toggle('hidden', !show);
}

function displayExtractedText(text) {
    document.getElementById('extractedText').innerHTML = `
        <h3>🧾 Extracted Ingredients:</h3>
        <pre class="code-block">${text}</pre>
    `;
}

function showRawResult(data) {
    document.getElementById('harmfulnessResult').innerHTML = `
        <h3>🩺 Raw API Result:</h3>
        <pre class="code-block">${JSON.stringify(data, null, 2)}</pre>
    `;
}

function renderMarkdown(markdown) {
    const markdownContainer = document.getElementById('markdownContainer');
    if (!markdown) {
        markdownContainer.innerHTML = `<p>⚠️ No markdown result available.</p>`;
        return;
    }

    const htmlContent = marked.parse(markdown);
    markdownContainer.innerHTML = htmlContent;

    // Animate appearance
    markdownContainer.classList.remove('hidden');
    markdownContainer.classList.add('fade-in-up');
}

function showError(message) {
    document.getElementById('harmfulnessResult').innerHTML = `
        <div class="error">${message}</div>
    `;
}
