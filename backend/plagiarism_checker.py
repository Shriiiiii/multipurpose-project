import os
from difflib import SequenceMatcher
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from utils import highlight_text_with_explanation # FIX: Updated to expect new args
from googleapiclient.discovery import build

def fetch_web_sources(text):
    """Fetches top 5 web sources from Google Custom Search based on the input text."""
    
    GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
    GOOGLE_SEARCH_ENGINE_ID = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
    
    if not GOOGLE_SEARCH_API_KEY or not GOOGLE_SEARCH_ENGINE_ID:
        print("CRITICAL: Google Search API keys missing or failed to load. Cannot perform live check.")
        return []
    try:
        service = build("customsearch", "v1", developerKey=GOOGLE_SEARCH_API_KEY)
        # Use a longer query for better context
        search_query = text[:200].strip() or "plagiarism checker test"
        res = service.cse().list(q=search_query, cx=GOOGLE_SEARCH_ENGINE_ID, num=5).execute()

        live_sources = []
        if 'items' in res:
            for item in res['items']:
                live_sources.append({
                    "url": item.get('link', 'N/A'),
                    "content": item.get('snippet', ''),
                    "excerpt": item.get('snippet', '')
                })
        return live_sources
    except Exception as e:
        print(f"Google Search API Error: {e}")
        return []

def cosine_similarity_score(text1, text2):
    """Compute cosine similarity between two texts using TF-IDF"""
    if not text1 or not text2:
        return 0.0
    
    vectorizer = TfidfVectorizer(ngram_range=(1, 2)).fit([text1, text2])
    tfidf_matrix = vectorizer.transform([text1, text2])
    similarity = cosine_similarity(tfidf_matrix[0], tfidf_matrix[1])[0][0]
    return similarity

def check_plagiarism(text, method="cosine"):
    """
    Checks the input text against live web sources.
    """
    live_sources = fetch_web_sources(text)
    explanation = []
    highlighted_segments_data = [] 
    
    # FIX: Used to calculate the average similarity of all matched chunks
    all_chunk_similarities = [] 
    # FIX: New list to hold the text of matched chunks for accurate highlighting
    highlighted_chunks = [] 

    
    # Split text into sentences/chunks for comparison
    chunks = [chunk.strip() for chunk in text.replace("\n", " ").split(".") if chunk.strip()]

    for source in live_sources:
        source_content = source.get("content", "")
        if not source_content:
            continue
        
        source_sentences = [sent.strip() for sent in source_content.split(".") if sent.strip()]

        for chunk in chunks:
            
            comparison_targets = [source_content] + source_sentences
            
            max_sequence_ratio = 0.0
            max_cosine_ratio = 0.0
            
            for target in comparison_targets:
                current_sequence_ratio = SequenceMatcher(None, chunk.lower(), target.lower()).ratio()
                max_sequence_ratio = max(max_sequence_ratio, current_sequence_ratio)
                
                current_cosine_ratio = cosine_similarity_score(chunk.lower(), target.lower())
                max_cosine_ratio = max(max_cosine_ratio, current_cosine_ratio)

            # --- Scoring and Highlighting Logic ---
            
            if max_cosine_ratio > 0.3: 
                
                if source not in highlighted_segments_data:
                    highlighted_segments_data.append(source) 

                # FIX: Store the sequence match ratio for averaging
                all_chunk_similarities.append(int(max_sequence_ratio * 100))
                highlighted_chunks.append(chunk) # FIX: Store the matched chunk text

                # Add detailed explanation based on the Cosine Ratio
                if max_cosine_ratio > 0.8:
                    explanation.append(f"Exact match ({int(max_sequence_ratio*100)}% sequence match) detected from {source['url']}")
                elif max_cosine_ratio > 0.6:
                    explanation.append(f"High semantic similarity/Paraphrased content ({int(max_sequence_ratio*100)}% sequence match) detected from {source['url']}")
                elif max_cosine_ratio > 0.4:
                    explanation.append(f"Potential concept overlap ({int(max_sequence_ratio*100)}% sequence match) detected from {source['url']}")


    # FIX: Calculate the final average similarity score
    if all_chunk_similarities:
        avg_similarity = sum(all_chunk_similarities) / len(all_chunk_similarities)
        final_similarity = int(avg_similarity)
    else:
        final_similarity = 0


    if not explanation:
        explanation.append("Your text appears original! Remember to cite your sources properly.")
    else:
        explanation.append("💡 Suggestion: Use the 'Suggest Paraphrase' feature for flagged sentences to improve originality.")
        explanation.append("💡 Suggestion: Always cite the source for any matched content found.")

    # FIX: Pass the newly collected highlighted_chunks for accurate highlighting
    highlighted_text = highlight_text_with_explanation(text, highlighted_segments_data, highlighted_chunks)

    
    # Finalize sources for the frontend
    formatted_sources = []
    unique_urls = set()
    for s in highlighted_segments_data:
        if s["url"] not in unique_urls:
            formatted_sources.append({"url": s["url"], "excerpt": s["excerpt"]})
            unique_urls.add(s["url"])

    return {
        "similarity": final_similarity, # FIX: Use the calculated average similarity
        "highlighted_text": highlighted_text,
        "sources": formatted_sources,
        "explanation": explanation,
        "ai": 10, 
        "human": 90
    }