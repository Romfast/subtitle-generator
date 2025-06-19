# backend/subtitles_utils.py
# FIX #9: Calculare automată a numărului de cuvinte pe linie bazată pe 70% lățime video
# FIX #8: Suport corect pentru numărul configurabil de linii

import re

# --- NEW CHARACTER-BASED LINE SPLITTING LOGIC ---

def calculate_max_chars_per_line(video_width, max_width_percent, font_size, font_family="Arial"):
    """
    Calculates the maximum number of characters that can fit on a single subtitle line.

    Args:
        video_width (int): The width of the video in pixels.
        max_width_percent (float): The maximum percentage of video width the subtitle can occupy (e.g., 0.7 for 70%).
        font_size (int): The font size in pixels (as it would be rendered in ASS).
        font_family (str, optional): The font family. Defaults to "Arial". (Currently unused in heuristic)

    Returns:
        int: The maximum number of characters estimated to fit on a line. Returns a minimum of 10 if calculation is too low.
    """
    if not video_width or not font_size or font_size <= 0 or max_width_percent <= 0:
        # print(f"[WARN] Invalid input for calculate_max_chars_per_line: video_width={video_width}, font_size={font_size}, max_width_percent={max_width_percent}. Returning default 30.")
        return 30 # Default fallback

    # Estimate average character width. Heuristic: avg_char_width is ~60% of font_size.
    estimated_average_char_width = font_size * 0.6
    if estimated_average_char_width == 0: # Avoid division by zero
        return 30

    max_allowable_pixel_width = video_width * max_width_percent
    calculated_max_chars = int(max_allowable_pixel_width / estimated_average_char_width)
    
    # print(f"Calculated max_chars_per_line: video_width={video_width}, max_width_percent={max_width_percent}, font_size={font_size} -> {calculated_max_chars} (raw), {max(10, calculated_max_chars)} (final)")
    return max(10, calculated_max_chars)


def split_text_into_lines_by_char_limit(text_content, max_chars_per_line, max_lines=2):
    """
    Splits a single block of text into lines based on max_chars_per_line and max_lines.
    Args:
        text_content (str): The text to split.
        max_chars_per_line (int): Max characters for a line.
        max_lines (int): Max number of lines for this text block.
    Returns:
        str: Text with '\n' for line breaks.
    """
    words = text_content.split()
    if not words:
        return ""

    lines = []
    current_line = ""
    for word in words:
        if not current_line:
            current_line = word
        elif len(lines) < max_lines -1: # If we can still create new lines
            if len(current_line) + 1 + len(word) <= max_chars_per_line:
                current_line += " " + word
            else:
                lines.append(current_line)
                current_line = word
        else: # Last allowed line, append all remaining words here
            current_line += " " + word # This line might exceed max_chars_per_line

    if current_line:
        lines.append(current_line)

    # If the last line (in case of max_lines being reached and words appended) is too long,
    # it's a limitation of this approach. The primary split should happen in break_long_subtitles.
    # This function primarily ensures the max_lines constraint for a given segment.
    # Forcibly truncate if a single word itself is longer than max_chars_per_line on the first line.
    if len(lines) == 1 and len(lines[0]) > max_chars_per_line:
        # print(f"[WARN] Single line still exceeds char limit: '{lines[0]}' (limit: {max_chars_per_line}). Truncation might occur if not handled by segment splitting.")
        pass # Let ASS renderer handle this, or rely on break_long_subtitles_by_char_limit

    return "\n".join(lines[:max_lines])


