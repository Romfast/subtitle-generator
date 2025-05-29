# backend/custom_position.py
# Funcții pentru procesarea subtitrărilor cu poziție personalizată
# VERSIUNEA COMPLETĂ FIX pentru poziționare corectă pe desktop și mobile

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

def get_ass_alignment_from_position(position, useCustomPosition=False):
    """
    Calculează alignment-ul ASS corect bazat pe poziția specificată.
    
    Args:
        position: Poziția predefinită sau None
        useCustomPosition: Dacă se folosește poziționarea personalizată
    
    Returns:
        int: Codul de alignment pentru ASS
    """
    if useCustomPosition:
        return 2  # Centru pentru poziționare personalizată
    
    # Mapare poziții standard la valorile de alignment ASS
    position_align_map = {
        'top': 8,          # Centru-sus (8)
        'top-20': 8,       # Centru-sus
        'top-30': 8,       # Centru-sus  
        'top-40': 8,       # Centru-sus
        'middle': 5,       # Centru (5)
        'bottom-40': 2,    # Centru-jos (2)
        'bottom-30': 2,    # Centru-jos
        'bottom-20': 2,    # Centru-jos
        'bottom': 2,       # Centru-jos (2)
        'top-left': 7,     # Stânga-sus (7)
        'top-right': 9,    # Dreapta-sus (9)
        'bottom-left': 1,  # Stânga-jos (1)
        'bottom-right': 3  # Dreapta-jos (3)
    }
    
    return position_align_map.get(position, 2)  # Default: centru-jos

def calculate_ass_margins_from_position(position, useCustomPosition=False, customX=50, customY=90):
    """
    Calculează marginile ASS corecte pentru poziția specificată.
    
    Args:
        position: Poziția predefinită
        useCustomPosition: Dacă se folosește poziționarea personalizată
        customX: Poziția X personalizată (procent)
        customY: Poziția Y personalizată (procent)
    
    Returns:
        dict: Marginile pentru ASS (MarginL, MarginR, MarginV)
    """
    # Pentru poziționarea personalizată, nu folosim margini clasice
    if useCustomPosition:
        return {'MarginL': 10, 'MarginR': 10, 'MarginV': 10}
    
    # Mapare poziții la margini în pixeli (pentru 1920x1080)
    position_margins = {
        'top': {'MarginL': 10, 'MarginR': 10, 'MarginV': 50},
        'top-20': {'MarginL': 10, 'MarginR': 10, 'MarginV': 150},
        'top-30': {'MarginL': 10, 'MarginR': 10, 'MarginV': 250},
        'top-40': {'MarginL': 10, 'MarginR': 10, 'MarginV': 350},
        'middle': {'MarginL': 10, 'MarginR': 10, 'MarginV': 10},
        'bottom-40': {'MarginL': 10, 'MarginR': 10, 'MarginV': 250},
        'bottom-30': {'MarginL': 10, 'MarginR': 10, 'MarginV': 200},
        'bottom-20': {'MarginL': 10, 'MarginR': 10, 'MarginV': 150},
        'bottom': {'MarginL': 10, 'MarginR': 10, 'MarginV': 100},
        'top-left': {'MarginL': 50, 'MarginR': 10, 'MarginV': 50},
        'top-right': {'MarginL': 10, 'MarginR': 50, 'MarginV': 50},
        'bottom-left': {'MarginL': 50, 'MarginR': 10, 'MarginV': 100},
        'bottom-right': {'MarginL': 10, 'MarginR': 50, 'MarginV': 100}
    }
    
    return position_margins.get(position, {'MarginL': 10, 'MarginR': 10, 'MarginV': 100})

