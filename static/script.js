// ==========================================================================
// PROMPT ENGINEERING TEMPLATES REGISTRY (Client-Side)
// ==========================================================================
const PROMPT_TEMPLATES = {
    question_answering: [
        "Answer the following question clearly:\n{user_input}",
        "Act as an expert teacher and explain:\n{user_input}",
        "Provide a detailed answer with examples:\n{user_input}"
    ],
    text_summarization: [
        "Summarize the following text:\n{user_input}",
        "Provide the key takeaways from:\n{user_input}",
        "Explain the main points of:\n{user_input}"
    ],
    content_generation: [
        "Write a short story about:\n{user_input}",
        "Create a poem about:\n{user_input}",
        "Generate an essay about:\n{user_input}"
    ],
    study_advice: [
        "Provide study tips for:\n{user_input}",
        "Create a learning roadmap for:\n{user_input}",
        "Provide placement preparation advice for:\n{user_input}"
    ]
};

// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let currentFunction = "question_answering";
let selectedTemplateIndex = 0;
let currentResponseText = "";
let currentPromptUsed = "";

// ==========================================================================
// DOM SELECTORS
// ==========================================================================
const functionSelect = document.getElementById("functionSelect");
const personalitySelect = document.getElementById("personalitySelect");
const templateContainer = document.getElementById("templateContainer");
const userInput = document.getElementById("userInput");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");

const outputPlaceholder = document.getElementById("outputPlaceholder");
const responseBox = document.getElementById("responseBox");
const responseContent = document.getElementById("responseContent");
const typingIndicator = document.getElementById("typingIndicator");
const outputActions = document.getElementById("outputActions");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const feedbackContainer = document.getElementById("feedbackContainer");
const helpfulYes = document.getElementById("helpfulYes");
const helpfulNo = document.getElementById("helpfulNo");
const feedbackSuccessMsg = document.getElementById("feedbackSuccessMsg");
const feedbackBtnGroup = document.querySelector(".feedback-btn-group");

const statQueries = document.getElementById("statQueries");
const statFeedback = document.getElementById("statFeedback");
const statFunction = document.getElementById("statFunction");
const statPersonality = document.getElementById("statPersonality");

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Initial templates rendering
    renderTemplates();
    
    // Fetch initial stats
    fetchStats();
    
    // Setup listeners
    functionSelect.addEventListener("change", handleFunctionChange);
    personalitySelect.addEventListener("change", handlePersonalityChange);
    generateBtn.addEventListener("click", handleGenerate);
    clearBtn.addEventListener("click", handleClear);
    copyBtn.addEventListener("click", copyToClipboard);
    downloadBtn.addEventListener("click", downloadResponse);
    
    helpfulYes.addEventListener("click", () => submitFeedback(true));
    helpfulNo.addEventListener("click", () => submitFeedback(false));

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// ==========================================================================
// UI EVENT HANDLERS & RENDERING
// ==========================================================================

function handleFunctionChange(e) {
    currentFunction = e.target.value;
    selectedTemplateIndex = 0;
    renderTemplates();
    updateDashboardInfo();
}

function handlePersonalityChange(e) {
    updateDashboardInfo();
}

function updateDashboardInfo() {
    // Update labels in stats panel
    const selectedFuncText = functionSelect.options[functionSelect.selectedIndex].text;
    const selectedPersText = personalitySelect.options[personalitySelect.selectedIndex].text;
    statFunction.textContent = selectedFuncText;
    statPersonality.textContent = selectedPersText.replace(" Persona", "");
}

