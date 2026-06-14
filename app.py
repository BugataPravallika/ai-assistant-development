import os
import json
import mimetypes
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env if present
load_dotenv()

app = Flask(__name__)

# Configure Google Gemini API
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
    model_configured = True
    print("=== AVAILABLE MODELS ON YOUR API KEY ===")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f" - {m.name}")
    except Exception as e:
        print(f"Error listing models: {e}")
    print("========================================")
else:
    model_configured = False
    print("WARNING: GEMINI_API_KEY environment variable is not set. The application will run in simulation mode.")

# Persona System instructions
PERSONAS = {
    "friendly": "You are a friendly, encouraging, and beginner-friendly AI assistant. "
                "Use warm, positive language, emojis where appropriate, and keep explanations "
                "easy to understand for someone new to the topic.",
    "academic": "You are a formal, academic, and detailed AI assistant. "
                "Explain concepts with rigor, structure, professional terminology, and educational depth. "
                "Maintain an objective, authoritative, and scientific tone."
}

# Prompt Engineering Templates
PROMPT_TEMPLATES = {
    "question_answering": [
        "Answer the following question clearly:\n{user_input}",
        "Act as an expert teacher and explain:\n{user_input}",
        "Provide a detailed answer with examples:\n{user_input}"
    ],
    "text_summarization": [
        "Summarize the following text:\n{user_input}",
        "Provide the key takeaways from:\n{user_input}",
        "Explain the main points of:\n{user_input}"
    ],
    "content_generation": [
        "Write a short story about:\n{user_input}",
        "Create a poem about:\n{user_input}",
        "Generate an essay about:\n{user_input}"
    ],
    "study_advice": [
        "Provide study tips for:\n{user_input}",
        "Create a learning roadmap for:\n{user_input}",
        "Provide placement preparation advice for:\n{user_input}"
    ]
}

# In-memory stats counter (reads from feedback.txt on startup to persist counts)
stats = {
    "total_queries": 0,
    "total_feedback": 0,
    "helpful": 0,
    "not_helpful": 0
}

def load_stats_from_feedback():
    """Reads the feedback.txt file to initialize statistics counters."""
    global stats
    feedback_file = "feedback.txt"
    if not os.path.exists(feedback_file):
        return

    try:
        with open(feedback_file, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                stats["total_queries"] += 1
                if "Feedback: Helpful" in line:
                    stats["total_feedback"] += 1
                    stats["helpful"] += 1
                elif "Feedback: Not Helpful" in line:
                    stats["total_feedback"] += 1
                    stats["not_helpful"] += 1
    except Exception as e:
        print(f"Error loading stats: {e}")

# Load stats on app startup
load_stats_from_feedback()

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
ALLOWED_TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_TEXT_SIZE = 512 * 1024
MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]


def parse_generate_request():
    """Parse JSON or multipart generate requests."""
    uploaded_file = None

    if request.content_type and "multipart/form-data" in request.content_type:
        func_type = request.form.get("function")
        template_idx = request.form.get("template_index")
        personality = request.form.get("personality", "friendly")
        user_input = (request.form.get("user_input") or "").strip()
        uploaded_file = request.files.get("file")
    else:
        data = request.json or {}
        func_type = data.get("function")
        template_idx = data.get("template_index")
        personality = data.get("personality", "friendly")
        user_input = (data.get("user_input") or "").strip()

    return func_type, template_idx, personality, user_input, uploaded_file


def process_uploaded_file(uploaded_file, user_input):
    """Validate upload and return updated user_input plus optional image part."""
    if not uploaded_file or not uploaded_file.filename:
        return user_input, None, None

    filename = uploaded_file.filename
    extension = os.path.splitext(filename)[1].lower()
    file_bytes = uploaded_file.read()
    mime_type = uploaded_file.content_type or mimetypes.guess_type(filename)[0]

    if mime_type in ALLOWED_IMAGE_TYPES or extension in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        if len(file_bytes) > MAX_IMAGE_SIZE:
            raise ValueError("Image too large. Maximum size is 5MB.")

        if not mime_type or mime_type not in ALLOWED_IMAGE_TYPES:
            mime_type = mimetypes.guess_type(filename)[0] or "image/jpeg"

        return user_input, {"mime_type": mime_type, "data": file_bytes}, filename

    if extension in ALLOWED_TEXT_EXTENSIONS:
        if len(file_bytes) > MAX_TEXT_SIZE:
            raise ValueError("Text file too large. Maximum size is 512KB.")

        try:
            file_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError("Text file must be UTF-8 encoded.") from exc

        attachment_block = f"\n\n--- Attached file: {filename} ---\n{file_text}"
        combined_input = f"{user_input}{attachment_block}".strip() if user_input else file_text.strip()
        return combined_input, None, filename

    raise ValueError(
        "Unsupported file type. Use JPG, PNG, WEBP, GIF, TXT, MD, CSV, or JSON."
    )


