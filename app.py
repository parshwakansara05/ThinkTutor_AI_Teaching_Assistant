import os
import time
import uuid
import nltk
from flask import Flask, render_template, request, jsonify, session, send_from_directory
import google.generativeai as genai
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import docx
from flask_cors import CORS

# Import load_dotenv
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()

# --- CONFIGURATION ---
app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "fallback_secret_key") 

# Safely fetch the API key
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("No API key found. Please check your .env file.")

genai.configure(api_key=api_key)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

chat_sessions = {}

# --- NLTK SETUP ---
def setup_nltk():
    try:
        nltk.data.find('tokenizers/punkt_tab')
        nltk.data.find('taggers/averaged_perceptron_tagger_eng')
        nltk.data.find('corpora/stopwords')
    except LookupError:
        print("Downloading NLTK data...")
        nltk.download('punkt')
        nltk.download('punkt_tab') 
        nltk.download('stopwords')
        nltk.download('averaged_perceptron_tagger')
        nltk.download('averaged_perceptron_tagger_eng') 

setup_nltk()

# --- HELPER FUNCTIONS ---
def extract_keywords(text):
    tokens = word_tokenize(text)
    stop_words = set(stopwords.words('english'))
    filtered = [w for w in tokens if w.lower() not in stop_words and w.isalnum()]
    tagged = nltk.pos_tag(filtered)
    keywords = [word for word, tag in tagged if tag.startswith('NN')]
    return keywords

def process_file_for_gemini(filepath):
    filename, ext = os.path.splitext(filepath)
    ext = ext.lower()
    
    mime_type = "application/pdf"
    final_path = filepath

    if ext == ".docx":
        doc = docx.Document(filepath)
        full_text = "\n".join([para.text for para in doc.paragraphs])
        txt_path = filename + ".txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(full_text)
        final_path = txt_path
        mime_type = "text/plain"
    elif ext in [".jpg", ".png", ".jpeg"]:
        mime_type = "image/jpeg"
    elif ext == ".txt":
        mime_type = "text/plain"

    return final_path, mime_type

def upload_to_gemini(filepath, mime_type):
    file = genai.upload_file(filepath, mime_type=mime_type)
    print(f"Uploaded {file.display_name}. Waiting for processing...")
    
    while file.state.name == "PROCESSING":
        time.sleep(1)
        file = genai.get_file(file.name)
        
    if file.state.name != "ACTIVE":
        raise ValueError(f"File {file.name} failed to process.")
        
    return file

# --- ROUTES ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('images', filename)

@app.route('/global.css')
def serve_css():
    return send_from_directory('.', 'global.css')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files[]' not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist('files[]')
    uploaded_gemini_files = []

    for file in files:
        if file.filename == '': continue
        
        save_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(save_path)
        
        try:
            ready_path, mime_type = process_file_for_gemini(save_path)
            g_file = upload_to_gemini(ready_path, mime_type)
            uploaded_gemini_files.append(g_file)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    model = genai.GenerativeModel("gemini-2.5-flash", 
        system_instruction="""You are ThinkTutor, an AI tutor designed to help students prepare for exams.

Use any uploaded materials (exam papers, notes, slides, or study resources) as the primary reference when available. If the material does not contain the answer, supplement with reliable general knowledge.

Your responses should be:
- Clear, concise, and educational
- Focused on exam preparation
- Structured for easy understanding
- Make use of bullet points, examples, and summaries when helpful
- Always relate your answers back to the uploaded materials when possible
- Give actionable study advice and tips for exam success
- Avoid unnecessary length. Prioritize clarity and exam-relevant information. Make it short and to the point till user asks for more details.
- Give clear, step-by-step explanations for complex concepts, but only when asked for. Otherwise, keep it concise and focused on key points.

When answering:
1. Explain the concept simply.
2. Highlight key points students should remember for exams.
3. Provide examples or short practice questions when helpful.

Avoid unnecessary length. Prioritize clarity and exam-relevant information.""" ) 
   
    chat = model.start_chat(history=[
        {"role": "user", "parts": uploaded_gemini_files + ["Analyze these exam papers."]},
        {"role": "model", "parts": ["I have analyzed the papers. Ready to help."]}
    ])

    session_id = str(uuid.uuid4())
    chat_sessions[session_id] = chat
    
    return jsonify({"status": "success", "session_id": session_id, "message": "Files analyzed! Ask me anything."})

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json or {}  
    user_msg = data.get("message", "")
    session_id = data.get("session_id")

    if not user_msg.strip():
        return jsonify({"error": "Message cannot be empty."}), 400

    if not session_id or session_id not in chat_sessions:
        model = genai.GenerativeModel("gemini-2.5-flash")
        chat_sessions['general'] = model.start_chat()
        session_id = 'general'

    chat_session = chat_sessions[session_id]

    keywords = extract_keywords(user_msg)
    print(f"NLTK Keywords detected: {keywords}")

    enhanced_prompt = user_msg
    if keywords:
        enhanced_prompt += f"\n\n(System Note: The user is asking about these specific concepts: {', '.join(keywords)}. Prioritize these in your answer.)"

    try:
        response = chat_session.send_message(enhanced_prompt)
        return jsonify({"response": response.text})
    except Exception as e:
        import traceback
        print("\n" + "="*40)
        print("GOOGLE API ERROR")
        traceback.print_exc()
        print("="*40 + "\n")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)