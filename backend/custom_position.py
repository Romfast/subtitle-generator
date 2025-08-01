# backend/custom_position.py
# VERSIUNEA ÎMBUNĂTĂȚITĂ pentru evidențiere cuvinte cu mărime mărită
# Synchronizes perfectly with frontend highlighting effects
# FIX COMPLET: Include conturul personalizat pentru cuvântul evidențiat
# FIX #6: Suport pentru scalarea corectă a fontului pe mobil

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

def calculate_highlighted_font_size(base_font_size, is_mobile=False):
    """
    Calculează mărimea fontului pentru cuvântul evidențiat.
    Folosește aceeași logică ca în frontend pentru sincronizare perfectă.
    FIX #6: Ajustări speciale pentru mobil.
    
    Args:
        base_font_size (int): Mărimea de bază a fontului
        is_mobile (bool): Dacă este pe mobil
    
    Returns:
        int: Mărimea mărită pentru cuvântul evidențiat
    """
    # Factorul de mărire pentru cuvântul evidențiat - SYNCHRONIZED cu frontend
    highlight_factor = 1.15  # 15% mai mare default
    
    # Pentru fonturi mici, mărim mai mult pentru vizibilitate
    if base_font_size < 20:
        highlight_factor = 1.25  # 25% mai mare pentru fonturi mici
    elif base_font_size < 30:
        highlight_factor = 1.2   # 20% mai mare pentru fonturi medii
    elif base_font_size > 48:
        highlight_factor = 1.1   # 10% mai mare pentru fonturi mari (să nu devină excesiv de mari)
    
    # FIX #6: Pe mobil, reducem puțin factorul de highlighting pentru a nu fi excesiv
    if is_mobile:
        highlight_factor = highlight_factor * 0.95  # Reducem cu 5% pe mobil
        print(f"Mobile highlight factor adjustment: {highlight_factor}")
    
    highlighted_size = int(round(base_font_size * highlight_factor))
    
    print(f"Highlighted font size calculation: base={base_font_size}, factor={highlight_factor}, highlighted={highlighted_size}, mobile={is_mobile}")
    
    return highlighted_size

def estimate_text_width(text, font_size):
    """
    Estimează lățimea textului în pixeli bazată pe mărimea fontului.
    Folosește o aproximare pentru fonturile monospace/proportionale.
    
    Args:
        text: Textul pentru care se calculează lățimea
        font_size: Mărimea fontului în pixeli
    
    Returns:
        int: Lățimea estimată în pixeli
    """
    # Factor de aproximare pentru lățimea caracterelor
    # Pentru majoritatea fonturilor, un caracter are ~0.6 din înălțimea fontului ca lățime
    avg_char_width = font_size * 0.6
    
    # Ajustăm pentru spații (mai înguste) și litere mari (mai late)
    adjusted_width = 0
    for char in text:
        if char == ' ':
            adjusted_width += avg_char_width * 0.3  # Spațiile sunt mai înguste
        elif char.isupper():
            adjusted_width += avg_char_width * 1.1  # Literele mari sunt mai late
        else:
            adjusted_width += avg_char_width
    
    return int(adjusted_width)

def calculate_word_position_in_text(text, word_index, font_size):
    """
    Calculează poziția X relativă a unui cuvânt în cadrul unui text complet.
    
    Args:
        text: Textul complet
        word_index: Indexul cuvântului (0-based)
        font_size: Mărimea fontului
    
    Returns:
        tuple: (offset_x, word_width) - offset-ul față de începutul textului și lățimea cuvântului
    """
    words = text.split()
    if word_index >= len(words):
        return 0, 0
    
    # Calculăm offset-ul prin măsurarea textului până la cuvântul curent
    text_before_word = ' '.join(words[:word_index])
    if text_before_word:
        text_before_word += ' '  # Adăugăm spațiul dinaintea cuvântului curent
    
    offset_x = estimate_text_width(text_before_word, font_size)
    
    # Calculăm lățimea cuvântului curent
    current_word = words[word_index]
    word_width = estimate_text_width(current_word, font_size)
    
    return offset_x, word_width

