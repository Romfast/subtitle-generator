# backend/subtitles_utils.py
# FIX #9: Calculare automată a numărului de cuvinte pe linie bazată pe 70% lățime video
# FIX #8: Suport corect pentru numărul configurabil de linii

import re

def calculate_optimal_words_per_line(text, max_width_percent=70, video_width=1920):
    """
    Calculează numărul optim de cuvinte pe linie bazat pe lățimea video și procentajul maxim.
    
    Args:
        text (str): Textul pentru care calculăm
        max_width_percent (int): Procentajul maxim din lățimea video (default 70%)
        video_width (int): Lățimea video-ului în pixeli (default 1920)
    
    Returns:
        int: Numărul optim de cuvinte pe linie
    """
    if not text:
        return 3
    
    # Calculăm lățimea disponibilă în pixeli
    available_width = (video_width * max_width_percent) / 100
    
    # Estimăm că un caracter mediu are ~12 pixeli lățime la fonturile standard
    avg_char_width = 12
    
    # Calculăm numărul maxim de caractere pe linie
    max_chars_per_line = int(available_width / avg_char_width)
    
    # Împărțim textul în cuvinte și calculăm lungimea medie a cuvintelor
    words = text.split()
    if not words:
        return 3
    
    avg_word_length = sum(len(word) for word in words) / len(words)
    
    # Calculăm numărul optim de cuvinte pe linie (incluzând spațiile)
    # Un spațiu între cuvinte = 1 caracter
    optimal_words = max(1, int(max_chars_per_line / (avg_word_length + 1)))
    
    # Limităm între 1 și 6 cuvinte pentru lizibilitate
    return min(max(1, optimal_words), 6)

def split_subtitle_into_lines_auto(text, max_lines=2, max_width_percent=70, video_width=1920):
    """
    FIX #9: Împarte textul subtitrării în linii folosind calculul automat de cuvinte pe linie.
    FIX #8: Respectă numărul maxim configurabil de linii.
    
    Args:
        text (str): Textul subtitlării
        max_lines (int): Numărul maxim de linii (configurabil)
        max_width_percent (int): Procentajul maxim din lățimea video-ului
        video_width (int): Lățimea video-ului în pixeli
    
    Returns:
        str: Textul formatat pe linii
    """
    if not text:
        return ""
    
    # Calculăm numărul optim de cuvinte pe linie
    optimal_words_per_line = calculate_optimal_words_per_line(text, max_width_percent, video_width)
    
    # Împărțim textul în cuvinte
    words = text.split()
    
    if not words:
        return ""
    
    # Dacă avem mai puține cuvinte decât optimul pentru o linie, returnăm textul ca atare
    if len(words) <= optimal_words_per_line:
        return text
    
    # Construim liniile
    lines = []
    current_line_words = []
    
    for word in words:
        # Verificăm dacă adăugarea acestui cuvânt ar depăși limita
        if len(current_line_words) >= optimal_words_per_line:
            # Salvăm linia curentă și începem una nouă
            if current_line_words:
                lines.append(" ".join(current_line_words))
                current_line_words = []
            
            # Dacă am atins numărul maxim de linii, forțăm restul pe ultima linie
            if len(lines) >= max_lines:
                break
        
        current_line_words.append(word)
    
    # Adăugăm ultima linie dacă mai avem cuvinte
    if current_line_words:
        if len(lines) < max_lines:
            lines.append(" ".join(current_line_words))
        else:
            # Dacă am depășit numărul maxim de linii, adăugăm la ultima linie
            if lines:
                lines[-1] += " " + " ".join(current_line_words)
            else:
                lines.append(" ".join(current_line_words))
    
    # Dacă mai avem cuvinte rămase și am atins limita de linii
    remaining_words_index = sum(len(line.split()) for line in lines)
    if remaining_words_index < len(words):
        remaining_words = words[remaining_words_index:]
        if lines and len(lines) == max_lines:
            # Adăugăm cuvintele rămase la ultima linie
            lines[-1] += " " + " ".join(remaining_words)
        elif len(lines) < max_lines:
            # Creăm o linie nouă cu cuvintele rămase
            lines.append(" ".join(remaining_words))
    
    # Combinăm liniile cu caractere de întrerupere linie
    result = "\n".join(lines)
    
    print(f"Auto line split: '{text}' -> {len(lines)} lines, {optimal_words_per_line} words/line optimal")
    print(f"Result: '{result}'")
    
    return result

def split_subtitle_into_segments_auto(text, max_lines=2, max_width_percent=70, video_width=1920):
    """
    FIX #9: Împarte textul în segmente separate dacă depășește capacitatea de afișare.
    
    Args:
        text (str): Textul subtitlării originale
        max_lines (int): Numărul maxim de linii per segment
        max_width_percent (int): Procentajul maxim din lățimea video-ului
        video_width (int): Lățimea video-ului în pixeli
    
    Returns:
        list: Lista de segmente de text
    """
    if not text:
        return []
    
    # Calculăm capacitatea optimă per segment
    optimal_words_per_line = calculate_optimal_words_per_line(text, max_width_percent, video_width)
    max_words_per_segment = optimal_words_per_line * max_lines
    
    # Împărțim textul în cuvinte
    words = text.split()
    
    # Dacă încape într-un singur segment, returnăm textul formatat
    if len(words) <= max_words_per_segment:
        formatted_text = split_subtitle_into_lines_auto(text, max_lines, max_width_percent, video_width)
        return [formatted_text]
    
    # Altfel, împărțim în segmente
    segments = []
    for i in range(0, len(words), max_words_per_segment):
        segment_words = words[i:i + max_words_per_segment]
        segment_text = " ".join(segment_words)
        formatted_segment = split_subtitle_into_lines_auto(segment_text, max_lines, max_width_percent, video_width)
        segments.append(formatted_segment)
    
    print(f"Split into {len(segments)} segments, max {max_words_per_segment} words per segment")
    
    return segments

