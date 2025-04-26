import requests
from flask import Flask, request, jsonify
from flask_cors import CORS  # You'll need to install this: pip install flask-cors

def getOutput(prompt):
    input = "read the ingredients and rate them on a scale of 1-10 in context of there harmfulnes in daily consumptions. At the end return wheather its healthy or unhealthy acording to you, in format heading with or whether its healthy or unhealthy with rating ranging from 1-10 and then in next line give about 40 words of explaination." + prompt
    api_key = '5a8aea55aa1f0bda102221dbd728a45f'
    default_model = 'gpt-3.5-turbo'
    model = default_model

    api_url = f'http://195.179.229.119/gpt/api.php?prompt={requests.utils.quote(input)}&api_key={requests.utils.quote(api_key)}&model={requests.utils.quote(model)}'

    try:
        response = requests.get(api_url)
        response.raise_for_status()

        data = response.json()
        return data
    except requests.RequestException as e:
        print(f'Request Error: {e}')
        return {"error": str(e)}

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/analyze', methods=['POST'])
def analyze_ingredients():
    data = request.get_json()
    
    if not data or 'ingredients' not in data:
        return jsonify({"error": "No ingredients provided in JSON"}), 400
    
    ingredients_text = data['ingredients']
    print("🔍 Received ingredients:", ingredients_text)

    result = getOutput(ingredients_text)
    print("🧠 AI API Response:", result)

    if isinstance(result, dict) and 'content' in result:
        return jsonify({"content": result['content']})
    else:
        return jsonify({"error": "Invalid response from AI API", "result": result}), 500


if __name__ == '__main__':
    app.run(debug=True)