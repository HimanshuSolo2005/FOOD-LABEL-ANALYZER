import requests
from flask import Flask, request, jsonify
from flask_cors import CORS  # You'll need to install this: pip install flask-cors

def getOutput(prompt):
    input = "Read all ingredients and tell information about how the preservatives and other things used it it is good or bad for our health for daily use. Return a rating on scale of 1-10 and also tell what that scale indicate according to you" + prompt
    api_key = 'c468d1c51a7ab595a04a9727d36b8f66'
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
    # Get JSON data from the request
    data = request.get_json()
    
    if not data or 'ingredients' not in data:
        return jsonify({"error": "No ingredients provided in JSON"}), 400
    
    ingredients_text = data['ingredients']
    
    # Pass the ingredients to the API
    result = getOutput(ingredients_text)
    
    # Return the result to the frontend
    return jsonify(result)

@app.route('/', methods=['GET'])
def home():
    return "Food Harmfulness API is running!"

if __name__ == '__main__':
    app.run(debug=True)