def break_long_subtitles_by_char_limit(subtitles_data, max_chars_per_line, max_lines=2):
    """
    Breaks long subtitle segments from Whisper into smaller, timed segments
    based on total character capacity (max_chars_per_line * max_lines).
    It attempts to use word-level timings if available and correctly aligned.

    Args:
        subtitles_data (list): List of subtitle dictionaries (must have 'text', 'start', 'end', and optionally 'words').
        max_chars_per_line (int): The maximum characters allowed per line.
        max_lines (int, optional): The maximum number of lines per new segment. Defaults to 2.

    Returns:
        list: A new list of subtitle dictionaries, with long ones broken down and lines formatted.
    """
    new_subtitles_list = []
    # Max characters a single subtitle segment should hold before being broken into a new timed event
    segment_char_capacity = max_chars_per_line * max_lines

    for sub_item_original in subtitles_data:
        original_text_content = sub_item_original['text'].strip()

        if not original_text_content:
            continue

        # If the original text fits, format it and add
        if len(original_text_content) <= segment_char_capacity:
            formatted_text_lines = split_text_into_lines_by_char_limit(original_text_content, max_chars_per_line, max_lines)
            new_subtitles_list.append({
                'start': sub_item_original['start'],
                'end': sub_item_original['end'],
                'text': formatted_text_lines,
                'words': list(sub_item_original.get('words', [])) # Ensure 'words' key exists
            })
        else:
            # Text is too long, needs to be split into multiple timed segments
            words_from_original_text = original_text_content.split()
            num_total_words = len(words_from_original_text)

            word_timings_available = sub_item_original.get('words', [])
            # Basic check if word timings seem usable
            has_reliable_word_timings = isinstance(word_timings_available, list) and len(word_timings_available) == num_total_words

            current_word_idx_overall = 0
            current_segment_start_time = sub_item_original['start']

            while current_word_idx_overall < num_total_words:
                current_segment_text_parts = []
                current_segment_char_count = 0
                current_segment_word_objects = [] # For storing word objects with timing for this new segment

                # Accumulate words for the new segment
                for i in range(current_word_idx_overall, num_total_words):
                    word = words_from_original_text[i]
                    word_len_with_space = len(word) + (1 if current_segment_text_parts else 0)

                    if current_segment_char_count + word_len_with_space > segment_char_capacity and current_segment_text_parts:
                        break # Current segment is full

                    current_segment_text_parts.append(word)
                    current_segment_char_count += word_len_with_space
                    if has_reliable_word_timings:
                        current_segment_word_objects.append(word_timings_available[i])
                    current_word_idx_overall += 1

                segment_text_final = " ".join(current_segment_text_parts)
                formatted_segment_text = split_text_into_lines_by_char_limit(segment_text_final, max_chars_per_line, max_lines)

                segment_end_time = sub_item_original['end'] # Default to original end
                if has_reliable_word_timings and current_segment_word_objects:
                    segment_end_time = current_segment_word_objects[-1]['end']
                elif current_word_idx_overall < num_total_words : # Not the last segment, estimate end time
                    # Estimate based on proportion of words if no reliable timings
                    avg_duration_per_word_estimate = (sub_item_original['end'] - sub_item_original['start']) / num_total_words if num_total_words > 0 else 0.1
                    estimated_segment_duration = len(current_segment_text_parts) * avg_duration_per_word_estimate
                    segment_end_time = current_segment_start_time + estimated_segment_duration
                    segment_end_time = min(segment_end_time, sub_item_original['end']) # Cap at original end

                # Ensure start < end, and segment does not exceed original timings significantly
                current_segment_start_time = min(current_segment_start_time, segment_end_time - 0.01 if segment_end_time > current_segment_start_time else segment_end_time)

                new_subtitles_list.append({
                    'start': current_segment_start_time,
                    'end': segment_end_time,
                    'text': formatted_segment_text,
                    'words': list(current_segment_word_objects) # Word objects for this specific segment
                })

                # Setup for next segment
                if current_word_idx_overall < num_total_words:
                    if has_reliable_word_timings:
                        current_segment_start_time = word_timings_available[current_word_idx_overall]['start']
                    else:
                        current_segment_start_time = segment_end_time # Start next segment where last one ended
                    # Ensure start time does not go beyond original sub end
                    current_segment_start_time = min(current_segment_start_time, sub_item_original['end'])


    return new_subtitles_list


