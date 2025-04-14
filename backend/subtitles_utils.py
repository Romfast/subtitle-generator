import re

def split_subtitle_into_segments(text, max_words_per_segment=4):
    """
    Împarte textul subtitlării în segmente mai mici, fiecare cu maxim 4 cuvinte.
    Această funcție este folosită pentru a crea segmente separate de subtitrări, nu doar linii.
    
    Args:
        text (str): Textul subtitlării originale
        max_words_per_segment (int): Numărul maxim de cuvinte per segment
    
    Returns:
        list: Lista de segmente noi de subtitrare
    """
    if not text:
        return []
    
    # Împărțim textul în cuvinte
    words = text.split()
    
    # Dacă avem mai puține sau egal cu max_words_per_segment cuvinte, returnăm un singur segment
    if len(words) <= max_words_per_segment:
        return [text]
    
    # Altfel, împărțim în segmente de max_words_per_segment cuvinte
    segments = []
    for i in range(0, len(words), max_words_per_segment):
        segment_words = words[i:i + max_words_per_segment]
        segments.append(" ".join(segment_words))
    
    return segments

def split_subtitle_into_lines(text, max_lines=2, max_width_percent=50, max_words_per_line=4):
    """
    Împarte textul subtitlării în mai multe linii, respectând numărul maxim de linii
    și limitând fiecare linie la max_words_per_line cuvinte.
    
    Args:
        text (str): Textul subtitlării
        max_lines (int): Numărul maxim de linii
        max_width_percent (int): Procentajul maxim din lățimea videoului
        max_words_per_line (int): Numărul maxim de cuvinte per linie
    
    Returns:
        str: Textul subtitlării formatat pe mai multe linii
    """
    if not text:
        return ""
    
    # Împărțim textul în cuvinte
    words = text.split()
    
    if not words:
        return ""
    
    # Dacă avem mai puține sau egal cu max_words_per_line cuvinte, returnăm textul ca atare
    if len(words) <= max_words_per_line:
        return text
    
    # Construim liniile
    lines = []
    for i in range(0, len(words), max_words_per_line):
        # Luăm maxim max_words_per_line cuvinte pentru fiecare linie
        line_words = words[i:i + max_words_per_line]
        lines.append(" ".join(line_words))
        
        # Dacă am ajuns la numărul maxim de linii, ne oprim
        if len(lines) >= max_lines:
            # Dacă mai avem cuvinte rămase, le adăugăm la ultima linie
            if i + max_words_per_line < len(words):
                remaining_words = words[i + max_words_per_line:]
                lines[-1] = lines[-1] + " " + " ".join(remaining_words)
            break
    
    # Combinăm liniile cu un caracter newline
    return "\n".join(lines)

def break_long_subtitles(subtitles, max_words_per_segment=4):
    """
    Împarte subtitrările lungi în segmente mai mici.
    
    Args:
        subtitles (list): Lista de subtitrări
        max_words_per_segment (int): Numărul maxim de cuvinte per segment
    
    Returns:
        list: Lista de subtitrări împărțite în segmente mai mici
    """
    result = []
    
    for subtitle in subtitles:
        # Verificăm dacă subtitrarea are prea multe cuvinte
        words = subtitle['text'].split()
        
        if len(words) <= max_words_per_segment:
            # Dacă e sub limita de cuvinte, o păstrăm așa cum e
            result.append(subtitle)
        else:
            # Altfel, o împărțim în segmente
            segments = split_subtitle_into_segments(subtitle['text'], max_words_per_segment)
            
            # Calculăm durata per segment
            duration = subtitle['end'] - subtitle['start']
            segment_duration = duration / len(segments)
            
            # Creăm noile segmente de subtitrare
            for i, segment_text in enumerate(segments):
                segment_start = subtitle['start'] + i * segment_duration
                segment_end = segment_start + segment_duration
                
                result.append({
                    'start': segment_start,
                    'end': segment_end,
                    'text': segment_text
                })
    
    return result

def format_srt_with_line_limits(subtitles, max_lines=2, max_width_percent=50, max_words_per_line=4):
    """
    Formatează lista de subtitrări pentru a respecta limitele de linii și lățime.
    
    Args:
        subtitles (list): Lista de subtitrări
        max_lines (int): Numărul maxim de linii
        max_width_percent (int): Procentajul maxim din lățimea videoului
        max_words_per_line (int): Numărul maxim de cuvinte per linie
    
    Returns:
        list: Lista de subtitrări formatată
    """
    # Mai întâi împărțim subtitrările lungi în segmente mai mici
    segmented_subtitles = break_long_subtitles(subtitles, max_words_per_line)
    
    # Apoi formatăm fiecare segment pe linii
    formatted_subtitles = []
    
    for subtitle in segmented_subtitles:
        formatted_text = split_subtitle_into_lines(
            subtitle['text'], 
            max_lines, 
            max_width_percent,
            max_words_per_line
        )
        
        formatted_subtitles.append({
            'start': subtitle['start'],
            'end': subtitle['end'],
            'text': formatted_text
        })
    
    return formatted_subtitles