def create_ass_file_with_custom_position(srt_path, output_path, style, subtitles):
    """
    Creează un fișier ASS (Advanced SubStation Alpha) pentru subtitrări cu poziționare personalizată.
    VERSIUNEA COMPLETĂ FIX - poziționare corectă pe toate platformele.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
    
    Returns:
        str: Calea către fișierul ASS generat
    """
    print(f"Creating ASS file with style: {style}")
    
    # Extragem parametrii de poziționare
    useCustomPosition = style.get('useCustomPosition', False)
    customX = style.get('customX', 50)
    customY = style.get('customY', 90)
    position = style.get('position', 'bottom')
    
    print(f"Position settings: useCustom={useCustomPosition}, position={position}, X={customX}, Y={customY}")
    
    # Calculăm poziția și coordonatele pentru ASS
    alignment = get_ass_alignment_from_position(position, useCustomPosition)
    margins = calculate_ass_margins_from_position(position, useCustomPosition, customX, customY)
    
    # Header ASS complet
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{primary_color},&H{secondary_color},&H{outline_color},&H{back_color},0,0,0,0,100,100,0,0,1,{outline_width},0,{alignment},{margin_l},{margin_r},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Extragem parametrii de stil - folosim mărimea fontului deja calculată în app.py
    font_family = style.get('fontFamily', 'Arial')
    font_size = style.get('fontSize', 24)  # Deja ajustată în app.py conform dimensiunilor video
    print(f"ASS: Using font: {font_family}, size: {font_size}")
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))
    outline_color = hex_to_ass_color(style.get('borderColor', '#000000'))
    outline_width = style.get('borderWidth', 2)
    
    # Completăm header-ul cu informațiile de stil
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=font_size,
        primary_color=font_color[2:],  # Eliminăm &H din început
        secondary_color="FFFFFF",
        outline_color=outline_color[2:],
        back_color="000000",
        outline_width=outline_width,
        alignment=alignment,
        margin_l=margins['MarginL'],
        margin_r=margins['MarginR'],
        margin_v=margins['MarginV']
    )
    
    # Creăm fișierul ASS
    with open(output_path, 'w', encoding='utf-8') as ass_file:
        ass_file.write(ass_header)
        
        print(f"Creating ASS file with {len(subtitles)} subtitles")
        
        # Adăugăm evenimentele de dialog pentru fiecare subtitrare
        for i, sub in enumerate(subtitles):
            start_time = sub['start']
            end_time = sub['end']
            
            start_ts = format_ass_timestamp(start_time)
            end_ts = format_ass_timestamp(end_time)
            
            # Procesează textul conform opțiunilor din style
            text = process_text_with_options(sub['text'].strip(), style)
            text = text.replace('\n', '\\N')
            
            # CRITICAL FIX: Calculăm poziționarea corectă
            position_tag = ""
            
            if useCustomPosition:
                # Pentru poziționare personalizată, folosim tag-ul \pos()
                # Convertim procentajele în coordonate absolute pentru 1920x1080
                abs_x = int((customX / 100) * 1920)
                abs_y = int((customY / 100) * 1080)
                position_tag = f"{{\\pos({abs_x},{abs_y})}}"
                print(f"Custom position: {customX}%,{customY}% -> {abs_x},{abs_y}")
            else:
                # Pentru poziționarea predefinită, folosim \an pentru alignment
                # și eventual \pos dacă avem nevoie de poziționare exactă
                if position in ['top-20', 'top-30', 'top-40', 'bottom-20', 'bottom-30', 'bottom-40']:
                    # Pentru pozițiile cu procente specifice, calculăm poziția exactă
                    position_map = {
                        'top-20': 20, 'top-30': 30, 'top-40': 40,
                        'bottom-20': 80, 'bottom-30': 70, 'bottom-40': 60
                    }
                    y_percent = position_map.get(position, 90)
                    abs_x = 960  # Centrat
                    abs_y = int((y_percent / 100) * 1080)
                    position_tag = f"{{\\pos({abs_x},{abs_y})}}"
                    print(f"Preset position {position}: {y_percent}% -> {abs_x},{abs_y}")
                else:
                    # Pentru pozițiile standard, folosim doar alignment-ul
                    position_tag = f"{{\\an{alignment}}}"
                    print(f"Standard position {position}: alignment {alignment}")
            
            # Scriem linia de dialog
            dialog_line = f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{position_tag}{text}\n"
            ass_file.write(dialog_line)
            
            # Log pentru debugging la primele câteva subtitrări
            if i < 3:
                print(f"Subtitle {i+1}: {start_ts} -> {end_ts} | {position_tag} | {text[:30]}...")
    
    print(f"ASS file created successfully: {output_path}")
    return output_path