def break_long_subtitles_auto(subtitles, max_lines=2, max_width_percent=70, video_width=1920):
    """
    FIX #9: Împarte subtitrările lungi în segmente mai mici cu calculul automat de cuvinte.
    FIX #8: Respectă numărul configurabil de linii.
    
    Args:
        subtitles (list): Lista de subtitrări cu timing-ul cuvintelor
        max_lines (int): Numărul maxim de linii per segment
        max_width_percent (int): Procentajul maxim din lățimea video-ului
        video_width (int): Lățimea video-ului în pixeli
    
    Returns:
        list: Lista de subtitrări împărțite în segmente cu timing păstrat
    """
    result = []
    
    for subtitle in subtitles:
        # Calculăm capacitatea optimă
        optimal_words_per_line = calculate_optimal_words_per_line(subtitle['text'], max_width_percent, video_width)
        max_words_per_segment = optimal_words_per_line * max_lines
        
        # Verificăm dacă subtitrarea are prea multe cuvinte
        words = subtitle['text'].split()
        
        if len(words) <= max_words_per_segment:
            # Dacă încape, o formatăm și o păstrăm
            formatted_text = split_subtitle_into_lines_auto(
                subtitle['text'], max_lines, max_width_percent, video_width
            )
            result.append({
                'start': subtitle['start'],
                'end': subtitle['end'],
                'text': formatted_text,
                'words': subtitle.get('words', [])
            })
        else:
            # Altfel, o împărțim în segmente, păstrând timing-ul word-level dacă există
            segments = split_subtitle_into_segments_auto(
                subtitle['text'], max_lines, max_width_percent, video_width
            )
            
            # Calculăm durata per segment
            duration = subtitle['end'] - subtitle['start']
            
            # Dacă avem timing word-level, îl folosim; altfel estimăm
            if 'words' in subtitle and subtitle['words']:
                # Folosim timing-ul real al cuvintelor
                word_timings = subtitle['words']
                current_word_index = 0
                
                for i, segment_text in enumerate(segments):
                    # Numărăm cuvintele din acest segment (fără \n)
                    segment_word_count = len(segment_text.replace('\n', ' ').split())
                    
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
                        'words': []
                    })
    
    return result

def format_srt_with_auto_lines(subtitles, max_lines=2, max_width_percent=70, video_width=1920):
    """
    FIX #9: Formatează lista de subtitrări cu calculul automat de cuvinte pe linie.
    FIX #8: Respectă numărul configurabil de linii.
    
    Args:
        subtitles (list): Lista de subtitrări cu timing word-level
        max_lines (int): Numărul maxim de linii
        max_width_percent (int): Procentajul maxim din lățimea video-ului
        video_width (int): Lățimea video-ului în pixeli
    
    Returns:
        list: Lista de subtitrări formatată cu timing păstrat
    """
    print(f"Formatting subtitles with auto calculation: max_lines={max_lines}, max_width={max_width_percent}%, video_width={video_width}")
    
    # Mai întâi împărțim subtitrările lungi în segmente mai mici
    segmented_subtitles = break_long_subtitles_auto(subtitles, max_lines, max_width_percent, video_width)
    
    # Rezultatul este deja formatat corect din break_long_subtitles_auto
    print(f"Final result: {len(segmented_subtitles)} subtitle segments")
    
    return segmented_subtitles

# Funcții originale păstrate pentru compatibilitate cu codul vechi
def split_subtitle_into_segments(text, max_words_per_segment=4):
    """
    DEPRECATED: Folosește split_subtitle_into_segments_auto în loc.
    Păstrată pentru compatibilitate.
    """
    # Convertim la noua funcție automat
    return split_subtitle_into_segments_auto(text, max_lines=1, max_width_percent=70)

def split_subtitle_into_lines(text, max_lines=2, max_width_percent=50, max_words_per_line=4):
    """
    DEPRECATED: Folosește split_subtitle_into_lines_auto în loc.
    Păstrată pentru compatibilitate.
    """
    # Convertim la noua funcție automată
    return split_subtitle_into_lines_auto(text, max_lines, max_width_percent)

def break_long_subtitles(subtitles, max_words_per_segment=4):
    """
    DEPRECATED: Folosește break_long_subtitles_auto în loc.
    Păstrată pentru compatibilitate.
    """
    # Convertim la noua funcție automată
    return break_long_subtitles_auto(subtitles, max_lines=2, max_width_percent=70)

def format_srt_with_line_limits(subtitles, max_lines=2, max_width_percent=50, max_words_per_line=4):
    """
    DEPRECATED: Folosește format_srt_with_auto_lines în loc.
    Păstrată pentru compatibilitate.
    """
    # Convertim la noua funcție automată
    return format_srt_with_auto_lines(subtitles, max_lines, max_width_percent)