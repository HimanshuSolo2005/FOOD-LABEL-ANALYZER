import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import axios from 'axios';

export default function App() {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [analysisList, setAnalysisList] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const performOCR = async (imageFile) => {
    document.getElementById('loadingIndicator').classList.remove('hidden');
    return new Promise((resolve, reject) => {
      Tesseract.recognize(
        imageFile,
        'eng',
        { logger: m => console.log(m) }
      ).then(({ data: { text } }) => {
        document.getElementById('loadingIndicator').classList.add('hidden');
        resolve(text);
      }).catch((error) => {
        document.getElementById('loadingIndicator').classList.add('hidden');
        reject(error);
      });
    });
  };

  const extractText = async () => {
    if (!image) return;
    setOcrLoading(true);
    try {
      const text = await performOCR(image);
      setExtractedText(text);
    } catch (error) {
      console.error('OCR Error:', error);
    }
    setOcrLoading(false);
  };

  const analyzeIngredients = async () => {
    if (!extractedText) return;
    setLoading(true);
  
    const ingredients = extractedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
  
    try {
      const analysisPromises = ingredients.map(async (ingredient) => {
        const response = await axios.post('http://localhost:5000/analyze', {
          ingredients: ingredient,
        });
        return response.data.content;
      });
  
      const results = await Promise.all(analysisPromises);
      const processedResults = results.map(result => result.trim());
  
      const ingredientsWithScore = processedResults.filter(line => line.includes('-') && line.includes('/10'));
      const finalSummary = "Individual ingredient analysis completed."; // Static summary or custom
  
      setAnalysisList(ingredientsWithScore);
      setSummary(finalSummary);
    } catch (error) {
      console.error('Analysis Error:', error);
    }
  
    setLoading(false);
  };
  

  const getColorClass = (score) => {
    if (score <= 3) return 'bg-green-100 text-green-700';
    if (score <= 6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">🥗 Food Label Analyzer</h1>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <button
          onClick={extractText}
          className="bg-yellow-400 text-white px-4 py-2 rounded-md mr-2 hover:bg-yellow-500"
        >
          {ocrLoading ? 'Extracting...' : 'Extract Ingredients'}
        </button>

        <button
          onClick={analyzeIngredients}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
        >
          {loading ? 'Analyzing...' : 'Analyze Ingredients'}
        </button>

        {extractedText && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">📄 Extracted Ingredients:</h2>
            <div className="bg-gray-50 p-3 rounded border border-gray-300 whitespace-pre-wrap">
              {extractedText}
            </div>
          </div>
        )}

        {analysisList.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">⚖️ Ingredient Scores:</h2>
            <div className="space-y-2">
              {analysisList.map((item, index) => {
                const [name, scoreText] = item.split('-').map(str => str.trim());
                const score = parseInt(scoreText);
                return (
                  <div key={index} className={`p-3 rounded-md ${getColorClass(score)} font-medium`}>
                    {name}: {scoreText}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {summary && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">🧠 Final Summary:</h2>
            <div className="bg-gray-100 p-3 rounded border border-gray-300 text-gray-800">
              {summary}
            </div>
          </div>
        )}

        <div id="loadingIndicator" className="hidden mt-4 text-center font-semibold">Loading...</div>
      </div>
    </div>
  );
}