function renderTemplates() {
    templateContainer.innerHTML = "";
    const templates = PROMPT_TEMPLATES[currentFunction];
    
    templates.forEach((template, index) => {
        const card = document.createElement("div");
        card.className = `template-card ${index === selectedTemplateIndex ? 'active' : ''}`;
        card.dataset.index = index;
        
        const badge = document.createElement("span");
        badge.className = "template-badge";
        badge.textContent = `Template ${index + 1}`;
        
        const text = document.createElement("pre");
        text.className = "template-text";
        // Format prompt placeholder nicely in UI
        text.textContent = template.replace("{user_input}", "[User Input]");
        
        card.appendChild(badge);
        card.appendChild(text);
        
        card.addEventListener("click", () => {
            document.querySelectorAll(".template-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            selectedTemplateIndex = index;
        });
        
        templateContainer.appendChild(card);
    });
}

// ==========================================================================
// BACKEND API CALLS
// ==========================================================================

async function handleGenerate() {
    const inputVal = userInput.value.trim();
    if (!inputVal) {
        alert("Please enter some text in the user input area before generating.");
        userInput.focus();
        return;
    }

    // Set loading UI states
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="btn-text">Generating...</span> <span class="btn-icon"><i class="fa-solid fa-spinner fa-spin"></i></span>`;
    
    outputPlaceholder.classList.add("hidden");
    responseBox.classList.remove("hidden");
    typingIndicator.classList.remove("hidden");
    responseContent.innerHTML = "";
    outputActions.classList.add("hidden");
    feedbackContainer.classList.add("hidden");
    feedbackSuccessMsg.classList.add("hidden");
    feedbackBtnGroup.classList.remove("hidden");

    try {
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                function: currentFunction,
                template_index: selectedTemplateIndex,
                personality: personalitySelect.value,
                user_input: inputVal
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || "An error occurred during response generation.");
        }

        // Store active response states
        currentResponseText = data.response;
        currentPromptUsed = data.prompt_used;

        // Render Markdown content
        responseContent.innerHTML = marked.parse(currentResponseText);
        
        // Show Actions & Feedback
        outputActions.classList.remove("hidden");
        feedbackContainer.classList.remove("hidden");
        
        // Sync stats from response
        if (data.stats) {
            updateStatsUI(data.stats);
        }
    } catch (error) {
        responseContent.innerHTML = `<p style="color: var(--color-danger); font-weight: 600;"><i class="fa-solid fa-circle-exclamation"></i> Error: ${error.message}</p>`;
    } finally {
        typingIndicator.classList.add("hidden");
        generateBtn.disabled = false;
        generateBtn.innerHTML = `<span class="btn-text">Generate Response</span> <span class="btn-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></span>`;
    }
}

async function submitFeedback(helpful) {
    try {
        const response = await fetch("/api/feedback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                helpful: helpful,
                function: currentFunction,
                personality: personalitySelect.value,
                prompt_used: currentPromptUsed
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to submit feedback.");
        }

        // Show feedback success message
        feedbackBtnGroup.classList.add("hidden");
        feedbackSuccessMsg.classList.remove("hidden");
        
        // Sync stats
        if (data.stats) {
            updateStatsUI(data.stats);
        }
    } catch (error) {
        console.error("Feedback error:", error);
        alert("Could not register feedback: " + error.message);
    }
}

async function fetchStats() {
    try {
        const response = await fetch("/api/stats");
        const data = await response.json();
        if (response.ok) {
            updateStatsUI(data);
        }
    } catch (error) {
        console.error("Error fetching stats:", error);
    }
}

function updateStatsUI(statsObj) {
    statQueries.textContent = statsObj.total_queries;
    statFeedback.textContent = statsObj.total_feedback;
}

// ==========================================================================
// TOOLBAR ACTIONS & UTILITIES
// ==========================================================================

function handleClear() {
    userInput.value = "";
    responseContent.innerHTML = "";
    currentResponseText = "";
    currentPromptUsed = "";
    
    responseBox.classList.add("hidden");
    outputPlaceholder.classList.remove("hidden");
    outputActions.classList.add("hidden");
    feedbackContainer.classList.add("hidden");
    feedbackSuccessMsg.classList.add("hidden");
    feedbackBtnGroup.classList.remove("hidden");
}

function copyToClipboard() {
    if (!currentResponseText) return;
    
    navigator.clipboard.writeText(currentResponseText).then(() => {
        const origText = copyBtn.innerHTML;
        copyBtn.innerHTML = `<i class="fa-solid fa-check" style="color: var(--color-success)"></i> Copied!`;
        copyBtn.disabled = true;
        setTimeout(() => {
            copyBtn.innerHTML = origText;
            copyBtn.disabled = false;
        }, 2000);
    }).catch(err => {
        console.error("Could not copy response: ", err);
    });
}

function downloadResponse() {
    if (!currentResponseText) return;
    
    const element = document.createElement("a");
    const file = new Blob([currentResponseText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    
    // Generate filename based on function name
    const timestamp = new Date().toISOString().slice(0, 10);
    element.download = `AI_Response_${currentFunction}_${timestamp}.txt`;
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