def process_text_with_options(text, style):
    """
    Procesează textul conform opțiunilor din style (ALL CAPS, eliminare punctuație, împărțire pe linii).
    UPDATED: Include formarea pe linii bazată pe maxLines și maxWordsPerLine din configurare.
    
    Args:
        text: Textul de procesat
        style: Dicționar cu opțiunile de stil
    
    Returns:
        str: Textul procesat și formatat pe linii
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
    
    # CRITICAL FIX: Aplicăm formatarea pe linii conform configurației DOAR dacă nu e deja formatat
    max_lines = style.get('maxLines', 2)
    max_words_per_line = style.get('maxWordsPerLine', None)
    
    print(f"DEBUG: Processing text formatting - maxLines={max_lines}, maxWordsPerLine={max_words_per_line}")
    newline_char = '\n'
    print(f"DEBUG: Original processed text: '{processed_text}' (already contains \\n: {newline_char in processed_text})")
    
    # Dacă textul DEJA conține line breaks, nu mai aplicăm formatarea
    if newline_char in processed_text:
        print("DEBUG: Text already formatted with line breaks, skipping additional formatting")
        return processed_text
    else:
        print("DEBUG: Text does NOT contain line breaks, will attempt formatting")
    
    # Dacă avem configurare explicită pentru maxWordsPerLine, o folosim
    if max_words_per_line is not None:
        # Formatare manuală bazată pe configurare
        words = processed_text.split()
        if words and len(words) > max_words_per_line:
            lines = []
            for i in range(0, len(words), max_words_per_line):
                line_words = words[i:i + max_words_per_line]
                lines.append(' '.join(line_words))
                if len(lines) >= max_lines:
                    # Dacă avem mai multe cuvinte, le adăugăm pe ultima linie
                    if i + max_words_per_line < len(words):
                        remaining_words = words[i + max_words_per_line:]
                        lines[-1] += ' ' + ' '.join(remaining_words)
                    break
            processed_text = '\n'.join(lines)
            print(f"Manual line formatting: {len(words)} words -> {len(lines)} lines, {max_words_per_line} words/line")
            print(f"DEBUG: Manual formatted text: '{processed_text}'")
    else:
        # CRITICAL FIX: Forțează împărțirea pe maxLines chiar și pentru texte scurte
        words = processed_text.split()
        print(f"DEBUG: Word count: {len(words)}, maxLines: {max_lines}")
        
        if len(words) > 1 and max_lines > 1:
            # Calculăm cuvintele per linie pentru a umple maxLines
            words_per_line = max(1, len(words) // max_lines)
            if len(words) % max_lines != 0:
                words_per_line += 1
            
            lines = []
            for i in range(0, len(words), words_per_line):
                line_words = words[i:i + words_per_line]
                lines.append(' '.join(line_words))
                if len(lines) >= max_lines:
                    # Dacă avem mai multe cuvinte rămase, le adăugăm la ultima linie
                    if i + words_per_line < len(words):
                        remaining_words = words[i + words_per_line:]
                        lines[-1] += ' ' + ' '.join(remaining_words)
                    break
            
            processed_text = '\n'.join(lines)
            print(f"FORCED line formatting: {len(words)} words -> {len(lines)} lines, ~{words_per_line} words/line")
            print(f"DEBUG: Forced formatted text: '{processed_text}'")
        else:
            print(f"DEBUG: Skipping formatting (only {len(words)} words or maxLines={max_lines})")
    
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

def calculate_ass_margins_from_position(position, useCustomPosition=False, customX=50, customY=90, is_mobile=False):
    """
    Calculează marginile ASS corecte pentru poziția specificată.
    FIX #6: Ajustări pentru mobil.
    
    Args:
        position: Poziția predefinită
        useCustomPosition: Dacă se folosește poziționarea personalizată
        customX: Poziția X personalizată (procent)
        customY: Poziția Y personalizată (procent)
        is_mobile: Dacă este pe mobil
    
    Returns:
        dict: Marginile pentru ASS (MarginL, MarginR, MarginV)
    """
    # Pentru poziționarea personalizată, nu folosim margini clasice
    if useCustomPosition:
        base_margin = 15 if is_mobile else 10  # FIX #6: Margini mai mari pe mobil
        return {'MarginL': base_margin, 'MarginR': base_margin, 'MarginV': base_margin}
    
    # FIX #6: Ajustăm marginile pentru mobil
    mobile_multiplier = 1.5 if is_mobile else 1.0
    
    # Mapare poziții la margini în pixeli (pentru 1920x1080, ajustate pentru mobil)
    position_margins = {
        'top': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(50 * mobile_multiplier)},
        'top-20': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(150 * mobile_multiplier)},
        'top-30': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(250 * mobile_multiplier)},
        'top-40': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(350 * mobile_multiplier)},
        'middle': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(10 * mobile_multiplier)},
        'bottom-40': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(250 * mobile_multiplier)},
        'bottom-30': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(200 * mobile_multiplier)},
        'bottom-20': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(150 * mobile_multiplier)},
        'bottom': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(100 * mobile_multiplier)},
        'top-left': {'MarginL': int(50 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(50 * mobile_multiplier)},
        'top-right': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(50 * mobile_multiplier), 'MarginV': int(50 * mobile_multiplier)},
        'bottom-left': {'MarginL': int(50 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(100 * mobile_multiplier)},
        'bottom-right': {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(50 * mobile_multiplier), 'MarginV': int(100 * mobile_multiplier)}
    }
    
    result = position_margins.get(position, {'MarginL': int(10 * mobile_multiplier), 'MarginR': int(10 * mobile_multiplier), 'MarginV': int(100 * mobile_multiplier)})
    
    if is_mobile:
        print(f"Mobile margins for position {position}: {result}")
    
    return result

def create_ass_file_with_custom_position(srt_path, output_path, style, subtitles):
    """
    Creează un fișier ASS (Advanced SubStation Alpha) pentru subtitrări cu poziționare personalizată.
    VERSIUNEA COMPLETĂ FIX - poziționare corectă pe toate platformele + FONTURILE BOLD.
    FIX #6: Suport pentru mobil cu scalare corectă.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
    
    Returns:
        str: Calea către fișierul ASS generat
    """
    print(f"Creating ASS file with style: {style}")
    
    # FIX #6: Extragem informațiile mobile
    is_mobile = style.get('isMobile', False)
    screen_width = style.get('screenWidth', 1920)
    
    # Extragem parametrii de poziționare
    useCustomPosition = style.get('useCustomPosition', False)
    customX = style.get('customX', 50)
    customY = style.get('customY', 90)
    position = style.get('position', 'bottom')
    
    print(f"Position settings: useCustom={useCustomPosition}, position={position}, X={customX}, Y={customY}, mobile={is_mobile}")
    
    # Calculăm poziția și coordonatele pentru ASS
    alignment = get_ass_alignment_from_position(position, useCustomPosition)
    margins = calculate_ass_margins_from_position(position, useCustomPosition, customX, customY, is_mobile)
    
    # Header ASS complet cu BOLD=1 pentru fonturile groase + MaxTextWidth pentru line wrapping
    video_width = style.get('videoWidth', 1920)
    max_text_width = int(video_width * 0.8)  # 80% din lățimea video-ului
    
    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{{font_family}},{{font_size}},&H{{primary_color}},&H{{secondary_color}},&H{{outline_color}},&H{{back_color}},1,0,0,0,100,100,0,0,1,{{outline_width}},{{shadow_depth}},{{alignment}},{{margin_l}},{{margin_r}},{{margin_v}},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Extragem parametrii de stil - folosim mărimea fontului deja calculată în app.py
    font_family = style.get('fontFamily', 'Arial')
    font_size = style.get('fontSize', 24)  # Deja ajustată în app.py conform dimensiunilor video și mobile
    
    print(f"ASS: Using font: {font_family}, size: {font_size}, mobile: {is_mobile}")
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))
    outline_color = hex_to_ass_color(style.get('borderColor', '#000000'))
    outline_width = style.get('borderWidth', 2)
    
    # GLOW EFFECT: Pentru glow, nu folosim shadow-ul din stil, ci aplicăm în fiecare linie
    highlight_mode = style.get('highlightMode', 'none')
    shadow_depth = 0
    back_color = "000000"  # Culoarea shadow-ului (mereu negru pentru stilul de bază)
    
    # Nu aplicăm shadow global aici pentru glow - va fi aplicat inline în fiecare linie
    print(f"Highlight mode: {highlight_mode}, using shadow depth: {shadow_depth}")
    
    # FIX #6: Pe mobil, mărim puțin grosimea conturului pentru vizibilitate
    if is_mobile:
        outline_width = max(outline_width, outline_width * 1.2)
        print(f"Mobile outline width adjustment: {outline_width}")
    
    # Completăm header-ul cu informațiile de stil
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=font_size,
        primary_color=font_color[2:],  # Eliminăm &H din început
        secondary_color="FFFFFF",
        outline_color=outline_color[2:],
        back_color="000000",  # Culoarea shadow-ului (mereu negru)
        outline_width=outline_width,
        shadow_depth=shadow_depth,  # Adăugat pentru glow
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
            newline_char = '\n'
            double_backslash_n = '\\N'
            print(f"DEBUG: Text before ASS formatting: '{text}' (contains \\n: {newline_char in text})")
            text = text.replace('\n', '\\N')
            print(f"DEBUG: Text after ASS formatting: '{text}' (contains \\\\N: {double_backslash_n in text})")
            
            # DEBUG: Removed force test to see natural behavior
            
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
            print(f"DEBUG: Writing ASS dialogue line: '{dialog_line.strip()}'")
            ass_file.write(dialog_line)
            
            # Log pentru debugging la primele câteva subtitrări
            if i < 3:
                print(f"Subtitle {i+1}: {start_ts} -> {end_ts} | {position_tag} | {text[:30]}...")
    
    print(f"ASS file created successfully: {output_path}")
    return output_path

def get_highlight_mode_effects(highlight_mode, highlight_color, highlighted_font_size, base_font_size, highlight_border_color=None):
    """
    REDESIGNED: Returnează tag-uri ASS care funcționează real și se potrivesc cu preview-ul.
    Folosește doar efecte care sunt suportate nativ în ASS format.
    
    Args:
        highlight_mode: Modul de evidențiere (none, shadow, border, glow, double_border, thick_shadow)
        highlight_color: Culoarea pentru evidențiere (fără &H prefix)
        highlighted_font_size: Mărimea fontului pentru cuvântul evidențiat
        base_font_size: Mărimea fontului pentru cuvintele normale
        highlight_border_color: Culoarea conturului pentru cuvântul evidențiat (OPȚIONAL)
    
    Returns:
        str: Tag-urile ASS pentru efectul dorit
    """
    if not highlight_mode or highlight_mode == 'none':
        # Modul simplu - doar culori și mărime
        result = f"\\fs{highlighted_font_size}\\c&H{highlight_color}&"
        if highlight_border_color:
            result += f"\\3c&H{highlight_border_color}&"
        return result
    
    elif highlight_mode == 'shadow':
        # Shadow - umbră neagră clasică în jos-dreapta (simplu și vizibil)
        result = f"\\fs{highlighted_font_size}\\c&H{highlight_color}&\\xshad2\\yshad2\\4c&H000000&"
        print(f"Applied shadow highlighting: {result}")
        return result
    
    elif highlight_mode == 'border':
        # Border subțire - contur de 2 pixeli
        border_color = highlight_border_color if highlight_border_color else "000000"
        result = f"\\fs{highlighted_font_size}\\c&H{highlight_color}&\\bord2\\3c&H{border_color}&"
        print(f"Applied border highlighting: {result}")
        return result
    
    elif highlight_mode == 'glow':
        # Glow - va fi aplicat global în create_enhanced_highlighted_text
        # Aici returnam doar schimbarea de culoare și mărime
        result = f"\\fs{highlighted_font_size}\\c&H{highlight_color}&"
        print(f"Applied glow highlighting (global glow handled separately): {result}")
        return result
    
    elif highlight_mode == 'double_border':
        # Double border - contur mediu de 4 pixeli
        border_color = highlight_border_color if highlight_border_color else "000000"
        result = f"\\fs{highlighted_font_size}\\c&H{highlight_color}&\\bord4\\3c&H{border_color}&"
        print(f"Applied double border highlighting: {result}")
        return result
    
    elif highlight_mode == 'thick_shadow':
        # Thick border - contur foarte gros de 6 pixeli
        border_color = highlight_border_color if highlight_border_color else "000000"
        result = f"\\fs{highlighted_font_size}\\c&H{highlight_color}&\\bord6\\3c&H{border_color}&"
        print(f"Applied thick border highlighting: {result}")
        return result
    
    else:
        # Fallback la modul simplu
        print(f"WARNING: Unknown highlight mode '{highlight_mode}', using simple mode")
        result = f"\\fs{highlighted_font_size}\\c&H{highlight_color}&"
        if highlight_border_color:
            result += f"\\3c&H{highlight_border_color}&"
        return result

def create_enhanced_highlighted_text(words, highlighted_word_index, highlight_color, highlighted_font_size, base_font_size, highlight_border_color=None, is_mobile=False, highlight_mode='none', style=None):
    """
    FIX COMPLET: Creează textul cu un cuvânt evidențiat folosind tag-uri ASS inline.
    ÎMBUNĂTĂȚITĂ: Include mărirea fontului și CONTURUL PERSONALIZAT pentru cuvântul evidențiat.
    NEW: Suport pentru multiple moduri de evidențiere.
    FIX #6: Ajustări pentru mobil.
    
    Args:
        words: Lista de cuvinte
        highlighted_word_index: Indexul cuvântului de evidențiat (0-based)
        highlight_color: Culoarea pentru evidențiere (fără &H prefix)
        highlighted_font_size: Mărimea fontului pentru cuvântul evidențiat
        base_font_size: Mărimea fontului pentru cuvintele normale
        highlight_border_color: Culoarea conturului pentru cuvântul evidențiat (OPȚIONAL)
        is_mobile: Dacă este pe mobil (pentru ajustări speciale)
        highlight_mode: Modul de evidențiere (none, backdrop, underline, glow, box, outline, gradient)
    
    Returns:
        str: Textul formatat cu tag-uri ASS pentru evidențiere + mărire + contur personalizat + mod evidențiere
    """
    if not words or highlighted_word_index >= len(words):
        return ' '.join(words) if words else ''
    
    result_parts = []
    
    # Pentru modul GLOW, aplicăm shadow global pe toate cuvintele
    if highlight_mode == 'glow':
        # Glow global pe toate cuvintele
        if style:
            glow_base_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))[2:]  # Fără &H
        else:
            glow_base_color = "FFFFFF"  # Fallback la alb
        
        for i, word in enumerate(words):
            if i == highlighted_word_index:
                # Cuvântul evidențiat - glow cu border transparent + culoare specială
                result_parts.append(f"{{\\c&H{highlight_color}&\\bord3\\3c&H{glow_base_color}&\\3a&HF0&\\fs{highlighted_font_size}}}{word}{{\\r}}")
            else:
                # Cuvintele normale - glow cu border transparent soft
                result_parts.append(f"{{\\bord2\\3c&H{glow_base_color}&\\3a&HE0&}}{word}{{\\r}}")
        
        print(f"Applied SOFT GLOW mode with very transparent border color {glow_base_color}")
    else:
        # Pentru alte moduri, logica normală
        for i, word in enumerate(words):
            if i == highlighted_word_index:
                # Obținem tag-urile pentru modul de evidențiere
                highlight_effects = get_highlight_mode_effects(
                    highlight_mode, highlight_color, highlighted_font_size, 
                    base_font_size, highlight_border_color
                )
                
                # Aplicăm efectele și resetăm la stilul normal
                result_parts.append(f"{{{highlight_effects}}}{word}{{\\r}}")
                print(f"Applied highlight mode '{highlight_mode}': color={highlight_color}, border={highlight_border_color}, mobile={is_mobile}")
            else:
                # Cuvânt normal - folosește setările din stil
                result_parts.append(word)
    
    return ' '.join(result_parts)

def create_precise_word_highlighting_ass(srt_path, output_path, style, subtitles):
    """
    FIX COMPLET: Creează un fișier ASS cu evidențierea PRECISĂ a cuvântului curent
    folosind un singur layer cu tag-uri de culoare și mărime inline pentru fiecare cuvânt.
    INCLUDE MĂRIREA FONTULUI pentru cuvântul evidențiat - SYNCHRONIZED cu frontend!
    INCLUDE CONTURUL PERSONALIZAT pentru cuvântul evidențiat!
    FIX #6: Optimizări pentru mobil.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări cu timing word-level
        
    Returns:
        str: Calea către fișierul ASS generat
    """
    print(f"Creating ENHANCED Precise Word Highlighting ASS file with style: {style}")
    
    # FIX #6: Extragem informațiile mobile
    is_mobile = style.get('isMobile', False)
    screen_width = style.get('screenWidth', 1920)
    
    # Extragem parametrii de poziționare
    useCustomPosition = style.get('useCustomPosition', False)
    customX = style.get('customX', 50)
    customY = style.get('customY', 90)
    position = style.get('position', 'bottom')
    
    # Calculăm poziția și coordonatele pentru ASS
    alignment = get_ass_alignment_from_position(position, useCustomPosition)
    margins = calculate_ass_margins_from_position(position, useCustomPosition, customX, customY, is_mobile)
    
    # Header ASS SIMPLIFICAT - doar un stil + BOLD=1
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{font_color},&H{secondary_color},&H{border_color},&H80000000,1,0,0,0,100,100,0,0,1,{border_width},0,{alignment},{margin_l},{margin_r},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Parametri de stil
    font_family = style.get('fontFamily', 'Arial')
    base_font_size = style.get('fontSize', 24)
    highlighted_font_size = calculate_highlighted_font_size(base_font_size, is_mobile)
    
    print(f"Enhanced Precise Word Highlighting ASS: Using font: {font_family}, base size: {base_font_size}, highlighted size: {highlighted_font_size}, mobile: {is_mobile}")
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))[2:]
    border_color = hex_to_ass_color(style.get('borderColor', '#000000'))[2:]
    highlight_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))[2:]
    
    # CRITICAL FIX: Obținem și procesăm conturul personalizat pentru cuvântul evidențiat
    highlight_border_color = None
    if 'currentWordBorderColor' in style and style['currentWordBorderColor']:
        highlight_border_color = hex_to_ass_color(style['currentWordBorderColor'])[2:]
        print(f"Using custom highlight border color: {style['currentWordBorderColor']} -> {highlight_border_color}")
    else:
        print("No custom highlight border color specified, using default")
    
    # NEW: Obținem modul de evidențiere
    highlight_mode = style.get('highlightMode', 'none')
    print(f"Using highlight mode: {highlight_mode}")
    
    border_width = style.get('borderWidth', 2)
    
    # FIX #6: Pe mobil, mărim puțin grosimea conturului pentru vizibilitate
    if is_mobile:
        border_width = max(border_width, border_width * 1.2)
        print(f"Mobile border width adjustment: {border_width}")
    
    # Formatăm header-ul cu mărimea de bază (highlight se face inline)
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=base_font_size,
        font_color=font_color,
        secondary_color="FFFFFF",
        border_color=border_color,
        border_width=border_width,
        alignment=alignment,
        margin_l=margins['MarginL'],
        margin_r=margins['MarginR'],
        margin_v=margins['MarginV']
    )
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ass_header)
        
        print(f"Creating Enhanced Precise Word Highlighting ASS file with {len(subtitles)} subtitles")
        
        total_dialogue_lines = 0
        
        for i, sub in enumerate(subtitles):
            text = process_text_with_options(sub['text'].strip(), style)
            text = text.replace('\n', '\\N')
            
            # DEBUG: Removed force test to see natural behavior
            
            start_time = sub['start']
            end_time = sub['end']
            
            # Calculăm poziționarea pentru această subtitrare
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
            
            # Verificăm dacă avem timing word-level și karaoke este activat
            if 'words' in sub and sub['words'] and style.get('useKaraoke', False):
                processed_words = text.split()
                word_timings = sub['words']
                
                # Creez o linie de dialog pentru fiecare moment când se schimbă cuvântul evidențiat
                word_events = []
                
                # Primul moment: începutul subtitrării (primul cuvânt evidențiat)
                if len(word_timings) > 0 and len(processed_words) > 0:
                    first_word_start = max(start_time, word_timings[0]['start'])
                    first_word_end = min(word_timings[0]['end'], end_time) if len(word_timings) > 1 else end_time
                    
                    # Textul cu primul cuvânt evidențiat + mărit + contur personalizat + mod evidențiere
                    highlighted_text = create_enhanced_highlighted_text(
                        processed_words, 0, highlight_color, highlighted_font_size, base_font_size, highlight_border_color, is_mobile, highlight_mode, style
                    )
                    word_events.append((first_word_start, first_word_end, highlighted_text))
                
                # Pentru fiecare cuvânt următor, creez o nouă linie de dialog
                for word_idx in range(1, min(len(word_timings), len(processed_words))):
                    word_start = max(word_timings[word_idx]['start'], start_time)
                    word_end = word_timings[word_idx]['end'] if word_idx < len(word_timings) - 1 else end_time
                    word_end = min(word_end, end_time)
                    
                    if word_start < word_end:  # Doar dacă avem un interval valid
                        highlighted_text = create_enhanced_highlighted_text(
                            processed_words, word_idx, highlight_color, highlighted_font_size, base_font_size, highlight_border_color, is_mobile, highlight_mode, style
                        )
                        word_events.append((word_start, word_end, highlighted_text))
                
                # Scriu toate evenimentele pentru această subtitrare
                for word_start, word_end, highlighted_text in word_events:
                    fmt_start = format_ass_timestamp(word_start)
                    fmt_end = format_ass_timestamp(word_end)
                    
                    f.write(f"Dialogue: 0,{fmt_start},{fmt_end},Default,,0,0,0,,{position_tag}{highlighted_text}\n")
                    total_dialogue_lines += 1
            
            else:
                # Fără karaoke - doar textul normal
                fmt_start = format_ass_timestamp(start_time)
                fmt_end = format_ass_timestamp(end_time)
                
                f.write(f"Dialogue: 0,{fmt_start},{fmt_end},Default,,0,0,0,,{position_tag}{text}\n")
                total_dialogue_lines += 1
            
            # Log pentru debugging la primele câteva subtitrări
            if i < 3:
                word_count = len(sub.get('words', []))
                karaoke_status = "enhanced_karaoke" if (style.get('useKaraoke', False) and word_count > 0) else "normal"
                print(f"Subtitle {i+1}: {karaoke_status} | {position_tag} | {word_count} words | mobile: {is_mobile} | {text[:30]}...")
        
        print(f"Total dialogue lines created: {total_dialogue_lines}")
    
    print(f"ENHANCED Precise Word Highlighting ASS file created successfully: {output_path}")
    return output_path

# Păstrez celelalte funcții neschimbate pentru compatibilitate
def create_karaoke_ass_file(srt_path, output_path, style, subtitles):
    """
    Creează un fișier ASS cu efect de karaoke îmbunătățit pentru a evidenția cuvintele
    pe măsură ce sunt pronunțate, cu poziționare corectă și FONTURILE BOLD.
    FIX #6: Ajustări pentru mobil.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
    
    Returns:
        str: Calea către fișierul ASS generat
    """
    print(f"Creating Karaoke ASS file with style: {style}")
    
    # FIX #6: Extragem informațiile mobile
    is_mobile = style.get('isMobile', False)
    
    # Extragem parametrii de poziționare
    useCustomPosition = style.get('useCustomPosition', False)
    customX = style.get('customX', 50)
    customY = style.get('customY', 90)
    position = style.get('position', 'bottom')
    
    # Calculăm poziția și coordonatele pentru ASS
    alignment = get_ass_alignment_from_position(position, useCustomPosition)
    margins = calculate_ass_margins_from_position(position, useCustomPosition, customX, customY, is_mobile)
    
    # Header ASS cu setări optime pentru karaoke și BOLD=1
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
Timer: 100.0000
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{font_color},&H{highlight_color},&H{border_color},&H80000000,1,0,0,0,100,100,0,0,1,{border_width},0,{alignment},{margin_l},{margin_r},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Parametri de stil
    font_family = style.get('fontFamily', 'Arial')
    font_size = style.get('fontSize', 24)
    print(f"Karaoke ASS: Using font: {font_family}, size: {font_size}, mobile: {is_mobile}")
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))[2:]  # Fără &H prefix
    border_color = hex_to_ass_color(style.get('borderColor', '#000000'))[2:]
    highlight_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))[2:]
    border_width = style.get('borderWidth', 2)
    
    # FIX #6: Pe mobil, mărim puțin grosimea conturului pentru vizibilitate
    if is_mobile:
        border_width = max(border_width, border_width * 1.2)
    
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
                print(f"Karaoke subtitle {i+1}: {start} -> {end} | {position_tag} | {len(words)} words | mobile: {is_mobile} | {text[:30]}...")
    
    print(f"Karaoke ASS file created successfully: {output_path}")
    return output_path

def create_word_by_word_karaoke(srt_path, output_path, style, subtitles):
    """
    Alternativă îmbunătățită pentru efectul de karaoke care folosește multiple linii de dialog
    cu timpi calculați mai precis pentru a evidenția fiecare cuvânt în parte.
    VERSIUNEA CU BOLD=1 pentru fonturile groase.
    FIX #6: Ajustări pentru mobil.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
        
    Returns:
        str: Calea către fișierul ASS generat
    """
    print(f"Creating Word-by-word ASS file with style: {style}")
    
    # FIX #6: Extragem informațiile mobile
    is_mobile = style.get('isMobile', False)
    
    # Extragem parametrii de poziționare
    useCustomPosition = style.get('useCustomPosition', False)
    customX = style.get('customX', 50)
    customY = style.get('customY', 90)
    position = style.get('position', 'bottom')
    
    # Calculăm poziția și coordonatele pentru ASS
    alignment = get_ass_alignment_from_position(position, useCustomPosition)
    margins = calculate_ass_margins_from_position(position, useCustomPosition, customX, customY, is_mobile)
    
    # Header ASS cu BOLD=1
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{font_color},&H{secondary_color},&H{border_color},&H80000000,1,0,0,0,100,100,0,0,1,{border_width},0,{alignment},{margin_l},{margin_r},{margin_v},1
Style: Highlight,{font_family},{highlight_font_size},&H{highlight_color},&H{secondary_color},&H{highlight_border},&H80000000,1,0,0,0,110,110,0,0,1,{border_width},0,{alignment},{margin_l},{margin_r},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Parametri de stil
    font_family = style.get('fontFamily', 'Arial')
    base_font_size = style.get('fontSize', 24)
    highlight_font_size = calculate_highlighted_font_size(base_font_size, is_mobile)
    
    print(f"Word-by-word ASS: Using font: {font_family}, base size: {base_font_size}, highlight size: {highlight_font_size}, mobile: {is_mobile}")
    
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))[2:]
    border_color = hex_to_ass_color(style.get('borderColor', '#000000'))[2:]
    highlight_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))[2:]
    highlight_border = hex_to_ass_color(style.get('currentWordBorderColor', '#000000'))[2:]
    border_width = style.get('borderWidth', 2)
    
    # FIX #6: Pe mobil, mărim puțin grosimea conturului pentru vizibilitate
    if is_mobile:
        border_width = max(border_width, border_width * 1.2)
    
    # Formatăm header-ul
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=base_font_size,
        highlight_font_size=highlight_font_size,
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
                
                # Afișăm fiecare cuvânt individual cu stil evidențiat (mărime mărită)
                # Layer 1 pentru a fi deasupra textului normal
                f.write(f"Dialogue: 1,{fmt_word_start},{fmt_word_end},Highlight,,0,0,0,,{position_tag}{word}\n")
                total_highlighted_words += 1
            
            # Log pentru debugging la primele câteva subtitrări
            if i < 3:
                word_count = len(sub.get('words', []))
                print(f"Word-by-word subtitle {i+1}: {fmt_start} -> {fmt_end} | {position_tag} | {len(words)} words | mobile: {is_mobile} | {text[:30]}...")
        
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

def test_all_highlight_effects():
    """
    Testează toate efectele de highlighting pentru a verifica dacă sunt vizibile în ASS.
    Returnează exemple de tag-uri pentru fiecare mod.
    """
    test_results = {}
    highlight_color = "FFFF00"  # Galben
    highlight_border_color = "000000"  # Negru
    highlighted_font_size = 48
    base_font_size = 36
    
    modes = ['none', 'shadow', 'border', 'glow', 'double_border', 'thick_shadow']
    
    for mode in modes:
        try:
            tags = get_highlight_mode_effects(
                mode, highlight_color, highlighted_font_size, 
                base_font_size, highlight_border_color
            )
            test_results[mode] = {
                'tags': tags,
                'description': f"Test pentru modul {mode}",
                'expected_visibility': 'high' if mode in ['border', 'thick_shadow'] else 'medium'
            }
        except Exception as e:
            test_results[mode] = {
                'tags': f"ERROR: {e}",
                'description': f"Eroare la testarea modului {mode}",
                'expected_visibility': 'none'
            }
    
    print("=== TEST REZULTATE HIGHLIGHTING EFFECTS ===")
    for mode, result in test_results.items():
        print(f"{mode.upper()}: {result['tags']}")
        print(f"  Vizibilitate așteptată: {result['expected_visibility']}")
        print()
    
    return test_results

def get_subtitle_statistics(subtitles):
    """
    Returnează statistici despre subtitrări pentru debugging, incluzând timing word-level.
    """
    if not subtitles:
        return "No subtitles to analyze"
    
    total_duration = sum(sub['end'] - sub['start'] for sub in subtitles)
    avg_duration = total_duration / len(subtitles)
    
    word_counts = [len(sub['text'].split()) for sub in subtitles]
    avg_words = sum(word_counts) / len(word_counts)
    
    char_counts = [len(sub['text']) for sub in subtitles]
    avg_chars = sum(char_counts) / len(char_counts)
    
    # Verificăm câte subtitrări au timing word-level
    subtitles_with_word_timing = sum(1 for sub in subtitles if 'words' in sub and len(sub.get('words', [])) > 0)
    total_words_with_timing = sum(len(sub.get('words', [])) for sub in subtitles)
    
    stats = f"""
Enhanced Subtitle Statistics:
- Total subtitles: {len(subtitles)}
- Total duration: {total_duration:.2f}s
- Average duration per subtitle: {avg_duration:.2f}s
- Average words per subtitle: {avg_words:.1f}
- Average characters per subtitle: {avg_chars:.1f}
- Shortest subtitle: {min(sub['end'] - sub['start'] for sub in subtitles):.2f}s
- Longest subtitle: {max(sub['end'] - sub['start'] for sub in subtitles):.2f}s
- Subtitles with word-level timing: {subtitles_with_word_timing}/{len(subtitles)} ({(subtitles_with_word_timing/len(subtitles)*100):.1f}%)
- Total words with precise timing: {total_words_with_timing}
- Enhanced highlighting support: Available
- Mobile optimizations: Enabled
"""
    
    return stats

# TEST: Rulează testul pentru highlighting effects
if __name__ == "__main__":
    test_all_highlight_effects()