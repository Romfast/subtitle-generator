# Funcții pentru procesarea subtitrărilor cu poziție personalizată
import re

def hex_to_ass_color(hex_color):
    """Convert hex color to ASS color format (AABBGGRR format)."""
    if hex_color.startswith('#'):
        hex_color = hex_color[1:]
    
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        # ASS uses BGR format with alpha in front: &HAABBGGRR
        return f'&H00{b:02X}{g:02X}{r:02X}'
    
    return '&H00FFFFFF'  # Default to white if invalid

def process_text_with_options(text, style):
    """
    Procesează textul conform opțiunilor din style (ALL CAPS, eliminare punctuație).
    
    Args:
        text: Textul de procesat
        style: Dicționar cu opțiunile de stil
    
    Returns:
        str: Textul procesat
    """
    processed_text = text
    
    # Aplicăm ALL CAPS dacă este activat
    if style.get('allCaps', False):
        processed_text = processed_text.upper()
    
    # Eliminăm semnele de punctuație dacă este selectat
    if style.get('removePunctuation', False):
        import re
        processed_text = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()]', '', processed_text)
        processed_text = re.sub(r'\s{2,}', ' ', processed_text)  # eliminăm spațiile multiple
    
    return processed_text

def format_ass_timestamp(seconds):
    """Convert seconds to ASS timestamp format (h:mm:ss.cc)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds_int = int(seconds % 60)
    centiseconds = int((seconds % 1) * 100)
    
    return f"{hours}:{minutes:02d}:{seconds_int:02d}.{centiseconds:02d}"

def create_ass_file_with_custom_position(srt_path, output_path, style, subtitles):
    """
    Creează un fișier ASS (Advanced SubStation Alpha) pentru subtitrări cu poziționare personalizată.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
    
    Returns:
        str: Calea către fișierul ASS generat
    """
    custom_x = style.get('customX', 50)
    custom_y = style.get('customY', 90)
    
    # Calculăm coordonatele în funcție de procentajele date
    x_pos = custom_x / 100 * 1280  # Transformăm procentajul în coordonate absolute
    y_pos = custom_y / 100 * 720   # pentru a asigura poziționarea consecventă
    
    # Creăm un header pentru fișierul ASS
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{primary_color},&H{secondary_color},&H{outline_color},&H{back_color},0,0,0,0,100,100,0,0,1,{outline_width},0,2,10,10,10,1
Style: CurrentWord,{font_family},{font_size},&H{current_word_color},&H{secondary_color},&H{current_word_border_color},&H{back_color},1,0,0,0,100,100,0,0,1,{outline_width},0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Extragem parametrii de stil
    font_family = style.get('fontFamily', 'Arial')
    # Ajustăm dimensiunea fontului în funcție de rezoluția video
    base_font_size = style.get('fontSize', 24)
    # Dimensiunea fontului ar trebui să fie aproximativ 2.5% din înălțimea video pentru 24px
    # la o rezoluție de 720p
    font_size = max(18, int(base_font_size * 0.9))  # Reducem doar cu 10% maximum
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))
    outline_color = hex_to_ass_color(style.get('borderColor', '#000000'))
    outline_width = style.get('borderWidth', 2)
    
    # Extragem culorile pentru cuvântul curent
    current_word_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))
    current_word_border_color = hex_to_ass_color(style.get('currentWordBorderColor', '#000000'))
    
    # Completăm header-ul cu informațiile de stil
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=font_size,
        primary_color=font_color[2:],  # Eliminăm &H din început
        secondary_color="FFFFFF",
        outline_color=outline_color[2:],
        current_word_color=current_word_color[2:],
        current_word_border_color=current_word_border_color[2:],
        back_color="000000",
        outline_width=outline_width
    )
    
    # Adăugăm o întârziere pentru sincronizare
    sync_delay = 0.5  # 500ms întârziere
    
    # Creăm fișierul ASS
    with open(output_path, 'w', encoding='utf-8') as ass_file:
        ass_file.write(ass_header)
        
        # Adăugăm evenimentele de dialog pentru fiecare subtitrare
        for sub in subtitles:
            # Aplicăm întârzierea pentru sincronizare
            start_time = sub['start'] + sync_delay
            end_time = sub['end'] + sync_delay
            
            start_ts = format_ass_timestamp(start_time)
            end_ts = format_ass_timestamp(end_time)
            
            # Procesează textul conform opțiunilor din style
            text = process_text_with_options(sub['text'].strip(), style)
            text = text.replace('\n', '\\N')
            
            # Adăugăm poziția personalizată ca tag override cu coordonate absolute
            position_tag = f"{{\\pos({x_pos},{y_pos})}}"
            
            # Scriem linia de dialog
            dialog_line = f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{position_tag}{text}\n"
            ass_file.write(dialog_line)
    
    return output_path

def create_karaoke_ass_file(srt_path, output_path, style, subtitles):
    """
    Creează un fișier ASS cu efect de karaoke îmbunătățit pentru a evidenția cuvintele
    pe măsură ce sunt pronunțate, cu o estimare mai precisă a duratei fiecărui cuvânt.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
    
    Returns:
        str: Calea către fișierul ASS generat
    """
    # Header ASS cu setări optime pentru karaoke
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
Timer: 100.0000
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{font_color},&H{highlight_color},&H{border_color},&H80000000,0,0,0,0,100,100,0,0,1,{border_width},0,{text_align},10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Parametri de stil
    font_family = style.get('fontFamily', 'Arial')
    # Ajustăm dimensiunea fontului în funcție de rezoluția video
    base_font_size = style.get('fontSize', 24)
    # Dimensiunea fontului ar trebui să fie aproximativ 2.5% din înălțimea video pentru 24px
    # la o rezoluție de 720p
    font_size = max(18, int(base_font_size * 0.9))  # Reducem doar cu 10% maximum
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))[2:]  # Fără &H prefix
    border_color = hex_to_ass_color(style.get('borderColor', '#000000'))[2:]
    highlight_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))[2:]
    border_width = style.get('borderWidth', 2)
    text_align = style.get('textAlign', 2)  # Default centrat
    
    # Verificăm poziționarea
    use_custom_position = style.get('useCustomPosition', False)
    position = style.get('position', 'bottom')
    
    # Mapare poziții standard la valorile de aliniere ASS
    position_align_map = {
        'top': 8,      # Centru-sus
        'middle': 5,   # Centru
        'bottom': 2,   # Centru-jos
        'top-left': 7, # Stânga-sus
        'top-right': 9, # Dreapta-sus
        'bottom-left': 1, # Stânga-jos
        'bottom-right': 3 # Dreapta-jos
    }
    
    # Folosim valoarea din mapare sau valoarea default 2 (centru-jos)
    if not use_custom_position:
        text_align = position_align_map.get(position, 2)
    
    # Formatăm header-ul
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=font_size,
        font_color=font_color,
        highlight_color=highlight_color,
        border_color=border_color,
        border_width=border_width,
        text_align=text_align
    )
    
    # Creăm fișierul ASS
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ass_header)
        
        # Adăugăm o întârziere pentru sincronizare
        sync_delay = 0.5  # 500ms întârziere
        
        # Verificăm dacă trebuie să folosim poziționare personalizată
        position_tag = ""
        if use_custom_position:
            custom_x = style.get('customX', 50)
            custom_y = style.get('customY', 90)
            x_pos = custom_x / 100 * 1280
            y_pos = custom_y / 100 * 720
            position_tag = f"{{\\pos({x_pos},{y_pos})}}"
        
        # Adăugăm linii de dialog pentru fiecare subtitrare
        for sub in subtitles:
            # Procesăm textul conform stilului
            text = process_text_with_options(sub['text'].strip(), style)
            text = text.replace('\n', '\\N')
            
            # Aplicăm întârzierea pentru sincronizare
            start_time = sub['start'] + sync_delay
            end_time = sub['end'] + sync_delay
            
            # Formatăm timpii
            start = format_ass_timestamp(start_time)
            end = format_ass_timestamp(end_time)
            
            # Împărțim textul în cuvinte
            words = text.split()
            if not words:
                continue
                
            # Calculăm durata totală a segmentului
            duration = end_time - start_time
            
            # Îmbunătățim estimarea duratei cuvintelor bazat pe lungimea lor
            # 1. Calculăm numărul total de caractere
            total_chars = sum(len(word) for word in words)
            
            # 2. Calculăm durata în centisecunde pentru fiecare caracter
            # Adăugăm un minim de 10 centisecunde pentru fiecare cuvânt pentru a gestiona cuvintele scurte
            char_durations = []
            for word in words:
                # Durata proporțională cu lungimea cuvântului
                # Folosim o pondere de 80% pentru lungime și 20% fixă
                word_proportion = len(word) / max(total_chars, 1)
                word_duration = max(30, int(word_proportion * duration * 100 * 0.8) + 20)  # minim 30 centisecunde
                char_durations.append(word_duration)
            
            # Ajustăm pentru a asigura că suma duratelor este egală cu durata totală
            total_estimated_duration = sum(char_durations)
            adjustment_factor = (duration * 100) / max(total_estimated_duration, 1)
            
            adjusted_durations = [int(d * adjustment_factor) for d in char_durations]
            
            # Implementare karaoke folosind tag-ul \k cu durate îmbunătățite
            karaoke_text = position_tag  # Adăugăm tag-ul de poziție înainte de text
            
            for i, word in enumerate(words):
                karaoke_text += f"{{\\k{adjusted_durations[i]}}}{word} "
            
            # Eliminăm ultimul spațiu
            karaoke_text = karaoke_text.rstrip()
            
            # Scriem linia de dialog cu efect de karaoke
            f.write(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{karaoke_text}\n")
    
    return output_path

def create_word_by_word_karaoke(srt_path, output_path, style, subtitles):
    """
    Alternativă îmbunătățită pentru efectul de karaoke care folosește multiple linii de dialog
    cu timpi calculați mai precis pentru a evidenția fiecare cuvânt în parte.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
        
    Returns:
        str: Calea către fișierul ASS generat
    """
    # Header ASS
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{font_color},&H{secondary_color},&H{border_color},&H80000000,0,0,0,0,100,100,0,0,1,{border_width},0,{text_align},10,10,10,1
Style: Highlight,{font_family},{font_size},&H{highlight_color},&H{secondary_color},&H{highlight_border},&H80000000,1,0,0,0,100,100,0,0,1,{border_width},0,{text_align},10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Parametri
    font_family = style.get('fontFamily', 'Arial')
    # Ajustăm dimensiunea fontului în funcție de rezoluția video
    base_font_size = style.get('fontSize', 24)
    # Dimensiunea fontului ar trebui să fie aproximativ 2.5% din înălțimea video pentru 24px
    # la o rezoluție de 720p
    font_size = max(18, int(base_font_size * 0.9))  # Reducem doar cu 10% maximum
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))[2:]
    border_color = hex_to_ass_color(style.get('borderColor', '#000000'))[2:]
    highlight_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))[2:]
    highlight_border = hex_to_ass_color(style.get('currentWordBorderColor', '#000000'))[2:]
    border_width = style.get('borderWidth', 2)
    
    # Verificăm poziționarea
    use_custom_position = style.get('useCustomPosition', False)
    position = style.get('position', 'bottom')
    
    # Mapare poziții standard la valorile de aliniere ASS
    position_align_map = {
        'top': 8,      # Centru-sus
        'middle': 5,   # Centru
        'bottom': 2,   # Centru-jos
        'top-left': 7, # Stânga-sus
        'top-right': 9, # Dreapta-sus
        'bottom-left': 1, # Stânga-jos
        'bottom-right': 3 # Dreapta-jos
    }
    
    # Folosim valoarea din mapare sau valoarea default 2 (centru-jos)
    text_align = position_align_map.get(position, 2)
    if use_custom_position:
        text_align = 2  # Centrat pentru poziție personalizată
    
    # Formatăm header-ul
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=font_size,
        font_color=font_color,
        secondary_color="FFFFFF",
        border_color=border_color,
        highlight_color=highlight_color,
        highlight_border=highlight_border,
        border_width=border_width,
        text_align=text_align
    )
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ass_header)
        
        # Introducem o întârziere universală pentru a îmbunătăți sincronizarea
        sync_delay = 0.5  # 500ms întârziere
        
        for sub in subtitles:
            text = process_text_with_options(sub['text'].strip(), style)
            text = text.replace('\n', '\\N')
            
            # Formatare timpi pentru subtitrarea completă cu întârziere pentru sincronizare
            start_time = sub['start'] + sync_delay
            end_time = sub['end'] + sync_delay
            
            fmt_start = format_ass_timestamp(start_time)
            fmt_end = format_ass_timestamp(end_time)
            
            # Adăugăm poziția personalizată dacă există
            position_tag = ""
            if use_custom_position:
                custom_x = style.get('customX', 50)
                custom_y = style.get('customY', 90)
                x_pos = custom_x / 100 * 1280
                y_pos = custom_y / 100 * 720
                position_tag = f"{{\\pos({x_pos},{y_pos})}}"
            
            # Adăugăm întregul text cu stilul normal
            f.write(f"Dialogue: 0,{fmt_start},{fmt_end},Default,,0,0,0,,{position_tag}{text}\n")
            
            # Împărțim textul în cuvinte
            words = text.split()
            if not words:
                continue
                
            # Calculăm durata totală
            duration = end_time - start_time
            
            # Îmbunătățim estimarea duratei cuvintelor bazat pe lungimea lor
            # Și factori lingvistici (cuvinte mai lungi durează mai mult)
            total_chars = sum(len(word) for word in words)
            
            # Stabilim durate minime și maxime pentru cuvinte (în secunde)
            min_word_duration = 0.2  # Minim 200ms per cuvânt
            word_durations = []
            
            for word in words:
                # Calculăm un factor de durată proporțional cu lungimea cuvântului
                # dar cu o valoare minimă pentru cuvinte scurte
                char_factor = len(word) / max(total_chars, 1)
                
                # Ajustăm durata: 60% bazată pe lungime, 40% distribuită uniform
                word_duration = max(
                    min_word_duration,
                    (char_factor * 0.6 + 1/len(words) * 0.4) * duration
                )
                word_durations.append(word_duration)
            
            # Asigurăm că suma duratelor nu depășește durata totală
            total_word_duration = sum(word_durations)
            if total_word_duration > duration:
                scaling_factor = duration / total_word_duration
                word_durations = [d * scaling_factor for d in word_durations]
            
            # Calculăm timpii pentru fiecare cuvânt
            word_start_times = [start_time]
            for i in range(len(words) - 1):
                word_start_times.append(word_start_times[-1] + word_durations[i])
            
            word_end_times = [word_start_times[i] + word_durations[i] for i in range(len(words))]
            
            # Adăugăm fiecare cuvânt evidențiat cu timpi îmbunătățiți
            for i, word in enumerate(words):
                # Formatăm timpii
                fmt_word_start = format_ass_timestamp(word_start_times[i])
                fmt_word_end = format_ass_timestamp(word_end_times[i])
                
                # Afișăm fiecare cuvânt individual cu stil evidențiat
                # Folosind tag-ul de culoare și poziționare dacă e necesar
                highlighted_word = f"{position_tag}{{\\c&H{highlight_color}&}}{{\\b1}}{word}"
                
                # Layer 1 pentru a fi deasupra textului normal
                f.write(f"Dialogue: 1,{fmt_word_start},{fmt_word_end},Default,,0,0,0,,{highlighted_word}\n")
    
    return output_path