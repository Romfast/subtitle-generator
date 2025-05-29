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
    Împarte subtitrările lungi în segmente mai mici, păstrând informațiile de timing pentru cuvinte.
    
    Args:
        subtitles (list): Lista de subtitrări cu timing-ul cuvintelor
        max_words_per_segment (int): Numărul maxim de cuvinte per segment
    
    Returns:
        list: Lista de subtitrări împărțite în segmente mai mici cu timing păstrat
    """
    result = []
    
    for subtitle in subtitles:
        # Verificăm dacă subtitrarea are prea multe cuvinte
        words = subtitle['text'].split()
        
        if len(words) <= max_words_per_segment:
            # Dacă e sub limita de cuvinte, o păstrăm așa cum e
            result.append(subtitle)
        else:
            # Altfel, o împărțim în segmente, păstrând timing-ul word-level dacă există
            segments = split_subtitle_into_segments(subtitle['text'], max_words_per_segment)
            
            # Calculăm durata per segment
            duration = subtitle['end'] - subtitle['start']
            
            # Dacă avem timing word-level, îl folosim; altfel estimăm
            if 'words' in subtitle and subtitle['words']:
                # Folosim timing-ul real al cuvintelor
                word_timings = subtitle['words']
                current_word_index = 0
                
                for i, segment_text in enumerate(segments):
                    segment_words = segment_text.split()
                    segment_word_count = len(segment_words)
                    
                    # Găsim timing-ul pentru cuvintele din acest segment
                    segment_words_timing = []
                    segment_start = subtitle['start']
                    segment_end = subtitle['end']
                    
                    if current_word_index < len(word_timings):
                        segment_start = word_timings[current_word_index]['start']
                        
                        # Calculăm sfârșitul segmentului
                        end_word_index = min(current_word_index + segment_word_count - 1, len(word_timings) - 1)
                        segment_end = word_timings[end_word_index]['end']
                        
                        # Colectăm timing-ul pentru cuvintele din segment
                        for j in range(segment_word_count):
                            if current_word_index + j < len(word_timings):
                                segment_words_timing.append(word_timings[current_word_index + j])
                        
                        current_word_index += segment_word_count
                    
                    result.append({
                        'start': segment_start,
                        'end': segment_end,
                        'text': segment_text,
                        'words': segment_words_timing
                    })
            else:
                # Fallback la estimare dacă nu avem timing word-level
                segment_duration = duration / len(segments)
                
                for i, segment_text in enumerate(segments):
                    segment_start = subtitle['start'] + i * segment_duration
                    segment_end = segment_start + segment_duration
                    
                    result.append({
                        'start': segment_start,
                        'end': segment_end,
                        'text': segment_text,
                        'words': []  # Fără timing word-level
                    })
    
    return result

def format_srt_with_line_limits(subtitles, max_lines=2, max_width_percent=50, max_words_per_line=4):
    """
    Formatează lista de subtitrări pentru a respecta limitele de linii și lățime,
    păstrând informațiile de timing pentru cuvinte.
    
    Args:
        subtitles (list): Lista de subtitrări cu timing word-level
        max_lines (int): Numărul maxim de linii
        max_width_percent (int): Procentajul maxim din lățimea videoului
        max_words_per_line (int): Numărul maxim de cuvinte per linie
    
    Returns:
        list: Lista de subtitrări formatată cu timing păstrat
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
        
        # Păstrăm timing-ul word-level dacă există
        formatted_subtitle = {
            'start': subtitle['start'],
            'end': subtitle['end'],
            'text': formatted_text
        }
        
        # Adăugăm informațiile de timing pentru cuvinte dacă există
        if 'words' in subtitle:
            formatted_subtitle['words'] = subtitle['words']
        
        formatted_subtitles.append(formatted_subtitle)
    
    return formatted_subtitles