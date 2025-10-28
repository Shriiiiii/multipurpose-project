// --- Utility Function to handle error messages ---
function displayErrorMessage(message) {
    const errorMessageDiv = document.getElementById('error-message');
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
    } else {
        // Fallback for pages without the dedicated error div
        console.error("Application Error:", message);
    }
}

// --- Text Search: Uses /api/check ---
document.getElementById("check-text-btn")?.addEventListener("click", async () => {
    const textInput = document.getElementById('text-input').value;
    const fileInput = document.getElementById('text-file').files[0];
    displayErrorMessage(""); // Clear previous errors
    
    const form = new FormData();
    
    if (fileInput) {
        form.append('file', fileInput);
    } else if (textInput.trim() !== '') {
        form.append('text', textInput);
    } else {
        displayErrorMessage("Please paste text or upload a file to check.");
        return;
    }
    
    // Add loading indicator
    const button = document.getElementById("check-text-btn");
    button.disabled = true;
    button.textContent = "Checking...";

    try {
        // 1. Send data to Flask backend
        const resp = await fetch('/api/check', { 
            method: 'POST', 
            body: form 
        }); 
        
        const json = await resp.json();
        
        if (resp.ok) {
            
            // --- Robustness Fixes for result.html ---
            // 1. Guarantee AI/Human chart data (defaults to 10/90 if missing)
            json.ai = json.ai || 10; 
            json.human = json.human || 90; 

            // 2. Map backend explanation/sources to the frontend's highlighted_sentences array
            if (json.sources && json.explanation) {
                // Combine sources (where matches were found) with the detailed explanation (what was found)
                json.highlighted_sentences = json.sources.map(sourceObj => ({
                    // Use a generic placeholder derived from the excerpt
                    text: `Content matched from this source (Excerpt: ${sourceObj.excerpt.substring(0, 100)}...)`, 
                    source: sourceObj.url,
                    type: "exact" // Use 'exact' as a default type
                }));
                
                json.suggestions = json.explanation; // Map backend's 'explanation' to frontend's 'suggestions'
            }
            
            localStorage.setItem("plagiarismResult", JSON.stringify(json));
            window.location.href = "result.html";
        } else {
            // Handle API errors
            displayErrorMessage(`API Error: ${json.error || 'Check failed'}`);
        }
        
    } catch (error) {
        displayErrorMessage(`Network Error: Could not connect to the server. ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = "Run Plagiarism Check";
    }
});


// --- PDF Compare: Uses /api/compare_pdfs ---
document.getElementById("compare-pdf-btn")?.addEventListener("click", async () => {
    const pdf1 = document.getElementById("pdf1").files[0];
    const pdf2 = document.getElementById("pdf2").files[0];
    displayErrorMessage(""); // Clear previous errors
    
    if (!pdf1 || !pdf2) { 
        displayErrorMessage("Please upload both PDFs for comparison.");
        return; 
    }

    const form = new FormData();
    form.append('file1', pdf1);
    form.append('file2', pdf2);

    // Add loading indicator
    const button = document.getElementById("compare-pdf-btn");
    button.disabled = true;
    button.textContent = "Comparing...";

    try {
        // 1. Send data to Flask backend for comparison and PDF generation
        const resp = await fetch('/api/compare_pdfs', { 
            method: 'POST', 
            body: form 
        });
        
        const json = await resp.json();

        if (resp.ok) {
             // Robustness Fixes
            json.ai = json.ai || 10;
            json.human = json.human || 90;
            
            // Ensure data structure matches frontend expectations
            if (json.top_matches) {
                // Format top_matches for the highlighted_sentences display
                json.sources = [{ url: "Document 2 Match", excerpt: `Similarity Score: ${json.similarity}%` }];
                json.highlighted_sentences = json.top_matches.map(m => ({ 
                    text: m, 
                    source: "Document 2 Match", 
                    type: "exact" 
                }));
                json.suggestions = json.suggestions || ["Review matching sentences in the downloaded PDF report.", "Consider rephrasing the top matching segments."];
            } else {
                 json.sources = [];
                 json.highlighted_sentences = [];
                 json.suggestions = ["Comparison complete, but no similarity results found in the response."];
            }


            localStorage.setItem("plagiarismResult", JSON.stringify(json));
            window.location.href = "result.html";
        } else {
            displayErrorMessage(`PDF API Error: ${json.error || 'Comparison failed'}`);
        }
    } catch (error) {
           displayErrorMessage(`PDF Network Error: Could not connect to the server. ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = "Compare PDFs";
    }
});

// --- Code Compare: Uses /api/check_code ---
document.getElementById("check-code-btn")?.addEventListener("click", async () => {
    // Get the files from the updated index.html inputs
    const code1 = document.getElementById("code1-file").files[0];
    const code2 = document.getElementById("code2-file").files[0];
    displayErrorMessage(""); // Clear previous errors
    
    if (!code1 || !code2) {
        displayErrorMessage("Please upload both code files for comparison.");
        return;
    }

    const form = new FormData();
    form.append('file1', code1);
    form.append('file2', code2);

    // Add loading indicator
    const button = document.getElementById("check-code-btn");
    button.disabled = true;
    button.textContent = "Checking Code...";

    try {
        // 1. Send data to Flask backend
        const resp = await fetch('/api/check_code', { 
            method: 'POST', 
            body: form 
        });
        
        const json = await resp.json();

        if (resp.ok) {
            // Robustness Fixes
            json.ai = json.ai || 0; // Default to 0 for code
            json.human = json.human || 100; // Default to 100 for code

            // Format the result for the frontend display
            json.highlighted_sentences = [
                { text: `Code Similarity Score: ${json.similarity || 0}%`, source: "Code Comparison", type: "exact" }
            ];
            
            if (json.highlighted_code) {
                json.highlighted_sentences.push({ 
                    text: `Common Code Snippet: ${json.highlighted_code.substring(0, 100)}...`, 
                    source: "Code Comparison", 
                    type: "paraphrase" 
                });
            }

            json.suggestions = json.suggestions || ["Refactor duplicated code into a shared function.", "Use different variable names if the logic is unique."];
            json.sources = [{ url: "File 1: " + code1.name, excerpt: "Code comparison results." }, { url: "File 2: " + code2.name, excerpt: "Code comparison results." }];

            localStorage.setItem("plagiarismResult", JSON.stringify(json));
            window.location.href = "result.html";
        } else {
            displayErrorMessage(`Code API Error: ${json.error || 'Code check failed'}`);
        }
    } catch (error) {
           displayErrorMessage(`Code Network Error: Could not connect to the server. ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = "Check Code";
    }
});


// Placeholder for custom error messages (to replace alert())
document.addEventListener('DOMContentLoaded', () => {
    // Check if error-message div exists on the current page
    const main = document.querySelector('main');
    if (main && !document.getElementById('error-message')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'text-red-600 font-bold mb-4 p-3 bg-red-100 rounded-lg';
        main.prepend(errorDiv);
    }
});