def format_subtitles_style_and_layout(subtitles_data, video_width, max_width_percent, font_size, max_lines=2, font_family="Arial"):
    """
    Primary formatting function. Formats a list of subtitle data using character limits
    derived from video dimensions, font size, and width percentage.

    Args:
        subtitles_data (list): List of subtitle dictionaries from Whisper (e.g., [{'text': ..., 'start': ..., 'end': ..., 'words': [...]}]).
        video_width (int): Width of the video in pixels.
        max_width_percent (float): Max percentage of video width for subtitles (e.g., 0.7 for 70%).
        font_size (int): Font size in pixels.
        max_lines (int, optional): Maximum number of lines per subtitle. Defaults to 2.
        font_family (str, optional): Font family (currently for future use in char width estimation). Defaults to "Arial".

    Returns:
        list: The list of formatted subtitle dictionaries.
    """
    # print(f"Formatting with: video_width={video_width}, max_width_percent={max_width_percent}, font_size={font_size}, max_lines={max_lines}")

    if not subtitles_data:
        return []

    if max_width_percent > 1.0: # Convert percentage like 70 to 0.7
        max_width_percent = max_width_percent / 100.0

    calculated_chars_per_line = calculate_max_chars_per_line(video_width, max_width_percent, font_size, font_family)
    # print(f"Calculated max_chars_per_line for formatting: {calculated_chars_per_line}")

    # Process subtitles: break long ones into timed segments, then format lines for each segment
    formatted_subtitles = break_long_subtitles_by_char_limit(subtitles_data, calculated_chars_per_line, max_lines)

    # print(f"Subtitle formatting complete. Input segments: {len(subtitles_data)}, Output segments: {len(formatted_subtitles)}")
    return formatted_subtitles

# --- END NEW CHARACTER-BASED LINE SPLITTING LOGIC ---

# --- Deprecated word-based functions (can be removed if new logic is stable) ---

def calculate_optimal_words_per_line(text, max_width_percent=70, video_width=1920):
    """DEPRECATED: This function uses a word-based heuristic. Prefer character-based splitting using font metrics."""
    print("[WARN] Using DEPRECATED calculate_optimal_words_per_line.")
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
    return min(max(1, optimal_words), 7) # Capped words

def split_subtitle_into_lines_auto(text, max_lines=2, max_width_percent=70, video_width=1920):
    """DEPRECATED: This function uses a word-based heuristic. Prefer character-based splitting using font metrics via format_srt_with_auto_lines."""
    print(f"[WARN] Using DEPRECATED split_subtitle_into_lines_auto for text: '{text[:30]}...'")
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
    """DEPRECATED: This function uses a word-based heuristic. Prefer character-based splitting via format_srt_with_auto_lines."""
    print("[WARN] Using DEPRECATED break_long_subtitles_auto.")
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

# --- Maintain compatibility with old function name `format_srt_with_auto_lines` ---
# This will be the main entry point called by app.py
def format_srt_with_auto_lines(subtitles, max_lines=2, max_width_percent=70, video_width=1920, font_size=None):
    """
    Main formatting entry point. If font_size, video_width are provided, it uses the new character-based splitting.
    Otherwise, it logs a warning and attempts a graceful fallback or returns minimally processed subtitles.
    
    Args:
        subtitles (list): List of subtitle data from Whisper.
        max_lines (int): Max lines per subtitle.
        max_width_percent (float or int): Max percentage of video width (e.g., 70 for 70%).
        video_width (int): Video width in pixels.
        font_size (int, optional): Font size in pixels for character-based splitting.

    Returns:
        list: Formatted subtitles.
    """
    if max_width_percent > 1: # Ensure it's a float like 0.7
        max_width_percent = max_width_percent / 100.0

    if font_size is not None and video_width is not None and video_width > 0 and font_size > 0:
        # print(f"Using character-based subtitle formatting via format_subtitles_style_and_layout with font_size: {font_size}")
        return format_subtitles_style_and_layout(subtitles, video_width, max_width_percent, font_size, max_lines)
    else:
        print(f"[WARN] Insufficient parameters for character-based formatting (font_size: {font_size}, video_width: {video_width}). Minimal processing will be applied.")
        # Fallback: very basic processing, just ensure text key exists and strip.
        # No complex line splitting if we can't calculate char limits.
        processed_subs = []
        for sub in subtitles:
            processed_subs.append({
                'start': sub['start'],
                'end': sub['end'],
                'text': sub['text'].strip(), # Basic strip
                'words': sub.get('words', [])
            })
        return processed_subs

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