def create_karaoke_ass_file(srt_path, output_path, style, subtitles):
    """
    Creează un fișier ASS cu efect de karaoke îmbunătățit pentru a evidenția cuvintele
    pe măsură ce sunt pronunțate, cu poziționare corectă.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
    
    Returns:
        str: Calea către fișierul ASS generat
    """
    print(f"Creating Karaoke ASS file with style: {style}")
    
    # Extragem parametrii de poziționare
    useCustomPosition = style.get('useCustomPosition', False)
    customX = style.get('customX', 50)
    customY = style.get('customY', 90)
    position = style.get('position', 'bottom')
    
    # Calculăm poziția și coordonatele pentru ASS
    alignment = get_ass_alignment_from_position(position, useCustomPosition)
    margins = calculate_ass_margins_from_position(position, useCustomPosition, customX, customY)
    
    # Header ASS cu setări optime pentru karaoke
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
Timer: 100.0000
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{font_color},&H{highlight_color},&H{border_color},&H80000000,0,0,0,0,100,100,0,0,1,{border_width},0,{alignment},{margin_l},{margin_r},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Parametri de stil
    font_family = style.get('fontFamily', 'Arial')
    font_size = style.get('fontSize', 24)
    print(f"Karaoke ASS: Using font: {font_family}, size: {font_size}")
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))[2:]  # Fără &H prefix
    border_color = hex_to_ass_color(style.get('borderColor', '#000000'))[2:]
    highlight_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))[2:]
    border_width = style.get('borderWidth', 2)
    
    # Formatăm header-ul
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=font_size,
        font_color=font_color,
        highlight_color=highlight_color,
        border_color=border_color,
        border_width=border_width,
        alignment=alignment,
        margin_l=margins['MarginL'],
        margin_r=margins['MarginR'],
        margin_v=margins['MarginV']
    )
    
    # Creăm fișierul ASS
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ass_header)
        
        print(f"Creating Karaoke ASS file with {len(subtitles)} subtitles")
        
        # Adăugăm linii de dialog pentru fiecare subtitrare
        for i, sub in enumerate(subtitles):
            # Procesăm textul conform stilului
            text = process_text_with_options(sub['text'].strip(), style)
            text = text.replace('\n', '\\N')
            
            start_time = sub['start']
            end_time = sub['end']
            
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
            total_chars = sum(len(word) for word in words)
            
            char_durations = []
            for word in words:
                word_proportion = len(word) / max(total_chars, 1)
                word_duration = max(30, int(word_proportion * duration * 100 * 0.8) + 20)
                char_durations.append(word_duration)
            
            # Ajustăm pentru a asigura că suma duratelor este egală cu durata totală
            total_estimated_duration = sum(char_durations)
            adjustment_factor = (duration * 100) / max(total_estimated_duration, 1)
            adjusted_durations = [int(d * adjustment_factor) for d in char_durations]
            
            # CRITICAL FIX: Calculăm poziționarea corectă pentru karaoke
            position_tag = ""
            
            if useCustomPosition:
                # Pentru poziționare personalizată
                abs_x = int((customX / 100) * 1920)
                abs_y = int((customY / 100) * 1080)
                position_tag = f"{{\\pos({abs_x},{abs_y})}}"
            else:
                # Pentru poziționarea predefinită
                if position in ['top-20', 'top-30', 'top-40', 'bottom-20', 'bottom-30', 'bottom-40']:
                    position_map = {
                        'top-20': 20, 'top-30': 30, 'top-40': 40,
                        'bottom-20': 80, 'bottom-30': 70, 'bottom-40': 60
                    }
                    y_percent = position_map.get(position, 90)
                    abs_x = 960  # Centrat
                    abs_y = int((y_percent / 100) * 1080)
                    position_tag = f"{{\\pos({abs_x},{abs_y})}}"
                else:
                    position_tag = f"{{\\an{alignment}}}"
            
            # Implementare karaoke folosind tag-ul \k cu durate îmbunătățite
            karaoke_text = position_tag  # Adăugăm tag-ul de poziție înainte de text
            
            for j, word in enumerate(words):
                karaoke_text += f"{{\\k{adjusted_durations[j]}}}{word} "
            
            # Eliminăm ultimul spațiu
            karaoke_text = karaoke_text.rstrip()
            
            # Scriem linia de dialog cu efect de karaoke
            f.write(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{karaoke_text}\n")
            
            # Log pentru debugging la primele câteva subtitrări
            if i < 3:
                print(f"Karaoke subtitle {i+1}: {start} -> {end} | {position_tag} | {len(words)} words | {text[:30]}...")
    
    print(f"Karaoke ASS file created successfully: {output_path}")
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
    print(f"Creating Word-by-word ASS file with style: {style}")
    
    # Extragem parametrii de poziționare
    useCustomPosition = style.get('useCustomPosition', False)
    customX = style.get('customX', 50)
    customY = style.get('customY', 90)
    position = style.get('position', 'bottom')
    
    # Calculăm poziția și coordonatele pentru ASS
    alignment = get_ass_alignment_from_position(position, useCustomPosition)
    margins = calculate_ass_margins_from_position(position, useCustomPosition, customX, customY)
    
    # Header ASS
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{font_color},&H{secondary_color},&H{border_color},&H80000000,0,0,0,0,100,100,0,0,1,{border_width},0,{alignment},{margin_l},{margin_r},{margin_v},1
Style: Highlight,{font_family},{font_size},&H{highlight_color},&H{secondary_color},&H{highlight_border},&H80000000,1,0,0,0,100,100,0,0,1,{border_width},0,{alignment},{margin_l},{margin_r},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Parametri de stil
    font_family = style.get('fontFamily', 'Arial')
    font_size = style.get('fontSize', 24)
    print(f"Word-by-word ASS: Using font: {font_family}, size: {font_size}")
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))[2:]
    border_color = hex_to_ass_color(style.get('borderColor', '#000000'))[2:]
    highlight_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))[2:]
    highlight_border = hex_to_ass_color(style.get('currentWordBorderColor', '#000000'))[2:]
    border_width = style.get('borderWidth', 2)
    
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
        alignment=alignment,
        margin_l=margins['MarginL'],
        margin_r=margins['MarginR'],
        margin_v=margins['MarginV']
    )
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ass_header)
        
        print(f"Creating Word-by-word ASS file with {len(subtitles)} subtitles")
        
        total_highlighted_words = 0
        
        for i, sub in enumerate(subtitles):
            text = process_text_with_options(sub['text'].strip(), style)
            text = text.replace('\n', '\\N')
            
            start_time = sub['start']
            end_time = sub['end']
            
            fmt_start = format_ass_timestamp(start_time)
            fmt_end = format_ass_timestamp(end_time)
            
            # CRITICAL FIX: Calculăm poziționarea corectă
            position_tag = ""
            
            if useCustomPosition:
                abs_x = int((customX / 100) * 1920)
                abs_y = int((customY / 100) * 1080)
                position_tag = f"{{\\pos({abs_x},{abs_y})}}"
            else:
                if position in ['top-20', 'top-30', 'top-40', 'bottom-20', 'bottom-30', 'bottom-40']:
                    position_map = {
                        'top-20': 20, 'top-30': 30, 'top-40': 40,
                        'bottom-20': 80, 'bottom-30': 70, 'bottom-40': 60
                    }
                    y_percent = position_map.get(position, 90)
                    abs_x = 960  # Centrat
                    abs_y = int((y_percent / 100) * 1080)
                    position_tag = f"{{\\pos({abs_x},{abs_y})}}"
                else:
                    position_tag = f"{{\\an{alignment}}}"
            
            # Adăugăm întregul text cu stilul normal (Layer 0)
            f.write(f"Dialogue: 0,{fmt_start},{fmt_end},Default,,0,0,0,,{position_tag}{text}\n")
            
            # Împărțim textul în cuvinte pentru evidențiere individuală
            words = text.split()
            if not words:
                continue
                
            # Calculăm durata totală
            duration = end_time - start_time
            total_chars = sum(len(word) for word in words)
            
            # Îmbunătățim estimarea duratei cuvintelor
            min_word_duration = 0.2  # Minim 200ms per cuvânt
            word_durations = []
            
            for word in words:
                char_factor = len(word) / max(total_chars, 1)
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
            for j in range(len(words) - 1):
                word_start_times.append(word_start_times[-1] + word_durations[j])
            
            word_end_times = [word_start_times[j] + word_durations[j] for j in range(len(words))]
            
            # Adăugăm fiecare cuvânt evidențiat cu timpi îmbunătățiți
            for j, word in enumerate(words):
                # Formatăm timpii pentru cuvântul curent
                fmt_word_start = format_ass_timestamp(word_start_times[j])
                fmt_word_end = format_ass_timestamp(word_end_times[j])
                
                # Afișăm fiecare cuvânt individual cu stil evidențiat
                highlighted_word = f"{position_tag}{{\\c&H{highlight_color}&}}{{\\b1}}{word}"
                
                # Layer 1 pentru a fi deasupra textului normal
                f.write(f"Dialogue: 1,{fmt_word_start},{fmt_word_end},Default,,0,0,0,,{highlighted_word}\n")
                total_highlighted_words += 1
            
            # Log pentru debugging la primele câteva subtitrări
            if i < 3:
                print(f"Word-by-word subtitle {i+1}: {fmt_start} -> {fmt_end} | {position_tag} | {len(words)} words | {text[:30]}...")
        
        print(f"Total highlighted words created: {total_highlighted_words}")
    
    print(f"Word-by-word ASS file created successfully: {output_path}")
    return output_path

