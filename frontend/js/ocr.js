function performOCR(imageFile) {
    return new Promise((resolve, reject) => {
        document.getElementById('loadingIndicator').classList.remove('hidden');
        
        Tesseract.recognize(
            imageFile,
            'eng',
            { logger: m => console.log(m) }
        ).then(({ data: { text } }) => {
            document.getElementById('loadingIndicator').classList.add('hidden');
            resolve(text);
        }).catch(error => {
            document.getElementById('loadingIndicator').classList.add('hidden');
            reject(error);
        });
    });
}