import re

# FIX: Added matched_chunks argument for accurate highlighting
def highlight_text_with_explanation(text, sources, matched_chunks):
    """
    Highlight plagiarized segments using the actual matched chunks.
    """
    highlighted = text
    # FIX: Iterate through the accurately identified full chunks (sentences/phrases)
    for chunk in matched_chunks:
        # Use simple replace for the matched sentence/chunk
        # This replaces the first occurrence of the chunk text with the marked version
        highlighted = highlighted.replace(chunk, f"<mark style='background-color:orange'>{chunk}</mark>", 1)
        
    return highlighted