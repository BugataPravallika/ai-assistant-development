// ==========================================================================
// MOBILE MENU, NAVBAR SCROLL, SCROLL REVEAL, FAQ
// ==========================================================================
document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initNavbarScroll();
    initScrollReveal();
    initFaqAccordion();
    initSmoothScroll();
});

function initMobileNav() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', function () {
        const isActive = hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isActive);
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('click', function (event) {
        if (!event.target.closest('.navbar')) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
}

function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    function updateNavbar() {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });
}

function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach(function (el) {
        observer.observe(el);
    });
}

function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(function (item) {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        question.addEventListener('click', function () {
            const isActive = item.classList.contains('active');

            faqItems.forEach(function (other) {
                other.classList.remove('active');
                const btn = other.querySelector('.faq-question');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });

            if (!isActive) {
                item.classList.add('active');
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function initSmoothScroll() {
    document.querySelectorAll('a.scroll-link[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

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

const fileInput = document.getElementById("fileInput");
const fileUploadZone = document.getElementById("fileUploadZone");
const fileUploadPlaceholder = document.getElementById("fileUploadPlaceholder");
const filePreview = document.getElementById("filePreview");
const filePreviewImage = document.getElementById("filePreviewImage");
const filePreviewDoc = document.getElementById("filePreviewDoc");
const filePreviewName = document.getElementById("filePreviewName");
const removeFileBtn = document.getElementById("removeFileBtn");

let selectedFile = null;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    renderTemplates();
    fetchStats();
    updateDashboardInfo();

    functionSelect.addEventListener("change", handleFunctionChange);
    personalitySelect.addEventListener("change", handlePersonalityChange);
    generateBtn.addEventListener("click", handleGenerate);
    clearBtn.addEventListener("click", handleClear);
    copyBtn.addEventListener("click", copyToClipboard);
    downloadBtn.addEventListener("click", downloadResponse);

    helpfulYes.addEventListener("click", () => submitFeedback(true));
    helpfulNo.addEventListener("click", () => submitFeedback(false));

    initFileUpload();
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

function handlePersonalityChange() {
    updateDashboardInfo();
}

function updateDashboardInfo() {
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

function animateStatValue(el, newValue) {
    if (!el || el.classList.contains('stats-value-text')) {
        if (el) el.textContent = newValue;
        return;
    }

    const current = parseInt(el.textContent, 10) || 0;
    const target = parseInt(newValue, 10) || 0;
    if (current === target) return;

    const duration = 600;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(current + (target - current) * eased);
        if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

// ==========================================================================
// FILE UPLOAD
// ==========================================================================

function initFileUpload() {
    if (!fileInput || !fileUploadZone) return;

    fileUploadZone.addEventListener("click", function (event) {
        if (event.target.closest("#removeFileBtn")) return;
        fileInput.click();
    });

    fileUploadZone.querySelector(".file-browse-link")?.addEventListener("click", function (event) {
        event.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files[0]) {
            setSelectedFile(fileInput.files[0]);
        }
    });

    removeFileBtn?.addEventListener("click", function (event) {
        event.stopPropagation();
        clearSelectedFile();
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
        fileUploadZone.addEventListener(eventName, function (event) {
            event.preventDefault();
            fileUploadZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
        fileUploadZone.addEventListener(eventName, function (event) {
            event.preventDefault();
            fileUploadZone.classList.remove("drag-over");
        });
    });

    fileUploadZone.addEventListener("drop", function (event) {
        const droppedFile = event.dataTransfer?.files?.[0];
        if (droppedFile) {
            setSelectedFile(droppedFile);
        }
    });
}

function setSelectedFile(file) {
    try {
        validateSelectedFile(file);
    } catch (error) {
        alert(error.message);
        clearSelectedFile();
        return;
    }

    selectedFile = file;
    fileUploadPlaceholder.classList.add("hidden");
    filePreview.classList.remove("hidden");

    if (file.type.startsWith("image/")) {
        filePreviewImage.src = URL.createObjectURL(file);
        filePreviewImage.classList.remove("hidden");
        filePreviewDoc.classList.add("hidden");
    } else {
        filePreviewImage.classList.add("hidden");
        filePreviewDoc.classList.remove("hidden");
        filePreviewName.textContent = file.name;
    }
}

function clearSelectedFile() {
    selectedFile = null;
    fileInput.value = "";
    if (filePreviewImage.src) {
        URL.revokeObjectURL(filePreviewImage.src);
        filePreviewImage.src = "";
    }
    filePreview.classList.add("hidden");
    fileUploadPlaceholder.classList.remove("hidden");
    filePreviewImage.classList.add("hidden");
    filePreviewDoc.classList.add("hidden");
    filePreviewName.textContent = "";
}

// ==========================================================================
// BACKEND API CALLS
// ==========================================================================

async function parseApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    const rawText = await response.text();
    const snippet = rawText.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
        `Server returned an unexpected response (${response.status}). ` +
        (response.status === 413
            ? "Try a smaller image under 5MB."
            : response.status >= 500
                ? "The server timed out or failed. Try again with a smaller image."
                : "Please refresh and try again.") +
        (snippet ? ` Details: ${snippet}` : "")
    );
}

function validateSelectedFile(file) {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/json"
    ];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".txt", ".md", ".csv", ".json"];
    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
    const isImage = file.type.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension);
    const maxSize = isImage ? 5 * 1024 * 1024 : 512 * 1024;

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
        throw new Error("Unsupported file type. Use JPG, PNG, WEBP, GIF, TXT, MD, CSV, or JSON.");
    }

    if (file.size > maxSize) {
        throw new Error(isImage ? "Image too large. Maximum size is 5MB." : "Text file too large. Maximum size is 512KB.");
    }
}

async function handleGenerate() {
    const inputVal = userInput.value.trim();
    if (!inputVal && !selectedFile) {
        alert("Please enter text or upload a file/photo before generating.");
        userInput.focus();
        return;
    }

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
        const formData = new FormData();
        formData.append("function", currentFunction);
        formData.append("template_index", selectedTemplateIndex);
        formData.append("personality", personalitySelect.value);
        formData.append("user_input", inputVal);
        if (selectedFile) {
            formData.append("file", selectedFile);
        }

        const response = await fetch("/api/generate", {
            method: "POST",
            body: formData
        });

        const data = await parseApiResponse(response);

        if (!response.ok) {
            throw new Error(data.error || "An error occurred during response generation.");
        }

        currentResponseText = data.response;
        currentPromptUsed = data.prompt_used;

        responseContent.innerHTML = marked.parse(currentResponseText);

        outputActions.classList.remove("hidden");
        feedbackContainer.classList.remove("hidden");

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                helpful: helpful,
                function: currentFunction,
                personality: personalitySelect.value,
                prompt_used: currentPromptUsed
            })
        });

        const data = await parseApiResponse(response);
        if (!response.ok) {
            throw new Error(data.error || "Failed to submit feedback.");
        }

        feedbackBtnGroup.classList.add("hidden");
        feedbackSuccessMsg.classList.remove("hidden");

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
        const data = await parseApiResponse(response);
        if (response.ok) {
            updateStatsUI(data);
        }
    } catch (error) {
        console.error("Error fetching stats:", error);
    }
}

function updateStatsUI(statsObj) {
    animateStatValue(statQueries, statsObj.total_queries);
    animateStatValue(statFeedback, statsObj.total_feedback);
}

// ==========================================================================
// TOOLBAR ACTIONS & UTILITIES
// ==========================================================================

function handleClear() {
    userInput.value = "";
    clearSelectedFile();
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
    const file = new Blob([currentResponseText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);

    const timestamp = new Date().toISOString().slice(0, 10);
    element.download = `AI_Response_${currentFunction}_${timestamp}.txt`;

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