# Funcții de utilitate pentru debugging și testare
def validate_ass_timestamps(subtitles):
    """
    Validează că timpii subtitrărilor sunt în ordine cronologică
    și nu se suprapun în mod necorespunzător.
    """
    print("Validating subtitle timestamps...")
    
    for i, sub in enumerate(subtitles):
        # Verificăm că start < end
        if sub['start'] >= sub['end']:
            print(f"WARNING: Subtitle {i+1} has invalid timing: start={sub['start']}, end={sub['end']}")
        
        # Verificăm suprapunerea cu subtitrarea următoare
        if i < len(subtitles) - 1:
            next_sub = subtitles[i + 1]
            if sub['end'] > next_sub['start']:
                overlap = sub['end'] - next_sub['start']
                print(f"INFO: Subtitle {i+1} overlaps with {i+2} by {overlap:.2f}s")
    
    print(f"Timestamp validation complete for {len(subtitles)} subtitles")

def get_subtitle_statistics(subtitles):
    """
    Returnează statistici despre subtitrări pentru debugging.
    """
    if not subtitles:
        return "No subtitles to analyze"
    
    total_duration = sum(sub['end'] - sub['start'] for sub in subtitles)
    avg_duration = total_duration / len(subtitles)
    
    word_counts = [len(sub['text'].split()) for sub in subtitles]
    avg_words = sum(word_counts) / len(word_counts)
    
    char_counts = [len(sub['text']) for sub in subtitles]
    avg_chars = sum(char_counts) / len(char_counts)
    
    stats = f"""
Subtitle Statistics:
- Total subtitles: {len(subtitles)}
- Total duration: {total_duration:.2f}s
- Average duration per subtitle: {avg_duration:.2f}s
- Average words per subtitle: {avg_words:.1f}
- Average characters per subtitle: {avg_chars:.1f}
- Shortest subtitle: {min(sub['end'] - sub['start'] for sub in subtitles):.2f}s
- Longest subtitle: {max(sub['end'] - sub['start'] for sub in subtitles):.2f}s
"""
    
    return stats