def generate_ai_response(system_instruction, prompt, image_part=None):
    """Generate content with Gemini model fallbacks."""
    content_parts = [prompt]
    if image_part:
        content_parts.append(image_part)

    last_error = None
    for model_name in MODEL_FALLBACKS:
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction,
            )
            response = model.generate_content(content_parts)
            return response.text
        except Exception as exc:
            last_error = exc
            print(f"Model {model_name} failed: {exc}")

    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/generate", methods=["POST"])
def generate():
    global stats

    try:
        func_type, template_idx, personality, user_input, uploaded_file = parse_generate_request()
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    if template_idx is None or not func_type:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        template_idx = int(template_idx)
    except ValueError:
        return jsonify({"error": "Invalid template index"}), 400

    try:
        user_input, image_part, attachment_name = process_uploaded_file(uploaded_file, user_input)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not user_input and not image_part:
        return jsonify({"error": "Please provide text input or upload a file/photo."}), 400

    if not user_input and image_part:
        user_input = "Analyze the attached image and respond according to the selected task."

    # Validate inputs
    if func_type not in PROMPT_TEMPLATES:
        return jsonify({"error": f"Invalid function: {func_type}"}), 400
    if template_idx < 0 or template_idx >= len(PROMPT_TEMPLATES[func_type]):
        return jsonify({"error": f"Invalid template index: {template_idx}"}), 400
    if personality not in PERSONAS:
        return jsonify({"error": f"Invalid personality: {personality}"}), 400

    # Build prompt
    template = PROMPT_TEMPLATES[func_type][template_idx]
    prompt = template.format(user_input=user_input)

    # Get system prompt for the persona
    system_instruction = PERSONAS[personality]

    # Generate response
    response_text = ""
    if not model_configured:
        attachment_note = ""
        if attachment_name:
            attachment_note = f"\n\n**Attachment:** `{attachment_name}`"
        if image_part:
            attachment_note += "\n\n**Image attached:** Yes (simulation mode cannot analyze images)."

        response_text = (
            f"### [SIMULATION MODE - NO API KEY SET]\n\n"
            f"**System Persona:** {personality.capitalize()}\n"
            f"**System Instruction:** {system_instruction}\n\n"
            f"**Rendered Prompt:**\n```\n{prompt}\n```"
            f"{attachment_note}\n\n"
            f"To enable real AI generations, please set the `GEMINI_API_KEY` environment variable."
        )
    else:
        try:
            response_text = generate_ai_response(system_instruction, prompt, image_part)
        except Exception as e:
            import traceback
            print("=== ERROR IN GENERATE ROUTE ===")
            traceback.print_exc()
            return jsonify({"error": f"API Error: {str(e)}"}), 500

    # Increment total queries (in memory)
    stats["total_queries"] += 1

    return jsonify({
        "response": response_text,
        "prompt_used": prompt,
        "attachment": attachment_name,
        "stats": stats
    })

@app.route("/api/feedback", methods=["POST"])
def feedback():
    global stats
    data = request.json or {}
    helpful = data.get("helpful")
    func_type = data.get("function", "unknown")
    personality = data.get("personality", "unknown")
    prompt_used = data.get("prompt_used", "unknown")

    if helpful is None:
        return jsonify({"error": "Missing helpful parameter"}), 400

    feedback_status = "Helpful" if helpful else "Not Helpful"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Format feedback log
    log_entry = (
        f"Timestamp: {timestamp} | "
        f"Feedback: {feedback_status} | "
        f"Function: {func_type} | "
        f"Personality: {personality} | "
        f"Prompt Used: {prompt_used.replace(chr(10), ' ')}\n"
    )

    # Append to feedback.txt
    try:
        with open("feedback.txt", "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception as e:
        return jsonify({"error": f"Failed to save feedback: {str(e)}"}), 500

    # Update in-memory stats
    stats["total_feedback"] += 1
    if helpful:
        stats["helpful"] += 1
    else:
        stats["not_helpful"] += 1

    return jsonify({
        "success": True,
        "stats": stats
    })

@app.route("/api/stats", methods=["GET"])
def get_stats():
    return jsonify(stats)

if __name__ == "__main__":
    # Standard Flask port configuration
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
